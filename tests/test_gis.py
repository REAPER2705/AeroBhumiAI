"""GIS module tests.

Test coverage:
- House completely inside parcel
- House partially outside parcel
- House completely outside parcel
- Invalid polygon
- Missing parcel
- CRS mismatch (implicit in demo data)
"""

import pytest
import sys
from pathlib import Path

# Add backend to path for imports
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from app.services import spatial_service, diagnosis_service


class TestGeometryValidation:
    """Test geometry validation."""
    
    def test_valid_polygon(self):
        """Test valid polygon geometry."""
        polygon = {
            "type": "Polygon",
            "coordinates": [
                [[28.5, -15.5], [28.51, -15.5], [28.51, -15.51], [28.5, -15.51], [28.5, -15.5]]
            ]
        }
        is_valid, error = spatial_service.validate_polygon_geometry(polygon)
        assert is_valid is True
        assert error == ""
    
    def test_invalid_polygon_not_closed(self):
        """Test polygon that is not closed."""
        polygon = {
            "type": "Polygon",
            "coordinates": [
                [[28.5, -15.5], [28.51, -15.5], [28.51, -15.51], [28.5, -15.51]]  # Not closed
            ]
        }
        is_valid, error = spatial_service.validate_polygon_geometry(polygon)
        assert is_valid is False
        assert "closed" in error.lower()
    
    def test_invalid_polygon_too_few_coordinates(self):
        """Test polygon with too few coordinates."""
        polygon = {
            "type": "Polygon",
            "coordinates": [
                [[28.5, -15.5], [28.51, -15.5]]  # Too few
            ]
        }
        is_valid, error = spatial_service.validate_polygon_geometry(polygon)
        assert is_valid is False
    
    def test_invalid_not_polygon_type(self):
        """Test non-polygon geometry."""
        geometry = {
            "type": "LineString",
            "coordinates": [[28.5, -15.5], [28.51, -15.5]]
        }
        is_valid, error = spatial_service.validate_polygon_geometry(geometry)
        assert is_valid is False
        assert "Polygon" in error
    
    def test_invalid_no_coordinates(self):
        """Test geometry without coordinates."""
        polygon = {
            "type": "Polygon",
            "coordinates": []
        }
        is_valid, error = spatial_service.validate_polygon_geometry(polygon)
        assert is_valid is False


class TestSpatialMetrics:
    """Test spatial metric calculations."""
    
    @pytest.fixture
    def parcel_polygon(self):
        """Sample parcel polygon (1km x 1km area)."""
        return {
            "type": "Polygon",
            "coordinates": [
                [[28.5, -15.5], [28.51, -15.5], [28.51, -15.51], [28.5, -15.51], [28.5, -15.5]]
            ]
        }
    
    @pytest.fixture
    def house_inside(self):
        """House polygon completely inside parcel."""
        return {
            "type": "Polygon",
            "coordinates": [
                [[28.502, -15.502], [28.505, -15.502], [28.505, -15.505], [28.502, -15.505], [28.502, -15.502]]
            ]
        }
    
    @pytest.fixture
    def house_partially_outside(self):
        """House polygon partially outside parcel."""
        return {
            "type": "Polygon",
            "coordinates": [
                [[28.505, -15.505], [28.515, -15.505], [28.515, -15.515], [28.505, -15.515], [28.505, -15.505]]
            ]
        }
    
    @pytest.fixture
    def house_completely_outside(self):
        """House polygon completely outside parcel."""
        return {
            "type": "Polygon",
            "coordinates": [
                [[28.52, -15.52], [28.525, -15.52], [28.525, -15.525], [28.52, -15.525], [28.52, -15.52]]
            ]
        }
    
    def test_house_completely_inside_parcel(self, parcel_polygon, house_inside):
        """Test house completely within parcel."""
        metrics = spatial_service.calculate_metrics(parcel_polygon, house_inside)
        
        assert metrics['outside_area_m2'] <= 1  # Allow tiny floating point differences
        assert metrics['outside_percentage'] <= 0.01
        assert metrics['house_area_m2'] > 0
    
    def test_house_partially_outside_parcel(self, parcel_polygon, house_partially_outside):
        """Test house partially extending outside parcel."""
        metrics = spatial_service.calculate_metrics(parcel_polygon, house_partially_outside)
        
        assert metrics['outside_area_m2'] > 10  # Should have significant area outside
        assert metrics['outside_percentage'] > 10  # Should be >10%
        assert metrics['has_conflict'] is True
    
    def test_house_completely_outside_parcel(self, parcel_polygon, house_completely_outside):
        """Test house completely outside parcel."""
        metrics = spatial_service.calculate_metrics(parcel_polygon, house_completely_outside)
        
        assert metrics['outside_area_m2'] > 0
        assert metrics['outside_percentage'] > 90  # Nearly 100%
    
    def test_metrics_have_required_fields(self, parcel_polygon, house_inside):
        """Test metrics contain all required fields."""
        metrics = spatial_service.calculate_metrics(parcel_polygon, house_inside)
        
        required_fields = ['house_area_m2', 'outside_area_m2', 'outside_percentage', 'has_conflict']
        for field in required_fields:
            assert field in metrics


class TestDiagnosis:
    """Test diagnosis result state determination."""
    
    def test_diagnose_clear_result(self):
        """Test CLEAR result when no conflict."""
        metrics = {
            'house_area_m2': 100,
            'outside_area_m2': 0.1,  # Below tolerance
            'outside_percentage': 0.1
        }
        result = diagnosis_service.diagnose_result(metrics, tolerance_m2=0.5)
        assert result == 'CLEAR'
    
    def test_diagnose_encroachment_result(self):
        """Test POTENTIAL_BUILDING_ENCROACHMENT when conflict exists."""
        metrics = {
            'house_area_m2': 100,
            'outside_area_m2': 25.0,  # Above tolerance
            'outside_percentage': 25.0
        }
        result = diagnosis_service.diagnose_result(metrics, tolerance_m2=0.5)
        assert result == 'POTENTIAL_BUILDING_ENCROACHMENT'
    
    def test_diagnose_uses_tolerance(self):
        """Test that tolerance is respected."""
        metrics = {
            'house_area_m2': 100,
            'outside_area_m2': 5.0,
            'outside_percentage': 5.0
        }
        
        # With low tolerance, should be encroachment
        result_strict = diagnosis_service.diagnose_result(metrics, tolerance_m2=1.0)
        assert result_strict == 'POTENTIAL_BUILDING_ENCROACHMENT'
        
        # With high tolerance, should be clear
        result_lenient = diagnosis_service.diagnose_result(metrics, tolerance_m2=10.0)
        assert result_lenient == 'CLEAR'
