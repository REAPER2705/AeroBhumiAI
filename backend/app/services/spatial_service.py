"""Spatial analysis service using Shapely + pyproj.

Responsibilities (GIS Engine):
- Polygon geometry validation and intersection
- Area calculations for proposed buildings using real projected CRS
- Deterministic spatial comparisons — no estimates, no guessing

All area calculations reproject from EPSG:4326 (lon/lat) to an
auto-detected UTM zone (via pyproj) before computing geometry.
"""

from typing import Dict, Optional, Tuple, Any

from shapely.geometry import shape, Polygon, LineString
from shapely.validation import explain_validity
import pyproj

# Default buffer width (metres) used when road_geometry is a LineString.
# A 3 m half-width gives a 6 m total corridor — a conservative lane approximation.
_ROAD_LINE_BUFFER_M = 3.0


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _geojson_to_shapely(geometry: dict) -> Polygon:
    """Convert a GeoJSON Polygon dict to a Shapely Polygon."""
    return shape(geometry)


def _auto_utm_crs(lon: float, lat: float) -> pyproj.CRS:
    """Return the appropriate UTM CRS for a given lon/lat centroid.

    Uses pyproj's built-in query so there is no hardcoded zone number.
    """
    utm_crs_list = pyproj.database.query_utm_crs_info(
        datum_name="WGS 84",
        area_of_interest=pyproj.aoi.AreaOfInterest(
            west_lon_degree=lon,
            south_lat_degree=lat,
            east_lon_degree=lon,
            north_lat_degree=lat,
        ),
    )
    if not utm_crs_list:
        raise ValueError(
            f"Could not determine UTM zone for centroid ({lon:.4f}, {lat:.4f})"
        )
    return pyproj.CRS.from_authority(
        utm_crs_list[0].auth_name, utm_crs_list[0].code
    )


def _reproject_polygon(polygon: Polygon, transformer: pyproj.Transformer) -> Polygon:
    """Reproject a Shapely Polygon using a pyproj Transformer.

    Handles exterior ring and any interior rings (holes).
    Coordinates are in (lon, lat) / (x, y) order throughout.
    """
    def _transform_ring(coords):
        xs, ys = zip(*coords)
        new_xs, new_ys = transformer.transform(xs, ys)
        return list(zip(new_xs, new_ys))

    exterior = _transform_ring(polygon.exterior.coords)
    interiors = [_transform_ring(ring.coords) for ring in polygon.interiors]
    return Polygon(exterior, interiors)


