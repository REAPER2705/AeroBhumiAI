"""API endpoint tests.

Test coverage:
- Build check endpoint with various inputs
- Error handling
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
    """Test health check endpoint."""
    
    def test_health_check(self):
        """Test health check returns 200."""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"


class TestBuildCheckEndpoint:
    """Test spatial build-check endpoint."""
    
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
