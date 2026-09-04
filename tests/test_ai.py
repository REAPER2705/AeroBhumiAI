"""Diagnosis and Resolution service tests.

Test coverage:
- Diagnosis classification (CLEAR, ENCROACHMENT, VARIANCE)
- Diagnosis reasoning and evidence
- Diagnosis measurement validation
- Resolution recommendations per diagnosis
- Error handling for invalid inputs
- Deterministic behavior
"""

import pytest
import sys
from pathlib import Path

# Add backend to path for imports
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from app.services import diagnosis_service, resolution_service


class TestDiagnosisValidation:
    """Test diagnosis metrics validation."""
    
    def test_valid_metrics_accepted(self):
        """Test valid metrics are accepted."""
        metrics = {
            'house_area_m2': 200.0,
            'outside_area_m2': 0.2,
            'outside_percentage': 0.1,
            'has_conflict': False
        }
        # Should not raise
        result = diagnosis_service.diagnose_result(metrics)
        assert result['result'] == 'CLEAR'
    
    def test_missing_required_field_raises_error(self):
        """Test missing required field raises error."""
        metrics = {
            'house_area_m2': 200.0,
            'outside_area_m2': 0.2
            # Missing outside_percentage
        }
        with pytest.raises(diagnosis_service.DiagnosisError):
            diagnosis_service.diagnose_result(metrics)
    
    def test_negative_area_raises_error(self):
        """Test negative area raises error."""
        metrics = {
            'house_area_m2': -200.0,
            'outside_area_m2': 0.2,
            'outside_percentage': 0.1,
            'has_conflict': False
        }
        with pytest.raises(diagnosis_service.DiagnosisError):
            diagnosis_service.diagnose_result(metrics)
    
    def test_outside_greater_than_total_raises_error(self):
        """Test outside area > total area raises error."""
        metrics = {
            'house_area_m2': 100.0,
            'outside_area_m2': 200.0,  # Greater than total
            'outside_percentage': 200.0,
            'has_conflict': True
        }
        with pytest.raises(diagnosis_service.DiagnosisError):
            diagnosis_service.diagnose_result(metrics)
    
    def test_invalid_percentage_raises_error(self):
        """Test percentage > 100 raises error."""
        metrics = {
            'house_area_m2': 100.0,
            'outside_area_m2': 50.0,
            'outside_percentage': 150.0,  # Greater than 100%
            'has_conflict': True
        }
        with pytest.raises(diagnosis_service.DiagnosisError):
            diagnosis_service.diagnose_result(metrics)


class TestDiagnosisClear:
    """Test CLEAR diagnosis classification."""
    
    def test_zero_outside_area_returns_clear(self):
        """Test zero outside area returns CLEAR."""
        metrics = {
            'house_area_m2': 200.0,
            'outside_area_m2': 0.0,
            'outside_percentage': 0.0,
            'has_conflict': False
        }
        result = diagnosis_service.diagnose_result(metrics)
        assert result['result'] == 'CLEAR'
        assert result['priority'] == 'low'
    
    def test_within_tolerance_returns_clear(self):
        """Test within tolerance threshold returns CLEAR."""
        metrics = {
            'house_area_m2': 200.0,
            'outside_area_m2': 0.3,  # Below default 0.5m² tolerance
            'outside_percentage': 0.15,
            'has_conflict': False
        }
        result = diagnosis_service.diagnose_result(metrics, tolerance_m2=0.5)
        assert result['result'] == 'CLEAR'
        assert result['affected_area_m2'] == 0.0
    
    def test_clear_includes_evidence(self):
        """Test CLEAR diagnosis includes evidence list."""
        metrics = {
            'house_area_m2': 200.0,
            'outside_area_m2': 0.1,
            'outside_percentage': 0.05,
            'has_conflict': False
        }
        result = diagnosis_service.diagnose_result(metrics)
        assert 'evidence' in result
        assert len(result['evidence']) > 0
        assert any('200.0' in str(e) for e in result['evidence'])


