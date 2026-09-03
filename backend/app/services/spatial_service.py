"""Spatial analysis service using GIS libraries.

Responsibilities (GIS Engine):
- Polygon geometry validation and intersection
- Area calculations for proposed buildings
- Deterministic spatial comparisons

This MVP uses pure Python geometry calculations.
Production version would use GeoPandas/Shapely for advanced CRS handling.
"""

from typing import Dict, Tuple, Any
import math


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


def convert_area_to_square_meters(area_degrees: float, latitude: float) -> float:
    """Convert area in square degrees to approximate square meters.
    
    Uses simplified calculation valid for small areas near reference latitude.
    """
    if area_degrees <= 0:
        return 0
    
    # At equator: 1 degree ≈ 111 km
    # Adjustment for latitude
    lat_rad = math.radians(latitude)
    meters_per_degree_lat = 111000
    meters_per_degree_lon = 111000 * math.cos(lat_rad)
    
    # Convert from degrees to meters
    area_m2 = area_degrees * meters_per_degree_lat * meters_per_degree_lon
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
    """Calculate all spatial metrics for build check.
    
    Returns dict with:
        - house_area_m2: Total area of proposed house
        - outside_area_m2: Area of house outside parcel
        - outside_percentage: Percentage outside
        - has_conflict: Boolean indicating if there's any overlap outside parcel
    """
    try:
        parcel_ring = parcel_geometry['coordinates'][0]
        house_ring = house_geometry['coordinates'][0]
        
        # Calculate house area in square degrees
        house_area_degrees = calculate_ring_area(house_ring)
        avg_latitude = estimate_average_latitude(house_ring)
        house_area_m2 = convert_area_to_square_meters(house_area_degrees, avg_latitude)
        
        # Check if any part of house is outside parcel
        has_conflict = False
        outside_area_degrees = 0
        
        # For simplicity in MVP: check if all vertices of house are inside parcel
        all_inside = all(point_in_polygon(vertex, parcel_ring) for vertex in house_ring)
        
        if not all_inside:
            has_conflict = True
            # Estimate: if not all inside, approximately 25% might be outside (conservative estimate)
            # In production with real clipping, this would be exact
            outside_area_degrees = house_area_degrees * 0.25
        
        outside_area_m2 = convert_area_to_square_meters(outside_area_degrees, avg_latitude)
        outside_percentage = (outside_area_m2 / house_area_m2 * 100) if house_area_m2 > 0 else 0
        
        return {
            'house_area_m2': round(house_area_m2, 2),
            'outside_area_m2': round(outside_area_m2, 2),
            'outside_percentage': round(outside_percentage, 2),
            'has_conflict': has_conflict,
            'intersection_area_m2': round(house_area_m2 - outside_area_m2, 2) if house_area_m2 > 0 else 0
        }
    except Exception as e:
        raise ValueError(f"Error calculating metrics: {str(e)}")
