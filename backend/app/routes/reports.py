"""Report generation endpoints.

Responsible for:
- Accepting a report-generation request referencing an existing audit
- Delegating PDF rendering to report_service
- Returning a stable report_id for frontend reference

Spec (API_UI_SPEC.md §8):
    POST /api/reports/generate
    Input:  { "audit_id": "AUD-001" }
    Response: { "success": true, "report_id": "REP-001" }

No GET download endpoint is defined in the spec — not added here.
"""

import os
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from ..services import report_service
from ..services.report_service import ReportError

router = APIRouter(prefix="/api/reports", tags=["reports"])

# Derive project root the same way report_service does — 3 levels up from here.
_PROJECT_ROOT = os.path.normpath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..")
)
_REPORTS_DIR = os.path.join(_PROJECT_ROOT, "reports")


class GenerateReportRequest(BaseModel):
    """Request body for POST /api/reports/generate."""
    audit_id: str


class GenerateReportResponse(BaseModel):
    """Response for POST /api/reports/generate."""
    success: bool
    report_id: str


@router.post(
    "/generate",
    response_model=GenerateReportResponse,
    responses={
        404: {"description": "Audit record not found"},
        422: {"description": "Request body validation error"},
        500: {"description": "PDF generation error"},
    },
)
async def generate_report(request: GenerateReportRequest):
    """Generate a PDF audit report for an existing audit.

    Derives report_id from audit_id by replacing the 'AUD-' prefix with
    'REP-', preserving the unique suffix so the frontend has a stable
    download reference (e.g. AUD-A1B2C3D4 → REP-A1B2C3D4).

    Errors:
        AUDIT_NOT_FOUND   — audit_id does not exist in data/audits/
        REPORT_ERROR      — PDF generation failed for any other reason
    """
    try:
        pdf_path = report_service.generate_audit_report(request.audit_id)

        # Derive a stable report_id: AUD-XXXXXXXX → REP-XXXXXXXX
        report_id = request.audit_id.replace("AUD-", "REP-", 1)

        return GenerateReportResponse(success=True, report_id=report_id)

    except ReportError as exc:
        msg = str(exc)
        # Distinguish "not found" from other report errors for correct status code
        if "not found" in msg.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "AUDIT_NOT_FOUND", "message": msg},
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "REPORT_ERROR", "message": msg},
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "REPORT_ERROR", "message": str(exc)},
        )
