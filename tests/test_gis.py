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


class TestEdgeCases:
    """Edge-case hardening tests added in Task 4.

    Covers scenarios the original test suite did not exercise:
    - Self-intersecting (bowtie) polygon
    - Near-zero area house polygon
    - MultiPolygon parcel (unsupported in MVP)
    - House polygon exactly equal to parcel polygon
    """

    # ------------------------------------------------------------------
    # Shared fixtures
    # ------------------------------------------------------------------

    @pytest.fixture
    def parcel_polygon(self):
        """Standard 1km x 1km parcel used across edge-case tests."""
        return {
            "type": "Polygon",
            "coordinates": [
                [[28.5, -15.5], [28.51, -15.5], [28.51, -15.51],
                 [28.5, -15.51], [28.5, -15.5]]
            ],
        }

    # ------------------------------------------------------------------
    # 1. Self-intersecting polygon (bowtie)
    # ------------------------------------------------------------------

    def test_self_intersecting_polygon_is_invalid(self):
        """validate_polygon_geometry must reject a bowtie / self-intersecting ring.

        The ring passes all structural checks (closed, >= 4 coords, valid bounds)
        but Shapely's is_valid returns False because edges cross.
        The old degree-math code would have accepted this silently.
        """
        bowtie = {
            "type": "Polygon",
            "coordinates": [
                # Cross-shaped figure-eight: top-left → bottom-right → top-right → bottom-left
                [
                    [28.5,  -15.5],
                    [28.51, -15.51],
                    [28.51, -15.5],
                    [28.5,  -15.51],
                    [28.5,  -15.5],   # closed
                ]
            ],
        }
        is_valid, error = spatial_service.validate_polygon_geometry(bowtie)
        assert is_valid is False
        # Must be caught by the Shapely validity layer, not the structural checks
        assert len(error) > 0

    # ------------------------------------------------------------------
    # 2. Near-zero area house polygon
    # ------------------------------------------------------------------

    def test_near_zero_area_house_does_not_crash(self, parcel_polygon):
        """calculate_metrics must not raise ZeroDivisionError for a degenerate house.

        A polygon whose vertices are nanometres apart produces an effectively
        zero area after reprojection. outside_percentage must be returned as 0,
        not raise an exception.
        """
        near_zero_house = {
            "type": "Polygon",
            "coordinates": [
                [
                    [28.5,       -15.5],
                    [28.5000001, -15.5],
                    [28.5000001, -15.5000001],
                    [28.5,       -15.5000001],
                    [28.5,       -15.5],        # closed
                ]
            ],
        }
        # Must not raise
        metrics = spatial_service.calculate_metrics(parcel_polygon, near_zero_house)

        assert metrics["outside_percentage"] == 0.0
        assert metrics["has_conflict"] is False
        assert metrics["outside_area_m2"] == 0.0

    # ------------------------------------------------------------------
    # 3. MultiPolygon parcel — unsupported in MVP
    # ------------------------------------------------------------------

    def test_multipolygon_parcel_raises(self):
        """calculate_metrics must raise NotImplementedError for MultiPolygon parcels.

        Rather than silently producing wrong numbers, the MVP explicitly rejects
        MultiPolygon input so the caller can handle it gracefully.
        """
        multi_parcel = {
            "type": "MultiPolygon",
            "coordinates": [
                [[[28.5, -15.5], [28.51, -15.5], [28.51, -15.51],
                  [28.5, -15.51], [28.5, -15.5]]],
                [[[28.52, -15.52], [28.53, -15.52], [28.53, -15.53],
                  [28.52, -15.53], [28.52, -15.52]]],
            ],
        }
        house = {
            "type": "Polygon",
            "coordinates": [
                [[28.502, -15.502], [28.505, -15.502], [28.505, -15.505],
                 [28.502, -15.505], [28.502, -15.502]]
            ],
        }
        with pytest.raises(NotImplementedError, match="MultiPolygon"):
            spatial_service.calculate_metrics(multi_parcel, house)

    # ------------------------------------------------------------------
    # 4. House exactly equal to parcel
    # ------------------------------------------------------------------

    def test_house_identical_to_parcel(self, parcel_polygon):
        """When house == parcel, outside_area_m2 must be ~0 and has_conflict False.

        Shapely's difference of identical polygons should return an empty geometry
        with area 0 (or floating-point noise well below 1e-6).
        """
        # Use the same coordinates as the parcel fixture
        house_same_as_parcel = {
            "type": "Polygon",
            "coordinates": [
                [[28.5, -15.5], [28.51, -15.5], [28.51, -15.51],
                 [28.5, -15.51], [28.5, -15.5]]
            ],
        }
        metrics = spatial_service.calculate_metrics(parcel_polygon, house_same_as_parcel)

        assert metrics["outside_area_m2"] < 1.0     # allow tiny fp noise
        assert metrics["outside_percentage"] < 0.01
        assert metrics["has_conflict"] is False
        assert metrics["house_area_m2"] > 0