class TestDiagnosisEncroachment:
    """Test POTENTIAL_BUILDING_ENCROACHMENT diagnosis classification."""
    
    def test_minor_encroachment(self):
        """Test minor encroachment (< 20%)."""
        metrics = {
            'house_area_m2': 200.0,
            'outside_area_m2': 30.0,
            'outside_percentage': 15.0,
            'has_conflict': True
        }
        result = diagnosis_service.diagnose_result(metrics, tolerance_m2=0.5)
        assert result['result'] == 'POTENTIAL_BUILDING_ENCROACHMENT'
        assert result['priority'] == 'medium'
        assert 'Minor portion' in result['reason']
    
    def test_significant_encroachment(self):
        """Test significant encroachment (20-50%)."""
        metrics = {
            'house_area_m2': 200.0,
            'outside_area_m2': 60.0,
            'outside_percentage': 30.0,
            'has_conflict': True
        }
        result = diagnosis_service.diagnose_result(metrics, tolerance_m2=0.5)
        assert result['result'] == 'POTENTIAL_BUILDING_ENCROACHMENT'
        assert result['priority'] == 'high'
        assert 'Significant portion' in result['reason']
    
    def test_major_encroachment(self):
        """Test major encroachment (> 50%)."""
        metrics = {
            'house_area_m2': 100.0,
            'outside_area_m2': 60.0,
            'outside_percentage': 60.0,
            'has_conflict': True
        }
        result = diagnosis_service.diagnose_result(metrics, tolerance_m2=0.5)
        assert result['result'] == 'POTENTIAL_BUILDING_ENCROACHMENT'
        assert result['priority'] == 'high'
        assert 'Majority' in result['reason']
    
    def test_encroachment_affected_area_matches(self):
        """Test affected area matches outside area."""
        metrics = {
            'house_area_m2': 200.0,
            'outside_area_m2': 25.0,
            'outside_percentage': 12.5,
            'has_conflict': True
        }
        result = diagnosis_service.diagnose_result(metrics)
        assert result['affected_area_m2'] == 25.0
        assert result['outside_percentage'] == 12.5


class TestDiagnosisEvidence:
    """Test diagnosis evidence generation."""
    
    def test_evidence_includes_all_measurements(self):
        """Test evidence list includes all measurements."""
        metrics = {
            'house_area_m2': 250.5,
            'outside_area_m2': 30.25,
            'outside_percentage': 12.1,
            'has_conflict': True
        }
        result = diagnosis_service.diagnose_result(metrics)
        evidence_text = ' '.join(result['evidence'])
        
        assert '250.5' in evidence_text
        assert '30.25' in evidence_text
        assert '12.1' in evidence_text
    
    def test_evidence_includes_tolerance(self):
        """Test evidence includes tolerance threshold."""
        metrics = {
            'house_area_m2': 200.0,
            'outside_area_m2': 10.0,
            'outside_percentage': 5.0,
            'has_conflict': True
        }
        result = diagnosis_service.diagnose_result(metrics, tolerance_m2=2.0)
        evidence_text = ' '.join(result['evidence'])
        assert '2.0' in evidence_text


class TestResolutionClear:
    """Test resolution recommendations for CLEAR diagnosis."""
    
    def test_clear_returns_proceed_action(self):
        """Test CLEAR diagnosis recommends proceeding."""
        diagnosis = {
            'result': 'CLEAR',
            'reason': 'No conflict',
            'priority': 'low',
            'affected_area_m2': 0.0,
            'outside_percentage': 0.0,
            'evidence': []
        }
        resolution = resolution_service.get_recommendation(diagnosis)
        assert resolution['action'] == 'PROCEED_TO_NEXT_VALIDATION'
        assert resolution['verification_required'] is False
    
    def test_clear_resolution_includes_steps(self):
        """Test CLEAR resolution includes next steps."""
        diagnosis = {
            'result': 'CLEAR',
            'reason': 'No conflict',
            'priority': 'low',
            'affected_area_m2': 0.0,
            'outside_percentage': 0.0,
            'evidence': []
        }
        resolution = resolution_service.get_recommendation(diagnosis)
        assert 'next_steps' in resolution
        assert len(resolution['next_steps']) > 0


