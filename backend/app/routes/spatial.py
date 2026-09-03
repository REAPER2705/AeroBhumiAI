"""Spatial analysis and build check endpoints.

Responsible for:
- Build check API orchestration
- Spatial analysis triggering
- Result state determination
"""

from fastapi import APIRouter, HTTPException, status
from typing import Dict, Any
import os

from ..schemas.spatial import BuildCheckRequest, BuildCheckResponse
from ..services import spatial_service, diagnosis_service, parcel_service

router = APIRouter(prefix="/api/spatial", tags=["spatial"])


@router.post("/build-check", response_model=BuildCheckResponse)
async def build_check(request: BuildCheckRequest):
    """Perform spatial validation of proposed building against parcel boundary.
    
    Accepts:
        - parcel_id: ID of the reference parcel
        - house_geometry: GeoJSON Polygon of proposed building
    
    Returns:
        - result: CLEAR, BOUNDARY_VARIANCE, or POTENTIAL_BUILDING_ENCROACHMENT
        - metrics: area calculations and percentages
        - boundary_status: source and authority of parcel boundary
    
    Errors:
        - MISSING_PARCEL: Parcel not found
        - INVALID_GEOMETRY: House geometry is invalid
        - INSUFFICIENT_SPATIAL_DATA: Required data missing
    """
    try:
        # Validate input
        if not request.parcel_id or not request.house_geometry:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "INSUFFICIENT_SPATIAL_DATA",
                    "message": "parcel_id and house_geometry are required"
                }
            )
        
        # Load parcel data
        parcel_feature = parcel_service.load_parcel(request.parcel_id)
        if not parcel_feature:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "MISSING_PARCEL",
                    "message": f"Parcel {request.parcel_id} not found"
                }
            )
        
        # Validate house geometry
        is_valid, error_msg = spatial_service.validate_polygon_geometry(request.house_geometry)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "INVALID_GEOMETRY",
                    "message": error_msg or "The proposed building polygon is invalid"
                }
            )
        
        # Extract parcel geometry and metadata
        parcel_geometry = parcel_feature.get('geometry')
        parcel_properties = parcel_feature.get('properties', {})
        
        if not parcel_geometry:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "INSUFFICIENT_SPATIAL_DATA",
                    "message": "Parcel has no geometry"
                }
            )
        
        # Validate parcel geometry
        is_valid, error_msg = spatial_service.validate_polygon_geometry(parcel_geometry)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "INSUFFICIENT_SPATIAL_DATA",
                    "message": f"Parcel geometry is invalid: {error_msg}"
                }
            )
        
        # Calculate spatial metrics
        metrics = spatial_service.calculate_metrics(parcel_geometry, request.house_geometry)
        
        # Determine result state
        tolerance_m2 = float(os.getenv('SPATIAL_TOLERANCE_M2', '0.5'))
        result_state = diagnosis_service.diagnose_result(metrics, tolerance_m2)
        
        # Get boundary status
        boundary_status = parcel_properties.get('boundary_status', 'UNKNOWN')
        
        return BuildCheckResponse(
            success=True,
            result=result_state,
            metrics={
                'house_area_m2': metrics['house_area_m2'],
                'outside_area_m2': metrics['outside_area_m2'],
                'outside_percentage': metrics['outside_percentage']
            },
            boundary_status=boundary_status
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "PROCESSING_ERROR",
                "message": str(e)
            }
        )
