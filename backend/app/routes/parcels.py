"""Parcel selection and retrieval endpoints.

Responsible for:
- Listing available parcels
- Retrieving parcel details and geometry
"""

from fastapi import APIRouter, HTTPException
from ..services import parcel_service

router = APIRouter(prefix="/api/parcels", tags=["parcels"])


@router.get("")
async def list_parcels():
    """Get list of available parcels."""
    parcels = parcel_service.list_parcels()
    return {"parcels": parcels}


@router.get("/{parcel_id}")
async def get_parcel(parcel_id: str):
    """Get complete parcel information and geometry."""
    parcel = parcel_service.load_parcel(parcel_id)
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")
    return parcel
