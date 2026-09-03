# AeroBhumiAI

Geospatial AI platform for spatial pre-validation of construction against reference land parcels.

## Project Overview

AeroBhumiAI helps citizens and field teams perform preliminary spatial validation of proposed construction by:

1. Selecting a reference parcel
2. Viewing the parcel boundary
3. Uploading drone/orthomosaic imagery
4. Drawing a proposed building footprint
5. Running deterministic GIS spatial analysis
6. Receiving AI-generated explanations
7. Getting actionable recommendations
8. Generating audit reports

## Architecture

### Frontend
- **React** with Vite build tool
- **Tailwind CSS** for styling
- **Leaflet** for interactive mapping
- TypeScript for type safety

### Backend
- **Python** with FastAPI
- **GeoPandas** for spatial dataframe operations
- **Shapely** for geometry calculations
- **Rasterio** for GeoTIFF processing
- **LLM integration** for explanations and recommendations

### GIS Engine
Deterministic spatial calculations using:
- Shapely: intersection, difference, union, area, distance
- GeoPandas: spatial dataframes, CRS transformations
- Rasterio: GeoTIFF metadata and raster operations

### Data Architecture
```
data/
├── parcels/        # Parcel GeoJSON files
├── images/         # Drone GeoTIFF files
├── footprints/     # Proposed house geometries
└── audits/         # Audit analysis records

reports/            # Generated PDF reports
```

## Project Structure

```
aerobhumiAI/
├── frontend/                 # React/Vite frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API client
│   │   └── utils/           # Helper utilities
│   ├── package.json
│   ├── vite.config.ts
│   └── index.html
│
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # Business logic
│   │   ├── schemas/         # Pydantic models
│   │   └── main.py          # FastAPI app
│   ├── requirements.txt
│   └── .env.example
│
├── data/
│   ├── parcels/             # Reference parcel data
│   ├── images/              # Drone imagery
│   ├── footprints/          # Proposed building footprints
│   └── audits/              # Audit records
│
├── reports/                 # Generated reports
│
├── tests/                   # Test suite
│   ├── test_gis.py
│   ├── test_geotiff.py
│   ├── test_api.py
│   ├── test_ai.py
│   └── test_reports.py
│
├── docs/                    # Documentation
│   ├── 01_PRD.md
│   ├── 02_SYSTEM_ARCHITECTURE.md
│   ├── 03_GIS_AI_DATA_SPEC.md
│   ├── 04_API_UI_SPEC.md
│   └── 05_AGENT_TEAM_SPEC.md
│
└── README.md
```

## Development

### Prerequisites
- Python 3.9+
- Node.js 18+
- npm or yarn

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
python -m uvicorn app.main:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Running Tests
```bash
# Backend tests
pytest tests/

# Frontend tests (when configured)
npm run test
```

## Core Features

### F-01: Parcel Selection
- Select available parcel
- Display parcel ID, area, boundary status

### F-02: Parcel Boundary Visualization
- Display parcel as polygon on interactive map
- Visible distinction from other layers

### F-03: Drone/Orthomosaic Upload
- Upload georeferenced GeoTIFF
- Extract CRS, bounds, resolution

### F-04: Interactive Map
- Parcel layer
- Drone imagery
- Proposed building
- Conflict visualization

### F-05: Proposed House Drawing
- User can create, edit, delete polygon
- Re-check capability

### F-06: Spatial Validation
- GIS comparison of parcel + proposed house

### F-07: Affected Area Calculation
- Proposed building area
- Area outside parcel
- Percentage affected

### F-08: Diagnosis
- **CLEAR**: Within tolerance
- **BOUNDARY_VARIANCE**: Requires verification
- **POTENTIAL_BUILDING_ENCROACHMENT**: Partial overlap outside

### F-09: Resolution Recommendation
- Actionable next steps for non-clear results

### F-10: AI Explanation
- Natural language explanation (GIS drives calculation, AI explains)

### F-11: Audit Report
- PDF report with parcel info, measurements, result, action

## Result States

```
CLEAR
├─ No significant discrepancy
└─ Proposed footprint within reference parcel

BOUNDARY_VARIANCE
├─ Reference and visible boundaries differ
├─ Spatial evidence uncertain
└─ Requires official verification

POTENTIAL_BUILDING_ENCROACHMENT
├─ Part of proposed footprint extends outside
├─ Shows affected area
└─ Recommends adjustment or verification
```

## API Contract

Core fields (stable across application):
- `parcel_id`
- `house_geometry`
- `result`
- `house_area_m2`
- `outside_area_m2`
- `outside_percentage`
- `boundary_status`
- `recommended_action`

See `/docs/04_API_UI_SPEC.md` for complete API specification.

## Engineering Principles

### Golden GIS Rule
GIS calculates. AI explains.

### Data Integrity
Never fabricate spatial data. If required data is unavailable, return `INSUFFICIENT_SPATIAL_DATA`.

### Boundary Status
- `AUTHORITATIVE`: Official government data
- `REFERENCE_ONLY`: Demo/reference geometry
- `UNKNOWN`: Source cannot be established

### No Automatic Modification
The system is a spatial decision-support tool. It does NOT:
- Declare legal ownership
- Approve construction
- Replace official demarcation
- Modify government records

## SAM 2 (Optional)

SAM 2 computer vision module is optional and provides:
- Building segmentation
- Roof detection
- Road segmentation

The core system works without SAM 2. If unavailable, the application continues with:
- Parcel GeoJSON
- User-drawn house polygon
- GIS analysis

## Testing

Test coverage includes:

**GIS Tests**
- House completely inside/outside parcel
- House partially outside
- Invalid polygons
- CRS handling

**GeoTIFF Tests**
- Valid file loading
- Invalid formats
- Missing CRS

**API Tests**
- All endpoints
- Error responses

**AI Tests**
- No invented measurements
- Correct GIS result usage
- Actionable recommendations

**Report Tests**
- PDF generation
- Content accuracy

## Legal Positioning

This system provides spatial pre-validation based on supplied/reference geospatial data.

It does NOT constitute:
- Legal ownership determination
- Official boundary verification
- Construction approval
- Substitute for competent authority

See `/docs/01_PRD.md` for complete disclaimer.

## Git Workflow

Feature branch format:
```
feature/feature-name
fix/bug-name
docs/documentation-name
```

Commit prefix:
```
feat: new feature
fix: bug fix
docs: documentation
test: test addition
refactor: code improvement
chore: maintenance
```

## Success Criteria

A non-technical user should understand the complete product within one minute:

> Select land → see boundary → upload/view drone image → draw house → check → understand conflict → see affected area → receive solution → generate report.

The MVP is successful when this flow works reliably end-to-end.

## Documentation

- `01_PRD.md` - Product requirements
- `02_SYSTEM_ARCHITECTURE.md` - System design
- `03_GIS_AI_DATA_SPEC.md` - Data structures and algorithms
- `04_API_UI_SPEC.md` - API contracts and UI specifications
- `05_AGENT_TEAM_SPEC.md` - Development standards and AI agent rules

## License

[Specify license if applicable]
