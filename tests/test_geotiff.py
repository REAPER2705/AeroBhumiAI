"""GeoTIFF handling tests.

All synthetic GeoTIFFs are created in-process using rasterio + numpy so
no external sample files are required.

Test coverage:
- Valid GeoTIFF loading (validate + extract_metadata)
- Invalid file handling (garbage bytes)
- Missing CRS (valid raster structure but no georeferencing)
- Unsupported / non-raster format (plain .txt masquerading as .tif)
- Missing imagery (path that does not exist)
"""

import os
import sys
import tempfile
from pathlib import Path

import numpy as np
import pytest
import rasterio
from rasterio.crs import CRS
from rasterio.transform import from_bounds

# ---------------------------------------------------------------------------
# Path setup — make backend importable
# ---------------------------------------------------------------------------
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from app.services.geotiff_service import validate_geotiff, extract_metadata


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_valid_geotiff(path: str, crs=CRS.from_epsg(32643)) -> None:
    """Write a minimal valid 10×10 single-band GeoTIFF to *path*."""
    transform = from_bounds(500000, 2800000, 500100, 2800100, 10, 10)
    with rasterio.open(
        path, "w",
        driver="GTiff",
        height=10, width=10,
        count=1, dtype="uint8",
        crs=crs,
        transform=transform,
    ) as ds:
        ds.write(np.zeros((1, 10, 10), dtype="uint8"))


def _make_no_crs_geotiff(path: str) -> None:
    """Write a valid 10×10 GeoTIFF with NO CRS to *path*."""
    transform = from_bounds(500000, 2800000, 500100, 2800100, 10, 10)
    with rasterio.open(
        path, "w",
        driver="GTiff",
        height=10, width=10,
        count=1, dtype="uint8",
        # intentionally omit crs=
        transform=transform,
    ) as ds:
        ds.write(np.zeros((1, 10, 10), dtype="uint8"))


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_valid_geotiff_loading():
    """validate_geotiff returns (True, '') and extract_metadata returns correct
    structure for a well-formed, georeferenced GeoTIFF."""
    with tempfile.NamedTemporaryFile(suffix=".tif", delete=False) as f:
        tmp = f.name
    try:
        _make_valid_geotiff(tmp)

        # --- validate ---
        is_valid, error = validate_geotiff(tmp)
        assert is_valid is True, f"Expected valid, got error: {error}"
        assert error == ""

        # --- extract_metadata ---
        meta = extract_metadata(tmp)

        # CRS
        assert meta["crs"] == "EPSG:32643"

        # Bounds — [left, bottom, right, top], all finite, extent > 0
        bounds = meta["bounds"]
        assert len(bounds) == 4
        assert bounds[2] > bounds[0], "right must be > left"
        assert bounds[3] > bounds[1], "top must be > bottom"

        # Resolution — two positive floats
        res = meta["resolution"]
        assert len(res) == 2
        assert res[0] > 0 and res[1] > 0

        # Transform — 6 affine coefficients
        assert len(meta["transform"]) == 6

        # Dimensions
        assert meta["width"] == 10
        assert meta["height"] == 10
        assert meta["band_count"] == 1

    finally:
        os.unlink(tmp)


def test_invalid_geotiff_file():
    """validate_geotiff returns (False, non-empty message) when the file
    contains garbage bytes and is not a recognisable raster format.
    It must not raise an exception."""
    with tempfile.NamedTemporaryFile(suffix=".tif", delete=False) as f:
        f.write(b"this is definitely not a GeoTIFF \x00\xff\xfe\xfd")
        tmp = f.name
    try:
        is_valid, error = validate_geotiff(tmp)
        assert is_valid is False
        assert len(error) > 0, "Error message must not be empty"
    finally:
        os.unlink(tmp)


def test_missing_crs():
    """validate_geotiff returns (False, ...) when the raster has no CRS.
    extract_metadata must raise ValueError for the same file.
    Per spec: georeferencing is required — missing CRS is a hard failure."""
    with tempfile.NamedTemporaryFile(suffix=".tif", delete=False) as f:
        tmp = f.name
    try:
        _make_no_crs_geotiff(tmp)

        # validate must reject
        is_valid, error = validate_geotiff(tmp)
        assert is_valid is False
        assert len(error) > 0
        # error message should mention CRS / georeferencing
        assert any(kw in error.lower() for kw in ("crs", "georeference", "georeferencing"))

        # extract_metadata must also raise
        with pytest.raises(ValueError, match="CRS"):
            extract_metadata(tmp)

    finally:
        os.unlink(tmp)


def test_unsupported_raster():
    """validate_geotiff returns (False, ...) for a plain text file with a
    .tif extension — any non-raster content must be caught gracefully."""
    with tempfile.NamedTemporaryFile(
        suffix=".tif", delete=False, mode="w"
    ) as f:
        f.write("I am a text file, not a raster.\n")
        tmp = f.name
    try:
        is_valid, error = validate_geotiff(tmp)
        assert is_valid is False
        assert len(error) > 0
    finally:
        os.unlink(tmp)


def test_missing_imagery():
    """Both validate_geotiff and extract_metadata must handle a path that
    does not exist at all — no crash, clear error."""
    nonexistent = "/tmp/does_not_exist_aerobhumi_test.tif"
    # Guarantee it really doesn't exist
    if os.path.exists(nonexistent):
        os.unlink(nonexistent)

    # validate_geotiff → (False, message), not an exception
    is_valid, error = validate_geotiff(nonexistent)
    assert is_valid is False
    assert len(error) > 0
    assert "not found" in error.lower() or nonexistent in error

    # extract_metadata → FileNotFoundError
    with pytest.raises(FileNotFoundError):
        extract_metadata(nonexistent)
