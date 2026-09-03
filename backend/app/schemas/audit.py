"""Audit analysis schemas."""

from pydantic import BaseModel
from typing import Dict, Any, Optional


class AuditAnalysisRequest(BaseModel):
    """Request schema for audit analysis."""
    parcel_id: str
    build_check: Dict[str, Any]


class AuditAnalysisResponse(BaseModel):
    """Response schema for audit analysis."""
    success: bool
    result: str
    summary: str
    problem: str
    recommended_action: str
    verification_note: Optional[str] = None
