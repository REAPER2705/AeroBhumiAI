"""Audit analysis and result generation endpoints.

Responsible for:
- AI-driven explanation generation
- Recommendation generation
- Audit record creation
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any

router = APIRouter(prefix="/api/audit", tags=["audit"])

class AuditRequest(BaseModel):
    parcel_id: str
    build_check: Dict[str, Any]

@router.post("/analyze")
async def audit_analyze(request: AuditRequest):
    """Generate AI-driven explanation and recommendations for build check result."""
    result = request.build_check.get("result", "UNKNOWN")
    
    # Mock AI analysis response based on result state
    if result == "CLEAR":
        return {
            "success": True,
            "result": "CLEAR",
            "summary": "The proposed construction is fully contained within the official parcel boundaries.",
            "problem": "None",
            "recommended_action": "Approve construction proposal."
        }
    else:
        return {
            "success": True,
            "result": "POTENTIAL_BUILDING_ENCROACHMENT",
            "summary": "The proposed construction footprint extends beyond the official parcel boundaries.",
            "problem": f"{request.build_check.get('metrics', {}).get('outside_percentage', 0)}% of the building encroaches on adjacent land.",
            "recommended_action": "Reject construction proposal and require revised architectural plans."
        }
