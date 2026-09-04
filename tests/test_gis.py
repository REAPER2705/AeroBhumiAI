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


class TestSupplementaryMetrics:
    """Tests for the three new supplementary keys added in Task 1 (session 2):
    iou, boundary_deviation_m, affected_side.

    All assertions are pinned to values confirmed via a pre-write probe of the
    actual Shapely + pyproj output on these exact fixture coordinates.

    Fixture coordinates are kept identical to TestSpatialMetrics so results are
    directly comparable.
    """

    # ------------------------------------------------------------------
    # Shared fixtures (same coordinates as TestSpatialMetrics)
    # ------------------------------------------------------------------

    @pytest.fixture
    def parcel(self):
        return {
            "type": "Polygon",
            "coordinates": [
                [[28.5, -15.5], [28.51, -15.5], [28.51, -15.51],
                 [28.5, -15.51], [28.5, -15.5]]
            ],
        }

    @pytest.fixture
    def house_inside(self):
        """House completely inside parcel."""
        return {
            "type": "Polygon",
            "coordinates": [
                [[28.502, -15.502], [28.505, -15.502], [28.505, -15.505],
                 [28.502, -15.505], [28.502, -15.502]]
            ],
        }

    @pytest.fixture
    def house_partial(self):
        """House partially outside parcel — straddles the SE corner."""
        return {
            "type": "Polygon",
            "coordinates": [
                [[28.505, -15.505], [28.515, -15.505], [28.515, -15.515],
                 [28.505, -15.515], [28.505, -15.505]]
            ],
        }

    @pytest.fixture
    def house_outside(self):
        """House completely outside parcel."""
        return {
            "type": "Polygon",
            "coordinates": [
                [[28.52, -15.52], [28.525, -15.52], [28.525, -15.525],
                 [28.52, -15.525], [28.52, -15.52]]
            ],
        }

    @pytest.fixture
    def house_east(self):
        """House that pokes clearly to the East of the parcel.

        Western edge (28.508) is inside the parcel (which ends at 28.51),
        eastern edge (28.515) is outside — conflict centroid is east of parcel
        centroid (~28.505).
        """
        return {
            "type": "Polygon",
            "coordinates": [
                [[28.508, -15.503], [28.515, -15.503], [28.515, -15.507],
                 [28.508, -15.507], [28.508, -15.503]]
            ],
        }

    @pytest.fixture
    def house_same_as_parcel(self, parcel):
        """House footprint identical to the parcel."""
        return parcel

    # ------------------------------------------------------------------
    # IoU tests
    # ------------------------------------------------------------------

    def test_iou_house_equals_parcel(self, parcel, house_same_as_parcel):
        """IoU must be 1.0 when house and parcel are identical polygons."""
        metrics = spatial_service.calculate_metrics(parcel, house_same_as_parcel)
        assert metrics["iou"] == 1.0

    def test_iou_fully_outside_is_zero(self, parcel, house_outside):
        """IoU must be 0.0 when house has no overlap with parcel."""
        metrics = spatial_service.calculate_metrics(parcel, house_outside)
        assert metrics["iou"] == 0.0

    def test_iou_partial_overlap_between_zero_and_one(self, parcel, house_partial):
        """IoU must be strictly between 0 and 1 for partial overlap.

        Probed value: intersection ~296 763 m², union ~2 077 339 m²
        → iou ≈ 0.1429.  Assert within ±0.01 of that.
        """
        metrics = spatial_service.calculate_metrics(parcel, house_partial)
        assert 0.0 < metrics["iou"] < 1.0
        assert abs(metrics["iou"] - 0.1429) < 0.01

    def test_iou_inside_house_reasonable(self, parcel, house_inside):
        """IoU for a fully-inside house equals house_area / parcel_area
        (since union == parcel in that case).  Must be > 0 and < 1."""
        metrics = spatial_service.calculate_metrics(parcel, house_inside)
        assert 0.0 < metrics["iou"] < 1.0

    def test_iou_present_in_output(self, parcel, house_inside):
        """iou key must always be present in the return dict."""
        metrics = spatial_service.calculate_metrics(parcel, house_inside)
        assert "iou" in metrics

    # ------------------------------------------------------------------
    # boundary_deviation_m tests
    # ------------------------------------------------------------------

    def test_boundary_deviation_zero_when_inside(self, parcel, house_inside):
        """boundary_deviation_m must be 0.0 when house is fully inside parcel."""
        metrics = spatial_service.calculate_metrics(parcel, house_inside)
        assert metrics["boundary_deviation_m"] == 0.0

    def test_boundary_deviation_positive_when_partial(self, parcel, house_partial):
        """boundary_deviation_m must be > 0 when house partially outside.

        Probed value: conflict centroid → parcel exterior ≈ 128.43 m.
        Assert > 0 and within 50 m of probed value (generous tolerance for
        floating-point differences across platforms).
        """
        metrics = spatial_service.calculate_metrics(parcel, house_partial)
        assert metrics["boundary_deviation_m"] > 0.0
        assert abs(metrics["boundary_deviation_m"] - 128.43) < 50.0

    def test_boundary_deviation_present_in_output(self, parcel, house_inside):
        """boundary_deviation_m key must always be present."""
        metrics = spatial_service.calculate_metrics(parcel, house_inside)
        assert "boundary_deviation_m" in metrics

    # ------------------------------------------------------------------
    # affected_side tests
    # ------------------------------------------------------------------

    def test_affected_side_none_when_no_conflict(self, parcel, house_inside):
        """affected_side must be None when house is fully within parcel."""
        metrics = spatial_service.calculate_metrics(parcel, house_inside)
        assert metrics["affected_side"] is None

    def test_affected_side_east_for_east_protruding_house(self, parcel, house_east):
        """affected_side must contain 'East' when conflict is clearly to the east.

        Probed: conflict centroid dx ≈ +805 m, dy ≈ -6 m → overwhelmingly East.
        """
        metrics = spatial_service.calculate_metrics(parcel, house_east)
        assert metrics["affected_side"] is not None
        assert "East" in metrics["affected_side"]

    def test_affected_side_not_opposite_for_east_house(self, parcel, house_east):
        """Sanity check: a house poking East must not report West or North."""
        metrics = spatial_service.calculate_metrics(parcel, house_east)
        side = metrics["affected_side"]
        assert side is not None
        assert "West" not in side
        assert "North" not in side

    def test_affected_side_present_in_output(self, parcel, house_inside):
        """affected_side key must always be present (None or a string)."""
        metrics = spatial_service.calculate_metrics(parcel, house_inside)
        assert "affected_side" in metrics

    def test_affected_side_is_string_when_conflict(self, parcel, house_partial):
        """affected_side must be a non-empty string when conflict exists."""
        metrics = spatial_service.calculate_metrics(parcel, house_partial)
        assert isinstance(metrics["affected_side"], str)
        assert len(metrics["affected_side"]) > 0


