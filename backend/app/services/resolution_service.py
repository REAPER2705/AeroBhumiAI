"""Resolution and recommendation service.

Responsibilities:
- Generate actionable recommendations for each diagnosis result
- Provide next steps based on classification
- Create resolution guidance for spatial conflicts
- Never make legal determinations

Resolution Logic:
- CLEAR: Continue to next validation/approval step
- POTENTIAL_BUILDING_ENCROACHMENT: Modify footprint or verify boundary
- BOUNDARY_VARIANCE: Request field measurement or official verification
"""

from typing import Dict, Any


class ResolutionError(Exception):
    """Custom exception for resolution errors."""
    pass


def get_recommendation(diagnosis: Dict[str, Any]) -> Dict[str, Any]:
    """Generate actionable recommendation based on diagnosis result.
    
    Args:
        diagnosis: Complete diagnosis dict from diagnosis_service.diagnose_result()
    
    Returns:
        Dict with:
            - action: Primary recommended action
            - next_steps: List of recommended next steps
            - verification_required: Boolean indicating if official verification needed
            - affected_boundary: Description of affected boundary (if applicable)
    
    Raises:
        ResolutionError: If diagnosis is invalid or missing required fields
    """
    if not isinstance(diagnosis, dict):
        raise ResolutionError("Diagnosis must be a dictionary")
    
    result = diagnosis.get('result')
    affected_area_m2 = diagnosis.get('affected_area_m2', 0)
    outside_percentage = diagnosis.get('outside_percentage', 0)
    
    if not result or result not in ['CLEAR', 'BOUNDARY_VARIANCE', 'POTENTIAL_BUILDING_ENCROACHMENT']:
        raise ResolutionError(f"Invalid or missing result: {result}")
    
    # Resolution recommendations per diagnosis result
    if result == 'CLEAR':
        return {
            'action': 'PROCEED_TO_NEXT_VALIDATION',
            'description': 'No spatial conflict detected from supplied reference data',
            'next_steps': [
                'Proposed building footprint is within reference parcel boundary',
                'Proceed with applicable next validation or approval step',
                'Consider on-site verification if reference boundary accuracy is uncertain'
            ],
            'verification_required': False,
            'affected_boundary': None,
            'priority': 'low'
        }
    
    elif result == 'POTENTIAL_BUILDING_ENCROACHMENT':
        if outside_percentage > 50:
            action = 'MODIFY_FOOTPRINT_REQUIRED'
            description = f'Majority of proposed building ({outside_percentage:.2f}%) extends outside reference parcel'
            primary_step = 'Modify proposed building footprint to remain fully within reference parcel boundary'
        else:
            action = 'MODIFY_FOOTPRINT_OR_VERIFY'
            description = f'{outside_percentage:.2f}% of proposed building extends outside reference parcel'
            primary_step = 'Either modify proposed footprint or request official boundary verification'
        
        return {
            'action': action,
            'description': description,
            'next_steps': [
                primary_step,
                f'Affected area in conflict: {affected_area_m2:.2f} m²',
                'Review affected boundary location(s)',
                'If boundary verification required, contact competent authority',
                'Verify ownership/rights for affected boundary if building extends to adjoining parcel'
            ],
            'verification_required': outside_percentage > 20,  # High if >20% outside
            'affected_boundary': f'Portion of parcel boundary exceeding {affected_area_m2:.2f} m²',
            'priority': 'high' if outside_percentage > 50 else 'medium'
        }
    
    elif result == 'BOUNDARY_VARIANCE':
        return {
            'action': 'REQUEST_BOUNDARY_VERIFICATION',
            'description': 'Reference boundary and visible spatial evidence require verification',
            'next_steps': [
                'Request field measurement or official boundary demarcation',
                'Compare reference parcel geometry with current visible boundary conditions',
                'Contact competent authority for official boundary clarification',
                'Document discrepancies between reference data and field observations',
                'Consider adjoining parcel comparison if relevant'
            ],
            'verification_required': True,
            'affected_boundary': 'Reference parcel boundary requires verification',
            'priority': 'medium'
        }
    
    else:
        raise ResolutionError(f"Unsupported result state: {result}")


def get_resolution_guidance(diagnosis: Dict[str, Any]) -> Dict[str, Any]:
    """Get detailed resolution guidance for a diagnosis.
    
    Combines diagnosis details with recommendations and action guidance.
    
    Args:
        diagnosis: Complete diagnosis dict from diagnosis_service
    
    Returns:
        Comprehensive resolution guidance dict
    
    Raises:
        ResolutionError: If diagnosis is invalid
    """
    try:
        recommendation = get_recommendation(diagnosis)
    except ResolutionError:
        raise
    
    return {
        'diagnosis_result': diagnosis.get('result'),
        'diagnosis_reason': diagnosis.get('reason'),
        'diagnosis_evidence': diagnosis.get('evidence', []),
        'affected_area_m2': diagnosis.get('affected_area_m2', 0),
        'outside_percentage': diagnosis.get('outside_percentage', 0),
        'priority': recommendation.get('priority'),
        'recommended_action': recommendation.get('action'),
        'action_description': recommendation.get('description'),
        'next_steps': recommendation.get('next_steps', []),
        'verification_required': recommendation.get('verification_required', False),
        'affected_boundary': recommendation.get('affected_boundary'),
        'legal_note': 'This assessment is based on supplied reference data. Legal boundaries and construction approval remain the responsibility of competent authorities.'
    }
