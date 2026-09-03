LAND-AUDIT AI
System Architecture Specification
1. Architecture
2. Frontend
Version: 1.0
                        USER
                         │
                         ▼
                ┌─────────────────┐
                │ React Frontend  │
                │ Vite + Tailwind │
                │ + Leaflet       │
                └────────┬────────┘
                         │ REST API
                         ▼
                ┌─────────────────┐
                │ FastAPI Backend │
                └────────┬────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
   ┌────────────┐ ┌────────────┐ ┌────────────┐
   │ GIS Engine │ │ CV / SAM2  │ │ AI Layer   │
   │ Shapely    │ │ Optional   │ │ LLM        │
   │ GeoPandas  │ │            │ │            │
   │ Rasterio   │ │            │ │            │
   └────────────┘ └────────────┘ └────────────┘
          │              │              │
          └──────────────┼──────────────┘
                         ▼
                 ┌───────────────┐
                 │ File Storage  │
                 │ JSON/GeoJSON  │
                 │ GeoTIFF       │
                 └───────────────┘
Technology:
React
Vite
Tailwind CSS
Leaflet
Leaflet drawing/editing library
Responsibilities:
User interaction
Parcel selection
File upload
Map rendering
House drawing
Result display
Report download
Frontend must NOT perform authoritative spatial calculations.
3. Backend
Technology:
Python
FastAPI
Responsibilities:
API handling
File validation
Spatial processing orchestration
GIS calculations
AI orchestration
Report generation
Error handling
4. GIS Engine
Libraries:
GeoPandas
Used for:
GeoJSON handling
Spatial dataframes
CRS transformations
Geometry management
Shapely
Used for:
Intersection
Difference
Union
Area
Distance
Geometry validation
Rasterio
Used for:
GeoTIFF reading
CRS
Bounds
Resolution
Raster metadata
Georeferencing
5. AI Layer
The AI layer receives structured results from GIS.
Example:
{
}
"result": "POTENTIAL_BUILDING_ENCROACHMENT",
"house_area": 180,
"outside_area": 42.5,
"outside_percentage": 23.61
AI then generates:
Plain-language explanation
Recommended action
Verification recommendation
6. Computer Vision Layer
7. Storage Architecture
The AI must NOT modify the original geometry.
SAM 2 is an optional service.
Flow:
GeoTIFF
 ↓
Image preprocessing
 ↓
SAM 2
 ↓
Segmentation mask
 ↓
Polygon extraction
 ↓
GeoJSON
 ↓
GIS analysis
If SAM 2 is unavailable, the system must continue working.
MVP uses file-based storage.
data/
├── parcels/
│   └── parcels.geojson
│
├── images/
│   ├── drone_001.tif
│   └── site_001.jpg
│
├── footprints/
│   └── P-001-house.geojson
│
8. Future Production Architecture
9. Repository Structure
└── audits/
    └── audit-001.json
Reports:
reports/
└── audit-001.pdf
No database is required for MVP.
Production version may use:
PostgreSQL
+
PostGIS
+
Object Storage
+
Redis/Queue
+
Containerized AI inference
This is future architecture only.
Do not make it a requirement for the hackathon MVP.
land-audit-ai/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── map/
│   │   ├── services/
│   │   └── utils/
│   └── package.json
│
├── backend/
│   ├── app/
10. Service Responsibilities
parcel_service
geotiff_service
spatial_service
segmentation_service
diagnosis_service
resolution_service
│   │   ├── main.py
│   │   ├── routes/
│   │   ├── services/
│   │   ├── ai/
│   │   ├── schemas/
│   │   └── utils/
│   └── requirements.txt
│
├── data/
│   ├── parcels/
│   ├── images/
│   ├── footprints/
│   └── audits/
│
├── reports/
│
├── docs/
│
├── tests/
│
├── .env.example
├── README.md
└── docker-compose.yml
Parcel loading and metadata.
GeoTIFF validation and metadata extraction.
All deterministic spatial calculations.
Optional SAM 2 processing.
Converts measurements into controlled result states.
ai_service
report_service
11. Data Flow
Creates recommended next actions.
Generates natural-language explanations.
Creates PDF reports.
Parcel GeoJSON
      │
      ▼
Parcel Service
      │
      ▼
Map
      │
      ├──── Drone GeoTIFF
      │
      └──── Proposed House
                 │
                 ▼
           Spatial Service
                 │
                 ▼
           Measurements
                 │
                 ▼
             Diagnosis
                 │
          ┌──────┴──────┐
          ▼             ▼
      AI Explain     Resolution
          │             │
          └──────┬──────┘
                 ▼
              Result
                 │
                 ▼
               Report
12. Engineering Principle
Keep deterministic systems deterministic.
Geometry:
GIS
Natural language:
AI
Visualization:
Frontend
API orchestration:
FastAPI
Do not mix these responsibilities unnecessarily.