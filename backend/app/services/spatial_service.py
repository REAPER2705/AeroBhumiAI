"""Spatial analysis service using GIS libraries.

Responsibilities (GIS Engine):
- Polygon geometry validation and intersection
- Area calculations for proposed buildings
- Deterministic spatial comparisons
- Calculate actual intersection and outside portions

Uses Shapely for accurate polygon operations.
"""

from typing import Dict, Tuple, Any, List
import math

try:
    from shapely.geometry import Polygon as ShapelyPolygon
    from shapely.geometry import mapping
    SHAPELY_AVAILABLE = True
except ImportError:
    SHAPELY_AVAILABLE = False


def validate_polygon_geometry(geometry: Dict[str, Any]) -> Tuple[bool, str]:
    """Validate polygon geometry structure and validity.
    
    Returns:
        (is_valid, error_message)
    """
    if not isinstance(geometry, dict):
        return False, "Geometry must be a dictionary"
    
    if geometry.get('type') != 'Polygon':
        return False, "Geometry must be a Polygon"
    
    coordinates = geometry.get('coordinates')
    if not coordinates or not isinstance(coordinates, list):
        return False, "Polygon must have coordinates"
    
    if len(coordinates) < 1:
        return False, "Polygon must have at least one ring"
    
    # Check that outer ring is closed
    outer_ring = coordinates[0]
    if len(outer_ring) < 4:
        return False, "Polygon ring must have at least 4 coordinates"
    
    if outer_ring[0] != outer_ring[-1]:
        return False, "Polygon ring must be closed"
    
    # Validate coordinate structure
    try:
        for ring in coordinates:
            for coord in ring:
                if not isinstance(coord, (list, tuple)) or len(coord) < 2:
                    return False, "Each coordinate must have [lon, lat]"
                # Check reasonable bounds
                lon, lat = coord[0], coord[1]
                if not (-180 <= lon <= 180 and -90 <= lat <= 90):
                    return False, f"Invalid coordinate bounds: [{lon}, {lat}]"
    except Exception as e:
        return False, f"Coordinate validation failed: {str(e)}"
    
    return True, ""


def point_in_polygon(point: Tuple[float, float], polygon_ring: list) -> bool:
    """Check if a point is inside a polygon ring using ray casting algorithm."""
    x, y = point
    n = len(polygon_ring)
    inside = False
    
    j = n - 1
    for i in range(n):
        xi, yi = polygon_ring[i][0], polygon_ring[i][1]
        xj, yj = polygon_ring[j][0], polygon_ring[j][1]
        
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    
    return inside


def polygon_bounding_box(polygon_ring: list) -> Dict[str, float]:
    """Calculate bounding box for a polygon ring."""
    lons = [coord[0] for coord in polygon_ring]
    lats = [coord[1] for coord in polygon_ring]
    
    return {
        'min_lon': min(lons),
        'max_lon': max(lons),
        'min_lat': min(lats),
        'max_lat': max(lats)
    }


def bounding_boxes_overlap(bbox1: Dict[str, float], bbox2: Dict[str, float]) -> bool:
    """Check if two bounding boxes overlap."""
    return (bbox1['min_lon'] <= bbox2['max_lon'] and 
            bbox1['max_lon'] >= bbox2['min_lon'] and
            bbox1['min_lat'] <= bbox2['max_lat'] and 
            bbox1['max_lat'] >= bbox2['min_lat'])


def calculate_ring_area(ring: list) -> float:
    """Calculate area of a polygon ring using Shoelace formula.
    
    Returns area in square degrees.
    """
    if len(ring) < 3:
        return 0
    
    area = 0
    for i in range(len(ring) - 1):
        x1, y1 = ring[i]
        x2, y2 = ring[i + 1]
        area += (x2 - x1) * (y2 + y1)
    
    return abs(area) / 2


def convert_area_to_square_meters(area_degrees_squared: float, latitude: float) -> float:
    """Convert area in square degrees to square meters.
    
    Formula: 
    - 1 degree latitude = ~111,320 meters (constant)
    - 1 degree longitude = ~111,320 * cos(latitude) meters
    - Area in m² = area_degrees² * (111320)² * cos(latitude)
    
    Args:
        area_degrees_squared: Area in square degrees
        latitude: Latitude for cos adjustment
    
    Returns:
        Area in square meters
    """
    if area_degrees_squared <= 0:
        return 0
    
    # Meters per degree (linear, not squared)
    meters_per_degree_lat = 111320  # ~1 degree latitude
    lat_rad = math.radians(latitude)
    meters_per_degree_lon = 111320 * math.cos(lat_rad)  # Adjusted for latitude
    
    # Convert square degrees to square meters
    # 1 square degree = meters_per_degree_lat * meters_per_degree_lon square meters
    area_m2 = area_degrees_squared * meters_per_degree_lat * meters_per_degree_lon
    return area_m2


