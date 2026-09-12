AeroBhumiAI — Government Verification Module PRD
Objective

Add a minimal Government Verification module to the existing AeroBhumiAI prototype.

The module will demonstrate how a government/survey official can compare official land records with observed spatial reality, understand the detected inconsistency through AI, and visually inspect the issue using a lightweight 3D representation.

VERY IMPORTANT
Do NOT modify the existing Citizen/User workflow.
Do NOT change existing parcel selection, construction-check, house-drawing, result or user-facing functionality.
Do NOT replace existing APIs unnecessarily.
Government data can be mock/demo data.
Existing GIS calculations remain the source of truth.
AI is used for explanation, not measurement.
1. Government Dashboard

Create/add a Government section using the existing application's design system.

Keep it visually clean and minimal.

Show 3 important areas:
A. Conflict Cases

Example mock cases:

P-001   CLEAR
P-002   BOUNDARY INCONSISTENCY
P-003   POTENTIAL ENCROACHMENT

Each case should display:

Parcel ID
Conflict type
Priority
Affected area
Status

Example:

P-002
BOUNDARY INCONSISTENCY
37.4 m² affected
HIGH
FIELD VERIFICATION

Clicking/selecting a case should update the visualization.

2. Record vs Reality

For the selected parcel show:

Official Record
Parcel ID: P-002
Registered Area: 1250 m²
Source: Government Record
Observed Reality
Observed Area: 1287.4 m²
Affected Area: 37.4 m²
Affected Side: East
Comparison
MATCH

or

⚠ POTENTIAL INCONSISTENCY

Show:

Area variance
Affected area
Affected side
Conflict type

Do not calculate these using Gemini.

Use deterministic/mock spatial values.

3. 2D Spatial Visualization

The selected government case should display a map.

Show:

Official Parcel Boundary
        +
Observed Building / Geometry
        +
Highlighted Conflict Area

The affected region should be visually obvious.

Example concept:

┌──────────────────────────┐
│                          │
│     OFFICIAL PARCEL      │
│                          │
│               ┌──────────┤
│               │ BUILDING │
│               │██████████│ ← overlap
│               └──────────┘
│                    ⚠     │
└──────────────────────────┘

Reuse the existing map/GIS infrastructure wherever possible.

4. Lightweight 3D Visualization ⭐

Add a small 3D spatial visualization beside the 2D map.

Use:

Three.js / React Three Fiber

only if compatible with the existing frontend.

Purpose

The 3D view is visual explanation, NOT the source of measurement.

Represent:

Parcel as a flat extruded polygon/block
Building as a simple 3D block
Neighbouring structure as another block where applicable
Conflict/overlap visually highlighted

Example concept:

                 ┌─────────┐
                 │Building │
                 │         │
          ┌──────┴─────────┘
          │  PARCEL
          │
          │
          └────────────────

The building should visibly extend into/overlap the parcel boundary for the relevant mock case.

Keep it lightweight

Do NOT implement:

real 3D reconstruction
terrain generation
photogrammetry
complex models
heavy rendering
new backend infrastructure

The 3D element exists only to make the spatial conflict immediately understandable to judges.

5. AI Technical Summary ⭐

Add one button:

Generate AI Technical Summary

When clicked, send the already calculated case data to the existing AI/Gemini service if possible.

Input:

{
  "parcel_id": "P-002",
  "registered_area_m2": 1250,
  "observed_area_m2": 1287.4,
  "area_variance_percent": 2.99,
  "affected_area_m2": 37.4,
  "affected_side": "East",
  "conflict_type": "BOUNDARY_INCONSISTENCY",
  "priority": "HIGH"
}

Gemini should generate exactly three sections:

What happened?

Short explanation.

Why was it flagged?

Explain the supplied spatial evidence.

What should be verified?

Give the appropriate field/official verification action.

Example:

What happened?
A potential spatial inconsistency was detected along the eastern boundary of P-002.

Why was it flagged?
The observed geometry differs from the supplied cadastral geometry, affecting approximately 37.4 m².

What should be verified?
Conduct official field demarcation of the eastern boundary and compare the adjoining parcel geometry.

6. AI Guardrails

Gemini MUST NOT:

calculate area
modify area
invent coordinates
invent parcel IDs
change IoU
change GIS measurements
declare legal ownership
declare someone legally guilty of encroachment
claim corruption
make a final legal determination

Always use:

Potential spatial inconsistency

Requires official field verification

Spatial finding, not legal determination

7. Government Workflow
Government Dashboard
        ↓
Select Case
        ↓
Record vs Reality
        ↓
2D GIS Comparison
        +
3D Visualisation
        ↓
Spatial Evidence
        ↓
AI Technical Summary
        ↓
Recommended Verification
8. Mock Data

Use only 3 demo cases.

Case 1
P-001
CLEAR
0 m² affected
LOW
NO ACTION
Case 2
P-002
BOUNDARY INCONSISTENCY
37.4 m² affected
HIGH
FIELD VERIFICATION
Case 3
P-003
POTENTIAL ENCROACHMENT
22.1 m² affected
HIGH
FIELD VERIFICATION

Keep the data in a simple frontend mock-data file unless the existing backend architecture makes another approach easier.

9. UI Layout

Use approximately:

┌────────────────────────────────────────────────────┐
│ GOVERNMENT VERIFICATION                            │
├─────────────────────┬──────────────────────────────┤
│ CONFLICT CASES      │ CASE DETAILS                 │
│                     │                              │
│ P-001  CLEAR        │ P-002                        │
│ P-002  ⚠           │ Boundary Inconsistency      │
│ P-003  ⚠           │ 37.4 m² affected             │
│                     │ East                         │
├─────────────────────┴──────────────────────────────┤
│                                                    │
│             2D MAP          │       3D VIEW        │
│                             │                      │
│       Parcel + Conflict     │   3D Parcel +       │
│                             │   Building           │
│                                                    │
├────────────────────────────────────────────────────┤
│ [ Generate AI Technical Summary ]                  │
├────────────────────────────────────────────────────┤
│ AI TECHNICAL SUMMARY                               │
│                                                    │
│ What happened?                                     │
│ Why was it flagged?                                │
│ What should be verified?                           │
└────────────────────────────────────────────────────┘
10. Technical Requirements

Use existing:

React
TypeScript
Existing API service
Existing GIS/map components
Existing Gemini integration where possible

For 3D:

three
@react-three/fiber
@react-three/drei

Only install these if they are not already available.

Do not create unnecessary architecture.
11. Acceptance Criteria

Implementation is complete when:

 Government section is accessible.
 3 mock cases are displayed.
 Selecting a case changes its details.
 Official vs observed data is displayed.
 2D spatial comparison is visible.
 Conflict area is visually highlighted.
 Lightweight 3D visualization works.
 3D view changes with selected case.
 AI Technical Summary button works.
 AI uses supplied measurements without changing them.
 Recommendation is generated.
 Legal disclaimer is visible.
 Existing Citizen/User workflow is unchanged.
 Existing APIs continue working.
 Existing tests continue passing.
 Frontend production build succeeds.