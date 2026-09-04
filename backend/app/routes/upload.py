"""File upload endpoints for drone imagery.

Responsible for:
- Accepting a GeoTIFF upload via multipart/form-data
- Persisting the file to data/images/
- Delegating validation and metadata extraction to geotiff_service
- Returning a structured response per API_UI_SPEC.md §3

This route contains orchestration only — no GeoTIFF logic lives here.
All raster work is in backend/app/services/geotiff_service.py.
"""

import os
import uuid

from fastapi import APIRouter, HTTPException, UploadFile, File, status
from fastapi.responses import JSONResponse

from ..schemas.upload import DroneUploadResponse, UploadErrorDetail
from ..services import geotiff_service

router = APIRouter(prefix="/api/upload", tags=["upload"])

# Path is relative to the project root (AeroBhumiAI/).
# Resolved to absolute at startup so the route works regardless of cwd.
_PROJECT_ROOT = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "..")
)
_IMAGES_DIR = os.path.join(_PROJECT_ROOT, "data", "images")


@router.post(
    "/drone",
    response_model=DroneUploadResponse,
    responses={
        400: {"description": "Invalid or non-georeferenced GeoTIFF"},
        422: {"description": "No file provided"},
    },
)
async def upload_drone(file: UploadFile = File(...)):
    """Upload a drone orthomosaic GeoTIFF.

    Multipart/form-data field: ``file``

    Flow:
    1. Generate a unique file_id (``IMG-<uuid8>``).
    2. Save the upload to ``data/images/{file_id}.tif``.
    3. Validate via geotiff_service.validate_geotiff().
       - On failure: delete the saved file and return an error response.
    4. Extract metadata via geotiff_service.extract_metadata().
    5. Return the spec-mandated response shape.

    Error codes returned in the ``error.code`` field:
    - ``INVALID_GEOTIFF``  — file is not a valid raster
    - ``MISSING_CRS``      — raster is valid but has no georeferencing
    """
    # --- 1. Generate file_id and resolve save path ---
    file_id = "IMG-" + uuid.uuid4().hex[:8].upper()
    os.makedirs(_IMAGES_DIR, exist_ok=True)
    saved_path = os.path.join(_IMAGES_DIR, f"{file_id}.tif")

    # --- 2. Save uploaded bytes to disk ---
    try:
        contents = await file.read()
        with open(saved_path, "wb") as f:
            f.write(contents)
    except Exception as exc:
        # Tidy up any partial write before surfacing the error
        _safe_delete(saved_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "UPLOAD_FAILED", "message": str(exc)},
        )

    # --- 3. Validate ---
    is_valid, error_message = geotiff_service.validate_geotiff(saved_path)
    if not is_valid:
        _safe_delete(saved_path)

        # Map the validation message to the most specific error code
        msg_lower = error_message.lower()
        if "crs" in msg_lower or "georeference" in msg_lower:
            code = "MISSING_CRS"
        else:
            code = "INVALID_GEOTIFF"

        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "success": False,
                "error": {"code": code, "message": error_message},
            },
        )

    # --- 4. Extract metadata (will not fail — validate_geotiff already passed) ---
    try:
        meta = geotiff_service.extract_metadata(saved_path)
    except Exception as exc:
        _safe_delete(saved_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "METADATA_EXTRACTION_FAILED", "message": str(exc)},
        )

    # --- 5. Return spec-mandated response ---
    return DroneUploadResponse(
        success=True,
        file_id=file_id,
        filename=file.filename or f"{file_id}.tif",
        crs=meta["crs"],
        bounds=meta["bounds"],
        resolution=meta["resolution"],
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _safe_delete(path: str) -> None:
    """Delete a file if it exists, silently ignoring errors."""
    try:
        if os.path.exists(path):
            os.remove(path)
    except OSError:
        pass
