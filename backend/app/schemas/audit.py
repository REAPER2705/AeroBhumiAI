"""Audit analysis schemas."""

from pydantic import BaseModel
from typing import Dict, Any, Optional, List


class AuditAnalysisRequest(BaseModel):
    """Request schema for audit analysis."""
    parcel_id: str
    build_check: Dict[str, Any]


class DiagnosisResult(BaseModel):
    """Diagnosis result with measurements and reasoning."""
    result: str  # CLEAR, BOUNDARY_VARIANCE, POTENTIAL_BUILDING_ENCROACHMENT
    reason: str
    priority: str  # low, medium, high
    affected_area_m2: float
    outside_percentage: float
    house_area_m2: float
    has_conflict: bool
    tolerance_m2: float
    evidence: List[str]


class ResolutionGuidance(BaseModel):
    """Resolution guidance for diagnosis result."""
    diagnosis_result: str
    diagnosis_reason: str
    diagnosis_evidence: List[str]
    affected_area_m2: float
    outside_percentage: float
    priority: str
    recommended_action: str
    action_description: str
    next_steps: List[str]
    verification_required: bool
    affected_boundary: Optional[str] = None
    legal_note: str


class AuditAnalysisResponse(BaseModel):
    """Response schema for audit analysis."""
    success: bool
    audit_id: str  # Generated audit ID for report generation
    result: str
    summary: str
    problem: str
    recommended_action: str
    verification_note: Optional[str] = None
    
    # Additional fields for diagnosis/resolution layer
    diagnosis: Optional[DiagnosisResult] = None
    resolution: Optional[ResolutionGuidance] = None
