"""Report generation service.

Responsibilities:
- Load audit records from data/audits/{audit_id}.json
- Reshape audit data for PDF template rendering (create_report_data)
- Render a structured PDF to reports/{audit_id}.pdf (generate_audit_report)
- Return the saved PDF path

Hard rules:
- Missing audit_id → ReportError, never generate an empty/fake report
- No geometry calculations — all numbers come directly from the audit record
- No LLM calls — text comes from the already-generated AI explanation
"""

import json
import os
from datetime import datetime
from typing import Any, Dict

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# ---------------------------------------------------------------------------
# Path helpers (anchored to this file's absolute location)
# ---------------------------------------------------------------------------

_BACKEND_ROOT = os.path.normpath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
)
_PROJECT_ROOT = os.path.normpath(os.path.join(_BACKEND_ROOT, ".."))
_AUDITS_DIR = os.path.join(_PROJECT_ROOT, "data", "audits")
_REPORTS_DIR = os.path.join(_PROJECT_ROOT, "reports")


class ReportError(Exception):
    """Raised when report generation fails due to missing or invalid data."""
    pass


# ---------------------------------------------------------------------------
# Result display helpers
# ---------------------------------------------------------------------------

_RESULT_LABELS = {
    "CLEAR": "CLEAR",
    "POTENTIAL_BUILDING_ENCROACHMENT": "POTENTIAL BOUNDARY CONFLICT",
    "BOUNDARY_VARIANCE": "BOUNDARY VARIANCE",
}

_RESULT_COLORS = {
    "CLEAR": colors.HexColor("#2e7d32"),               # green
    "POTENTIAL_BUILDING_ENCROACHMENT": colors.HexColor("#c62828"),  # red
    "BOUNDARY_VARIANCE": colors.HexColor("#e65100"),   # amber
}


# ---------------------------------------------------------------------------
# Step 1 — reshape audit record into template-ready data
# ---------------------------------------------------------------------------

def create_report_data(audit_record: Dict[str, Any]) -> Dict[str, Any]:
    """Reshape a raw audit JSON record into a flat dict for the PDF template.

    Every value in the returned dict is a pre-formatted string or simple Python
    scalar — no further calculation is done in the rendering step.

    Args:
        audit_record: The dict loaded from data/audits/{audit_id}.json.

    Returns:
        Template-ready dict with keys:
            audit_id, parcel_id, created_at,
            result, result_label, result_color,
            house_area_m2, outside_area_m2, outside_percentage,
            affected_area_m2, has_conflict, priority,
            summary, problem, recommended_action, verification_note,
            legal_note, next_steps

    Raises:
        ReportError: if required fields are missing from the audit record.
    """
    required = ("audit_id", "parcel_id", "diagnosis", "explanation")
    missing = [k for k in required if k not in audit_record]
    if missing:
        raise ReportError(
            f"Audit record is missing required fields: {', '.join(missing)}"
        )

    diag = audit_record["diagnosis"]
    expl = audit_record["explanation"]
    metrics = audit_record.get("metrics", {})
    resolution = audit_record.get("resolution", {})

    result = diag.get("result", "UNKNOWN")

    # Format the ISO timestamp for display
    raw_ts = audit_record.get("created_at", "")
    try:
        dt = datetime.fromisoformat(raw_ts.replace("Z", "+00:00"))
        created_at_display = dt.strftime("%Y-%m-%d %H:%M UTC")
    except (ValueError, AttributeError):
        created_at_display = raw_ts or "Unknown"

    return {
        # Identity
        "audit_id":    audit_record["audit_id"],
        "parcel_id":   audit_record["parcel_id"],
        "created_at":  created_at_display,
        # Result classification
        "result":       result,
        "result_label": _RESULT_LABELS.get(result, result),
        "result_color": _RESULT_COLORS.get(result, colors.black),
        "priority":     diag.get("priority", ""),
        # Measurements (formatted strings — values come from audit record only)
        "house_area_m2":      f"{float(metrics.get('house_area_m2', diag.get('house_area_m2', 0))):.2f} m²",
        "outside_area_m2":    f"{float(metrics.get('outside_area_m2', diag.get('affected_area_m2', 0))):.2f} m²",
        "outside_percentage": f"{float(metrics.get('outside_percentage', diag.get('outside_percentage', 0))):.2f}%",
        "affected_area_m2":   f"{float(diag.get('affected_area_m2', 0)):.2f} m²",
        "has_conflict":       "Yes" if diag.get("has_conflict") else "No",
        # AI explanation text (already generated — not re-derived here)
        "summary":            expl.get("summary", ""),
        "problem":            expl.get("problem", ""),
        "recommended_action": expl.get("recommended_action", ""),
        "verification_note":  expl.get("verification_note", ""),
        # Resolution details
        "legal_note":  resolution.get(
            "legal_note",
            "This assessment is based on supplied reference data. "
            "Legal boundaries and construction approval remain the "
            "responsibility of competent authorities.",
        ),
        "next_steps": resolution.get("next_steps", []),
    }


# ---------------------------------------------------------------------------
# Step 2 — render PDF
# ---------------------------------------------------------------------------

