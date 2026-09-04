"""GeoTIFF processing service using rasterio.

Responsibilities:
- Validate GeoTIFF files (existence, parseable, georeferenced, non-degenerate)
- Extract CRS, bounds, resolution, transform, and band metadata

Design rules (from project spec):
- If georeferencing is missing or invalid the file MUST fail validation —
  never pretend imagery is correctly aligned.
- All failure cases return (False, clear_message) or raise ValueError with a
  clear message. Raw rasterio exceptions must not propagate to callers.
- Pure functions only — no FastAPI, no LLM calls.
"""

import os
from typing import Tuple

import rasterio


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def extract_metadata(file_path: str) -> dict:
    """Extract georeferencing and raster metadata from a GeoTIFF file.

    Args:
        file_path: Absolute or relative path to the GeoTIFF file.

    Returns:
        dict with keys:
            crs         (str)        — CRS authority string, e.g. "EPSG:32643"
            bounds      (list[float])— [left, bottom, right, top] in CRS units
            resolution  (list[float])— [x_res, y_res] pixel size in CRS units
            transform   (list[float])— 6 affine coefficients [a, b, c, d, e, f]
                                       matching the GDAL/rasterio convention
            width       (int)        — raster width in pixels
            height      (int)        — raster height in pixels
            band_count  (int)        — number of raster bands

    Raises:
        FileNotFoundError: if the file does not exist at file_path
        ValueError: if the file cannot be opened as a raster, or if CRS is
                    missing (georeferencing is required — spec constraint)
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"GeoTIFF file not found: {file_path}")

    try:
        with rasterio.open(file_path) as ds:
            crs = ds.crs
            if crs is None:
                raise ValueError(
                    f"GeoTIFF has no CRS — georeferencing is required: {file_path}"
                )

            bounds = ds.bounds          # BoundingBox(left, bottom, right, top)
            res = ds.res                # (x_res, y_res) — always positive
            transform = ds.transform   # Affine object

            return {
                "crs": str(crs),
                "bounds": [bounds.left, bounds.bottom, bounds.right, bounds.top],
                "resolution": [res[0], res[1]],
                # Affine stores [a, b, c, d, e, f] as the first 6 elements
                "transform": list(transform)[:6],
                "width": ds.width,
                "height": ds.height,
                "band_count": ds.count,
            }

    except (FileNotFoundError, ValueError):
        raise
    except rasterio.errors.RasterioIOError as e:
        raise ValueError(f"Cannot open file as a raster: {e}")
    except Exception as e:
        raise ValueError(f"Failed to extract GeoTIFF metadata: {e}")


def validate_geotiff(file_path: str) -> Tuple[bool, str]:
    """Validate a GeoTIFF file for use in the spatial pipeline.

    Checks (in order):
    1. File exists on disk.
    2. rasterio can open it as a valid raster.
    3. CRS is present (not None) — missing georeferencing is a hard failure.
    4. Bounds are non-degenerate (spatial extent has positive width and height).
    5. At least one band is present.

    Args:
        file_path: Absolute or relative path to the GeoTIFF file.

    Returns:
        (is_valid: bool, error_message: str)
        On success: (True, "")
        On failure: (False, human-readable reason)

    This function never raises — all failures are returned as (False, message).
    """
    if not os.path.exists(file_path):
        return False, f"File not found: {file_path}"

    try:
        with rasterio.open(file_path) as ds:

            # Check CRS — missing georeferencing is a hard failure per spec
            if ds.crs is None:
                return False, (
                    "GeoTIFF has no CRS — georeferencing is required for "
                    "spatial alignment"
                )

            # Check bounds are non-degenerate
            b = ds.bounds
            if (b.right - b.left) <= 0 or (b.top - b.bottom) <= 0:
                return False, (
                    f"GeoTIFF has degenerate bounds (zero or negative spatial "
                    f"extent): left={b.left}, right={b.right}, "
                    f"bottom={b.bottom}, top={b.top}"
                )

            # Check at least one band
            if ds.count < 1:
                return False, "GeoTIFF has no bands"

    except rasterio.errors.RasterioIOError as e:
        return False, f"File is not a valid raster: {e}"
    except Exception as e:
        return False, f"Failed to validate GeoTIFF: {e}"

    return True, ""
