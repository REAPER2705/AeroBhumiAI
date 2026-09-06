"""Report generation endpoints.

Responsible for:
- PDF report generation
- Report template rendering
- Audit record association
"""

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse
from typing import Dict, Any
from pydantic import BaseModel

from ..services import report_service

router = APIRouter(prefix="/api/reports", tags=["reports"])


class GenerateReportRequest(BaseModel):
    """Request schema for report generation."""
    audit_id: str


@router.post("/generate")
async def generate_report(request: GenerateReportRequest):
    """Generate PDF audit report for completed audit.
    
    Args:
        request: GenerateReportRequest with audit_id
    
    Returns:
        JSON response with report information (file download or report data)
    
    Errors:
        - INVALID_AUDIT_ID: Audit ID missing or invalid
        - REPORT_GENERATION_ERROR: Error during report generation
    """
    try:
        # Validate input
        if not request.audit_id or not isinstance(request.audit_id, str):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "INVALID_AUDIT_ID",
                    "message": "audit_id is required"
                }
            )
        
        # Generate report
        try:
            report_result = report_service.generate_audit_report(request.audit_id)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "code": "REPORT_GENERATION_ERROR",
                    "message": f"Error generating report: {str(e)}"
                }
            )
        
        # Return report information
        return JSONResponse(
            status_code=200,
            content={
                'success': report_result.get('success', False),
                'report_id': report_result.get('report_id', ''),
                'audit_id': report_result.get('audit_id', ''),
                'generated_at': report_result.get('generated_at', ''),
                'download_url': f"/api/reports/{report_result.get('report_id', '')}/download"
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "PROCESSING_ERROR",
                "message": f"Error processing report request: {str(e)}"
            }
        )
