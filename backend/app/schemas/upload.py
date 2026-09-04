"""Upload endpoint schemas.

Response shape matches the API_UI_SPEC.md §3 Drone Upload contract exactly.
"""

from pydantic import BaseModel
from typing import List


class DroneUploadResponse(BaseModel):
    """Successful response for POST /api/upload/drone."""
    success: bool
    file_id: str
    filename: str
    crs: str
    bounds: List[float]       # [left, bottom, right, top] in CRS units
    resolution: List[float]   # [x_res, y_res] pixel size in CRS units


class UploadErrorDetail(BaseModel):
    """Standard error detail sub-object (matches API_UI_SPEC.md §9)."""
    code: str
    message: str


class UploadErrorResponse(BaseModel):
    """Error response for POST /api/upload/drone."""
    success: bool = False
    error: UploadErrorDetail
