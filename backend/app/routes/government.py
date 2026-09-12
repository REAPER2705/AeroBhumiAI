"""Government Verification Module Endpoints

Responsible for:
- Government case analysis
- AI-powered technical summaries
- Verification recommendations
- Safety guardrails for AI output
"""

from fastapi import APIRouter, HTTPException, status
from typing import Dict, Any, Optional
from pydantic import BaseModel

from ..services import ai_service

router = APIRouter(prefix="/api/government", tags=["government"])


class GovernmentCaseData(BaseModel):
    """Government case data for AI summary generation"""
    parcel_id: str
    registered_area_m2: float
    observed_area_m2: float
    area_variance_percent: float
    affected_area_m2: float
    affected_side: str
    conflict_type: str
    priority: str


class GovernmentAISummaryResponse(BaseModel):
    """AI-generated technical summary for government case"""
    success: bool
    parcel_id: str
    what_happened: str
    why_flagged: str
    what_to_verify: str
    disclaimer: str
    llm_used: bool


@router.post("/case-summary", response_model=GovernmentAISummaryResponse)
async def generate_government_case_summary(case_data: GovernmentCaseData):
    """Generate AI technical summary for a government verification case.
    
    Args:
        case_data: Government case with spatial measurements
    
    Returns:
        Technical summary with three sections:
        - What happened?
        - Why was it flagged?
        - What should be verified?
    
    Safety:
        - AI does NOT modify measurements
        - AI does NOT calculate new areas
        - AI does NOT make legal determinations
        - AI uses cautious language ("potential", "requires verification")
    """
    try:
        # Build deterministic AI prompt (no measurement changes)
        prompt = _build_government_summary_prompt(case_data)
        
        # Get AI response using existing service
        success, response_text = ai_service._call_gemini_api(prompt)
        
        if success:
            # Parse AI response into sections
            sections = _parse_summary_sections(response_text)
            llm_used = True
        else:
            # Fall back to template-based summary
            sections = _generate_fallback_summary(case_data)
            llm_used = False
        
        return GovernmentAISummaryResponse(
            success=True,
            parcel_id=case_data.parcel_id,
            what_happened=sections.get('what_happened', ''),
            why_flagged=sections.get('why_flagged', ''),
            what_to_verify=sections.get('what_to_verify', ''),
            disclaimer='This is a spatial finding based on supplied measurements. Not a legal determination. Requires official field verification.',
            llm_used=llm_used
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "SUMMARY_GENERATION_ERROR",
                "message": str(e)
            }
        )


def _build_government_summary_prompt(case_data: GovernmentCaseData) -> str:
    """Build a safe prompt for government case summary generation.
    
    Critical: Do NOT include any request for measurement changes or calculations.
    """
    
    if case_data.conflict_type == 'CLEAR':
        case_description = f"Parcel {case_data.parcel_id} shows no spatial conflict."
    elif case_data.conflict_type == 'BOUNDARY_INCONSISTENCY':
        case_description = (
            f"Parcel {case_data.parcel_id} shows potential boundary inconsistency. "
            f"Registered area: {case_data.registered_area_m2} m². "
            f"Observed area: {case_data.observed_area_m2} m². "
            f"Affected area: {case_data.affected_area_m2} m² on the {case_data.affected_side} side."
        )
    else:  # POTENTIAL_ENCROACHMENT
        case_description = (
            f"Parcel {case_data.parcel_id} shows potential encroachment. "
            f"Registered area: {case_data.registered_area_m2} m². "
            f"Observed area: {case_data.observed_area_m2} m². "
            f"Affected area: {case_data.affected_area_m2} m² on the {case_data.affected_side} side."
        )
    
    prompt = f"""You are a land compliance expert preparing a technical summary for government officials.

CASE DATA (DO NOT MODIFY THESE VALUES):
{case_description}
Conflict Type: {case_data.conflict_type}
Priority: {case_data.priority}

Generate exactly three sections for this government case:

1. What happened?
   - One sentence explaining the spatial finding
   - Use: "A potential spatial inconsistency..." or "No conflicts detected..."
   - Do NOT declare legal ownership or guilt

2. Why was it flagged?
   - One sentence explaining the evidence
   - Reference the supplied measurements only
   - Do NOT invent new measurements

3. What should be verified?
   - One sentence recommending official verification action
   - Use: "Requires field verification...", "Conduct official...", "Compare adjoining..."
   - Do NOT make legal declarations

OUTPUT FORMAT:
What happened?
[single sentence]

Why was it flagged?
[single sentence]

What should be verified?
[single sentence]

DO NOT:
- Change any measurements
- Calculate new areas
- Invent coordinates
- Make legal determinations
- Accuse anyone
"""
    
    return prompt


def _parse_summary_sections(response_text: str) -> Dict[str, str]:
    """Parse AI response into what/why/verify sections."""
    sections = {
        'what_happened': '',
        'why_flagged': '',
        'what_to_verify': ''
    }
    
    lines = response_text.split('\n')
    current_section = None
    
    for line in lines:
        line = line.strip()
        if 'What happened?' in line:
            current_section = 'what_happened'
        elif 'Why was it flagged?' in line or 'Why was it flagged' in line:
            current_section = 'why_flagged'
        elif 'What should be verified?' in line or 'What should be verified' in line:
            current_section = 'what_to_verify'
        elif current_section and line and not line.startswith('DO NOT'):
            if line[0].isalpha():  # Skip section headers
                sections[current_section] += line + ' '
    
    # Clean up whitespace
    for key in sections:
        sections[key] = sections[key].strip()
    
    return sections


def _generate_fallback_summary(case_data: GovernmentCaseData) -> Dict[str, str]:
    """Generate template-based summary when AI is unavailable."""
    
    if case_data.conflict_type == 'CLEAR':
        return {
            'what_happened': 'Parcel boundaries align with registered records. No spatial conflicts detected.',
            'why_flagged': 'No inconsistencies were identified in the boundary comparison.',
            'what_to_verify': 'No additional verification required. Documentation is clear and consistent.'
        }
    
    elif case_data.conflict_type == 'BOUNDARY_INCONSISTENCY':
        return {
            'what_happened': f'A potential boundary inconsistency was detected along the {case_data.affected_side} side of {case_data.parcel_id}.',
            'why_flagged': f'The observed geometry differs from the registered cadastral data, affecting approximately {case_data.affected_area_m2} m².',
            'what_to_verify': f'Conduct official field demarcation of the {case_data.affected_side} boundary and compare adjoining parcel geometry.'
        }
    
    else:  # POTENTIAL_ENCROACHMENT
        return {
            'what_happened': f'A potential structure encroachment was detected on the {case_data.affected_side} boundary of {case_data.parcel_id}.',
            'why_flagged': f'The observed building/structure extends beyond the registered parcel boundary, affecting approximately {case_data.affected_area_m2} m².',
            'what_to_verify': f'Verify the ownership and boundaries of the structure on the {case_data.affected_side} side. Compare with adjoining parcel records and conduct field survey if needed.'
        }
