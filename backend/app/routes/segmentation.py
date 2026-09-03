"""Computer vision and image segmentation endpoints.

Responsible for:
- SAM 2 processing orchestration
- Segmentation mask to polygon conversion
- Optional building/road detection
"""

from fastapi import APIRouter

router = APIRouter(prefix="/api/segmentation", tags=["segmentation"])


@router.post("/run")
async def run_segmentation(image_id: str):
    """Run SAM 2 segmentation on drone imagery (optional)."""
    pass
