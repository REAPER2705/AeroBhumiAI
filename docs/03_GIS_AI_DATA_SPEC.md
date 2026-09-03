LAND-AUDIT AI
GIS, AI & Data Specification
Version: 1.0
1. Data Architecture
The MVP uses three primary spatial inputs:
1. Parcel Boundary → GeoJSON
2. Drone/Orthomosaic → GeoTIFF
3. Proposed House → GeoJSON Polygon
2. Parcel GeoJSON
Example:
{
"parcel_id": "P-001",
"area": 1250,
"source": "DEMO_CADASTRAL_DATA",
"boundary_status": "REFERENCE_ONLY",
"geometry": {
"type": "Polygon",
"coordinates": []
}
}
Required fields:
parcel_id
geometry
source
boundary_status
Optional:
area
location
record reference
metadata
3. Boundary Status
Allowed values:
AUTHORITATIVE
REFERENCE_ONLY
UNKNOWN
AUTHORITATIVE
Used only when the data has been provided from an authoritative source.
REFERENCE_ONLY
Used for demo/test/reference geometry.
UNKNOWN
Used when source cannot be established.
4. GeoTIFF
The uploaded drone/orthomosaic should preferably be georeferenced.
Backend must inspect:
CRS
Bounds
Resolution
Transform
Width
Height
Number of bands
If georeferencing is missing or invalid, the system must not pretend the imagery is 
correctly aligned.
5. CRS
All spatial calculations must be performed in an appropriate projected CRS when 
calculating areas/distances.
Do not blindly calculate physical area using raw latitude/longitude coordinates.
Typical workflow:
Input CRS
↓
Validate
↓
Transform to suitable projected CRS
↓
Calculate area/distance
The implementation must preserve the original geometry and CRS metadata where 
needed.
6. Proposed House Geometry
The frontend creates a polygon.
Example:
{
}
"type": "Polygon",
"coordinates": []
The polygon is sent to the backend.
The backend validates:
Polygon validity
Closed geometry
CRS consistency
Coordinate structure
7. Core GIS Calculations
Given:
P = Parcel Polygon
H = House Polygon
Calculate:
House Area
H.area
Intersection
H.intersection(P)
Outside Area
H.difference(P)
Outside Percentage
outside_area / house_area × 100
Optional
Boundary distance
Overlap with roads
Neighbour parcel intersection
8. Diagnosis Rules
CLEAR
Condition:
outside_area <= configured tolerance
Example:
outside_area = 0
Result:
CLEAR
POTENTIAL_BUILDING_ENCROACHMENT
Condition:
outside_area > configured tolerance
Result:
POTENTIAL_BUILDING_ENCROACHMENT
BOUNDARY_VARIANCE
Used when the relevant reference/observed boundary relationship requires additional 
verification.
Example causes:
Reference geometry uncertainty
Boundary mismatch
Insufficient spatial evidence
Significant visual/reference variance
9. Tolerance
The system should use a configurable spatial tolerance rather than assuming every tiny 
floating-point difference is a conflict.
Example configuration:
SPATIAL_TOLERANCE_M2 = configurable
The exact value should be determined based on the demo dataset and should not be 
presented as a legal tolerance.
10. SAM 2
SAM 2 is an optional computer vision module.
Input
Drone/orthomosaic imagery.
Output
Segmentation masks.
Potential classes:
BUILDING
ROAD
OTHER
The segmentation pipeline should convert masks into usable polygons where practical.
11. SAM 2 Limitations
Legal parcel boundary
Ownership
Encroachment by itself
Construction legality
12. AI Input
13. AI Output
SAM 2 should NOT be used to determine:
Example:
SAM2:
"Building pixels detected here."
GIS:
"This building overlaps the reference parcel boundary by X m²."
AI:
"Explain the result and suggest verification."
AI should receive structured facts only.
Example:
{
  "parcel_id": "P-001",
  "boundary_status": "REFERENCE_ONLY",
  "result": "POTENTIAL_BUILDING_ENCROACHMENT",
  "house_area_m2": 180,
  "outside_area_m2": 42.5,
  "outside_percentage": 23.61
}
AI should produce:
{
  "summary": "...",
  "problem": "...",
  "recommended_action": "...",
Parcel ownership
Legal provisions
Exact government decisions
Missing measurements
Official status
14. Resolution Logic
Encroachment
Boundary Variance
15. Audit JSON
  "verification_note": "..."
}
The AI should not invent:
Input:
outside_area > tolerance
Output recommendation:
Edit/move the proposed footprint.
If physical and reference boundaries appear inconsistent,
request official boundary verification before construction.
Output:
Identify affected boundary.
Recommend field measurement/official verification.
Do not automatically alter the reference boundary.
Example:
{
  "audit_id": "AUD-001",
  "parcel_id": "P-001",
  "boundary_status": "REFERENCE_ONLY",
  "house_area_m2": 180,
  "outside_area_m2": 42.5,
16. Golden GIS Rule
17. Data Integrity Rule
18. Storage
  "outside_percentage": 23.61,
  "result": "POTENTIAL_BUILDING_ENCROACHMENT",
  "recommended_action": "Adjust footprint or request official boundary 
verification.",
  "created_at": "ISO-8601"
}
Never use the LLM to perform geometry.
Correct:
Shapely → calculates
LLM → explains
Incorrect:
Image → LLM → guesses boundary conflict
Never fabricate spatial data.
If required data is missing:
STATUS = INSUFFICIENT_SPATIAL_DATA
and explain what is missing.
MVP:
GeoJSON → parcel geometry
GeoTIFF → imagery
GeoJSON → proposed house
JSON → audit result
PDF → report
Database is optional future infrastructure.