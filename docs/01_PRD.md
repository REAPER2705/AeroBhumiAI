LAND-AUDIT AI
Product Requirements Document
Version: 1.0
Status: Hackathon MVP
Product: AI-Assisted Land & Construction Pre-Validation System
1. Product Overview
LAND-AUDIT AI is an AI-assisted geospatial platform that helps citizens and field teams 
perform preliminary spatial validation of proposed construction against a 
recorded/reference land parcel.
The system combines:
Parcel boundary data
Drone/orthomosaic imagery
Interactive GIS maps
Proposed building footprints
Deterministic spatial analysis
Optional SAM 2 image segmentation
AI-generated explanations
Actionable resolution recommendations
Audit report generation
The product is intended to identify and explain potential spatial discrepancies before 
construction.
Core Product Principle
Detect → Measure → Diagnose → Solve → Verify → Report
The system must not stop at a warning.
2. Problem Statement
A citizen planning to construct a house may have difficulty understanding whether the 
proposed building footprint spatially fits within the recorded/reference parcel.
Potential issues include:
Building footprint extending beyond the parcel
Differences between reference boundaries and visible site conditions
Existing structures appearing outside the reference parcel
Potential road/right-of-way overlap
Lack of understandable spatial analysis
Manual spatial checking can require GIS expertise and can be time-consuming.
LAND-AUDIT AI converts this process into an interactive workflow.
3. Product Vision
A user should be able to:
1. Select a parcel.
2. View its reference boundary.
3. Upload/view drone imagery.
4. Draw a proposed house.
5. Click CHECK BUILD.
6. Receive a clear result.
7. Understand the affected area.
8. Receive a practical next action.
9. Edit the house and check again.
10. Generate an audit report.
4. Target Users
Primary — Citizen / Property Owner
Wants to perform preliminary spatial validation before construction.
Secondary — Field Operator / Survey Assistant
Wants to quickly identify and document potential spatial discrepancies.
Tertiary — Planning / Administrative Team
Uses the analysis as supporting information for further verification.
5. Core User Flow
SELECT PARCEL
↓
VIEW REFERENCE BOUNDARY
6. Core Features
F-01 Parcel Selection
Parcel ID
Reference area
Boundary
Boundary source
Boundary status
F-02 Parcel Boundary Visualization
      ↓
UPLOAD DRONE / ORTHOMOSAIC
      ↓
VIEW MAP
      ↓
DRAW PROPOSED HOUSE
      ↓
CHECK BUILD
      ↓
GIS ANALYSIS
      ↓
MEASURE
      ↓
DIAGNOSIS
      ↓
AI EXPLANATION
      ↓
RECOMMENDED ACTION
      ↓
EDIT / RECHECK
      ↓
GENERATE REPORT
User can select an available parcel.
Display:
Display the parcel as a polygon on an interactive map.
The boundary must have a visible distinction from other map layers.
F-03 Drone / Orthomosaic Upload
User can upload georeferenced imagery.
Supported MVP formats:
.tif
.tiff
The system should read:
CRS
Bounds
Resolution
Transform
F-04 Interactive Map
The map should support:
Parcel layer
Drone imagery
Proposed building
Optional segmentation
Optional roads
Conflict visualization
F-05 Proposed House Drawing
User can draw a polygon representing the proposed house/building footprint.
The user can:
Create
Edit
Delete
Re-check
the proposed footprint.
F-06 Spatial Validation
The system compares:
REFERENCE PARCEL
+
PROPOSED HOUSE
using deterministic GIS operations.
F-07 Affected Area Calculation
The system calculates:
Proposed building area
Area outside parcel
Percentage affected
Relevant overlap/intersection
Optional boundary distance
F-08 Diagnosis
MVP supports three primary outcomes:
CLEAR
Proposed footprint is spatially within the reference parcel.
BOUNDARY_VARIANCE
Potential boundary discrepancy/uncertainty requires verification.
POTENTIAL_BUILDING_ENCROACHMENT
A measurable portion of the proposed footprint lies outside the reference parcel.
F-09 Resolution Recommendation
Every non-clear result must include an actionable recommendation.
Example:
Adjust the proposed footprint to remain within the reference parcel or request 
official boundary verification before construction.
F-10 AI Explanation
AI converts deterministic GIS measurements into understandable language.
AI does NOT perform geometry calculations.
F-11 Audit Report
Generate a report containing:
Parcel information
Boundary source/status
Proposed building
Spatial measurements
Result
Explanation
Recommended action
Map/snapshot
Disclaimer
7. SAM 2 Feature
SAM 2 is an optional computer-vision enhancement.
It may be used to segment visible:
Buildings
Roofs
Roads
Other relevant regions
SAM 2 does NOT determine:
Ownership
Legal boundaries
Property rights
Construction approval
SAM 2 answers:
Where is the visible object?
GIS answers:
Where is that object relative to the reference parcel?
8. Result UX
The main result must be simple.
9. Boundary Source Policy
10. Legal Positioning
BUILD CHECK
RESULT
POTENTIAL BOUNDARY CONFLICT
WHAT IS WRONG?
42.5 m² of the proposed footprint lies outside
the reference parcel.
AFFECTED AREA
42.5 m²
WHAT SHOULD I DO?
Adjust the footprint or request official
boundary verification before construction.
[ EDIT HOUSE ]
[ GENERATE REPORT ]
Technical metrics can be placed inside:
View Technical Details
The system must never assume arbitrary coordinates are official.
Boundary status must be explicit:
AUTHORITATIVE
REFERENCE_ONLY
UNKNOWN
For hackathon demo data:
source: DEMO_CADASTRAL_DATA
boundary_status: REFERENCE_ONLY
The UI must not call demo geometry "official".
The system is a spatial decision-support/pre-validation tool.
It must NOT:
Declare legal ownership
Declare legally valid boundaries from arbitrary imagery
Approve construction
Replace official demarcation
Replace statutory approval
Automatically modify government records
Required disclaimer:
This system provides spatial pre-validation based on supplied/reference geospatial 
data. It does not constitute legal ownership determination, official boundary 
verification.
demarcation, construction approval, or a substitute for competent authority 
11. MVP Scope
MUST HAVE
Interactive map
Parcel GeoJSON
Boundary visualization
GeoTIFF upload
Drone imagery display
House drawing
GIS spatial comparison
Affected area
Three result states
AI explanation
Actionable recommendation
Re-check workflow
PDF report
OPTIONAL
SAM 2
Automatic building segmentation
Road overlap
Neighbour parcel comparison
Heatmap
Advanced multi-agent orchestration
12. Non-Goals
The MVP will not include:
Authentication
Multi-user management
Mobile application
Live government API integration
ULPIN integration
Automatic legal notices
Legal adjudication
Production-scale database infrastructure
Complex RAG/vector database architecture
13. Success Criteria
A non-technical user should understand the complete product within one minute:
Select land → see boundary → upload/view drone image → draw house → check 
→ understand conflict → see affected area → receive solution → generate report.
The MVP is considered successful when this flow works reliably from beginning to end.