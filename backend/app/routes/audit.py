"""Audit analysis and result generation endpoints.

Responsible for:
- AI-driven explanation generation
- Recommendation generation
- Audit record creation
- Full orchestration of spatial→diagnosis→resolution→AI pipeline
"""

from fastapi import APIRouter, HTTPException, status
import os
from typing import Dict, Any
import uuid

from ..schemas.audit import AuditAnalysisRequest, AuditAnalysisResponse, DiagnosisResult, ResolutionGuidance
from ..services import parcel_service, spatial_service, diagnosis_service, resolution_service, ai_service

router = APIRouter(prefix="/api/audit", tags=["audit"])


@router.post("/analyze", response_model=AuditAnalysisResponse)
async def audit_analyze(request: AuditAnalysisRequest):
    """Generate AI-driven audit analysis for a build check result.
    
    This endpoint orchestrates the complete audit pipeline:
    1. Load parcel data
    2. Extract build-check metrics
    3. Run diagnosis service (deterministic classification)
    4. Run resolution service (get recommendations)
    5. Call AI service for explanation
    6. Return complete audit response
    
    Args:
        request: AuditAnalysisRequest with parcel_id and build_check data
    
    Returns:
        Complete audit analysis response with diagnosis, resolution, and AI explanation
    
    Errors:
        - PARCEL_NOT_FOUND: Parcel ID not found
        - INVALID_BUILD_CHECK: Build check data invalid/incomplete
        - PROCESSING_ERROR: Error during audit processing
    """
    try:
        # Validate inputs
        if not request.parcel_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "INVALID_BUILD_CHECK",
                    "message": "parcel_id is required"
                }
            )
        
        if not request.build_check or not isinstance(request.build_check, dict):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "INVALID_BUILD_CHECK",
                    "message": "build_check data is required"
                }
            )
        
        # Load parcel to validate it exists
        parcel_feature = parcel_service.load_parcel(request.parcel_id)
        if not parcel_feature:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "PARCEL_NOT_FOUND",
                    "message": f"Parcel {request.parcel_id} not found"
                }
            )
        
        # Extract metrics from build_check result
        # build_check is from spatial/build-check endpoint and contains:
        # - result: CLEAR, BOUNDARY_VARIANCE, or POTENTIAL_BUILDING_ENCROACHMENT
        # - metrics: {house_area_m2, outside_area_m2, outside_percentage}
        metrics = request.build_check.get('metrics', {})
        
        if not metrics:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "INVALID_BUILD_CHECK",
                    "message": "build_check must contain metrics"
                }
            )
        
        # Step 1: Run diagnosis service (deterministic classification)
        try:
            tolerance_m2 = float(os.getenv('SPATIAL_TOLERANCE_M2', '0.5'))
            diagnosis = diagnosis_service.diagnose_result(metrics, tolerance_m2)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "DIAGNOSIS_ERROR",
                    "message": f"Error running diagnosis: {str(e)}"
                }
            )
        
        # Step 2: Run resolution service (get recommendations)
        try:
            resolution = resolution_service.get_resolution_guidance(diagnosis)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "RESOLUTION_ERROR",
                    "message": f"Error generating resolution: {str(e)}"
                }
            )
        
        # Step 3: Call AI service for explanation
        try:
            ai_result = ai_service.explain_result(diagnosis, resolution)
        except Exception as e:
            # If AI fails, create a safe fallback
            ai_result = {
                'summary': diagnosis.get('reason', 'Analysis complete'),
                'problem': diagnosis.get('reason', ''),
                'recommended_action': resolution.get('recommended_action', ''),
                'verification_note': 'Unable to generate AI explanation at this time',
                'ai_explanation': diagnosis.get('reason', ''),
                'llm_used': False
            }
        
        # Step 4: Generate audit ID
        audit_id = f"AUD-{uuid.uuid4().hex[:8].upper()}"
        
        # Step 5: Build complete response
        return AuditAnalysisResponse(
            success=True,
            result=diagnosis.get('result', ''),
            summary=ai_result.get('summary', ''),
            problem=ai_result.get('problem', ''),
            recommended_action=ai_result.get('recommended_action', ''),
            verification_note=ai_result.get('verification_note'),
            diagnosis=DiagnosisResult(
                result=diagnosis.get('result'),
                reason=diagnosis.get('reason'),
                priority=diagnosis.get('priority'),
                affected_area_m2=diagnosis.get('affected_area_m2', 0),
                outside_percentage=diagnosis.get('outside_percentage', 0),
                house_area_m2=diagnosis.get('house_area_m2', 0),
                has_conflict=diagnosis.get('has_conflict', False),
                tolerance_m2=diagnosis.get('tolerance_m2', 0.5),
                evidence=diagnosis.get('evidence', [])
            ),
            resolution=ResolutionGuidance(
                diagnosis_result=resolution.get('diagnosis_result'),
                diagnosis_reason=resolution.get('diagnosis_reason'),
                diagnosis_evidence=resolution.get('diagnosis_evidence', []),
                affected_area_m2=resolution.get('affected_area_m2', 0),
                outside_percentage=resolution.get('outside_percentage', 0),
                priority=resolution.get('priority'),
                recommended_action=resolution.get('recommended_action'),
                action_description=resolution.get('action_description'),
                next_steps=resolution.get('next_steps', []),
                verification_required=resolution.get('verification_required', False),
                affected_boundary=resolution.get('affected_boundary'),
                legal_note=resolution.get('legal_note', '')
            )
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "PROCESSING_ERROR",
                "message": f"Error processing audit: {str(e)}"
            }
        )
