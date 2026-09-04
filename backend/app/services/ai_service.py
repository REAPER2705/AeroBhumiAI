"""AI explanation service — deterministic template-based approach.

Responsibilities:
- Convert structured GIS/diagnosis facts into plain-language output
- Never perform geometry calculations (that is spatial_service's job)
- Never invent, estimate, or re-derive measurements
- Produce output matching the spec's AI contract:
  { summary, problem, recommended_action, verification_note }

Architecture note:
  Two steps are kept deliberately separate so the text-generation step can be
  swapped for a real LLM call later without changing explain_result()'s signature:

  1. _extract_facts(diagnosis)      → plain Python dict of typed facts
  2. _render_explanation(facts)     → final text output dict

  A future LLM integration would replace _render_explanation() only.

Hard rules (from project spec):
  - Every number in the output text comes directly from the input dict.
  - Thresholds (>50% = majority, >20% = significant, else minor) reuse the
    same boundaries already established in diagnosis_service.py.
  - No legal ownership, boundary validity, or construction approval claims.
    Disclaimer language mirrors resolution_service.py's legal_note field.
  - Missing required key → AIServiceError, never placeholder text.
"""

from typing import Any, Dict

# Required keys that must be present in the diagnosis dict passed to explain_result.
_REQUIRED_KEYS = (
    "result",
    "reason",
    "affected_area_m2",
    "outside_percentage",
    "house_area_m2",
    "has_conflict",
    "priority",
)

# Legal disclaimer — mirrors resolution_service.py's legal_note field exactly.
_LEGAL_DISCLAIMER = (
    "This assessment is based on supplied reference data. "
    "Legal boundaries and construction approval remain the responsibility "
    "of competent authorities."
)


class AIServiceError(Exception):
    """Raised when explain_result() receives an invalid or incomplete input."""
    pass


# ---------------------------------------------------------------------------
# Step 1 — fact extraction (pure data, no text composition)
# ---------------------------------------------------------------------------

def _extract_facts(diagnosis: Dict[str, Any]) -> Dict[str, Any]:
    """Validate the diagnosis dict and extract typed facts for text generation.

    Raises:
        AIServiceError: if any required key is missing or result is unrecognised.
    """
    if not isinstance(diagnosis, dict):
        raise AIServiceError("Diagnosis input must be a dictionary.")

    for key in _REQUIRED_KEYS:
        if key not in diagnosis:
            raise AIServiceError(
                f"Missing required key in diagnosis input: '{key}'"
            )

    result = diagnosis["result"]
    valid_results = {"CLEAR", "BOUNDARY_VARIANCE", "POTENTIAL_BUILDING_ENCROACHMENT"}
    if result not in valid_results:
        raise AIServiceError(
            f"Unrecognised result value: '{result}'. "
            f"Expected one of: {sorted(valid_results)}"
        )

    return {
        "result":             result,
        "reason":             str(diagnosis["reason"]),
        "affected_area_m2":   float(diagnosis["affected_area_m2"]),
        "outside_percentage": float(diagnosis["outside_percentage"]),
        "house_area_m2":      float(diagnosis["house_area_m2"]),
        "has_conflict":       bool(diagnosis["has_conflict"]),
        "priority":           str(diagnosis["priority"]),
    }


# ---------------------------------------------------------------------------
# Step 2 — text rendering (could be replaced by an LLM call)
# ---------------------------------------------------------------------------

