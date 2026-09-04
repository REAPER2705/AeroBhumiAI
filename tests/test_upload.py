"""Upload route tests.

Tests the POST /api/upload/drone route function DIRECTLY — without going
through FastAPI's TestClient — because the current venv has an
httpx==0.28.x / starlette==0.27.x version conflict that makes
TestClient(app) raise TypeError at instantiation time.

Full HTTP-level integration testing (TestClient) is BLOCKED until the
team resolves the fastapi/httpx version conflict in the shared environment.
That is a tracked environment issue, not something these tests need to solve.

Strategy:
  - Import the async `upload_drone` coroutine directly from routes/upload.py.
  - Construct a fastapi.UploadFile wrapping an io.BytesIO of known bytes.
  - Drive each call with asyncio.run() — no pytest-asyncio dependency needed.
  - Assert on the returned Pydantic model or JSONResponse content dict directly.

GeoTIFF fixtures are generated in-process with rasterio (same pattern as
tests/test_geotiff.py) so no external sample files are required.
"""

import asyncio
import io
import os
import sys
import tempfile
from pathlib import Path

import numpy as np
import pytest
import rasterio
from fastapi import UploadFile
from fastapi.responses import JSONResponse
from rasterio.crs import CRS
from rasterio.transform import from_bounds

# ---------------------------------------------------------------------------
# Path setup — make backend importable
# ---------------------------------------------------------------------------
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from app.routes.upload import upload_drone, _IMAGES_DIR


# ---------------------------------------------------------------------------
# GeoTIFF byte-generators (identical pattern to test_geotiff.py)
# ---------------------------------------------------------------------------

def _valid_geotiff_bytes(crs: CRS = CRS.from_epsg(32643)) -> bytes:
    """Return bytes of a minimal valid 10×10 single-band GeoTIFF."""
    transform = from_bounds(500000, 2800000, 500100, 2800100, 10, 10)
    buf = io.BytesIO()
    with rasterio.open(
        buf, "w",
        driver="GTiff",
        height=10, width=10,
        count=1, dtype="uint8",
        crs=crs,
        transform=transform,
    ) as ds:
        ds.write(np.zeros((1, 10, 10), dtype="uint8"))
    return buf.getvalue()


def _no_crs_geotiff_bytes() -> bytes:
    """Return bytes of a valid raster with NO CRS."""
    transform = from_bounds(500000, 2800000, 500100, 2800100, 10, 10)
    buf = io.BytesIO()
    with rasterio.open(
        buf, "w",
        driver="GTiff",
        height=10, width=10,
        count=1, dtype="uint8",
        transform=transform,
        # intentionally no crs=
    ) as ds:
        ds.write(np.zeros((1, 10, 10), dtype="uint8"))
    return buf.getvalue()


def _garbage_bytes() -> bytes:
    """Return bytes that are definitely not a valid raster."""
    return b"this is not a GeoTIFF \x00\xff\xfe\xfd" * 4


# ---------------------------------------------------------------------------
# Helper: build a fake UploadFile from raw bytes
# ---------------------------------------------------------------------------

def _make_upload_file(data: bytes, filename: str = "test.tif") -> UploadFile:
    """Wrap *data* in a BytesIO and return a fastapi.UploadFile instance."""
    buf = io.BytesIO(data)
    return UploadFile(file=buf, filename=filename, size=len(data))


# ---------------------------------------------------------------------------
# Helper: collect all file_ids currently in data/images/
# ---------------------------------------------------------------------------

