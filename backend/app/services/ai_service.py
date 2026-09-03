"""AI service for natural language explanations.

Responsibilities:
- Generate plain-language explanations of GIS results
- Create actionable recommendations
- Provide verification guidance

Critical Rule:
- AI NEVER performs geometry calculations (GIS does that)
- AI NEVER invents measurements
- AI receives structured facts only
- AI generates: explanation + recommendation + verification note
"""


def explain_result(result: dict) -> dict:
    """Generate AI-powered explanation for spatial analysis result.

    Input: Structured GIS results
    Output: {
        "summary": "...",
        "problem": "...",
        "recommended_action": "...",
        "verification_note": "..."
    }
    """
    pass