def generate_audit_report(audit_id: str) -> str:
    """Load the audit record for *audit_id* and render a PDF report.

    The PDF is saved to reports/{audit_id}.pdf.

    Args:
        audit_id: The audit identifier (e.g. "AUD-A1B2C3D4").

    Returns:
        Absolute path of the saved PDF file.

    Raises:
        ReportError: if the audit file does not exist, or data is invalid.
    """
    # --- Load audit record ---
    audit_path = os.path.join(_AUDITS_DIR, f"{audit_id}.json")
    if not os.path.exists(audit_path):
        raise ReportError(
            f"Audit record not found: {audit_id}. "
            f"Expected at: {audit_path}"
        )

    try:
        with open(audit_path, "r", encoding="utf-8") as f:
            audit_record = json.load(f)
    except (json.JSONDecodeError, OSError) as exc:
        raise ReportError(f"Failed to load audit record {audit_id}: {exc}")

    # --- Reshape into template data ---
    data = create_report_data(audit_record)

    # --- Prepare output path ---
    os.makedirs(_REPORTS_DIR, exist_ok=True)
    pdf_path = os.path.join(_REPORTS_DIR, f"{audit_id}.pdf")

    # --- Build PDF ---
    _render_pdf(data, pdf_path)

    return pdf_path


def _render_pdf(data: Dict[str, Any], output_path: str) -> None:
    """Render the PDF to *output_path* using reportlab Platypus."""
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2.5 * cm,
        title=f"Land Audit Report — {data['audit_id']}",
        author="AeroBhumiAI",
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Title"],
        fontSize=20,
        spaceAfter=6,
        textColor=colors.HexColor("#1a237e"),
    )
    heading_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontSize=12,
        spaceBefore=14,
        spaceAfter=4,
        textColor=colors.HexColor("#1a237e"),
    )
    body_style = ParagraphStyle(
        "BodyText",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
        spaceAfter=6,
    )
    small_style = ParagraphStyle(
        "SmallText",
        parent=styles["Normal"],
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#555555"),
    )
    result_banner_style = ParagraphStyle(
        "ResultBanner",
        parent=styles["Normal"],
        fontSize=14,
        leading=18,
        textColor=colors.white,
        backColor=data["result_color"],
        borderPadding=(8, 12, 8, 12),
        spaceAfter=10,
    )

    story = []

    # --- Title block ---
    story.append(Paragraph("AeroBhumiAI — Land Audit Report", title_style))
    story.append(Paragraph(
        f"Audit ID: {data['audit_id']} &nbsp;&nbsp;|&nbsp;&nbsp; "
        f"Parcel: {data['parcel_id']} &nbsp;&nbsp;|&nbsp;&nbsp; "
        f"Generated: {data['created_at']}",
        small_style,
    ))
    story.append(HRFlowable(width="100%", thickness=1,
                             color=colors.HexColor("#1a237e"), spaceAfter=10))

    # --- Result banner ---
    story.append(Paragraph(
        f"<b>BUILD CHECK RESULT: {data['result_label']}</b>",
        result_banner_style,
    ))

    # --- Summary ---
    story.append(Paragraph("Summary", heading_style))
    story.append(Paragraph(data["summary"], body_style))

    # --- Measurements table ---
    story.append(Paragraph("Measurements", heading_style))
    table_data = [
        ["Metric", "Value"],
        ["Proposed Building Area", data["house_area_m2"]],
        ["Area Outside Parcel Boundary", data["outside_area_m2"]],
        ["Percentage Outside", data["outside_percentage"]],
        ["Affected Area", data["affected_area_m2"]],
        ["Conflict Detected", data["has_conflict"]],
        ["Priority", data["priority"].capitalize()],
    ]
    measurements_table = Table(
        table_data,
        colWidths=[9 * cm, 7 * cm],
        style=TableStyle([
            ("BACKGROUND",   (0, 0), (-1, 0), colors.HexColor("#1a237e")),
            ("TEXTCOLOR",    (0, 0), (-1, 0), colors.white),
            ("FONTNAME",     (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE",     (0, 0), (-1, 0), 10),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1),
             [colors.HexColor("#f5f5f5"), colors.white]),
            ("FONTSIZE",     (0, 1), (-1, -1), 10),
            ("GRID",         (0, 0), (-1, -1), 0.5, colors.HexColor("#cccccc")),
            ("TOPPADDING",   (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING",  (0, 0), (-1, -1), 8),
        ]),
    )
    story.append(measurements_table)

    # --- Problem description ---
    story.append(Paragraph("What Was Found", heading_style))
    story.append(Paragraph(data["problem"], body_style))

    # --- Recommended action ---
    story.append(Paragraph("Recommended Action", heading_style))
    story.append(Paragraph(data["recommended_action"], body_style))

    # --- Next steps (if any) ---
    if data["next_steps"]:
        story.append(Paragraph("Next Steps", heading_style))
        for step in data["next_steps"]:
            story.append(Paragraph(f"• {step}", body_style))

    # --- Verification note ---
    if data.get("verification_note"):
        story.append(Spacer(1, 6))
        story.append(Paragraph(data["verification_note"], body_style))

    # --- Legal disclaimer footer ---
    story.append(Spacer(1, 14))
    story.append(HRFlowable(width="100%", thickness=0.5,
                             color=colors.HexColor("#aaaaaa")))
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        f"<b>Legal Notice:</b> {data['legal_note']}",
        small_style,
    ))

    doc.build(story)
