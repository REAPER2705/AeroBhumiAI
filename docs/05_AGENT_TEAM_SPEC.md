05_AGENT_TEAM_SPEC.md
LAND-AUDIT AI — AGENT TEAM SPECIFICATION
1. PURPOSE
This document defines the development rules, technology constraints, integration 
standards, and AI-agent instructions for the LAND-AUDIT AI project.
All human developers and AI coding agents must follow this specification.
The purpose is to ensure that different developers or AI tools such as Claude, Gemini, 
Kiro, Antigravity, Cursor, or similar coding agents build the same system architecture 
instead of creating incompatible implementations.
2. MANDATORY AGENT INSTRUCTION
Before modifying the project, every AI coding agent must:
1. Read all project specification documents.
2. Inspect the existing repository.
3. Understand the current implementation.
4. Identify existing components and services that can be reused.
5. Follow the defined architecture.
6. Follow the defined API contracts.
7. Avoid unnecessary technology changes.
8. Implement only the requested functionality.
9. Test the affected functionality.
10. Report all changes clearly.
Required workflow
READ
↓
INSPECT
↓
UNDERSTAND
↓
PLAN
↓
IMPLEMENT
↓
TEST
↓
INTEGRATE
Agents must not blindly overwrite existing code.
3. TECHNOLOGY LOCK
The following technologies are the default project stack.
Frontend
React
Vite
Tailwind CSS
Leaflet
Backend
Python
FastAPI
GIS
AI
GeoPandas
Shapely
Rasterio
LLM for explanation and recommendations
SAM 2 as an optional computer-vision component
Data
GeoJSON
GeoTIFF
JSON
Local file storage
4. ARCHITECTURE LOCK
The project must follow:
Responsibility boundaries
React Frontend
      ↓
FastAPI Backend
      ↓
┌───────────────┬───────────────┐
│               │               │
GIS Engine      AI Layer        CV Layer
│               │               │
Shapely         LLM             SAM 2
GeoPandas                       (Optional)
Rasterio
│
└───────────────┘
        ↓
 Local File Storage
Layer Responsi
bility
Frontend UI, map, 
user 
interaction
FastAPI API and 
orchestrati
on
GIS Determini
stic spatial 
calculatio
ns
SAM 2 Image 
segmentat
ion
5. CRITICAL ENGINEERING RULE
GIS calculates. AI explains.
6. SAM 2 RULE
Building/roof segmentation
Visible structure detection
LLM Explanatio
n and 
recomme
ndations
Storage GeoJSON
, 
GeoTIFF, 
JSON, 
reports
The LLM must never independently calculate spatial geometry.
For example:
Shapely
   ↓
outside_area = 18.4 m²
outside_percentage = 6.2%
   ↓
LLM
   ↓
"Part of the proposed footprint extends
outside the reference parcel."
The AI receives structured GIS results and converts them into understandable 
explanations and actionable recommendations.
SAM 2 is an optional enhancement, not a mandatory dependency for the core system.
SAM 2 may be used for:
Road segmentation
Image region extraction
7. DATA SOURCE RULE
SAM 2 must not determine legal ownership or authoritative parcel boundaries.
The core application must remain functional without SAM 2.
GeoTIFF
   ↓
SAM 2
   ↓
Segmentation Mask
   ↓
Polygon
   ↓
