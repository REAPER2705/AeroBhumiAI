"""API endpoint tests.

Test coverage:
- Health endpoints
- Parcel listing endpoint
- Parcel detail endpoint
- Parcel error handling
- Response structure validation
"""

import pytest
import sys
from pathlib import Path

# Add backend to path for imports
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app)


class TestHealthEndpoint:
    """Test health check endpoints."""
    
    def test_health_check(self):
        """Test /health returns 200."""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
    
    def test_api_health_check(self):
        """Test /api/health returns 200."""
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["status"] == "healthy"


class TestParcelListEndpoint:
    """Test GET /api/parcels endpoint."""
    
    def test_list_parcels_returns_200(self):
        """Test list parcels returns 200."""
        response = client.get("/api/parcels")
        assert response.status_code == 200
    
    def test_list_parcels_response_structure(self):
        """Test list parcels response has correct structure."""
        response = client.get("/api/parcels")
        assert response.status_code == 200
        data = response.json()
        
        # Check response structure
        assert "success" in data
        assert "parcels" in data
        assert data["success"] is True
        assert isinstance(data["parcels"], list)
    
    def test_list_parcels_contains_demo_parcel(self):
        """Test list parcels contains demo parcel P-001."""
        response = client.get("/api/parcels")
        assert response.status_code == 200
        data = response.json()
        
        parcel_ids = [p["parcel_id"] for p in data["parcels"]]
        assert "P-001" in parcel_ids
    
    def test_list_parcels_parcel_structure(self):
        """Test each parcel in list has required fields."""
        response = client.get("/api/parcels")
        assert response.status_code == 200
        data = response.json()
        
        for parcel in data["parcels"]:
            assert "parcel_id" in parcel
            assert "boundary_status" in parcel
            assert "source" in parcel
            assert "geometry" in parcel
            assert parcel["source"] == "DEMO_CADASTRAL_DATA"
            assert parcel["boundary_status"] == "REFERENCE_ONLY"
    
    def test_list_parcels_geometry_valid(self):
        """Test parcel geometry is valid."""
        response = client.get("/api/parcels")
        assert response.status_code == 200
        data = response.json()
        
        for parcel in data["parcels"]:
            geometry = parcel["geometry"]
            assert geometry["type"] in ["Polygon", "MultiPolygon"]
            assert "coordinates" in geometry
            assert len(geometry["coordinates"]) > 0


class TestParcelDetailEndpoint:
    """Test GET /api/parcels/{parcel_id} endpoint."""
    
    def test_get_existing_parcel_returns_200(self):
        """Test get existing parcel returns 200."""
        response = client.get("/api/parcels/P-001")
        assert response.status_code == 200
    
    def test_get_existing_parcel_response_structure(self):
        """Test get parcel response has correct structure."""
        response = client.get("/api/parcels/P-001")
        assert response.status_code == 200
        data = response.json()
        
        # Check response structure
        assert "success" in data
        assert "parcel" in data
        assert data["success"] is True
    
    def test_get_existing_parcel_contains_data(self):
        """Test get parcel returns correct parcel data."""
        response = client.get("/api/parcels/P-001")
        assert response.status_code == 200
        data = response.json()
        
        parcel = data["parcel"]
        assert parcel["parcel_id"] == "P-001"
        assert parcel["boundary_status"] == "REFERENCE_ONLY"
        assert parcel["source"] == "DEMO_CADASTRAL_DATA"
    
    def test_get_existing_parcel_has_geometry(self):
        """Test get parcel includes valid geometry."""
        response = client.get("/api/parcels/P-001")
        assert response.status_code == 200
        data = response.json()
        
        parcel = data["parcel"]
        assert "geometry" in parcel
        geometry = parcel["geometry"]
        assert geometry["type"] == "Polygon"
        assert "coordinates" in geometry
        assert len(geometry["coordinates"]) > 0
    
    def test_get_existing_parcel_has_area(self):
        """Test get parcel includes area."""
        response = client.get("/api/parcels/P-001")
        assert response.status_code == 200
        data = response.json()
        
        parcel = data["parcel"]
        assert "area" in parcel
        assert parcel["area"] is not None
        assert parcel["area"] > 0
    
    def test_get_nonexistent_parcel_returns_404(self):
        """Test get nonexistent parcel returns 404."""
        response = client.get("/api/parcels/P-NONEXISTENT")
        assert response.status_code == 404
    
    def test_get_nonexistent_parcel_error_structure(self):
        """Test 404 response has correct error structure."""
        response = client.get("/api/parcels/P-NONEXISTENT")
        assert response.status_code == 404
        data = response.json()
        
        # Check error structure
        assert "detail" in data
        assert "code" in data["detail"]
        assert "message" in data["detail"]
        assert data["detail"]["code"] == "PARCEL_NOT_FOUND"
    
    def test_get_another_demo_parcel(self):
        """Test get another demo parcel P-002."""
        response = client.get("/api/parcels/P-002")
        assert response.status_code == 200
        data = response.json()
        
        parcel = data["parcel"]
        assert parcel["parcel_id"] == "P-002"
        assert parcel["area"] == 2000


