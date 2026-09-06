"""Parcel data service.

Responsibilities:
- Load parcel GeoJSON from data directory
- Parse and validate GeoJSON structure
- Extract parcel metadata
- List and retrieve parcels
- Handle errors cleanly
"""

import json
import os
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple


def get_parcels_file_path() -> str:
    """Get path to parcels GeoJSON file."""
    # __file__ is backend/app/services/parcel_service.py
    # Go up 4 levels to reach project root
    base_dir = Path(__file__).parent.parent.parent.parent
    return str(base_dir / "data" / "parcels" / "parcels.geojson")


class ParcelError(Exception):
    """Custom exception for parcel-related errors."""
    pass


def validate_geometry(geometry: Dict[str, Any]) -> Tuple[bool, str]:
    """Validate that geometry is a valid Polygon or MultiPolygon.
    
    Returns:
        (is_valid, error_message)
    """
    if not isinstance(geometry, dict):
        return False, "Geometry must be a dictionary"
    
    geom_type = geometry.get('type')
    if geom_type not in ['Polygon', 'MultiPolygon']:
        return False, f"Geometry type must be Polygon or MultiPolygon, got {geom_type}"
    
    coordinates = geometry.get('coordinates')
    if not coordinates:
        return False, "Geometry coordinates are missing"
    
    if not isinstance(coordinates, list):
        return False, "Coordinates must be a list"
    
    if len(coordinates) == 0:
        return False, "Coordinates list is empty"
    
    return True, ""


def validate_parcel_feature(feature: Dict[str, Any]) -> Tuple[bool, str]:
    """Validate a parcel feature has required fields and valid structure.
    
    Returns:
        (is_valid, error_message)
    """
    if not isinstance(feature, dict):
        return False, "Feature must be a dictionary"
    
    # Check feature type
    if feature.get('type') != 'Feature':
        return False, "Feature must have type='Feature'"
    
    # Check properties exist
    properties = feature.get('properties')
    if not isinstance(properties, dict):
        return False, "Feature must have properties dictionary"
    
    # Check required properties
    parcel_id = properties.get('parcel_id')
    if not parcel_id or not isinstance(parcel_id, str):
        return False, "Feature must have parcel_id string property"
    
    source = properties.get('source')
    if not source or not isinstance(source, str):
        return False, "Feature must have source string property"
    
    boundary_status = properties.get('boundary_status')
    if not boundary_status or boundary_status not in ['AUTHORITATIVE', 'REFERENCE_ONLY', 'UNKNOWN']:
        return False, f"Invalid boundary_status: {boundary_status}"
    
    # Check geometry
    geometry = feature.get('geometry')
    if not geometry:
        return False, "Feature must have geometry"
    
    is_valid, error_msg = validate_geometry(geometry)
    if not is_valid:
        return False, f"Invalid geometry: {error_msg}"
    
    return True, ""


def _load_parcels_file() -> Dict[str, Any]:
    """Load the parcels GeoJSON file.
    
    Returns:
        Parsed GeoJSON FeatureCollection or empty dict if file not found
        
    Raises:
        ParcelError: If file cannot be read or parsed
    """
    parcels_file = get_parcels_file_path()
    
    if not os.path.exists(parcels_file):
        raise ParcelError(f"Parcel data file not found: {parcels_file}")
    
    try:
        with open(parcels_file, 'r') as f:
            geojson_data = json.load(f)
        return geojson_data
    except json.JSONDecodeError as e:
        raise ParcelError(f"Invalid JSON in parcel data file: {str(e)}")
    except IOError as e:
        raise ParcelError(f"Error reading parcel data file: {str(e)}")


def load_parcel(parcel_id: str) -> Optional[Dict[str, Any]]:
    """Load parcel data by ID.
    
    Args:
        parcel_id: The ID of the parcel to load
    
    Returns:
        GeoJSON feature dict if found, None otherwise
        
    Raises:
        ParcelError: If parcel data cannot be loaded
    """
    try:
        geojson_data = _load_parcels_file()
    except ParcelError:
        raise
    
    features = geojson_data.get('features', [])
    
    for feature in features:
        try:
            properties = feature.get('properties', {})
            if properties.get('parcel_id') == parcel_id:
                # Validate before returning
                is_valid, error_msg = validate_parcel_feature(feature)
                if not is_valid:
                    raise ParcelError(f"Invalid parcel feature for {parcel_id}: {error_msg}")
                return feature
        except (TypeError, AttributeError) as e:
            raise ParcelError(f"Error processing parcel feature: {str(e)}")
    
    # Not found
    return None


def list_parcels() -> List[Dict[str, Any]]:
    """List all available parcels.
    
    Returns:
        List of GeoJSON feature dicts
        
    Raises:
        ParcelError: If parcel data cannot be loaded
    """
    try:
        geojson_data = _load_parcels_file()
    except ParcelError:
        raise
    
    features = geojson_data.get('features', [])
    valid_parcels = []
    
    for feature in features:
        try:
            is_valid, error_msg = validate_parcel_feature(feature)
            if is_valid:
                valid_parcels.append(feature)
            # Skip invalid features instead of raising
        except (TypeError, AttributeError):
            # Skip malformed features
            pass
    
    return valid_parcels