def _images_dir_files() -> set:
    if not os.path.isdir(_IMAGES_DIR):
        return set()
    return {f for f in os.listdir(_IMAGES_DIR) if f != ".gitkeep"}


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestUploadDroneValid:
    """Valid GeoTIFF upload — happy path."""

    def test_valid_geotiff_returns_success_true(self):
        """Route must return success=True and a file_id for a valid GeoTIFF."""
        fake_file = _make_upload_file(_valid_geotiff_bytes(), "drone_001.tif")
        result = asyncio.run(upload_drone(file=fake_file))

        # Should be a DroneUploadResponse (Pydantic model), not a JSONResponse
        assert not isinstance(result, JSONResponse), (
            f"Expected DroneUploadResponse, got JSONResponse: {result.body}"
        )
        assert result.success is True

    def test_valid_geotiff_file_id_format(self):
        """file_id must start with 'IMG-'."""
        fake_file = _make_upload_file(_valid_geotiff_bytes(), "drone_001.tif")
        result = asyncio.run(upload_drone(file=fake_file))
        assert result.file_id.startswith("IMG-")

    def test_valid_geotiff_filename_preserved(self):
        """Original filename must be echoed back in the response."""
        fake_file = _make_upload_file(_valid_geotiff_bytes(), "drone_001.tif")
        result = asyncio.run(upload_drone(file=fake_file))
        assert result.filename == "drone_001.tif"

    def test_valid_geotiff_crs_correct(self):
        """CRS in response must match the CRS written into the test file."""
        fake_file = _make_upload_file(_valid_geotiff_bytes(CRS.from_epsg(32643)), "test.tif")
        result = asyncio.run(upload_drone(file=fake_file))
        assert result.crs == "EPSG:32643"

    def test_valid_geotiff_bounds_shape(self):
        """bounds must be a 4-element list with right > left and top > bottom."""
        fake_file = _make_upload_file(_valid_geotiff_bytes(), "test.tif")
        result = asyncio.run(upload_drone(file=fake_file))
        assert len(result.bounds) == 4
        left, bottom, right, top = result.bounds
        assert right > left
        assert top > bottom

    def test_valid_geotiff_resolution_shape(self):
        """resolution must be a 2-element list of positive floats."""
        fake_file = _make_upload_file(_valid_geotiff_bytes(), "test.tif")
        result = asyncio.run(upload_drone(file=fake_file))
        assert len(result.resolution) == 2
        assert result.resolution[0] > 0
        assert result.resolution[1] > 0

    def test_valid_geotiff_file_saved_to_disk(self):
        """The uploaded file must actually be persisted under data/images/."""
        files_before = _images_dir_files()
        fake_file = _make_upload_file(_valid_geotiff_bytes(), "test.tif")
        result = asyncio.run(upload_drone(file=fake_file))
        files_after = _images_dir_files()

        new_files = files_after - files_before
        assert len(new_files) == 1
        saved_name = new_files.pop()
        assert saved_name == f"{result.file_id}.tif"

        # Tidy up
        os.remove(os.path.join(_IMAGES_DIR, saved_name))


class TestUploadDroneInvalid:
    """Invalid file upload — garbage bytes."""

    def test_invalid_file_returns_json_response(self):
        """Route must return a JSONResponse (error shape) for garbage bytes."""
        fake_file = _make_upload_file(_garbage_bytes(), "bad.tif")
        result = asyncio.run(upload_drone(file=fake_file))
        assert isinstance(result, JSONResponse)

    def test_invalid_file_success_false(self):
        """Response body must have success=False."""
        fake_file = _make_upload_file(_garbage_bytes(), "bad.tif")
        result = asyncio.run(upload_drone(file=fake_file))
        body = result.body
        import json
        data = json.loads(body)
        assert data["success"] is False

    def test_invalid_file_error_code_present(self):
        """Response body must contain error.code."""
        fake_file = _make_upload_file(_garbage_bytes(), "bad.tif")
        result = asyncio.run(upload_drone(file=fake_file))
        import json
        data = json.loads(result.body)
        assert "error" in data
        assert "code" in data["error"]
        assert data["error"]["code"] == "INVALID_GEOTIFF"

    def test_invalid_file_not_left_on_disk(self):
        """Invalid upload must NOT leave a file behind in data/images/."""
        files_before = _images_dir_files()
        fake_file = _make_upload_file(_garbage_bytes(), "bad.tif")
        asyncio.run(upload_drone(file=fake_file))
        files_after = _images_dir_files()
        assert files_after == files_before, (
            f"Orphaned files left behind: {files_after - files_before}"
        )


class TestUploadDroneMissingCRS:
    """Valid raster but no georeferencing — missing CRS."""

    def test_missing_crs_returns_json_response(self):
        """Route must return a JSONResponse for a raster without CRS."""
        fake_file = _make_upload_file(_no_crs_geotiff_bytes(), "no_crs.tif")
        result = asyncio.run(upload_drone(file=fake_file))
        assert isinstance(result, JSONResponse)

    def test_missing_crs_success_false(self):
        """Response body must have success=False."""
        import json
        fake_file = _make_upload_file(_no_crs_geotiff_bytes(), "no_crs.tif")
        result = asyncio.run(upload_drone(file=fake_file))
        data = json.loads(result.body)
        assert data["success"] is False

    def test_missing_crs_error_code_is_missing_crs(self):
        """error.code must be 'MISSING_CRS' specifically — not the generic code."""
        import json
        fake_file = _make_upload_file(_no_crs_geotiff_bytes(), "no_crs.tif")
        result = asyncio.run(upload_drone(file=fake_file))
        data = json.loads(result.body)
        assert data["error"]["code"] == "MISSING_CRS"

    def test_missing_crs_file_not_left_on_disk(self):
        """Missing-CRS upload must NOT leave a file behind in data/images/."""
        files_before = _images_dir_files()
        fake_file = _make_upload_file(_no_crs_geotiff_bytes(), "no_crs.tif")
        asyncio.run(upload_drone(file=fake_file))
        files_after = _images_dir_files()
        assert files_after == files_before, (
            f"Orphaned files left behind: {files_after - files_before}"
        )