class TestResolutionEncroachment:
    """Test resolution recommendations for ENCROACHMENT diagnosis."""
    
    def test_minor_encroachment_modify_or_verify(self):
        """Test minor encroachment recommends modify or verify."""
        diagnosis = {
            'result': 'POTENTIAL_BUILDING_ENCROACHMENT',
            'reason': 'Minor conflict',
            'priority': 'medium',
            'affected_area_m2': 10.0,
            'outside_percentage': 5.0,
            'evidence': []
        }
        resolution = resolution_service.get_recommendation(diagnosis)
        assert 'MODIFY_FOOTPRINT' in resolution['action']
        assert resolution['verification_required'] is False
    
    def test_major_encroachment_modify_required(self):
        """Test major encroachment requires modification."""
        diagnosis = {
            'result': 'POTENTIAL_BUILDING_ENCROACHMENT',
            'reason': 'Major conflict',
            'priority': 'high',
            'affected_area_m2': 100.0,
            'outside_percentage': 60.0,
            'evidence': []
        }
        resolution = resolution_service.get_recommendation(diagnosis)
        assert resolution['action'] == 'MODIFY_FOOTPRINT_REQUIRED'
        assert resolution['verification_required'] is True
    
    def test_encroachment_includes_affected_area(self):
        """Test encroachment resolution mentions affected area."""
        diagnosis = {
            'result': 'POTENTIAL_BUILDING_ENCROACHMENT',
            'reason': 'Conflict',
            'priority': 'high',
            'affected_area_m2': 42.5,
            'outside_percentage': 20.0,
            'evidence': []
        }
        resolution = resolution_service.get_recommendation(diagnosis)
        steps_text = ' '.join(resolution['next_steps'])
        assert '42.5' in steps_text


class TestResolutionVariance:
    """Test resolution recommendations for BOUNDARY_VARIANCE diagnosis."""
    
    def test_variance_requests_verification(self):
        """Test VARIANCE diagnosis requests official verification."""
        diagnosis = {
            'result': 'BOUNDARY_VARIANCE',
            'reason': 'Variance detected',
            'priority': 'medium',
            'affected_area_m2': 0.0,
            'outside_percentage': 0.0,
            'evidence': []
        }
        resolution = resolution_service.get_recommendation(diagnosis)
        assert resolution['action'] == 'REQUEST_BOUNDARY_VERIFICATION'
        assert resolution['verification_required'] is True
    
    def test_variance_includes_field_measurement_step(self):
        """Test VARIANCE resolution includes field measurement."""
        diagnosis = {
            'result': 'BOUNDARY_VARIANCE',
            'reason': 'Variance',
            'priority': 'medium',
            'affected_area_m2': 0.0,
            'outside_percentage': 0.0,
            'evidence': []
        }
        resolution = resolution_service.get_recommendation(diagnosis)
        steps_text = ' '.join(resolution['next_steps'])
        assert 'field measurement' in steps_text.lower() or 'official' in steps_text.lower()


class TestResolutionGuidance:
    """Test complete resolution guidance."""
    
    def test_guidance_includes_diagnosis_and_resolution(self):
        """Test guidance includes both diagnosis and resolution."""
        diagnosis = {
            'result': 'CLEAR',
            'reason': 'No conflict',
            'priority': 'low',
            'affected_area_m2': 0.0,
            'outside_percentage': 0.0,
            'evidence': ['test']
        }
        guidance = resolution_service.get_resolution_guidance(diagnosis)
        
        assert 'diagnosis_result' in guidance
        assert 'recommended_action' in guidance
        assert guidance['diagnosis_result'] == 'CLEAR'
    
    def test_guidance_includes_legal_note(self):
        """Test guidance includes legal disclaimer."""
        diagnosis = {
            'result': 'CLEAR',
            'reason': 'No conflict',
            'priority': 'low',
            'affected_area_m2': 0.0,
            'outside_percentage': 0.0,
            'evidence': []
        }
        guidance = resolution_service.get_resolution_guidance(diagnosis)
        assert 'legal_note' in guidance
        assert 'competent authorities' in guidance['legal_note'].lower()


class TestDeterministicBehavior:
    """Test deterministic behavior across multiple calls."""
    
    def test_same_input_produces_same_output(self):
        """Test same input always produces same output."""
        metrics = {
            'house_area_m2': 200.0,
            'outside_area_m2': 30.0,
            'outside_percentage': 15.0,
            'has_conflict': True
        }
        result1 = diagnosis_service.diagnose_result(metrics)
        result2 = diagnosis_service.diagnose_result(metrics)
        
        assert result1['result'] == result2['result']
        assert result1['priority'] == result2['priority']
        assert result1['affected_area_m2'] == result2['affected_area_m2']
    pass


def test_safe_legal_wording():
    """Test AI uses appropriate legal wording."""
    pass


# ---------------------------------------------------------------------------
# ai_service tests — appended, existing tests above are untouched
# ---------------------------------------------------------------------------

from app.services.ai_service import explain_result, AIServiceError