class TestRoadOverlap:
    """Tests for the road_geometry optional kwarg added in Task 2 (session 2).

    Probed values (UTM zone 35S / EPSG:32735):
    - Road Polygon cutting through house_inside → overlap ≈ 35 612 m²
    - Buffered LineString road cutting through house_inside → overlap ≈ 1 931 m²
    - Road Polygon far from house → overlap = 0.0
    """

    # ------------------------------------------------------------------
    # Shared fixtures
    # ------------------------------------------------------------------

    @pytest.fixture
    def parcel(self):
        return {
            "type": "Polygon",
            "coordinates": [
                [[28.5, -15.5], [28.51, -15.5], [28.51, -15.51],
                 [28.5, -15.51], [28.5, -15.5]]
            ],
        }

    @pytest.fixture
    def house_inside(self):
        """House completely inside parcel."""
        return {
            "type": "Polygon",
            "coordinates": [
                [[28.502, -15.502], [28.505, -15.502], [28.505, -15.505],
                 [28.502, -15.505], [28.502, -15.502]]
            ],
        }

    @pytest.fixture
    def road_overlapping(self):
        """Road Polygon that cuts through the house_inside fixture.

        Probed overlap area with house_inside ≈ 35 612 m².
        """
        return {
            "type": "Polygon",
            "coordinates": [
                [[28.501, -15.503], [28.506, -15.503], [28.506, -15.504],
                 [28.501, -15.504], [28.501, -15.503]]
            ],
        }

    @pytest.fixture
    def road_linestring_overlapping(self):
        """Road LineString that passes through house_inside.

        Buffered to 3 m on each side before intersection is computed.
        Probed overlap area ≈ 1 931 m².
        """
        return {
            "type": "LineString",
            "coordinates": [
                [28.501, -15.503],
                [28.506, -15.503],
            ],
        }

    @pytest.fixture
    def road_far_away(self):
        """Road Polygon entirely outside the parcel and house."""
        return {
            "type": "Polygon",
            "coordinates": [
                [[28.520, -15.520], [28.525, -15.520], [28.525, -15.525],
                 [28.520, -15.525], [28.520, -15.520]]
            ],
        }

    # ------------------------------------------------------------------
    # Regression: no road_geometry → existing behaviour unchanged
    # ------------------------------------------------------------------

    def test_no_road_geometry_road_keys_present_with_safe_defaults(
        self, parcel, house_inside
    ):
        """When road_geometry is omitted, output must still contain road keys
        with road_overlap=False and road_overlap_area_m2=0.0.
        All previously-required keys must also still be present."""
        metrics = spatial_service.calculate_metrics(parcel, house_inside)

        # Road keys always present
        assert "road_overlap" in metrics
        assert "road_overlap_area_m2" in metrics
        assert metrics["road_overlap"] is False
        assert metrics["road_overlap_area_m2"] == 0.0

        # Core keys untouched
        for key in ("house_area_m2", "outside_area_m2", "outside_percentage",
                    "has_conflict", "intersection_area_m2"):
            assert key in metrics

    def test_no_road_geometry_explicit_none_same_as_omitted(
        self, parcel, house_inside
    ):
        """Passing road_geometry=None explicitly must produce the same result
        as not passing it at all."""
        m1 = spatial_service.calculate_metrics(parcel, house_inside)
        m2 = spatial_service.calculate_metrics(parcel, house_inside,
                                                road_geometry=None)
        assert m1 == m2

    # ------------------------------------------------------------------
    # Road Polygon overlapping house
    # ------------------------------------------------------------------

    def test_road_polygon_overlap_detected(self, parcel, house_inside,
                                           road_overlapping):
        """road_overlap must be True when a road Polygon intersects the house.

        Probed road_overlap_area_m2 ≈ 35 612 m².  Assert within 500 m² tolerance.
        """
        metrics = spatial_service.calculate_metrics(
            parcel, house_inside, road_geometry=road_overlapping
        )
        assert metrics["road_overlap"] is True
        assert metrics["road_overlap_area_m2"] > 0.0
        assert abs(metrics["road_overlap_area_m2"] - 35612.07) < 500.0

    def test_road_polygon_overlap_does_not_change_core_keys(
        self, parcel, house_inside, road_overlapping
    ):
        """Adding road_geometry must not alter the values of core output keys."""
        base = spatial_service.calculate_metrics(parcel, house_inside)
        with_road = spatial_service.calculate_metrics(
            parcel, house_inside, road_geometry=road_overlapping
        )
        for key in ("house_area_m2", "outside_area_m2", "outside_percentage",
                    "has_conflict", "intersection_area_m2"):
            assert base[key] == with_road[key], (
                f"Core key '{key}' changed when road_geometry was added"
            )

    # ------------------------------------------------------------------
    # Road LineString overlapping house (buffer path)
    # ------------------------------------------------------------------

    def test_road_linestring_buffered_overlap(self, parcel, house_inside,
                                              road_linestring_overlapping):
        """A LineString road must be buffered and produce a positive overlap.

        Probed road_overlap_area_m2 ≈ 1 931 m² (3 m buffer).
        Assert > 0 and within 200 m² tolerance.
        """
        metrics = spatial_service.calculate_metrics(
            parcel, house_inside, road_geometry=road_linestring_overlapping
        )
        assert metrics["road_overlap"] is True
        assert metrics["road_overlap_area_m2"] > 0.0
        assert abs(metrics["road_overlap_area_m2"] - 1931.16) < 200.0

    # ------------------------------------------------------------------
    # Road not touching house
    # ------------------------------------------------------------------

    def test_road_not_touching_house(self, parcel, house_inside, road_far_away):
        """road_overlap must be False and area 0.0 when road doesn't touch house."""
        metrics = spatial_service.calculate_metrics(
            parcel, house_inside, road_geometry=road_far_away
        )
        assert metrics["road_overlap"] is False
        assert metrics["road_overlap_area_m2"] == 0.0

    # ------------------------------------------------------------------
    # Invalid road geometry
    # ------------------------------------------------------------------

    def test_invalid_road_geometry_unsupported_type_raises(
        self, parcel, house_inside
    ):
        """An unsupported GeoJSON type (e.g. Point) must raise ValueError."""
        bad_road = {
            "type": "Point",
            "coordinates": [28.503, -15.503],
        }
        with pytest.raises(ValueError, match="Polygon or LineString"):
            spatial_service.calculate_metrics(
                parcel, house_inside, road_geometry=bad_road
            )

    def test_invalid_road_polygon_not_closed_raises(self, parcel, house_inside):
        """An invalid (unclosed) road Polygon must raise ValueError."""
        unclosed_road = {
            "type": "Polygon",
            "coordinates": [
                [[28.501, -15.503], [28.506, -15.503], [28.506, -15.504],
                 [28.501, -15.504]]   # not closed
            ],
        }
        with pytest.raises(ValueError):
            spatial_service.calculate_metrics(
                parcel, house_inside, road_geometry=unclosed_road
            )

    def test_invalid_road_linestring_too_short_raises(
        self, parcel, house_inside
    ):
        """A LineString with only one point must raise ValueError."""
        short_line = {
            "type": "LineString",
            "coordinates": [[28.503, -15.503]],   # only 1 point
        }
        with pytest.raises(ValueError):
            spatial_service.calculate_metrics(
                parcel, house_inside, road_geometry=short_line
            )


