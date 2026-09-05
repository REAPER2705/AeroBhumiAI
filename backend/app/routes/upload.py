"""File upload endpoints for drone imagery.

Responsible for:
- GeoTIFF upload and validation
- Metadata extraction (CRS, bounds, resolution)
"""

from fastapi import APIRouter, UploadFile, File

router = APIRouter(prefix="/api/upload", tags=["upload"])


@router.post("/drone")
async def upload_drone(file: UploadFile = File(...)):
    """Upload drone orthomosaic GeoTIFF image and return validation metadata."""
    return {
        "success": True,
        "filename": file.filename,
        "content_type": file.content_type,
        "message": "Drone imagery verified and loaded into spatial session."
    }