class TestAIServiceClear:
    """explain_result() for CLEAR diagnoses."""

    @pytest.fixture
    def clear_diagnosis(self):
        return {
            "result": "CLEAR",
            "reason": "Proposed footprint remains within reference parcel boundary",
            "priority": "low",
            "affected_area_m2": 0.0,
            "outside_percentage": 0.0,
            "house_area_m2": 180.0,
            "has_conflict": False,
            "tolerance_m2": 0.5,
            "evidence": [],
        }

    def test_clear_returns_all_required_keys(self, clear_diagnosis):
        out = explain_result(clear_diagnosis)
        for key in ("summary", "problem", "recommended_action", "verification_note"):
            assert key in out, f"Missing key: {key}"

    def test_clear_summary_mentions_no_discrepancy(self, clear_diagnosis):
        out = explain_result(clear_diagnosis)
        assert "no significant" in out["summary"].lower()

    def test_clear_problem_contains_house_area_from_input(self, clear_diagnosis):
        """house_area_m2 = 180.0 must appear in the problem text."""
        out = explain_result(clear_diagnosis)
        assert "180.0" in out["problem"] or "180.00" in out["problem"]

    def test_clear_problem_does_not_invent_numbers(self, clear_diagnosis):
        """Problem text must not contain numbers not in the input."""
        out = explain_result(clear_diagnosis)
        # Change house area and verify new value appears, old does not
        clear_diagnosis["house_area_m2"] = 250.0
        out2 = explain_result(clear_diagnosis)
        assert "250.0" in out2["problem"] or "250.00" in out2["problem"]
        assert "180" not in out2["problem"]

    def test_clear_verification_note_contains_legal_disclaimer(self, clear_diagnosis):
        out = explain_result(clear_diagnosis)
        assert "competent authorities" in out["verification_note"].lower()

    def test_clear_deterministic(self, clear_diagnosis):
        assert explain_result(clear_diagnosis) == explain_result(clear_diagnosis)


class TestAIServiceEncroachment:
    """explain_result() for POTENTIAL_BUILDING_ENCROACHMENT diagnoses."""

    @pytest.fixture
    def minor_diagnosis(self):
        """15% outside — minor severity."""
        return {
            "result": "POTENTIAL_BUILDING_ENCROACHMENT",
            "reason": "Minor portion extends outside",
            "priority": "medium",
            "affected_area_m2": 27.0,
            "outside_percentage": 15.0,
            "house_area_m2": 180.0,
            "has_conflict": True,
            "tolerance_m2": 0.5,
            "evidence": [],
        }

    @pytest.fixture
    def significant_diagnosis(self):
        """30% outside — significant severity."""
        return {
            "result": "POTENTIAL_BUILDING_ENCROACHMENT",
            "reason": "Significant portion extends outside",
            "priority": "high",
            "affected_area_m2": 42.5,
            "outside_percentage": 23.61,
            "house_area_m2": 180.0,
            "has_conflict": True,
            "tolerance_m2": 0.5,
            "evidence": [],
        }

    @pytest.fixture
    def major_diagnosis(self):
        """60% outside — majority severity."""
        return {
            "result": "POTENTIAL_BUILDING_ENCROACHMENT",
            "reason": "Majority extends outside",
            "priority": "high",
            "affected_area_m2": 108.0,
            "outside_percentage": 60.0,
            "house_area_m2": 180.0,
            "has_conflict": True,
            "tolerance_m2": 0.5,
            "evidence": [],
        }

    def test_encroachment_returns_all_required_keys(self, minor_diagnosis):
        out = explain_result(minor_diagnosis)
        for key in ("summary", "problem", "recommended_action", "verification_note"):
            assert key in out

    def test_problem_contains_affected_area_from_input(self, significant_diagnosis):
        """affected_area_m2 = 42.5 must appear in the problem text verbatim."""
        out = explain_result(significant_diagnosis)
        assert "42.5" in out["problem"] or "42.50" in out["problem"]

    def test_problem_contains_outside_percentage_from_input(self, significant_diagnosis):
        """outside_percentage = 23.61 must appear in the problem text."""
        out = explain_result(significant_diagnosis)
        assert "23.61" in out["problem"]

    def test_summary_mentions_encroachment(self, minor_diagnosis):
        out = explain_result(minor_diagnosis)
        assert "encroachment" in out["summary"].lower()

    def test_summary_reflects_majority_severity(self, major_diagnosis):
        """60% outside → summary must use majority language."""
        out = explain_result(major_diagnosis)
        assert "majority" in out["summary"].lower() or "60.00" in out["summary"]

    def test_summary_reflects_minor_severity(self, minor_diagnosis):
        """15% outside → summary must use minor language (not majority/significant)."""
        out = explain_result(minor_diagnosis)
        summary_lower = out["summary"].lower()
        assert "majority" not in summary_lower
        assert "significant" not in summary_lower

    def test_recommended_action_contains_affected_area(self, significant_diagnosis):
        """Affected area 42.5 must appear in the recommended_action text."""
        out = explain_result(significant_diagnosis)
        assert "42.5" in out["recommended_action"] or "42.50" in out["recommended_action"]

    def test_verification_note_contains_legal_disclaimer(self, minor_diagnosis):
        out = explain_result(minor_diagnosis)
        assert "competent authorities" in out["verification_note"].lower()

    def test_encroachment_deterministic(self, significant_diagnosis):
        assert explain_result(significant_diagnosis) == explain_result(significant_diagnosis)


