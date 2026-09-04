"""Audit analysis and result generation endpoints.

Responsible for:
- Orchestrating diagnosis → resolution → AI explanation pipeline
- Persisting full audit records to data/audits/{audit_id}.json
- Returning AuditAnalysisResponse per schemas/audit.py

This route contains orchestration only:
  - Geometry/area calculations  → spatial_service   (Arohi)
  - Result classification        → diagnosis_service
  - Actionable recommendations   → resolution_service
  - Plain-language explanation   → ai_service
"""

import json
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, HTTPException, status

from ..schemas.audit import (
    AuditAnalysisRequest,
    AuditAnalysisResponse,
    DiagnosisResult,
    ResolutionGuidance,
)
from ..services import ai_service, diagnosis_service, resolution_service
from ..services.ai_service import AIServiceError
from ..services.diagnosis_service import DiagnosisError

router = APIRouter(prefix="/api/audit", tags=["audit"])

# Resolve data/audits/ relative to this file so it works regardless of cwd.
_PROJECT_ROOT = os.path.normpath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..")
)
_AUDITS_DIR = os.path.join(_PROJECT_ROOT, "data", "audits")


def _save_audit_record(audit_id: str, record: Dict[str, Any]) -> str:
    """Persist *record* as JSON to data/audits/{audit_id}.json.

    Returns the absolute path of the saved file.
    """
    os.makedirs(_AUDITS_DIR, exist_ok=True)
    path = os.path.join(_AUDITS_DIR, f"{audit_id}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(record, f, indent=2, ensure_ascii=False, default=str)
    return path


@router.post(
    "/analyze",
    response_model=AuditAnalysisResponse,
    responses={
        400: {"description": "Insufficient or invalid spatial data"},
        422: {"description": "Request body validation error"},
        500: {"description": "Internal processing error"},
    },
)
async def audit_analyze(request: AuditAnalysisRequest):
    """Generate AI-driven explanation and recommendations for a build check result.

    Accepts the spatial metrics produced by POST /api/spatial/build-check
    (or equivalent GIS output) and runs the full diagnosis → resolution →
    explanation pipeline.

    Flow:
    1. Validate the incoming build_check metrics dict has required fields.
    2. Call diagnosis_service.diagnose_result() → full diagnosis dict.
    3. Call resolution_service.get_resolution_guidance(diagnosis) → resolution.
    4. Call ai_service.explain_result(diagnosis) → plain-language explanation.
    5. Generate audit_id and persist a complete JSON audit record to
       data/audits/{audit_id}.json.
    6. Return AuditAnalysisResponse populated from all three service outputs.

    Error codes:
        INSUFFICIENT_SPATIAL_DATA  — build_check is missing required metric keys
        AI_SERVICE_ERROR           — ai_service raised AIServiceError
        PROCESSING_ERROR           — any other unexpected error
    """
    try:
        build_check: Dict[str, Any] = request.build_check

        # --- 1. Validate required metric keys are present ---
        required_keys = ("house_area_m2", "outside_area_m2", "outside_percentage")
        missing = [k for k in required_keys if k not in build_check]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "INSUFFICIENT_SPATIAL_DATA",
                    "message": (
                        f"build_check is missing required metric(s): "
                        f"{', '.join(missing)}"
                    ),
                },
            )

        # --- 2. Diagnose ---
        tolerance_m2 = float(os.getenv("SPATIAL_TOLERANCE_M2", "0.5"))
        try:
            diagnosis = diagnosis_service.diagnose_result(build_check, tolerance_m2)
        except DiagnosisError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "INSUFFICIENT_SPATIAL_DATA",
                    "message": str(exc),
                },
            )

        # --- 3. Resolution guidance ---
        resolution = resolution_service.get_resolution_guidance(diagnosis)

        # --- 4. AI explanation ---
        try:
            explanation = ai_service.explain_result(diagnosis)
        except AIServiceError as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "code": "AI_SERVICE_ERROR",
                    "message": str(exc),
                },
            )

        # --- 5. Persist audit record ---
        audit_id = "AUD-" + uuid.uuid4().hex[:8].upper()
        created_at = datetime.now(timezone.utc).isoformat()

        audit_record: Dict[str, Any] = {
            "audit_id": audit_id,
            "parcel_id": request.parcel_id,
            "created_at": created_at,
            # Full metrics dict as received — includes Arohi's supplementary keys
            # (iou, boundary_deviation_m, affected_side, road_overlap,
            #  neighbor_overlap, etc.) if the caller supplied them.
            "metrics": build_check,
            "diagnosis": diagnosis,
            "resolution": resolution,
            "explanation": explanation,
        }

        _save_audit_record(audit_id, audit_record)

        # --- 6. Build response ---
        return AuditAnalysisResponse(
            success=True,
            result=diagnosis["result"],
            summary=explanation["summary"],
            problem=explanation["problem"],
            recommended_action=explanation["recommended_action"],
            verification_note=explanation.get("verification_note"),
            diagnosis=DiagnosisResult(
                result=diagnosis["result"],
                reason=diagnosis["reason"],
                priority=diagnosis["priority"],
                affected_area_m2=float(diagnosis["affected_area_m2"]),
                outside_percentage=float(diagnosis["outside_percentage"]),
                house_area_m2=float(diagnosis["house_area_m2"]),
                has_conflict=bool(diagnosis["has_conflict"]),
                tolerance_m2=float(diagnosis["tolerance_m2"]),
                evidence=diagnosis["evidence"],
            ),
            resolution=ResolutionGuidance(
                diagnosis_result=resolution["diagnosis_result"],
                diagnosis_reason=resolution["diagnosis_reason"],
                diagnosis_evidence=resolution["diagnosis_evidence"],
                affected_area_m2=float(resolution["affected_area_m2"]),
                outside_percentage=float(resolution["outside_percentage"]),
                priority=resolution["priority"],
                recommended_action=resolution["recommended_action"],
                action_description=resolution["action_description"],
                next_steps=resolution["next_steps"],
                verification_required=bool(resolution["verification_required"]),
                affected_boundary=resolution.get("affected_boundary"),
                legal_note=resolution["legal_note"],
            ),
        )

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "PROCESSING_ERROR",
                "message": str(exc),
            },
        )
