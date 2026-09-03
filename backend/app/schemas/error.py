"""Error response schemas."""

from pydantic import BaseModel
from typing import Optional


class ErrorResponse(BaseModel):
    """Standard error response schema."""
    success: bool = False
    error: dict
    
    class Config:
        schema_extra = {
            "example": {
                "success": False,
                "error": {
                    "code": "INVALID_GEOMETRY",
                    "message": "The proposed building polygon is invalid."
                }
            }
        }
