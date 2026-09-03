"""Parcel data service.

Responsibilities:
- Load parcel GeoJSON
- Extract parcel metadata
- Validate parcel geometry
"""

import json
import os
from pathlib import Path
from shapely.geometry import shape


def get_parcels_file_path() -> str:
    """Get path to parcels GeoJSON file."""
    base_dir = Path(__file__).parent.parent.parent
    return str(base_dir / "data" / "parcels" / "parcels.geojson")


def load_parcel(parcel_id: str):
    """Load parcel data by ID.
    
    Returns:
        dict with properties and geometry, or None if not found
    """
    parcels_file = get_parcels_file_path()
    
    if not os.path.exists(parcels_file):
        return None
    
    try:
        with open(parcels_file, 'r') as f:
            geojson_data = json.load(f)
        
        for feature in geojson_data.get('features', []):
            if feature['properties'].get('parcel_id') == parcel_id:
                return feature
        
        return None
    except Exception as e:
        raise ValueError(f"Error loading parcel data: {str(e)}")


def list_parcels():
    """List available parcels.
    
    Returns:
        List of parcel features with basic properties
    """
    parcels_file = get_parcels_file_path()
    
    if not os.path.exists(parcels_file):
        return []
    
    try:
        with open(parcels_file, 'r') as f:
            geojson_data = json.load(f)
        
        return geojson_data.get('features', [])
    except Exception as e:
        raise ValueError(f"Error loading parcel list: {str(e)}")
