"""Parcel data schemas."""

from pydantic import BaseModel
from typing import Optional, Dict, Any, List


class ParcelResponse(BaseModel):
    """Response schema for single parcel information."""
    parcel_id: str
    area: Optional[float] = None
    boundary_status: str  # AUTHORITATIVE, REFERENCE_ONLY, UNKNOWN
    source: str
    geometry: Dict[str, Any]
    metadata: Optional[Dict[str, Any]] = None


class ParcelListResponse(BaseModel):
    """Response schema for list of parcels."""
    success: bool
    parcels: List[ParcelResponse]


class ParcelDetailResponse(BaseModel):
    """Response schema for single parcel detail."""
    success: bool
    parcel: ParcelResponse