GIS Analysis
If SAM 2 is unavailable, the system must still support:
Parcel GeoJSON
+
User-drawn House Polygon
+
GIS Analysis
AI agents must never invent official government data.
Demo coordinates, sample parcels, and generated imagery must be clearly labelled.
Example:
{
  "source": "DEMO_CADASTRAL_DATA",
  "boundary_status": "REFERENCE_ONLY"
}
Allowed boundary statuses:
AUTHORITATIVE
REFERENCE_ONLY
UNKNOWN
8. API CONTRACT RULE
9. RESULT STATES
CLEAR
The system must never present random demo coordinates as official cadastral 
boundaries.
The following core fields must remain stable across the application.
parcel_id
house_geometry
result
house_area_m2
outside_area_m2
outside_percentage
boundary_status
recommended_action
Core endpoint:
POST /api/spatial/build-check
Example response:
{
  "success": true,
  "result": "POTENTIAL_BUILDING_ENCROACHMENT",
  "metrics": {
    "house_area_m2": 300.0,
    "outside_area_m2": 18.4,
    "outside_percentage": 6.13
  },
  "boundary_status": "REFERENCE_ONLY"
}
Agents must not rename these fields without agreement across the project.
The application must support the following primary outcomes.
NO SIGNIFICANT DISCREPANCY
The proposed footprint remains within the reference parcel according to the configured 
spatial tolerance.
POTENTIAL BUILDING ENCROACHMENT
PART OF PROPOSED FOOTPRINT EXTENDS
OUTSIDE THE REFERENCE PARCEL
The system must show:
affected area
percentage
conflict geometry
recommended action
BOUNDARY VARIANCE
Used when:
reference boundary and visible evidence differ
spatial evidence is uncertain
boundary data is insufficient
verification is required
The system should recommend official field verification or demarcation where 
appropriate.
10. NO FABRICATION RULE
If required spatial data is unavailable, the system must not create fake results.
Example:
INSUFFICIENT_SPATIAL_DATA
Possible reasons:
Missing parcel geometry
Invalid house geometry
Missing CRS
Invalid GeoTIFF
Missing reference layer
The system should explain what data is missing.
11. ERROR HANDLING
12. TESTING REQUIREMENTS
GIS tests
Imagery tests
All APIs should return structured errors.
Example:
{
  "success": false,
  "error": {
    "code": "INVALID_GEOMETRY",
    "message": "The proposed house polygon is invalid."
  }
}
Common error categories:
INVALID_GEOMETRY
MISSING_PARCEL
MISSING_IMAGE
INVALID_GEOTIFF
MISSING_CRS
INSUFFICIENT_SPATIAL_DATA
PROCESSING_ERROR
AI_SERVICE_ERROR
REPORT_GENERATION_ERROR
Errors must be understandable to both developers and users.
Every major module must be tested.
Must include:
House completely inside parcel
House partially outside parcel
House completely outside parcel
Invalid polygon
Missing parcel
CRS mismatch
Must include:
Valid GeoTIFF
Invalid file
Missing CRS
Unsupported raster
Missing imagery
AI tests
Must verify:
Correct explanation
No invented measurements
Correct use of GIS results
Actionable recommendations
Safe/legal wording
Report tests
Must verify:
Correct parcel ID
Correct measurements
Correct result
Correct recommendation
Successful PDF generation
13. GIT RULES
Use feature branches where practical.
Recommended branch format:
feature/frontend-map
feature/gis-spatial-engine
feature/backend-api
feature/ai-diagnosis
feature/reports
fix/geometry-validation
Recommended commit prefixes:
14. FEATURE PRIORITY
P0 — MUST WORK
P1 — IMPORTANT
feat:
fix:
docs:
test:
refactor:
chore:
Example:
feat: add proposed house drawing workflow
Avoid vague commits such as:
update
changes
final
new code
working
Do not overwrite another developer's work without coordination.
Parcel selection
      ↓
Parcel boundary visualization
      ↓
House drawing
      ↓
Spatial comparison
      ↓
Result
      ↓
Problem explanation
      ↓
Recommended action
GeoTIFF upload
Drone imagery visualization
AI explanation
PDF report
Re-check after editing
P2 — OPTIONAL
SAM 2
Road overlap
Neighbor analysis
Heatmap
Advanced multi-agent system
P2 features must never delay completion of P0 functionality.
15. AI AGENT DEVELOPMENT RULES
AI coding agents must:
DO
Inspect existing code first.
Reuse existing components.
Follow the API contract.
Follow the architecture.
Add proper validation.
Add tests.
Keep changes focused.
Explain what was changed.
Mention integration requirements.
DO NOT
Replace FastAPI without approval.
Replace React without approval.
Replace Leaflet without approval.
Introduce a database unnecessarily.
Make SAM 2 mandatory.
Let the LLM calculate geometry.
Invent government data.
Treat demo data as official.
Add unnecessary authentication.
Add unnecessary microservices.
Rewrite the entire repository for a small feature.
16. DEFINITION OF DONE
17. AGENT OUTPUT FORMAT
A feature is considered complete only when:
Implementation complete
        ↓
API contract followed
        ↓
Validation added
        ↓
Error handling added
        ↓
Tests passed
        ↓
Existing features still work
        ↓
Frontend/backend integration verified
        ↓
Ready for final demo
A feature is not complete merely because the code compiles.
After completing work, every AI coding agent should report:
## Changed
Files modified or created.
## Implemented
What functionality was added.
## API Changes
Any endpoint/request/response changes.
## Tested
18. FINAL DEMO CONTRACT
Tests or manual verification performed.
## Issues
Known limitations or problems.
## Integration Point
What another team member needs to know.
The complete system must support the following demonstration:
SELECT PARCEL
      ↓
VIEW REFERENCE BOUNDARY
      ↓
UPLOAD / VIEW DRONE IMAGERY
      ↓
DRAW PROPOSED HOUSE
      ↓
CHECK BUILD
      ↓
GIS SPATIAL ANALYSIS
      ↓
RESULT
      ↓
SHOW PROBLEM
      ↓
SHOW AFFECTED AREA
      ↓
AI EXPLANATION
      ↓
RECOMMENDED ACTION
      ↓
EDIT HOUSE
      ↓
RE-CHECK
      ↓
GENERATE REPORT
This is the primary end-to-end product workflow.
19. FINAL PRODUCT PRINCIPLE
LAND-AUDIT AI is not only a warning system.
It follows:
DETECT
↓
MEASURE
↓
DIAGNOSE
↓
SOLVE
↓
VERIFY
↓
REPORT
The system should help a citizen understand:
“What is the problem?”
“How much area is affected?”
“Why is it happening?”
“What should I do next?”
The system provides AI-assisted spatial pre-validation, not legal approval. Final legal 
decisions, cadastral corrections, demarcation, and construction permissions remain with 
the competent authority.