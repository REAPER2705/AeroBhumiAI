LAND-AUDIT AI
API & UI Specification
Version: 1.0
1. API PRINCIPLES
All APIs:
Use JSON where applicable.
Use multipart upload for files.
Return predictable response structures.
Validate inputs.
Return meaningful errors.
Do not expose internal stack traces to users.
Base path:
/api
2. Parcel APIs
GET 
/api/parcels
Returns available parcels.
Example:
{
"success": true,
"parcels": [
{
}
]
"parcel_id": "P-001",
"area": 1250,
"boundary_status": "REFERENCE_ONLY"
}
GET 
/api/parcels/{parcel_id}
Returns complete parcel information and geometry.
3. Drone Upload
POST /api/upload/drone
4. Proposed House
5. Build Check
POST /api/spatial/build-check
Content type:
multipart/form-data
Input:
file = drone_001.tif
Response:
{
  "success": true,
  "file_id": "IMG-001",
  "filename": "drone_001.tif",
  "crs": "EPSG:....",
  "bounds": [],
  "resolution": []
}
The frontend generates a GeoJSON polygon.
The backend accepts:
{
  "parcel_id": "P-001",
  "house_geometry": {
    "type": "Polygon",
    "coordinates": []
  }
}
Request:
6. Audit Analysis
POST /api/audit/analyze
{
  "parcel_id": "P-001",
  "house_geometry": {
    "type": "Polygon",
    "coordinates": []
  }
}
Response:
{
  "success": true,
  "result": "POTENTIAL_BUILDING_ENCROACHMENT",
  "metrics": {
    "house_area_m2": 180,
    "outside_area_m2": 42.5,
    "outside_percentage": 23.61
  }
}
Input:
{
  "parcel_id": "P-001",
  "build_check": {
    "result": "POTENTIAL_BUILDING_ENCROACHMENT",
    "outside_area_m2": 42.5,
    "outside_percentage": 23.61
  }
}
Response:
{
  "success": true,
  "result": "POTENTIAL_BUILDING_ENCROACHMENT",
  "summary": "Part of the proposed footprint lies outside the reference 
parcel.",
7. SAM 2
POST /api/segmentation/run
8. Report
POST /api/reports/generate
  "problem": "42.5 m² is outside the reference parcel.",
  "recommended_action": "Adjust the footprint or request official 
boundary verification before construction."
}
Input:
image_id
Response:
{
  "success": true,
  "segments": [
    {
      "type": "BUILDING",
      "geometry": {}
    }
  ]
}
SAM 2 remains optional.
Input:
{
  "audit_id": "AUD-001"
}
Response:
{
  "success": true,
  "report_id": "REP-001"
}
9. Error Response
Standard structure:
{
}
"success": false,
"error": {
"code": "INVALID_GEOMETRY",
}
"message": "The proposed building polygon is invalid."
10. Frontend Screens
Screen 1 — Dashboard
Display:
Product title
Short explanation
Start audit button
Recent/demo parcels
Screen 2 — Parcel Selection
Display:
Parcel ID
Area
Boundary Status
Source
Button:
OPEN PARCEL
11. Screen 3 — Audit Map
Main screen.
Map layers:
BASE MAP
REFERENCE PARCEL
12. Upload UI
13. Result UI
DRONE IMAGERY
EXISTING BUILDINGS
ROADS
PROPOSED HOUSE
CONFLICT AREA
Controls:
[ Upload Drone ]
[ Draw House ]
[ Edit House ]
[ Delete ]
[ Check Build ]
Example:
┌──────────────────────────────┐
│ Upload Drone Orthomosaic     │
│                              │
│ Drag & Drop                  │
│ or                           │
│ [ Choose GeoTIFF ]           │
│                              │
│ Supported: .tif / .tiff      │
└──────────────────────────────┘
After upload:
✓ Image loaded
CRS: ...
Bounds: ...
Primary result card:
BUILD CHECK
🔴
 POTENTIAL BOUNDARY CONFLICT
14. Clear Result
15. Boundary Variance
WHAT IS WRONG?
42.5 m² of the proposed building
footprint lies outside the reference parcel.
AFFECTED AREA
42.5 m²
WHAT SHOULD I DO?
Adjust the footprint or request official
boundary verification before construction.
[ EDIT HOUSE ]
[ VIEW DETAILS ]
[ GENERATE REPORT ]
BUILD CHECK
🟢
 CLEAR
WHAT IS WRONG?
No significant spatial discrepancy
was detected.
AFFECTED AREA
0 m²
[ GENERATE REPORT ]
BUILD CHECK
🟡
 BOUNDARY VARIANCE
16. Map Interaction Rules
Reference boundary
Drone image
Proposed building
Conflict area
17. UX Principle
18. Responsive Design
WHAT IS WRONG?
A potential boundary discrepancy or
uncertainty requires verification.
WHAT SHOULD I DO?
Review the affected boundary and request
field/official verification before construction.
[ VIEW DETAILS ]
[ GENERATE REPORT ]
The user must clearly distinguish:
The map must not become visually overloaded.
The user should not need GIS knowledge.
The interface should communicate:
RESULT
↓
PROBLEM
↓
MEASUREMENT
↓
ACTION
Technical details remain secondary.
Desktop
Laptop
Tablet-sized screens
19. Frontend State
20. API Contract Rule
The MVP should work on:
Desktop is the primary demo target.
Suggested state:
selectedParcel
droneImage
mapLayers
houseGeometry
buildCheckResult
aiExplanation
auditId
reportId
loading
error
Frontend and backend developers must use the API schemas in this document.
Do not independently rename core fields.
Core fields include:
parcel_id
house_geometry
result
house_area_m2
outside_area_m2
outside_percentage
recommended_action
boundary_status