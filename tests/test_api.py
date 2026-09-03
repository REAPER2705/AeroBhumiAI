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
