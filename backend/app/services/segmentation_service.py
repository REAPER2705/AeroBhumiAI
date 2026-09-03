"""Computer vision and segmentation service.

Responsibilities:
- Optional SAM 2 processing
- Image preprocessing
- Segmentation mask to polygon conversion
- Building/road detection

Note: SAM 2 is optional and must not block core functionality.
Core system works without segmentation.
"""


def run_sam2_segmentation(image_path: str):
    """Run SAM 2 segmentation on drone imagery."""
    pass


def convert_mask_to_polygon(mask_data):
    """Convert segmentation mask to GeoJSON polygon."""
    pass
