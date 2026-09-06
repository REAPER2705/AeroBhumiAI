"""AI service for natural language explanations using Gemini API.

Responsibilities:
- Generate plain-language explanations of GIS results via Gemini
- Create actionable recommendations
- Provide verification guidance
- Fall back to template-based explanations if Gemini unavailable

Critical Rule:
- AI NEVER performs geometry calculations (GIS does that)
- AI NEVER inverts measurements
- AI receives structured facts only
- AI generates: explanation + recommendation + verification note
"""

import os
import requests
from typing import Dict, Any, Tuple


def _get_gemini_api_key() -> str:
    """Get Gemini API key from environment."""
    return os.getenv("GEMINI_API_KEY", "")


def _get_gemini_model() -> str:
    """Get Gemini model name from environment."""
    return os.getenv("GEMINI_MODEL", "gemini-3.6-flash")


def _build_gemini_prompt(diagnosis: Dict[str, Any], resolution: Dict[str, Any]) -> str:
    """Build a prompt for Gemini based on diagnosis and resolution data.
    
    Args:
        diagnosis: Diagnosis result dict with measurements and classification
        resolution: Resolution guidance dict with recommended actions
    
    Returns:
        Formatted prompt for Gemini
    """
    result = diagnosis.get('result', 'UNKNOWN')
    reason = diagnosis.get('reason', '')
    affected_area = diagnosis.get('affected_area_m2', 0)
    outside_percentage = diagnosis.get('outside_percentage', 0)
    house_area = diagnosis.get('house_area_m2', 0)
    
    action = resolution.get('recommended_action', '')
    next_steps = resolution.get('next_steps', [])
    
    next_steps_text = '\n'.join([f"- {step}" for step in next_steps])
    
    prompt = f"""You are a land compliance expert. Based on the following spatial analysis results, provide a clear, citizen-friendly explanation of the audit findings and recommendations.

SPATIAL ANALYSIS RESULTS:
- Result Classification: {result}
- Reason: {reason}
- Total Building Area: {house_area:.2f} m²
- Area Outside Parcel: {affected_area:.2f} m²
- Percentage Outside: {outside_percentage:.2f}%

DIAGNOSIS:
The analysis shows that {reason.lower()}

RECOMMENDED ACTION:
{action}

NEXT STEPS:
{next_steps_text}

Please provide a concise, citizen-friendly explanation (2-3 sentences) of the audit finding and the primary recommended action. Use simple language that a property owner can understand. Do not include technical jargon."""

    return prompt


def _call_gemini_api(prompt: str) -> Tuple[bool, str]:
    """Call Gemini API with the given prompt.
    
    Args:
        prompt: The prompt to send to Gemini
    
    Returns:
        Tuple of (success: bool, response_text: str)
    """
    api_key = _get_gemini_api_key()
    model = _get_gemini_model()
    
    if not api_key or api_key == "":
        return False, "API key not configured"
    
    # Check if using placeholder key (for fallback testing)
    if api_key.startswith("sk-") or api_key == "":
        return False, "Placeholder API key detected"
    
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        
        headers = {
            "Content-Type": "application/json"
        }
        
        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": prompt
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 1024
            }
        }
        
        response = requests.post(
            url,
            headers=headers,
            params={"key": api_key},
            json=payload,
            timeout=15
        )
        
        if response.status_code != 200:
            return False, f"API error: {response.status_code}"
        
        data = response.json()
        
        # Extract text from response
        if "candidates" in data and len(data["candidates"]) > 0:
            candidate = data["candidates"][0]
            if "content" in candidate and "parts" in candidate["content"]:
                if len(candidate["content"]["parts"]) > 0:
                    text = candidate["content"]["parts"][0].get("text", "")
                    if text:
                        return True, text
        
        return False, "No text in Gemini response"
    
    except requests.Timeout:
        return False, "Gemini API timeout"
    except requests.RequestException as e:
        return False, f"Request error: {str(e)}"
    except Exception as e:
        return False, f"Unexpected error: {str(e)}"


def _generate_fallback_explanation(diagnosis: Dict[str, Any], resolution: Dict[str, Any]) -> str:
    """Generate a template-based explanation when Gemini is unavailable.
    
    Args:
        diagnosis: Diagnosis result dict
        resolution: Resolution guidance dict
    
    Returns:
        Template-based explanation string
    """
    result = diagnosis.get('result', 'UNKNOWN')
    reason = diagnosis.get('reason', '')
    affected_area = diagnosis.get('affected_area_m2', 0)
    outside_percentage = diagnosis.get('outside_percentage', 0)
    action = resolution.get('recommended_action', '')
    
    if result == 'CLEAR':
        explanation = f"The proposed building footprint remains within the reference parcel boundary. {reason} This is a favorable outcome for construction approval."
    
    elif result == 'POTENTIAL_BUILDING_ENCROACHMENT':
        if outside_percentage > 50:
            explanation = f"The analysis shows that {outside_percentage:.2f}% ({affected_area:.2f} m²) of the proposed building extends outside the reference parcel boundary. This constitutes a potential encroachment. {action} to proceed."
        else:
            explanation = f"A portion ({outside_percentage:.2f}% or {affected_area:.2f} m²) of the proposed building extends beyond the parcel boundary. This requires attention: {action} to resolve the conflict."
    
    elif result == 'BOUNDARY_VARIANCE':
        explanation = f"The analysis indicates a variance between the reference boundary and the proposed building footprint. {reason} Field verification or official boundary clarification may be needed."
    
    else:
        explanation = reason
    
    return explanation


def explain_result(diagnosis: Dict[str, Any], resolution: Dict[str, Any]) -> Dict[str, Any]:
    """Generate AI-powered explanation for audit result.

    Input:
        - diagnosis: Dict with result, reason, affected_area_m2, outside_percentage, evidence, house_area_m2
        - resolution: Dict with recommended_action, next_steps, verification_required, affected_boundary
    
    Output:
        Dict with:
        - summary: Plain-language explanation of the diagnosis
        - problem: Clear statement of the problem (if any)
        - recommended_action: Primary recommended action
        - verification_note: Whether official verification is needed
        - ai_explanation: Detailed explanation from Gemini (or fallback)
        - llm_used: Boolean indicating if Gemini was used successfully
    
    Returns:
        Complete explanation dict
    """
    result = diagnosis.get('result', 'UNKNOWN')
    reason = diagnosis.get('reason', '')
    
    # Build Gemini prompt
    prompt = _build_gemini_prompt(diagnosis, resolution)
    
    # Try to get Gemini explanation
    gemini_success, gemini_text = _call_gemini_api(prompt)
    
    if gemini_success:
        ai_explanation = gemini_text
        llm_used = True
    else:
        # Fall back to template-based explanation
        ai_explanation = _generate_fallback_explanation(diagnosis, resolution)
        llm_used = False
    
    # Build response with all components preserved from services
    return {
        'summary': ai_explanation,
        'problem': reason,
        'recommended_action': resolution.get('recommended_action', ''),
        'verification_note': 'Official verification required' if resolution.get('verification_required') else 'No official verification required',
        'ai_explanation': ai_explanation,
        'llm_used': llm_used
    }