def _render_explanation(facts: Dict[str, Any]) -> Dict[str, str]:
    """Convert structured facts into plain-language explanation output.

    All numbers used in text are taken verbatim from *facts*; no arithmetic
    or estimation is performed here.

    Returns:
        dict with keys: summary, problem, recommended_action, verification_note
    """
    result             = facts["result"]
    affected_area_m2   = facts["affected_area_m2"]
    outside_percentage = facts["outside_percentage"]
    house_area_m2      = facts["house_area_m2"]

    # ------------------------------------------------------------------
    # CLEAR
    # ------------------------------------------------------------------
    if result == "CLEAR":
        summary = (
            "No significant spatial discrepancy was detected between the "
            "proposed building footprint and the reference parcel boundary."
        )
        problem = (
            "No significant spatial discrepancy was detected. "
            "The proposed footprint of {house_area_m2:.2f} m\u00b2 "
            "lies within the reference parcel boundary."
        ).format(house_area_m2=house_area_m2)
        recommended_action = (
            "Proceed with applicable next validation or approval step. "
            "Consider on-site verification if the accuracy of the reference "
            "boundary data is uncertain."
        )
        verification_note = _LEGAL_DISCLAIMER

    # ------------------------------------------------------------------
    # POTENTIAL_BUILDING_ENCROACHMENT
    # ------------------------------------------------------------------
    elif result == "POTENTIAL_BUILDING_ENCROACHMENT":
        # Severity language mirrors diagnosis_service.py thresholds
        if outside_percentage > 50:
            severity = "the majority ({pct:.2f}%)".format(pct=outside_percentage)
            action_verb = "Modify the proposed footprint"
        elif outside_percentage > 20:
            severity = "a significant portion ({pct:.2f}%)".format(pct=outside_percentage)
            action_verb = "Modify the proposed footprint or request official boundary verification"
        else:
            severity = "a minor portion ({pct:.2f}%)".format(pct=outside_percentage)
            action_verb = "Modify the proposed footprint or request official boundary verification"

        summary = (
            "A potential building encroachment was detected. "
            "{severity} of the proposed {house_area_m2:.2f} m\u00b2 "
            "footprint extends outside the reference parcel boundary."
        ).format(
            severity=severity.capitalize(),
            house_area_m2=house_area_m2,
        )
        problem = (
            "{affected_area_m2:.2f} m\u00b2 ({pct:.2f}%) of the proposed "
            "building footprint lies outside the reference parcel boundary."
        ).format(
            affected_area_m2=affected_area_m2,
            pct=outside_percentage,
        )
        recommended_action = (
            "{action_verb}. Affected area: {affected_area_m2:.2f} m\u00b2. "
            "Review the affected boundary location and, if required, contact "
            "the competent authority for official boundary clarification."
        ).format(
            action_verb=action_verb,
            affected_area_m2=affected_area_m2,
        )
        verification_note = (
            "Official boundary verification is recommended before proceeding "
            "with construction. " + _LEGAL_DISCLAIMER
        )

    # ------------------------------------------------------------------
    # BOUNDARY_VARIANCE
    # ------------------------------------------------------------------
    else:  # BOUNDARY_VARIANCE
        summary = (
            "A potential boundary variance was detected. "
            "The spatial relationship between the proposed footprint and the "
            "reference parcel boundary requires verification."
        )
        problem = (
            "The reference parcel boundary and the observed spatial evidence "
            "do not clearly align. Verification is required before conclusions "
            "can be drawn about the proposed {house_area_m2:.2f} m\u00b2 footprint."
        ).format(house_area_m2=house_area_m2)
        recommended_action = (
            "Request field measurement or official boundary demarcation. "
            "Compare the reference parcel geometry with current visible "
            "boundary conditions and contact the competent authority for "
            "official boundary clarification."
        )
        verification_note = (
            "Official boundary verification is required before any construction "
            "decision is made. " + _LEGAL_DISCLAIMER
        )

    return {
        "summary":             summary,
        "problem":             problem,
        "recommended_action":  recommended_action,
        "verification_note":   verification_note,
    }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def explain_result(diagnosis: Dict[str, Any]) -> Dict[str, str]:
    """Generate a plain-language explanation for a spatial analysis diagnosis.

    Deterministic template-based implementation.  Designed so _render_explanation
    can be swapped for an LLM call in the future without changing this signature.

    Args:
        diagnosis: The full dict returned by diagnosis_service.diagnose_result(),
                   containing at minimum: result, reason, affected_area_m2,
                   outside_percentage, house_area_m2, has_conflict, priority.

    Returns:
        dict with keys:
            summary             (str) — one-sentence status headline
            problem             (str) — concrete description of what was found,
                                        using numbers directly from the input
            recommended_action  (str) — what to do next
            verification_note   (str) — legal disclaimer (always present)

    Raises:
        AIServiceError: if a required key is missing or result is unrecognised.
    """
    facts = _extract_facts(diagnosis)
    return _render_explanation(facts)
