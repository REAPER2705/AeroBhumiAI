"""Parcel selection and retrieval endpoints.

Responsible for:
- Listing available parcels
- Retrieving parcel details and geometry
- Error handling for missing/invalid parcels
"""

from fastapi import APIRouter, HTTPException, status
from typing import List

from ..schemas.parcel import ParcelResponse, ParcelListResponse, ParcelDetailResponse
from ..services import parcel_service

router = APIRouter(prefix="/api/parcels", tags=["parcels"])


@router.get("", response_model=ParcelListResponse)
async def list_parcels():
    """Get list of available reference parcels.
    
    Returns:
        List of parcel features with properties and geometry
    """
    try:
        parcels = parcel_service.list_parcels()
        
        # Convert features to ParcelResponse objects
        parcel_list = []
        for feature in parcels:
            properties = feature.get('properties', {})
            parcel_list.append(ParcelResponse(
                parcel_id=properties.get('parcel_id'),
                area=properties.get('area'),
                boundary_status=properties.get('boundary_status', 'UNKNOWN'),
                source=properties.get('source', ''),
                geometry=feature.get('geometry', {}),
                metadata=properties
            ))
        
        return ParcelListResponse(success=True, parcels=parcel_list)
    
    except parcel_service.ParcelError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "PARCEL_DATA_ERROR",
                "message": str(e)
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "INTERNAL_SERVER_ERROR",
                "message": "Error retrieving parcel list"
            }
        )


@router.get("/{parcel_id}", response_model=ParcelDetailResponse)
async def get_parcel(parcel_id: str):
    """Get complete parcel information and geometry.
    
    Args:
        parcel_id: The ID of the parcel to retrieve
    
    Returns:
        Complete parcel feature with properties and geometry
    """
    try:
        feature = parcel_service.load_parcel(parcel_id)
        
        if not feature:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "PARCEL_NOT_FOUND",
                    "message": f"Parcel {parcel_id} not found"
                }
            )
        
        properties = feature.get('properties', {})
        parcel_data = ParcelResponse(
            parcel_id=properties.get('parcel_id'),
            area=properties.get('area'),
            boundary_status=properties.get('boundary_status', 'UNKNOWN'),
            source=properties.get('source', ''),
            geometry=feature.get('geometry', {}),
            metadata=properties
        )
        
        return ParcelDetailResponse(success=True, parcel=parcel_data)
    
    except HTTPException:
        raise
    except parcel_service.ParcelError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "PARCEL_DATA_ERROR",
                "message": str(e)
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "INTERNAL_SERVER_ERROR",
                "message": "Error retrieving parcel"
            }
        )
