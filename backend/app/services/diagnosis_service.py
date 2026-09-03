"""Diagnosis service for result state determination.

Responsibilities:
- Convert spatial measurements into controlled result states
- Apply tolerance logic
- Determine: CLEAR, BOUNDARY_VARIANCE, POTENTIAL_BUILDING_ENCROACHMENT

Diagnosis Rules:
- CLEAR: outside_area <= SPATIAL_TOLERANCE_M2
- POTENTIAL_BUILDING_ENCROACHMENT: outside_area > SPATIAL_TOLERANCE_M2
- BOUNDARY_VARIANCE: when reference/observed relationship requires verification
"""


def diagnose_result(metrics: dict, tolerance_m2: float = 0.5) -> str:
    """Determine result state based on spatial metrics.
    
    Args:
        metrics: Dict with house_area_m2, outside_area_m2, outside_percentage
        tolerance_m2: Spatial tolerance in square meters (default 0.5)
    
    Returns:
        One of: CLEAR, BOUNDARY_VARIANCE, POTENTIAL_BUILDING_ENCROACHMENT
    """
    outside_area = metrics.get('outside_area_m2', 0)
    
    if outside_area <= tolerance_m2:
        return 'CLEAR'
    else:
        return 'POTENTIAL_BUILDING_ENCROACHMENT'


def get_diagnosis_details(result: str, metrics: dict) -> dict:
    """Get detailed diagnosis information.
    
    Returns dict with diagnosis details based on result state.
    """
    return {
        'result': result,
        'affected_area_m2': metrics.get('outside_area_m2', 0),
        'affected_percentage': metrics.get('outside_percentage', 0),
        'house_area_m2': metrics.get('house_area_m2', 0),
        'has_conflict': metrics.get('has_conflict', False)
    }
