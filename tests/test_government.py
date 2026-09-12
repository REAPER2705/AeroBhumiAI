"""Government Verification Module Tests

Tests for government case analysis and AI summary generation
"""

import pytest
import sys
from pathlib import Path
from fastapi.testclient import TestClient

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from app.main import app

client = TestClient(app)


class TestGovernmentEndpoints:
    """Test government verification endpoints"""
    
    def test_government_case_summary_p001_clear(self):
        """Test AI summary generation for CLEAR case (P-001)"""
        case_data = {
            "parcel_id": "P-001",
            "registered_area_m2": 1250,
            "observed_area_m2": 1250,
            "area_variance_percent": 0,
            "affected_area_m2": 0,
            "affected_side": "N/A",
            "conflict_type": "CLEAR",
            "priority": "LOW"
        }
        
        response = client.post("/api/government/case-summary", json=case_data)
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["parcel_id"] == "P-001"
        assert "what_happened" in data
        assert "why_flagged" in data
        assert "what_to_verify" in data
        assert "disclaimer" in data
    
    def test_government_case_summary_p002_boundary_inconsistency(self):
        """Test AI summary generation for BOUNDARY_INCONSISTENCY case (P-002)"""
        case_data = {
            "parcel_id": "P-002",
            "registered_area_m2": 1250,
            "observed_area_m2": 1287.4,
            "area_variance_percent": 2.99,
            "affected_area_m2": 37.4,
            "affected_side": "East",
            "conflict_type": "BOUNDARY_INCONSISTENCY",
            "priority": "HIGH"
        }
        
        response = client.post("/api/government/case-summary", json=case_data)
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["parcel_id"] == "P-002"
        
        # Verify the summary sections exist and contain relevant info
        assert len(data["what_happened"]) > 0
        assert len(data["why_flagged"]) > 0
        assert len(data["what_to_verify"]) > 0
    
    def test_government_case_summary_p003_encroachment(self):
        """Test AI summary generation for POTENTIAL_ENCROACHMENT case (P-003)"""
        case_data = {
            "parcel_id": "P-003",
            "registered_area_m2": 1250,
            "observed_area_m2": 1272.1,
            "area_variance_percent": 1.77,
            "affected_area_m2": 22.1,
            "affected_side": "West",
            "conflict_type": "POTENTIAL_ENCROACHMENT",
            "priority": "HIGH"
        }
        
        response = client.post("/api/government/case-summary", json=case_data)
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["parcel_id"] == "P-003"
        assert data["llm_used"] in [True, False]  # Either LLM or fallback
        
        # Verify disclaimer is present (AI safety guardrail)
        assert "disclaimer" in data
        assert len(data["disclaimer"]) > 0
    
    def test_government_case_summary_contains_disclaimer(self):
        """Test that all summaries contain legal disclaimer"""
        case_data = {
            "parcel_id": "P-001",
            "registered_area_m2": 1250,
            "observed_area_m2": 1250,
            "area_variance_percent": 0,
            "affected_area_m2": 0,
            "affected_side": "N/A",
            "conflict_type": "CLEAR",
            "priority": "LOW"
        }
        
        response = client.post("/api/government/case-summary", json=case_data)
        assert response.status_code == 200
        data = response.json()
        
        # Disclaimer must be present (safety guardrail)
        assert "disclaimer" in data
        assert len(data["disclaimer"]) > 0
        # Should mention it's not a legal determination
        assert (
            "spatial" in data["disclaimer"].lower() or
            "verification" in data["disclaimer"].lower() or
            "legal" in data["disclaimer"].lower()
        )
    
    def test_government_health_check(self):
        """Test that health check endpoint still works (existing functionality)"""
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
