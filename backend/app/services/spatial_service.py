"""Spatial analysis service using Shapely + pyproj.

Responsibilities (GIS Engine):
- Polygon geometry validation and intersection
- Area calculations for proposed buildings using real projected CRS
- Deterministic spatial comparisons — no estimates, no guessing

All area calculations reproject from EPSG:4326 (lon/lat) to an
auto-detected UTM zone (via pyproj) before computing geometry.
"""

from typing import Dict, Tuple, Any

from shapely.geometry import shape, Polygon
from shapely.validation import explain_validity
import pyproj


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


def calculate_metrics(parcel_geometry: dict, house_geometry: dict) -> dict:
    """Calculate spatial metrics for a proposed building against a parcel boundary.

    Steps:
    1. Guard: parcel must be a Polygon (MultiPolygon not supported in MVP).
    2. Build Shapely polygons from GeoJSON (EPSG:4326, coords as [lon, lat]).
    3. Auto-detect UTM zone from parcel centroid via pyproj.
    4. Reproject both polygons to that UTM CRS.
    5. Compute all areas from real projected geometry — no estimates.

    Returns:
        dict with keys:
            house_area_m2        (float) — total house footprint area
            outside_area_m2      (float) — area of house outside parcel
            outside_percentage   (float) — outside_area / house_area * 100
            has_conflict         (bool)  — True if outside_area_m2 > 1e-6
            intersection_area_m2 (float) — area of house inside parcel

    Raises:
        NotImplementedError: if parcel geometry type is MultiPolygon
        ValueError: if geometries are invalid, degenerate, or UTM detection fails
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

        # Guard: near-zero area house — don't divide by zero, return safe result
        if house_area_m2 <= 1e-6:
            return {
                "house_area_m2": round(house_area_m2, 2),
                "outside_area_m2": 0.0,
                "outside_percentage": 0.0,
                "has_conflict": False,
                "intersection_area_m2": 0.0,
            }

        outside_geom = house_proj.difference(parcel_proj)
        outside_area_m2 = outside_geom.area

        intersection_area_m2 = house_proj.intersection(parcel_proj).area

        outside_percentage = outside_area_m2 / house_area_m2 * 100
        has_conflict = outside_area_m2 > 1e-6

        return {
            "house_area_m2": round(house_area_m2, 2),
            "outside_area_m2": round(outside_area_m2, 2),
            "outside_percentage": round(outside_percentage, 2),
            "has_conflict": has_conflict,
            "intersection_area_m2": round(intersection_area_m2, 2),
        }

    except (ValueError, NotImplementedError):
        raise
    except Exception as e:
        raise ValueError(f"Error calculating metrics: {str(e)}")
