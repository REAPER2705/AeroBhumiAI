"""Diagnosis service for result state determination.

Responsibilities:
- Convert spatial measurements into controlled result states
- Apply deterministic classification logic
- Determine: CLEAR, BOUNDARY_VARIANCE, POTENTIAL_BUILDING_ENCROACHMENT
- Expose measurements and classification reasons

Diagnosis Rules:
- CLEAR: outside_area <= SPATIAL_TOLERANCE_M2
- POTENTIAL_BUILDING_ENCROACHMENT: outside_area > SPATIAL_TOLERANCE_M2 (measurable portion outside)
- BOUNDARY_VARIANCE: when reference/observed relationship requires verification
"""

from typing import Dict, Any, Tuple


class DiagnosisError(Exception):
    """Custom exception for diagnosis errors."""
    pass


def validate_metrics(metrics: Dict[str, Any]) -> Tuple[bool, str]:
    """Validate that metrics dict has required fields.
    
    Returns:
        (is_valid, error_message)
    """
    if not isinstance(metrics, dict):
        return False, "Metrics must be a dictionary"
    
    required_fields = ['house_area_m2', 'outside_area_m2', 'outside_percentage']
    for field in required_fields:
        if field not in metrics:
            return False, f"Missing required metric: {field}"
        
        value = metrics[field]
        if not isinstance(value, (int, float)):
            return False, f"Metric {field} must be numeric, got {type(value).__name__}"
        
        if value < 0:
            return False, f"Metric {field} cannot be negative: {value}"
    
    return True, ""


def diagnose_result(metrics: Dict[str, Any], tolerance_m2: float = 0.5) -> Dict[str, Any]:
    """Determine result state based on spatial metrics.
    
    Consumes structured GIS measurements and returns deterministic classification
    with the reason and evidence for the classification.
    
    Args:
        metrics: Dict with:
            - house_area_m2: Total area of proposed building
            - outside_area_m2: Area of building outside reference parcel
            - outside_percentage: Percentage of building outside parcel
            - has_conflict: Boolean indicating if there's overlap outside parcel
        tolerance_m2: Spatial tolerance threshold in square meters (default 0.5)
    
    Returns:
        Dict with:
            - result: Classification state (CLEAR, BOUNDARY_VARIANCE, POTENTIAL_BUILDING_ENCROACHMENT)
            - reason: Human-readable classification reason
            - priority: Urgency level (low, medium, high)
            - affected_area_m2: Area in conflict (if any)
            - outside_percentage: Percentage outside reference parcel
            - has_conflict: Whether measurable conflict detected
            - evidence: List of supporting measurements
    
    Raises:
        DiagnosisError: If metrics are invalid or missing required fields
    """
    # Validate metrics
    is_valid, error_msg = validate_metrics(metrics)
    if not is_valid:
        raise DiagnosisError(f"Invalid metrics: {error_msg}")
    
    # Extract measurements
    house_area_m2 = float(metrics['house_area_m2'])
    outside_area_m2 = float(metrics['outside_area_m2'])
    outside_percentage = float(metrics['outside_percentage'])
    has_conflict = bool(metrics.get('has_conflict', False))
    
    # Validate measurements consistency
    if house_area_m2 <= 0:
        raise DiagnosisError("House area must be positive")
    
    if outside_area_m2 > house_area_m2:
        raise DiagnosisError("Outside area cannot exceed total house area")
    
    if outside_percentage > 100:
        raise DiagnosisError("Outside percentage cannot exceed 100%")
    
    # Deterministic classification logic
    if outside_area_m2 <= tolerance_m2:
        # No significant conflict
        result = 'CLEAR'
        reason = f"Proposed footprint remains within reference parcel boundary (tolerance: {tolerance_m2}m²)"
        priority = 'low'
        affected_area_m2 = 0.0
        affected_percentage = 0.0
    
    elif outside_area_m2 > tolerance_m2 and outside_area_m2 > 0:
        # Measurable portion extends outside parcel
        result = 'POTENTIAL_BUILDING_ENCROACHMENT'
        affected_area_m2 = outside_area_m2
        affected_percentage = outside_percentage
        
        if outside_percentage > 50:
            priority = 'high'
            reason = f"Majority of proposed footprint ({outside_percentage:.2f}%) extends outside reference parcel boundary"
        elif outside_percentage > 20:
            priority = 'high'
            reason = f"Significant portion ({outside_percentage:.2f}%) of proposed footprint extends outside reference parcel boundary"
        else:
            priority = 'medium'
            reason = f"Minor portion ({outside_percentage:.2f}%) of proposed footprint extends outside reference parcel boundary"
    
    else:
        # Edge case: conflict detected but area is zero (shouldn't happen with valid data)
        result = 'BOUNDARY_VARIANCE'
        reason = "Spatial relationship with reference boundary requires verification"
        priority = 'medium'
        affected_area_m2 = outside_area_m2
        affected_percentage = outside_percentage
    
    # Build evidence list
    evidence = [
        f"Total proposed building area: {house_area_m2:.2f} m²",
        f"Area outside reference parcel: {outside_area_m2:.2f} m²",
        f"Percentage outside: {outside_percentage:.2f}%",
        f"Spatial tolerance threshold: {tolerance_m2} m²",
        f"Conflict detected: {has_conflict}"
    ]
    
    return {
        'result': result,
        'reason': reason,
        'priority': priority,
        'affected_area_m2': round(affected_area_m2, 2),
        'outside_percentage': round(affected_percentage, 2),
        'house_area_m2': round(house_area_m2, 2),
        'has_conflict': has_conflict,
        'tolerance_m2': tolerance_m2,
        'evidence': evidence
    }


def get_diagnosis_details(result: str, metrics: Dict[str, Any], tolerance_m2: float = 0.5) -> Dict[str, Any]:
    """Get complete diagnosis details.
    
    This is a convenience wrapper that calls diagnose_result and returns
    all diagnostic information.
    
    Args:
        result: Diagnosis result state (for compatibility)
        metrics: Spatial measurements from GIS layer
        tolerance_m2: Spatial tolerance threshold
    
    Returns:
        Complete diagnosis dict with all details and evidence
    """
    try:
        diagnosis = diagnose_result(metrics, tolerance_m2)
        return diagnosis
    except DiagnosisError as e:
        raise
    except Exception as e:
        raise DiagnosisError(f"Error generating diagnosis: {str(e)}")