def estimate_average_latitude(ring: list) -> float:
    """Get average latitude for coordinate conversion."""
    lats = [coord[1] for coord in ring]
    return sum(lats) / len(lats) if lats else 0


def polygons_intersect(parcel_ring: list, house_ring: list) -> bool:
    """Check if two polygon rings intersect or overlap."""
    parcel_bbox = polygon_bounding_box(parcel_ring)
    house_bbox = polygon_bounding_box(house_ring)
    
    # Quick check: bounding boxes must overlap
    if not bounding_boxes_overlap(parcel_bbox, house_bbox):
        return False
    
    # Check if any house vertex is inside parcel
    for vertex in house_ring:
        if point_in_polygon(vertex, parcel_ring):
            return True
    
    # Check if any parcel vertex is inside house
    for vertex in parcel_ring:
        if point_in_polygon(vertex, house_ring):
            return True
    
    return False


def calculate_metrics(parcel_geometry: dict, house_geometry: dict) -> dict:
    """Calculate all spatial metrics for build check using Shapely.
    
    Returns dict with:
        - house_area_m2: Total area of proposed house
        - outside_area_m2: Area of house outside parcel (ACTUAL, not estimated)
        - outside_percentage: Percentage outside
        - encroachment_geometry: GeoJSON Polygon of outside portion (or null)
    """
    try:
        if not SHAPELY_AVAILABLE:
            raise ImportError("Shapely is required for accurate spatial calculations")
        
        parcel_ring = parcel_geometry['coordinates'][0]
        house_ring = house_geometry['coordinates'][0]
        
        # Convert GeoJSON rings to Shapely polygons
        # GeoJSON uses [lon, lat], Shapely uses (lon, lat) internally
        parcel_coords = [(coord[0], coord[1]) for coord in parcel_ring]
        house_coords = [(coord[0], coord[1]) for coord in house_ring]
        
        parcel_poly = ShapelyPolygon(parcel_coords)
        house_poly = ShapelyPolygon(house_coords)
        
        # Validate polygons are valid
        if not parcel_poly.is_valid:
            raise ValueError("Parcel polygon is not valid")
        if not house_poly.is_valid:
            raise ValueError("House polygon is not valid")
        
        # Use the PARCEL's average latitude for coordinate conversion
        # This ensures consistency across both geometries
        avg_latitude = estimate_average_latitude(parcel_ring)
        
        # Calculate house area in degrees, then convert to m²
        house_area_degrees = house_poly.area
        house_area_m2 = convert_area_to_square_meters(house_area_degrees, avg_latitude)
        
        # Calculate parcel area in degrees, then convert to m²
        parcel_area_degrees = parcel_poly.area
        parcel_area_m2 = convert_area_to_square_meters(parcel_area_degrees, avg_latitude)
        
        # Calculate ACTUAL outside area using set difference
        # outside_portion = house - parcel (what's in house but NOT in parcel)
        outside_portion = house_poly.difference(parcel_poly)
        
        # Handle empty geometry (building completely inside)
        if outside_portion.is_empty:
            outside_area_degrees = 0
            outside_geometry = None
        else:
            outside_area_degrees = outside_portion.area
            # Convert outside portion back to GeoJSON
            outside_geom = mapping(outside_portion)
            outside_geometry = outside_geom
        
        outside_area_m2 = convert_area_to_square_meters(outside_area_degrees, avg_latitude)
        outside_percentage = (outside_area_m2 / house_area_m2 * 100) if house_area_m2 > 0 else 0
        
        # Determine if there's actual conflict
        has_conflict = outside_area_m2 > 0
        
        return {
            'house_area_m2': round(house_area_m2, 2),
            'parcel_area_m2': round(parcel_area_m2, 2),
            'outside_area_m2': round(outside_area_m2, 2),
            'outside_percentage': round(outside_percentage, 2),
            'has_conflict': has_conflict,
            'intersection_area_m2': round(house_area_m2 - outside_area_m2, 2) if house_area_m2 > 0 else 0,
            'encroachment_geometry': outside_geometry  # The ACTUAL outside portion
        }
    except Exception as e:
        raise ValueError(f"Error calculating metrics: {str(e)}")