class TestBuildCheckEndpoint:
    """Test spatial build-check endpoint (Stage 3)."""
    
    @pytest.fixture
    def parcel_id(self):
        return "P-001"
    
    @pytest.fixture
    def valid_house_inside(self):
        """House completely inside parcel P-001."""
        return {
            "type": "Polygon",
            "coordinates": [
                [[28.502, -15.502], [28.505, -15.502], [28.505, -15.505], [28.502, -15.505], [28.502, -15.502]]
            ]
        }
    
    @pytest.fixture
    def valid_house_outside(self):
        """House partially outside parcel P-001."""
        return {
            "type": "Polygon",
            "coordinates": [
                [[28.505, -15.505], [28.515, -15.505], [28.515, -15.515], [28.505, -15.515], [28.505, -15.505]]
            ]
        }
    
    def test_build_check_house_inside_returns_clear(self, parcel_id, valid_house_inside):
        """Test build check returns CLEAR for house inside parcel."""
        response = client.post(
            "/api/spatial/build-check",
            json={
                "parcel_id": parcel_id,
                "house_geometry": valid_house_inside
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["result"] == "CLEAR"
        assert "metrics" in data
        assert "outside_area_m2" in data["metrics"]
    
    def test_build_check_house_outside_returns_encroachment(self, parcel_id, valid_house_outside):
        """Test build check returns POTENTIAL_BUILDING_ENCROACHMENT for house outside."""
        response = client.post(
            "/api/spatial/build-check",
            json={
                "parcel_id": parcel_id,
                "house_geometry": valid_house_outside
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["result"] == "POTENTIAL_BUILDING_ENCROACHMENT"
        assert data["metrics"]["outside_area_m2"] > 0
    
    def test_build_check_missing_parcel_returns_404(self, valid_house_inside):
        """Test build check with non-existent parcel returns 404."""
        response = client.post(
            "/api/spatial/build-check",
            json={
                "parcel_id": "P-NONEXISTENT",
                "house_geometry": valid_house_inside
            }
        )
        assert response.status_code == 404
        data = response.json()
        assert data["detail"]["code"] == "MISSING_PARCEL"
    
    def test_build_check_invalid_geometry(self, parcel_id):
        """Test build check with invalid geometry."""
        invalid_geometry = {
            "type": "Polygon",
            "coordinates": []  # Empty coordinates
        }
        response = client.post(
            "/api/spatial/build-check",
            json={
                "parcel_id": parcel_id,
                "house_geometry": invalid_geometry
            }
        )
        assert response.status_code == 400
        data = response.json()
        assert data["detail"]["code"] == "INVALID_GEOMETRY"
    
    def test_build_check_not_closed_polygon(self, parcel_id):
        """Test build check with polygon that is not closed."""
        invalid_geometry = {
            "type": "Polygon",
            "coordinates": [
                [[28.502, -15.502], [28.505, -15.502], [28.505, -15.505], [28.502, -15.505]]  # Not closed
            ]
        }
        response = client.post(
            "/api/spatial/build-check",
            json={
                "parcel_id": parcel_id,
                "house_geometry": invalid_geometry
            }
        )
        assert response.status_code == 400
        data = response.json()
        assert data["detail"]["code"] == "INVALID_GEOMETRY"
    
    def test_build_check_response_structure(self, parcel_id, valid_house_inside):
        """Test response has correct structure."""
        response = client.post(
            "/api/spatial/build-check",
            json={
                "parcel_id": parcel_id,
                "house_geometry": valid_house_inside
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert "success" in data
        assert "result" in data
        assert "metrics" in data
        assert "boundary_status" in data
        
        # Check metrics structure
        metrics = data["metrics"]
        assert "house_area_m2" in metrics
        assert "outside_area_m2" in metrics
        assert "outside_percentage" in metrics
        
        # Check result state is valid
        assert data["result"] in ["CLEAR", "BOUNDARY_VARIANCE", "POTENTIAL_BUILDING_ENCROACHMENT"]
        
        # Check boundary status
        assert data["boundary_status"] in ["AUTHORITATIVE", "REFERENCE_ONLY", "UNKNOWN"]
    
    def test_build_check_missing_parcel_id(self, valid_house_inside):
        """Test build check with missing parcel_id."""
        response = client.post(
            "/api/spatial/build-check",
            json={
                "house_geometry": valid_house_inside
            }
        )
        # Should fail validation
        assert response.status_code in [400, 422]
    
    def test_build_check_missing_geometry(self, parcel_id):
        """Test build check with missing house_geometry."""
        response = client.post(
            "/api/spatial/build-check",
            json={
                "parcel_id": parcel_id
            }
        )
        # Should fail validation
        assert response.status_code in [400, 422]


class TestAuditAnalyzeEndpoint:
    """Test POST /api/audit/analyze endpoint.

    Uses TestClient (now unblocked by the fastapi>=0.115.0 upgrade).
    Tests both a CLEAR case and an ENCROACHMENT case, and verify that
    the audit JSON file is written to data/audits/.
    """

    # Minimal valid build_check metric dicts — matching the keys
    # diagnosis_service.diagnose_result() requires.

    @pytest.fixture
    def clear_metrics(self):
        """Metrics for a house fully inside the parcel → CLEAR."""
        return {
            "house_area_m2": 180.0,
            "outside_area_m2": 0.0,
            "outside_percentage": 0.0,
            "has_conflict": False,
            # Arohi's supplementary keys — optional, included to verify
            # the audit record stores them without crashing.
            "intersection_area_m2": 180.0,
            "iou": 0.15,
            "boundary_deviation_m": 0.0,
            "affected_side": None,
            "road_overlap": False,
            "road_overlap_area_m2": 0.0,
            "neighbor_overlap": False,
            "neighbor_overlap_area_m2": 0.0,
        }

    @pytest.fixture
    def encroachment_metrics(self):
        """Metrics for a house that is 23.61% outside → ENCROACHMENT."""
        return {
            "house_area_m2": 180.0,
            "outside_area_m2": 42.5,
            "outside_percentage": 23.61,
            "has_conflict": True,
            "intersection_area_m2": 137.5,
            "iou": 0.12,
            "boundary_deviation_m": 3.5,
            "affected_side": "East",
            "road_overlap": False,
            "road_overlap_area_m2": 0.0,
            "neighbor_overlap": False,
            "neighbor_overlap_area_m2": 0.0,
        }

    @pytest.fixture
    def audits_dir(self):
        """Absolute path to data/audits/ for file-existence checks."""
        from pathlib import Path
        return Path(__file__).parent.parent / "data" / "audits"

    # ------------------------------------------------------------------
    # CLEAR case
    # ------------------------------------------------------------------

    def test_audit_clear_returns_200(self, clear_metrics):
        response = client.post(
            "/api/audit/analyze",
            json={"parcel_id": "P-001", "build_check": clear_metrics},
        )
        assert response.status_code == 200, response.text

    def test_audit_clear_response_structure(self, clear_metrics):
        response = client.post(
            "/api/audit/analyze",
            json={"parcel_id": "P-001", "build_check": clear_metrics},
        )
        data = response.json()
        assert data["success"] is True
        assert data["result"] == "CLEAR"
        assert "summary" in data
        assert "problem" in data
        assert "recommended_action" in data
        assert "verification_note" in data

    def test_audit_clear_summary_content(self, clear_metrics):
        """Summary must mention no discrepancy."""
        response = client.post(
            "/api/audit/analyze",
            json={"parcel_id": "P-001", "build_check": clear_metrics},
        )
        data = response.json()
        assert "no significant" in data["summary"].lower()

    def test_audit_clear_includes_diagnosis_sub_object(self, clear_metrics):
        """Response must include the nested diagnosis object."""
        response = client.post(
            "/api/audit/analyze",
            json={"parcel_id": "P-001", "build_check": clear_metrics},
        )
        data = response.json()
        assert "diagnosis" in data
        diag = data["diagnosis"]
        assert diag["result"] == "CLEAR"
        assert diag["priority"] == "low"
        assert isinstance(diag["evidence"], list)

    def test_audit_clear_includes_resolution_sub_object(self, clear_metrics):
        """Response must include the nested resolution object."""
        response = client.post(
            "/api/audit/analyze",
            json={"parcel_id": "P-001", "build_check": clear_metrics},
        )
        data = response.json()
        assert "resolution" in data
        res = data["resolution"]
        assert res["diagnosis_result"] == "CLEAR"
        assert res["recommended_action"] == "PROCEED_TO_NEXT_VALIDATION"
        assert res["verification_required"] is False
        assert "competent authorities" in res["legal_note"].lower()

    def test_audit_clear_file_written_to_disk(self, clear_metrics, audits_dir):
        """Audit JSON file must be created in data/audits/."""
        import os, json as _json
        files_before = set(os.listdir(audits_dir)) if audits_dir.exists() else set()

        response = client.post(
            "/api/audit/analyze",
            json={"parcel_id": "P-001", "build_check": clear_metrics},
        )
        assert response.status_code == 200
        audit_id = response.json()["diagnosis"]["result"]  # sanity — not the id
        # Find the newly created file
        files_after = set(os.listdir(audits_dir))
        new_files = files_after - files_before - {".gitkeep"}
        assert len(new_files) == 1, f"Expected 1 new file, got: {new_files}"

        audit_file = audits_dir / new_files.pop()
        with open(audit_file) as f:
            record = _json.load(f)

        assert record["parcel_id"] == "P-001"
        assert record["diagnosis"]["result"] == "CLEAR"
        assert "metrics" in record
        assert "created_at" in record
        # Supplementary keys are stored in the audit trail
        assert "iou" in record["metrics"]

        # Cleanup
        os.remove(audit_file)

    # ------------------------------------------------------------------
    # ENCROACHMENT case
    # ------------------------------------------------------------------

    def test_audit_encroachment_returns_200(self, encroachment_metrics):
        response = client.post(
            "/api/audit/analyze",
            json={"parcel_id": "P-001", "build_check": encroachment_metrics},
        )
        assert response.status_code == 200, response.text

    def test_audit_encroachment_result_is_correct(self, encroachment_metrics):
        response = client.post(
            "/api/audit/analyze",
            json={"parcel_id": "P-001", "build_check": encroachment_metrics},
        )
        data = response.json()
        assert data["result"] == "POTENTIAL_BUILDING_ENCROACHMENT"

    def test_audit_encroachment_problem_contains_numbers_from_input(
        self, encroachment_metrics
    ):
        """problem text must contain 42.5 and 23.61 from the input metrics."""
        response = client.post(
            "/api/audit/analyze",
            json={"parcel_id": "P-001", "build_check": encroachment_metrics},
        )
        data = response.json()
        assert "42.5" in data["problem"] or "42.50" in data["problem"]
        assert "23.61" in data["problem"]

    def test_audit_encroachment_diagnosis_affected_area(self, encroachment_metrics):
        """diagnosis.affected_area_m2 must equal the input outside_area_m2."""
        response = client.post(
            "/api/audit/analyze",
            json={"parcel_id": "P-001", "build_check": encroachment_metrics},
        )
        data = response.json()
        assert data["diagnosis"]["affected_area_m2"] == 42.5

    def test_audit_encroachment_resolution_verification_required(
        self, encroachment_metrics
    ):
        """23.61% outside (> 20%) → verification_required must be True."""
        response = client.post(
            "/api/audit/analyze",
            json={"parcel_id": "P-001", "build_check": encroachment_metrics},
        )
        data = response.json()
        assert data["resolution"]["verification_required"] is True

    def test_audit_encroachment_file_written_to_disk(
        self, encroachment_metrics, audits_dir
    ):
        """Audit JSON file must be created and contain encroachment data."""
        import os, json as _json
        files_before = set(os.listdir(audits_dir)) if audits_dir.exists() else set()

        response = client.post(
            "/api/audit/analyze",
            json={"parcel_id": "P-001", "build_check": encroachment_metrics},
        )
        assert response.status_code == 200

        files_after = set(os.listdir(audits_dir))
        new_files = files_after - files_before - {".gitkeep"}
        assert len(new_files) == 1

        audit_file = audits_dir / new_files.pop()
        with open(audit_file) as f:
            record = _json.load(f)

        assert record["diagnosis"]["result"] == "POTENTIAL_BUILDING_ENCROACHMENT"
        assert record["metrics"]["outside_area_m2"] == 42.5
        assert record["metrics"]["affected_side"] == "East"

        # Cleanup
        os.remove(audit_file)

    # ------------------------------------------------------------------
    # Error cases
    # ------------------------------------------------------------------

    def test_audit_missing_required_metric_returns_400(self):
        """build_check missing house_area_m2 → 400 INSUFFICIENT_SPATIAL_DATA."""
        bad_metrics = {
            "outside_area_m2": 10.0,
            "outside_percentage": 5.0,
            # missing house_area_m2
        }
        response = client.post(
            "/api/audit/analyze",
            json={"parcel_id": "P-001", "build_check": bad_metrics},
        )
        assert response.status_code == 400
        data = response.json()
        assert data["detail"]["code"] == "INSUFFICIENT_SPATIAL_DATA"

    def test_audit_missing_parcel_id_returns_422(self):
        """Missing parcel_id in request body → 422 from Pydantic."""
        response = client.post(
            "/api/audit/analyze",
            json={"build_check": {"house_area_m2": 100.0}},
        )
        assert response.status_code == 422


class TestReportGenerateEndpoint:
    """Test POST /api/reports/generate endpoint.

    Integration flow: create a real audit via /api/audit/analyze first,
    then generate its report via /api/reports/generate, and verify the
    PDF file was written to reports/ and is non-empty.
    """

    @pytest.fixture
    def encroachment_metrics(self):
        return {
            "house_area_m2": 180.0,
            "outside_area_m2": 42.5,
            "outside_percentage": 23.61,
            "has_conflict": True,
            "intersection_area_m2": 137.5,
            "iou": 0.12,
            "boundary_deviation_m": 3.5,
            "affected_side": "East",
            "road_overlap": False,
            "road_overlap_area_m2": 0.0,
            "neighbor_overlap": False,
            "neighbor_overlap_area_m2": 0.0,
        }

    @pytest.fixture
    def reports_dir(self):
        from pathlib import Path
        return Path(__file__).parent.parent / "reports"

    @pytest.fixture
    def audits_dir(self):
        from pathlib import Path
        return Path(__file__).parent.parent / "data" / "audits"

    def _create_audit(self, metrics) -> str:
        """Helper: POST to /api/audit/analyze and return the audit_id."""
        response = client.post(
            "/api/audit/analyze",
            json={"parcel_id": "P-001", "build_check": metrics},
        )
        assert response.status_code == 200, response.text
        # audit_id is embedded in the saved file — extract from diagnosis
        # response doesn't expose audit_id directly, so find the newest file
        import os
        audits_path = str(
            ((__import__("pathlib").Path(__file__).parent.parent) / "data" / "audits")
        )
        files = [
            f for f in os.listdir(audits_path)
            if f.startswith("AUD-") and f.endswith(".json")
        ]
        files.sort(key=lambda f: os.path.getmtime(os.path.join(audits_path, f)))
        return files[-1].replace(".json", "")

    # ------------------------------------------------------------------
    # Happy path — generate a report from a real audit
    # ------------------------------------------------------------------

    def test_report_generate_returns_200(self, encroachment_metrics, audits_dir):
        audit_id = self._create_audit(encroachment_metrics)
        try:
            response = client.post(
                "/api/reports/generate",
                json={"audit_id": audit_id},
            )
            assert response.status_code == 200, response.text
        finally:
            import os
            audit_file = audits_dir / f"{audit_id}.json"
            if audit_file.exists():
                os.remove(audit_file)

    def test_report_generate_response_structure(
        self, encroachment_metrics, audits_dir, reports_dir
    ):
        """Response must have success=True and a report_id starting with REP-."""
        audit_id = self._create_audit(encroachment_metrics)
        try:
            response = client.post(
                "/api/reports/generate",
                json={"audit_id": audit_id},
            )
            data = response.json()
            assert data["success"] is True
            assert "report_id" in data
            assert data["report_id"].startswith("REP-")
        finally:
            import os
            audit_file = audits_dir / f"{audit_id}.json"
            if audit_file.exists():
                os.remove(audit_file)
            # cleanup pdf
            suffix = audit_id.replace("AUD-", "")
            pdf = reports_dir / f"{audit_id}.pdf"
            if pdf.exists():
                os.remove(pdf)

    def test_report_id_derives_from_audit_id(
        self, encroachment_metrics, audits_dir, reports_dir
    ):
        """report_id must be AUD-XXXX → REP-XXXX (same suffix)."""
        audit_id = self._create_audit(encroachment_metrics)
        try:
            response = client.post(
                "/api/reports/generate",
                json={"audit_id": audit_id},
            )
            data = response.json()
            expected_report_id = audit_id.replace("AUD-", "REP-")
            assert data["report_id"] == expected_report_id
        finally:
            import os
            audit_file = audits_dir / f"{audit_id}.json"
            if audit_file.exists():
                os.remove(audit_file)
            pdf = reports_dir / f"{audit_id}.pdf"
            if pdf.exists():
                os.remove(pdf)

    def test_report_pdf_exists_on_disk(
        self, encroachment_metrics, audits_dir, reports_dir
    ):
        """PDF file must be created at reports/{audit_id}.pdf."""
        import os
        audit_id = self._create_audit(encroachment_metrics)
        pdf_path = reports_dir / f"{audit_id}.pdf"
        try:
            response = client.post(
                "/api/reports/generate",
                json={"audit_id": audit_id},
            )
            assert response.status_code == 200
            assert pdf_path.exists(), f"PDF not found at {pdf_path}"
        finally:
            audit_file = audits_dir / f"{audit_id}.json"
            if audit_file.exists():
                os.remove(audit_file)
            if pdf_path.exists():
                os.remove(pdf_path)

    def test_report_pdf_is_non_empty(
        self, encroachment_metrics, audits_dir, reports_dir
    ):
        """PDF must be a non-empty file (>1 KB — a minimal PDF is never 0 bytes)."""
        import os
        audit_id = self._create_audit(encroachment_metrics)
        pdf_path = reports_dir / f"{audit_id}.pdf"
        try:
            response = client.post(
                "/api/reports/generate",
                json={"audit_id": audit_id},
            )
            assert response.status_code == 200
            assert pdf_path.exists()
            assert os.path.getsize(pdf_path) > 1024, (
                f"PDF is suspiciously small: {os.path.getsize(pdf_path)} bytes"
            )
        finally:
            audit_file = audits_dir / f"{audit_id}.json"
            if audit_file.exists():
                os.remove(audit_file)
            if pdf_path.exists():
                os.remove(pdf_path)

    def test_report_pdf_starts_with_pdf_magic_bytes(
        self, encroachment_metrics, audits_dir, reports_dir
    ):
        """PDF must start with the %%PDF magic bytes — confirms it is a real PDF."""
        import os
        audit_id = self._create_audit(encroachment_metrics)
        pdf_path = reports_dir / f"{audit_id}.pdf"
        try:
            client.post("/api/reports/generate", json={"audit_id": audit_id})
            with open(pdf_path, "rb") as f:
                header = f.read(4)
            assert header == b"%PDF", f"Not a valid PDF header: {header!r}"
        finally:
            audit_file = audits_dir / f"{audit_id}.json"
            if audit_file.exists():
                os.remove(audit_file)
            if pdf_path.exists():
                os.remove(pdf_path)

    # ------------------------------------------------------------------
    # Error cases
    # ------------------------------------------------------------------

    def test_nonexistent_audit_id_returns_404(self):
        """Unknown audit_id must return 404 AUDIT_NOT_FOUND."""
        response = client.post(
            "/api/reports/generate",
            json={"audit_id": "AUD-DOESNOTEXIST"},
        )
        assert response.status_code == 404
        data = response.json()
        assert data["detail"]["code"] == "AUDIT_NOT_FOUND"

    def test_missing_audit_id_returns_422(self):
        """Missing audit_id in body must return 422 from Pydantic."""
        response = client.post("/api/reports/generate", json={})
        assert response.status_code == 422
