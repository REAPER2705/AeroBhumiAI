"""Parcel selection and retrieval endpoints.

Responsible for:
- Listing available parcels
- Retrieving parcel details and geometry
"""

from fastapi import APIRouter

router = APIRouter(prefix="/api/parcels", tags=["parcels"])


@router.get("")
async def list_parcels():
    """Get list of available parcels."""
    pass


@router.get("/{parcel_id}")
async def get_parcel(parcel_id: str):
    """Get complete parcel information and geometry."""
    pass
