"""Spatial analysis and build check schemas."""

from pydantic import BaseModel
from typing import Dict, Any, Optional


class BuildCheckRequest(BaseModel):
    """Request schema for spatial build check."""
    parcel_id: str
    house_geometry: Dict[str, Any]


class BuildCheckResponse(BaseModel):
    """Response schema for build check result."""
    success: bool
    result: str  # CLEAR, BOUNDARY_VARIANCE, POTENTIAL_BUILDING_ENCROACHMENT
    metrics: Dict[str, float]
    boundary_status: str
    encroachment_geometry: Optional[Dict[str, Any]] = None  # The actual outside portion as GeoJSON