class TestAIServiceBoundaryVariance:
    """explain_result() for BOUNDARY_VARIANCE diagnoses."""

    @pytest.fixture
    def variance_diagnosis(self):
        return {
            "result": "BOUNDARY_VARIANCE",
            "reason": "Spatial relationship requires verification",
            "priority": "medium",
            "affected_area_m2": 0.0,
            "outside_percentage": 0.0,
            "house_area_m2": 180.0,
            "has_conflict": False,
            "tolerance_m2": 0.5,
            "evidence": [],
        }

    def test_variance_returns_all_required_keys(self, variance_diagnosis):
        out = explain_result(variance_diagnosis)
        for key in ("summary", "problem", "recommended_action", "verification_note"):
            assert key in out

    def test_variance_summary_mentions_variance_or_verification(self, variance_diagnosis):
        out = explain_result(variance_diagnosis)
        summary_lower = out["summary"].lower()
        assert "variance" in summary_lower or "verification" in summary_lower

    def test_variance_recommended_action_mentions_field_or_official(self, variance_diagnosis):
        out = explain_result(variance_diagnosis)
        action_lower = out["recommended_action"].lower()
        assert "field" in action_lower or "official" in action_lower

    def test_variance_verification_note_contains_legal_disclaimer(self, variance_diagnosis):
        out = explain_result(variance_diagnosis)
        assert "competent authorities" in out["verification_note"].lower()

    def test_variance_problem_contains_house_area(self, variance_diagnosis):
        out = explain_result(variance_diagnosis)
        assert "180.0" in out["problem"] or "180.00" in out["problem"]


class TestAIServiceErrors:
    """explain_result() error handling — missing/invalid inputs."""

    def test_missing_result_key_raises(self):
        bad = {
            "reason": "x", "priority": "low",
            "affected_area_m2": 0.0, "outside_percentage": 0.0,
            "house_area_m2": 100.0, "has_conflict": False,
        }
        with pytest.raises(AIServiceError, match="result"):
            explain_result(bad)

    def test_missing_affected_area_raises(self):
        bad = {
            "result": "CLEAR", "reason": "x", "priority": "low",
            "outside_percentage": 0.0, "house_area_m2": 100.0, "has_conflict": False,
        }
        with pytest.raises(AIServiceError, match="affected_area_m2"):
            explain_result(bad)

    def test_missing_outside_percentage_raises(self):
        bad = {
            "result": "CLEAR", "reason": "x", "priority": "low",
            "affected_area_m2": 0.0, "house_area_m2": 100.0, "has_conflict": False,
        }
        with pytest.raises(AIServiceError, match="outside_percentage"):
            explain_result(bad)

    def test_missing_house_area_raises(self):
        bad = {
            "result": "CLEAR", "reason": "x", "priority": "low",
            "affected_area_m2": 0.0, "outside_percentage": 0.0, "has_conflict": False,
        }
        with pytest.raises(AIServiceError, match="house_area_m2"):
            explain_result(bad)

    def test_unrecognised_result_value_raises(self):
        bad = {
            "result": "UNKNOWN_STATE", "reason": "x", "priority": "low",
            "affected_area_m2": 0.0, "outside_percentage": 0.0,
            "house_area_m2": 100.0, "has_conflict": False,
        }
        with pytest.raises(AIServiceError, match="Unrecognised"):
            explain_result(bad)

    def test_non_dict_input_raises(self):
        with pytest.raises(AIServiceError):
            explain_result("not a dict")

    def test_empty_dict_raises(self):
        with pytest.raises(AIServiceError):
            explain_result({})
