"""Report generation service.

Responsibilities:
- Generate PDF audit reports
- Template rendering
- Include parcel info, measurements, result, explanation, action
"""


def generate_audit_report(audit_id: str) -> str:
    """Generate PDF audit report and return file path."""
    pass


def create_report_data(audit_record: dict) -> dict:
    """Format audit data for report template."""
    pass