def _road_geojson_to_projected_polygon(
    road_geometry: dict,
    transformer: pyproj.Transformer,
) -> Polygon:
    """Convert a GeoJSON road geometry dict to a projected Shapely Polygon.

    Accepted input types:
    - Polygon  — reprojected directly; caller is responsible for prior
                 structural validation via validate_polygon_geometry().
    - LineString — reprojected then buffered by _ROAD_LINE_BUFFER_M metres
                   on each side, approximating a road corridor.  This is a
                   practical approximation, not a survey-grade measurement.

    Raises:
        ValueError: for any unsupported geometry type.
    """
    geom_type = road_geometry.get("type") if isinstance(road_geometry, dict) else None

    if geom_type == "Polygon":
        poly_4326 = shape(road_geometry)
        return _reproject_polygon(poly_4326, transformer)

    if geom_type == "LineString":
        line_4326 = shape(road_geometry)
        coords = list(line_4326.coords)
        xs, ys = zip(*coords)
        new_xs, new_ys = transformer.transform(xs, ys)
        line_proj = LineString(list(zip(new_xs, new_ys)))
        return line_proj.buffer(_ROAD_LINE_BUFFER_M)

    raise ValueError(
        f"road_geometry must be a GeoJSON Polygon or LineString, got: {geom_type!r}"
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def validate_polygon_geometry(geometry: Dict[str, Any]) -> Tuple[bool, str]:
    """Validate polygon geometry structure and validity.

    Checks (in order):
    1. Must be a dict
    2. type must be 'Polygon'   — error contains "Polygon"
    3. coordinates must exist and be a non-empty list
    4. Outer ring must have >= 4 coordinate pairs
    5. Outer ring must be closed (first == last) — error contains "closed"
    6. Each coordinate must be [lon, lat] within valid bounds
    7. Shapely validity check (catches self-intersections etc.)

    Returns:
        (is_valid: bool, error_message: str)
        On success: (True, "")
    """
    if not isinstance(geometry, dict):
        return False, "Geometry must be a dictionary"

    if geometry.get("type") != "Polygon":
        return False, "Geometry must be a Polygon"

    coordinates = geometry.get("coordinates")
    if not coordinates or not isinstance(coordinates, list):
        return False, "Polygon must have coordinates"

    if len(coordinates) < 1:
        return False, "Polygon must have at least one ring"

    outer_ring = coordinates[0]
    if len(outer_ring) < 4:
        return False, "Polygon ring must have at least 4 coordinates"

    if outer_ring[0] != outer_ring[-1]:
        return False, "Polygon ring must be closed"

    # Validate coordinate values
    try:
        for ring in coordinates:
            for coord in ring:
                if not isinstance(coord, (list, tuple)) or len(coord) < 2:
                    return False, "Each coordinate must have [lon, lat]"
                lon, lat = coord[0], coord[1]
                if not (-180 <= lon <= 180 and -90 <= lat <= 90):
                    return False, f"Invalid coordinate bounds: [{lon}, {lat}]"
    except Exception as e:
        return False, f"Coordinate validation failed: {str(e)}"

    # Shapely validity check (self-intersections, duplicate points, etc.)
    try:
        poly = _geojson_to_shapely(geometry)
        if not poly.is_valid:
            reason = explain_validity(poly)
            return False, f"Polygon geometry is not valid: {reason}"
    except Exception as e:
        return False, f"Could not parse geometry: {str(e)}"

    return True, ""


def _compass_direction(dx: float, dy: float) -> str:
    """Return a compass-direction string for a displacement vector (dx, dy).

    Both dx and dy are in the projected CRS (metres), with:
        dx positive  → East
        dy positive  → North  (UTM northing increases northward)

    The 45° threshold means a displacement is labelled as a diagonal only
    when it has a meaningful component in both axes; otherwise the dominant
    axis wins.

    Returns one of: "North", "South", "East", "West",
                    "Northeast", "Northwest", "Southeast", "Southwest"
    """
    abs_dx, abs_dy = abs(dx), abs(dy)

    # Pure cardinal when one axis strongly dominates (ratio > 2:1)
    if abs_dx == 0 and abs_dy == 0:
        return "None"           # degenerate — caller should guard before here
    if abs_dy > 0 and abs_dx / abs_dy < 0.5:
        return "North" if dy > 0 else "South"
    if abs_dx > 0 and abs_dy / abs_dx < 0.5:
        return "East" if dx > 0 else "West"

    # Diagonal
    ns = "North" if dy > 0 else "South"
    ew = "East" if dx > 0 else "West"
    return ns + ew


def calculate_metrics(
    parcel_geometry: dict,
    house_geometry: dict,
    *,
    road_geometry: Optional[dict] = None,
    neighbor_geometry: Optional[dict] = None,
) -> dict:
    """Calculate spatial metrics for a proposed building against a parcel boundary.

    Steps:
    1. Guard: parcel must be a Polygon (MultiPolygon not supported in MVP).
    2. Build Shapely polygons from GeoJSON (EPSG:4326, coords as [lon, lat]).
    3. Auto-detect UTM zone from parcel centroid via pyproj.
    4. Reproject both polygons to that UTM CRS.
    5. Compute all areas and supplementary metrics from real projected geometry.
    6. Optionally compute road-overlap metrics if road_geometry is supplied.

    Args:
        parcel_geometry: GeoJSON Polygon dict of the reference parcel (EPSG:4326).
        house_geometry:  GeoJSON Polygon dict of the proposed building (EPSG:4326).
        road_geometry:   Optional GeoJSON Polygon or LineString dict representing a
                         road / right-of-way corridor (EPSG:4326).
                         - Polygon: used as-is after reprojection.
                         - LineString: buffered by _ROAD_LINE_BUFFER_M metres on
                           each side before intersection is computed.  This is a
                           practical approximation of road width, not survey-grade.
                         - None (default): road keys are still present in the output
                           with safe zero/False values so callers can always expect
                           a consistent dict shape.
        neighbor_geometry: Optional GeoJSON Polygon dict of an adjoining parcel
                         (EPSG:4326).  Answers the question "does the proposed
                         house encroach specifically into the neighbouring parcel,
                         rather than just outside the reference boundary generally?"
                         Useful supplementary context for encroachment cases; the
                         diagnosis logic in diagnosis_service.py is unchanged.
                         - None (default): neighbor keys present with safe
                           zero/False values.

    Returns:
        dict with keys:
            ── Core keys (consumed by diagnosis_service / routes/spatial.py) ──
            house_area_m2        (float) — total house footprint area in m²
            outside_area_m2      (float) — area of house outside parcel in m²
            outside_percentage   (float) — outside_area / house_area * 100
            has_conflict         (bool)  — True if outside_area_m2 > 1e-6
            intersection_area_m2 (float) — area of house inside parcel in m²

            ── Supplementary metrics (directional / approximate, not survey-grade) ──
            iou                  (float) — Intersection-over-Union of house and
                                           parcel polygons, rounded to 4 dp.
            boundary_deviation_m (float) — Distance from conflict centroid to
                                           parcel exterior; 0.0 when no conflict.
            affected_side        (str|None) — Cardinal/intercardinal direction of
                                           conflict area; None when no conflict.

            ── Road-overlap metrics (approximate — road_geometry is caller-supplied) ──
            road_overlap         (bool)  — True if house intersects road corridor
                                           by more than 1e-6 m².  Always False when
                                           road_geometry is None.
            road_overlap_area_m2 (float) — Area of intersection between house and
                                           road corridor in m², rounded to 2 dp.
                                           Always 0.0 when road_geometry is None.

            ── Neighbor-overlap metrics (supplementary — caller-supplied geometry) ──
            neighbor_overlap         (bool)  — True if house intersects the
                                               adjoining parcel by > 1e-6 m².
                                               Always False when neighbor_geometry
                                               is None.
            neighbor_overlap_area_m2 (float) — Area of intersection between house
                                               and neighbour parcel in m², rounded
                                               to 2 dp.  Always 0.0 when
                                               neighbor_geometry is None.

    Raises:
        NotImplementedError: if parcel geometry type is MultiPolygon.
        ValueError: if geometries are invalid, degenerate, or UTM detection fails;
                    also raised for unsupported road_geometry types.
    """
    try:
        # --- 0. Guard: MultiPolygon parcels not supported in MVP ---
        parcel_type = parcel_geometry.get("type") if isinstance(parcel_geometry, dict) else None
        if parcel_type == "MultiPolygon":
            raise NotImplementedError(
                "MultiPolygon parcels not yet supported in MVP"
            )

        # --- 1. Build Shapely objects in geographic CRS (EPSG:4326) ---
        parcel_4326 = _geojson_to_shapely(parcel_geometry)
        house_4326 = _geojson_to_shapely(house_geometry)

        if not parcel_4326.is_valid:
            raise ValueError(
                f"Parcel geometry is not valid: {explain_validity(parcel_4326)}"
            )
        if not house_4326.is_valid:
            raise ValueError(
                f"House geometry is not valid: {explain_validity(house_4326)}"
            )

        # Validate road geometry structure before any reprojection
        if road_geometry is not None:
            road_type = road_geometry.get("type") if isinstance(road_geometry, dict) else None
            if road_type == "Polygon":
                is_valid_road, road_err = validate_polygon_geometry(road_geometry)
                if not is_valid_road:
                    raise ValueError(f"Road geometry is invalid: {road_err}")
            elif road_type == "LineString":
                road_coords = road_geometry.get("coordinates")
                if not road_coords or len(road_coords) < 2:
                    raise ValueError(
                        "Road LineString must have at least 2 coordinate pairs"
                    )
                for coord in road_coords:
                    if not isinstance(coord, (list, tuple)) or len(coord) < 2:
                        raise ValueError(
                            "Each road coordinate must have [lon, lat]"
                        )
                    lon, lat = coord[0], coord[1]
                    if not (-180 <= lon <= 180 and -90 <= lat <= 90):
                        raise ValueError(
                            f"Road coordinate out of bounds: [{lon}, {lat}]"
                        )
            else:
                raise ValueError(
                    f"road_geometry must be a GeoJSON Polygon or LineString, "
                    f"got: {road_type!r}"
                )

        # Validate neighbor geometry structure (Polygon only)
        if neighbor_geometry is not None:
            is_valid_nb, nb_err = validate_polygon_geometry(neighbor_geometry)
            if not is_valid_nb:
                raise ValueError(f"Neighbor geometry is invalid: {nb_err}")

        # --- 2. Auto-detect UTM zone from parcel centroid ---
        centroid = parcel_4326.centroid
        utm_crs = _auto_utm_crs(centroid.x, centroid.y)

        # --- 3. Reproject both polygons to projected CRS ---
        transformer = pyproj.Transformer.from_crs(
            "EPSG:4326",
            utm_crs,
            always_xy=True,   # ensures (lon, lat) → (easting, northing)
        )

        parcel_proj = _reproject_polygon(parcel_4326, transformer)
        house_proj = _reproject_polygon(house_4326, transformer)

        # --- 4. Compute real geometry ---
        house_area_m2 = house_proj.area

        # Guard: near-zero area house — return safe zeros, no division
        if house_area_m2 <= 1e-6:
            return {
                "house_area_m2": round(house_area_m2, 2),
                "outside_area_m2": 0.0,
                "outside_percentage": 0.0,
                "has_conflict": False,
                "intersection_area_m2": 0.0,
                "iou": 0.0,
                "boundary_deviation_m": 0.0,
                "affected_side": None,
                "road_overlap": False,
                "road_overlap_area_m2": 0.0,
                "neighbor_overlap": False,
                "neighbor_overlap_area_m2": 0.0,
            }

        outside_geom = house_proj.difference(parcel_proj)
        outside_area_m2 = outside_geom.area

        intersection_geom = house_proj.intersection(parcel_proj)
        intersection_area_m2 = intersection_geom.area

        outside_percentage = outside_area_m2 / house_area_m2 * 100
        has_conflict = outside_area_m2 > 1e-6

        # --- 5. IoU (Intersection over Union) ---
        union_area = parcel_proj.union(house_proj).area
        iou = round(intersection_area_m2 / union_area, 4) if union_area > 1e-6 else 0.0

        # --- 6. Boundary deviation (supplementary, not survey-grade) ---
        if has_conflict:
            conflict_centroid = outside_geom.centroid
            boundary_deviation_m = round(
                parcel_proj.exterior.distance(conflict_centroid), 2
            )
        else:
            boundary_deviation_m = 0.0

        # --- 7. Affected side (supplementary directional indicator) ---
        if has_conflict:
            conflict_cx = outside_geom.centroid.x
            conflict_cy = outside_geom.centroid.y
            parcel_cx = parcel_proj.centroid.x
            parcel_cy = parcel_proj.centroid.y
            affected_side = _compass_direction(
                conflict_cx - parcel_cx,
                conflict_cy - parcel_cy,
            )
        else:
            affected_side = None

        # --- 8. Road overlap (optional — only when road_geometry supplied) ---
        if road_geometry is not None:
            road_proj = _road_geojson_to_projected_polygon(road_geometry, transformer)
            road_overlap_area_m2 = round(house_proj.intersection(road_proj).area, 2)
            road_overlap = road_overlap_area_m2 > 1e-6
        else:
            road_overlap = False
            road_overlap_area_m2 = 0.0

        # --- 9. Neighbor overlap (optional — only when neighbor_geometry supplied) ---
        if neighbor_geometry is not None:
            neighbor_4326 = _geojson_to_shapely(neighbor_geometry)
            neighbor_proj = _reproject_polygon(neighbor_4326, transformer)
            neighbor_overlap_area_m2 = round(
                house_proj.intersection(neighbor_proj).area, 2
            )
            neighbor_overlap = neighbor_overlap_area_m2 > 1e-6
        else:
            neighbor_overlap = False
            neighbor_overlap_area_m2 = 0.0

        return {
            "house_area_m2": round(house_area_m2, 2),
            "outside_area_m2": round(outside_area_m2, 2),
            "outside_percentage": round(outside_percentage, 2),
            "has_conflict": has_conflict,
            "intersection_area_m2": round(intersection_area_m2, 2),
            "iou": iou,
            "boundary_deviation_m": boundary_deviation_m,
            "affected_side": affected_side,
            "road_overlap": road_overlap,
            "road_overlap_area_m2": road_overlap_area_m2,
            "neighbor_overlap": neighbor_overlap,
            "neighbor_overlap_area_m2": neighbor_overlap_area_m2,
        }

    except (ValueError, NotImplementedError):
        raise
    except Exception as e:
        raise ValueError(f"Error calculating metrics: {str(e)}")
