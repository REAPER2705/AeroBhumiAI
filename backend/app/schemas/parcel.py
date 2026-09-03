"""Parcel data schemas."""

from pydantic import BaseModel
from typing import Optional, Dict, Any


class ParcelResponse(BaseModel):
    """Response schema for parcel information."""
    parcel_id: str
    area: Optional[float] = None
    boundary_status: str  # AUTHORITATIVE, REFERENCE_ONLY, UNKNOWN
    source: str
    geometry: Dict[str, Any]
    metadata: Optional[Dict[str, Any]] = None