class TestNeighborOverlap:
    """Tests for the neighbor_geometry optional kwarg added in Task 3 (session 2).

    Answers: "does the house encroach specifically into an adjoining parcel?"
    Supplementary data only — diagnosis_service.py is unchanged.

    Probed values (UTM zone 35S / EPSG:32735):
    - house_partial vs neighbor_se → overlap ≈ 296 757 m²
    - house_inside vs neighbor_far  → overlap = 0.0
    """

    # ------------------------------------------------------------------
    # Shared fixtures
    # ------------------------------------------------------------------

    @pytest.fixture
    def parcel(self):
        return {
            "type": "Polygon",
            "coordinates": [
                [[28.5, -15.5], [28.51, -15.5], [28.51, -15.51],
                 [28.5, -15.51], [28.5, -15.5]]
            ],
        }

    @pytest.fixture
    def house_inside(self):
        """House completely inside parcel."""
        return {
            "type": "Polygon",
            "coordinates": [
                [[28.502, -15.502], [28.505, -15.502], [28.505, -15.505],
                 [28.502, -15.505], [28.502, -15.502]]
            ],
        }

    @pytest.fixture
    def house_partial(self):
        """House straddling the SE corner — spills into neighbor_se."""
        return {
            "type": "Polygon",
            "coordinates": [
                [[28.505, -15.505], [28.515, -15.505], [28.515, -15.515],
                 [28.505, -15.515], [28.505, -15.505]]
            ],
        }

    @pytest.fixture
    def neighbor_se(self):
        """Adjoining parcel directly to the SE of the main parcel.

        house_partial straddles the boundary and partially enters this parcel.
        Probed overlap with house_partial ≈ 296 757 m².
        """
        return {
            "type": "Polygon",
            "coordinates": [
                [[28.51, -15.51], [28.52, -15.51], [28.52, -15.52],
                 [28.51, -15.52], [28.51, -15.51]]
            ],
        }

    @pytest.fixture
    def neighbor_far(self):
        """Neighbor parcel far from house_inside — no overlap."""
        return {
            "type": "Polygon",
            "coordinates": [
                [[28.52, -15.52], [28.53, -15.52], [28.53, -15.53],
                 [28.52, -15.53], [28.52, -15.52]]
            ],
        }

    # ------------------------------------------------------------------
    # Regression: no neighbor_geometry → unchanged behaviour
    # ------------------------------------------------------------------

    def test_no_neighbor_geometry_keys_present_with_safe_defaults(
        self, parcel, house_inside
    ):
        """When neighbor_geometry is omitted, output must contain neighbor keys
        with neighbor_overlap=False and neighbor_overlap_area_m2=0.0."""
        metrics = spatial_service.calculate_metrics(parcel, house_inside)

        assert "neighbor_overlap" in metrics
        assert "neighbor_overlap_area_m2" in metrics
        assert metrics["neighbor_overlap"] is False
        assert metrics["neighbor_overlap_area_m2"] == 0.0

    def test_no_neighbor_explicit_none_same_as_omitted(
        self, parcel, house_inside
    ):
        """Passing neighbor_geometry=None explicitly must equal omitting it."""
        m1 = spatial_service.calculate_metrics(parcel, house_inside)
        m2 = spatial_service.calculate_metrics(
            parcel, house_inside, neighbor_geometry=None
        )
        assert m1 == m2

    def test_all_previously_passing_core_keys_still_present(
        self, parcel, house_inside
    ):
        """Adding neighbor kwarg must not remove any previously required key."""
        metrics = spatial_service.calculate_metrics(parcel, house_inside)
        for key in ("house_area_m2", "outside_area_m2", "outside_percentage",
                    "has_conflict", "intersection_area_m2",
                    "iou", "boundary_deviation_m", "affected_side",
                    "road_overlap", "road_overlap_area_m2"):
            assert key in metrics, f"Previously present key '{key}' is missing"

    # ------------------------------------------------------------------
    # House overlapping neighbor parcel
    # ------------------------------------------------------------------

    def test_neighbor_overlap_detected(self, parcel, house_partial, neighbor_se):
        """neighbor_overlap must be True when house enters the adjoining parcel.

        Probed neighbor_overlap_area_m2 ≈ 296 757 m².  Assert within 1000 m²
        tolerance.
        """
        metrics = spatial_service.calculate_metrics(
            parcel, house_partial, neighbor_geometry=neighbor_se
        )
        assert metrics["neighbor_overlap"] is True
        assert metrics["neighbor_overlap_area_m2"] > 0.0
        assert abs(metrics["neighbor_overlap_area_m2"] - 296756.91) < 1000.0

    def test_neighbor_overlap_does_not_change_core_keys(
        self, parcel, house_partial, neighbor_se
    ):
        """Adding neighbor_geometry must not alter any core output key values."""
        base = spatial_service.calculate_metrics(parcel, house_partial)
        with_nb = spatial_service.calculate_metrics(
            parcel, house_partial, neighbor_geometry=neighbor_se
        )
        for key in ("house_area_m2", "outside_area_m2", "outside_percentage",
                    "has_conflict", "intersection_area_m2"):
            assert base[key] == with_nb[key], (
                f"Core key '{key}' changed when neighbor_geometry was added"
            )

    # ------------------------------------------------------------------
    # House not touching neighbor parcel
    # ------------------------------------------------------------------

    def test_neighbor_no_overlap(self, parcel, house_inside, neighbor_far):
        """neighbor_overlap must be False and area 0.0 when house doesn't
        touch the neighbor parcel."""
        metrics = spatial_service.calculate_metrics(
            parcel, house_inside, neighbor_geometry=neighbor_far
        )
        assert metrics["neighbor_overlap"] is False
        assert metrics["neighbor_overlap_area_m2"] == 0.0

    # ------------------------------------------------------------------
    # Both road and neighbor provided simultaneously
    # ------------------------------------------------------------------

    def test_road_and_neighbor_both_provided(
        self, parcel, house_partial, neighbor_se
    ):
        """road_geometry and neighbor_geometry can both be supplied in the same
        call.  Both sets of keys must be present and correct."""
        road = {
            "type": "Polygon",
            "coordinates": [
                [[28.501, -15.503], [28.506, -15.503], [28.506, -15.504],
                 [28.501, -15.504], [28.501, -15.503]]
            ],
        }
        metrics = spatial_service.calculate_metrics(
            parcel, house_partial,
            road_geometry=road,
            neighbor_geometry=neighbor_se,
        )
        assert "road_overlap" in metrics
        assert "road_overlap_area_m2" in metrics
        assert "neighbor_overlap" in metrics
        assert "neighbor_overlap_area_m2" in metrics
        assert metrics["neighbor_overlap"] is True
        assert metrics["neighbor_overlap_area_m2"] > 0.0

    # ------------------------------------------------------------------
    # Invalid neighbor geometry
    # ------------------------------------------------------------------

    def test_invalid_neighbor_not_closed_raises(self, parcel, house_inside):
        """An unclosed neighbor Polygon must raise ValueError."""
        unclosed = {
            "type": "Polygon",
            "coordinates": [
                [[28.51, -15.51], [28.52, -15.51], [28.52, -15.52],
                 [28.51, -15.52]]   # not closed
            ],
        }
        with pytest.raises(ValueError, match="[Nn]eighbor"):
            spatial_service.calculate_metrics(
                parcel, house_inside, neighbor_geometry=unclosed
            )

    def test_invalid_neighbor_wrong_type_raises(self, parcel, house_inside):
        """A non-Polygon neighbor geometry type must raise ValueError."""
        line_neighbor = {
            "type": "LineString",
            "coordinates": [[28.51, -15.51], [28.52, -15.51]],
        }
        with pytest.raises(ValueError, match="[Nn]eighbor"):
            spatial_service.calculate_metrics(
                parcel, house_inside, neighbor_geometry=line_neighbor
            )
