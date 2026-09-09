/**
 * Government Land Verification Module - Enhanced Mock Data & Assets
 * 
 * Contains realistic cadastral geometry with 20+ parcels, multiple government cases,
 * and assets for automated land-record verification system prototype.
 */

export interface GovernmentCase {
  parcel_id: string;
  registered_area_m2: number;
  observed_area_m2: number;
  area_variance_percent: number;
  affected_area_m2: number;
  affected_side: string;
  conflict_type: string;
  priority: string;
  status: string;
  description: string;
}

// ============================================================================
// DEMO MAP IMAGE - Professional cadastral survey map (Base64 encoded)
// ============================================================================

const createCadastralMap = (): string => {
  const svg = `<svg width="600" height="700" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 700">
    <rect width="600" height="700" fill="#fdf8f0"/>
    <rect x="15" y="15" width="570" height="670" fill="none" stroke="#333333" stroke-width="2"/>
    <rect x="18" y="18" width="564" height="664" fill="none" stroke="#666666" stroke-width="0.5"/>
    <text x="300" y="45" font-size="20" font-weight="bold" fill="#1a1a1a" text-anchor="middle">CADASTRAL SURVEY MAP</text>
    <text x="300" y="68" font-size="11" fill="#333333" text-anchor="middle">Official Land Record Document</text>
    <line x1="40" y1="75" x2="560" y2="75" stroke="#999999" stroke-width="1"/>
    <text x="30" y="100" font-size="10" font-weight="bold" fill="#333333">Survey Number:</text>
    <text x="180" y="100" font-size="10" fill="#555555">BTP-667-2024</text>
    <text x="30" y="120" font-size="10" font-weight="bold" fill="#333333">Taluk/Block:</text>
    <text x="180" y="120" font-size="10" fill="#555555">Nagpur District</text>
    <text x="30" y="140" font-size="10" font-weight="bold" fill="#333333">Survey Date:</text>
    <text x="180" y="140" font-size="10" fill="#555555">15-NOV-2024</text>
    <text x="350" y="100" font-size="10" font-weight="bold" fill="#333333">Reference:</text>
    <text x="470" y="100" font-size="10" fill="#555555">B4P-667</text>
    <text x="350" y="120" font-size="10" font-weight="bold" fill="#333333">Scale:</text>
    <text x="470" y="120" font-size="10" fill="#555555">1:1000 M</text>
    <defs>
      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e8e0d0" stroke-width="0.4"/>
      </pattern>
    </defs>
    <rect x="40" y="160" width="520" height="430" fill="url(#grid)"/>
    <polyline points="100,200 450,200 450,500 100,500 100,200" fill="none" stroke="#1a5f1a" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="100" cy="200" r="3" fill="#1a5f1a"/>
    <circle cx="450" cy="200" r="3" fill="#1a5f1a"/>
    <circle cx="450" cy="500" r="3" fill="#1a5f1a"/>
    <circle cx="100" cy="500" r="3" fill="#1a5f1a"/>
    <line x1="100" y1="340" x2="450" y2="340" stroke="#999999" stroke-width="1" stroke-dasharray="3,3"/>
    <line x1="275" y1="200" x2="275" y2="500" stroke="#999999" stroke-width="1" stroke-dasharray="3,3"/>
    <text x="188" y="270" font-size="28" font-weight="bold" fill="#2a2a2a" text-anchor="middle">P-003</text>
    <text x="362" y="270" font-size="24" font-weight="bold" fill="#2a2a2a" text-anchor="middle">P-025</text>
    <text x="188" y="420" font-size="24" font-weight="bold" fill="#2a2a2a" text-anchor="middle">P-047</text>
    <text x="362" y="420" font-size="24" font-weight="bold" fill="#2a2a2a" text-anchor="middle">P-048</text>
    <line x1="40" y1="610" x2="560" y2="610" stroke="#999999" stroke-width="1"/>
    <text x="30" y="635" font-size="9" font-weight="bold" fill="#333333">LEGEND:</text>
    <line x1="30" y1="640" x2="50" y2="640" stroke="#1a5f1a" stroke-width="3"/>
    <text x="60" y="645" font-size="8" fill="#333333">= Registered Boundary</text>
    <text x="30" y="665" font-size="8" fill="#666666">Official Government Record (c) Maharashtra Revenue Department 2024</text>
    <text x="30" y="680" font-size="7" fill="#999999">Not to be reproduced without written permission • Coordinates in WGS84</text>
    <text x="300" y="400" font-size="60" fill="#f0f0f0" opacity="0.15" text-anchor="middle" font-weight="bold" font-style="italic">VERIFIED</text>
  </svg>`;
  
  // UTF-8 safe Base64 encoding to handle Unicode characters like © and •
  const encoded = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${encoded}`;
};

export const DEMO_MAP_IMAGE = createCadastralMap();

// ============================================================================
// GENERATE REALISTIC CADASTRAL PARCEL GRID (20+ parcels)
// Center: Nagpur, India [21.1458°N, 79.0882°E]
// Grid: 4 rows × 6 columns of mock parcel polygons
// ============================================================================

const generateParcelGrid = () => {
  const parcels: any[] = [];
  const baseLatLon: [number, number] = [21.1458, 79.0882];
  
  // Larger cells for better visibility at this zoom level (~18)
  // ~70 meters = 0.00063 degrees latitude, ~89 meters = 0.00089 degrees longitude at equator
  const cellWidth = 0.00095;   // Slightly wider cells
  const cellHeight = 0.00070;  // Slightly taller cells
  
  let parcelIndex = 1;
  
  // Create a more realistic cadastral grid with 5 rows × 6 columns = 30 parcels
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 6; col++) {
      // Base position for this cell
      const baseLat = baseLatLon[0] - (row * cellHeight);
      const baseLon = baseLatLon[1] + (col * cellWidth);
      
      const parcelId = `P-${String(parcelIndex).padStart(3, '0')}`;
      
      // Add variation to parcel size for realism
      // Some parcels are wider, some are taller, creating irregular pattern
      const widthVariation = 0.95 + Math.random() * 0.1;  // 95-105% of standard width
      const heightVariation = 0.93 + Math.random() * 0.14; // 93-107% of standard height
      
      // Add subtle rotation for visual interest (1-3 degrees)
      const rotationDegrees = Math.random() * 3;
      const rotationRad = (rotationDegrees * Math.PI) / 180;
      
      // Create irregular polygons by adding corner variations
      const cornerNoise = 0.0001;
      const corners: [number, number][] = [
        // SW corner with noise
        [baseLat - cornerNoise * Math.random(), baseLon - cornerNoise * Math.random()],
        // SE corner with noise
        [baseLat - cornerNoise * Math.random(), baseLon + (cellWidth * widthVariation) + cornerNoise * Math.random()],
        // NE corner with noise
        [baseLat - (cellHeight * heightVariation) + cornerNoise * Math.random(), baseLon + (cellWidth * widthVariation) + cornerNoise * Math.random()],
        // NW corner with noise
        [baseLat - (cellHeight * heightVariation) - cornerNoise * Math.random(), baseLon - cornerNoise * Math.random()],
      ];
      
      // Apply simple rotation around center
      const centerLat = baseLat - (cellHeight * heightVariation) / 2;
      const centerLon = baseLon + (cellWidth * widthVariation) / 2;
      
      const rotatedCorners = corners.map(([lat, lon]) => {
        const dLat = lat - centerLat;
        const dLon = lon - centerLon;
        const newDLat = dLat * Math.cos(rotationRad) - dLon * Math.sin(rotationRad);
        const newDLon = dLat * Math.sin(rotationRad) + dLon * Math.cos(rotationRad);
        return [centerLat + newDLat, centerLon + newDLon] as [number, number];
      });
      
      // Close the polygon
      rotatedCorners.push(rotatedCorners[0]);
      
      parcels.push({
        parcel_id: parcelId,
        coordinates: rotatedCorners,
        area_m2: 1200 + Math.random() * 2500,  // Vary areas 1200-3700 m²
        center: [centerLat, centerLon] as [number, number]  // Store center for label placement
      });
      
      parcelIndex++;
    }
  }
  
  return parcels;
};

const CADASTRAL_PARCELS = generateParcelGrid();

// ============================================================================
// DEMO GEOMETRY - P-009 with conflict on WEST side
// ============================================================================

export const DEMO_GEOMETRY = {
  center: [21.1458, 79.0882] as [number, number],

  // P-009 Government record (official boundary)
  // P-009 is at row 1, col 3 in the grid
  // baseLatLon[0] - (1 * 0.00070) = 21.1458 - 0.0007 = 21.1451
  // baseLatLon[1] + (3 * 0.00095) = 79.0882 + 0.00285 = 79.09105
  governmentParcel: [
    [21.1451, 79.0905],
    [21.1451, 79.0915],
    [21.1444, 79.0915],
    [21.1444, 79.0905],
    [21.1451, 79.0905],
  ] as [number, number][],

  // P-009 Observed boundary - WEST side extends beyond official
  observedBoundary: [
    [21.1451, 79.0905],
    [21.1451, 79.0915],
    [21.1444, 79.0915],
    [21.1444, 79.0890],  // Extends west
    [21.1451, 79.0905],
  ] as [number, number][],

  // Conflict area - Small strip/overlap on WEST boundary (22.1 m²)
  // This appears as a thin strip at the edge, not a giant rectangle
  conflict: [
    [21.1444, 79.0894],     // Start of overlap strip
    [21.1444, 79.0905],     // End of strip (small width)
    [21.14455, 79.0905],    // Slight extension into parcel
    [21.14455, 79.0894],    // Back to start point
    [21.1444, 79.0894],     // Close polygon
  ] as [number, number][],

  // All cadastral parcels from grid
  cadastralParcels: CADASTRAL_PARCELS
};

// ============================================================================
// GOVERNMENT CASES - Only P-009 for demo (with conflict)
// ============================================================================

export const governmentCases: GovernmentCase[] = [
  {
    parcel_id: 'P-009',
    registered_area_m2: 1250,
    observed_area_m2: 1272.1,
    area_variance_percent: 1.77,
    affected_area_m2: 22.1,
    affected_side: 'West',
    conflict_type: 'POTENTIAL_ENCROACHMENT',
    priority: 'HIGH',
    status: 'FIELD_VERIFICATION',
    description: 'Potential structure encroachment detected on western boundary. Requires verification.'
  }
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function getCaseGeometry(parcelId: string): {
  official: any;
  observed: any;
  conflict: any;
} {
  if (parcelId === 'P-009') {
    return {
      official: { type: 'Polygon', coordinates: [DEMO_GEOMETRY.governmentParcel.map(([lat, lon]) => [lon, lat])] },
      observed: { type: 'Polygon', coordinates: [DEMO_GEOMETRY.observedBoundary.map(([lat, lon]) => [lon, lat])] },
      conflict: { type: 'Polygon', coordinates: [DEMO_GEOMETRY.conflict.map(([lat, lon]) => [lon, lat])] }
    };
  }

  return {
    official: null,
    observed: null,
    conflict: null
  };
}

export function get3DVisualizationData(parcelId: string): {
  parcelBlock: { width: number; height: number; depth: number; position: [number, number, number] };
  buildingBlock: { width: number; height: number; depth: number; position: [number, number, number] };
  conflictBlock: { width: number; height: number; depth: number; position: [number, number, number] } | null;
} {
  if (parcelId === 'P-003') {
    return {
      parcelBlock: { width: 2, height: 0.5, depth: 2, position: [0, 0, 0] },
      buildingBlock: { width: 2.2, height: 1.5, depth: 2, position: [-0.1, 1.5, 0] },
      conflictBlock: { width: 0.2, height: 1.5, depth: 2, position: [-1, 1.5, 0] }
    };
  }

  return {
    parcelBlock: { width: 2, height: 0.5, depth: 2, position: [0, 0, 0] },
    buildingBlock: { width: 1.5, height: 1.5, depth: 1.5, position: [0.2, 1.5, 0.2] },
    conflictBlock: null
  };
}

/**
 * Get all cadastral parcels for rendering
 */
export function getCadastralParcels() {
  return DEMO_GEOMETRY.cadastralParcels;
}
