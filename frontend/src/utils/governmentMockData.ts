/**
 * Government Land Verification Module - Enhanced Mock Data & Assets
 * 
 * Contains realistic cadastral geometry with 20+ parcels, multiple government cases,
 * and assets for automated land-record verification system prototype.
 */

import * as caseServiceModule from '../services/caseService';

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
    <!-- Satellite background - green terrain -->
    <defs>
      <radialGradient id="satellite" cx="40%" cy="40%">
        <stop offset="0%" style="stop-color:#3a6b2f;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#1a3a1a;stop-opacity:1" />
      </radialGradient>
    </defs>
    
    <rect width="600" height="700" fill="url(#satellite)"/>
    
    <!-- Add some texture variation for satellite effect -->
    <circle cx="150" cy="200" r="100" fill="#2d5016" opacity="0.6"/>
    <circle cx="450" cy="300" r="120" fill="#4a8a3f" opacity="0.5"/>
    <circle cx="300" cy="500" r="80" fill="#2a4a1f" opacity="0.7"/>
    
    <!-- Road/path -->
    <line x1="0" y1="100" x2="600" y2="150" stroke="#666666" stroke-width="15" opacity="0.8"/>
    
    <!-- Parcel boundary - GREEN DASHED (legal boundary) -->
    <rect x="100" y="150" width="400" height="450" fill="none" stroke="#00ff00" stroke-width="4" stroke-dasharray="15,10" opacity="0.9"/>
    
    <!-- Boundary corner markers -->
    <circle cx="100" cy="150" r="5" fill="#00ff00" opacity="0.9"/>
    <circle cx="500" cy="150" r="5" fill="#00ff00" opacity="0.9"/>
    <circle cx="500" cy="600" r="5" fill="#00ff00" opacity="0.9"/>
    <circle cx="100" cy="600" r="5" fill="#00ff00" opacity="0.9"/>
    
    <!-- Conflict/Building area - RED SOLID (encroachment) -->
    <polygon points="420,150 500,200 480,320 420,280" fill="#ff3333" opacity="0.5"/>
    <polygon points="420,150 500,200 480,320 420,280" fill="none" stroke="#ff0000" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    
    <!-- Blue reference line between parcel and conflict -->
    <line x1="420" y1="150" x2="300" y2="100" stroke="#0099ff" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
    
    <!-- Labels -->
    <text x="110" y="130" font-size="14" font-weight="bold" fill="#00ff00" text-anchor="start">LEGAL BOUNDARY</text>
    <text x="430" y="120" font-size="14" font-weight="bold" fill="#ff3333" text-anchor="start">ENCROACHMENT</text>
    
    <!-- Legend at bottom -->
    <rect x="10" y="650" width="580" height="40" fill="#000000" opacity="0.6" rx="3"/>
    <line x1="20" y1="670" x2="50" y2="670" stroke="#00ff00" stroke-width="3" stroke-dasharray="5,4"/>
    <text x="60" y="675" font-size="12" fill="#ffffff">Green Dashed = Legal Parcel Boundary</text>
    
    <line x1="320" y1="670" x2="350" y2="670" stroke="#ff0000" stroke-width="3"/>
    <text x="360" y="675" font-size="12" fill="#ffffff">Red = Conflict/Encroachment Area</text>
  </svg>`;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

export const DEMO_MAP_IMAGE = '';

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

/**
 * Convert CitizenCase to GovernmentCase format for government dashboard
 * This allows citizen-flagged cases to appear alongside mock government cases
 */
export function convertCitizenCaseToGovernmentCase(citizenCase: any): GovernmentCase & { caseId?: string } {
  return {
    parcel_id: citizenCase.parcelId, // Use original parcel ID
    caseId: citizenCase.caseId, // Store the actual case ID for matching
    registered_area_m2: 0, // Not available from citizen case
    observed_area_m2: 0, // Not available from citizen case
    area_variance_percent: 0, // Not available from citizen case
    affected_area_m2: citizenCase.affectedAreaM2,
    affected_side: 'Unknown', // Not available from citizen case
    conflict_type: citizenCase.conflictResult,
    priority: citizenCase.confidenceLevel === 'HIGH' ? 'HIGH' : citizenCase.confidenceLevel === 'MEDIUM' ? 'MEDIUM' : 'LOW',
    status: citizenCase.status,
    description: `Citizen-flagged case: ${citizenCase.reason}. Confidence: ${citizenCase.spatialConfidence}% (${citizenCase.confidenceLevel})`
  };
}

/**
 * Get merged list of mock government cases + citizen-created cases
 */
export function getAllGovernmentCases(): (GovernmentCase & { isCitizenCase?: boolean; citizenCase?: any })[] {
  console.log('=== getAllGovernmentCases called ===');
  
  // Start with empty array - NO mock cases
  const allCases: (GovernmentCase & { isCitizenCase?: boolean; citizenCase?: any })[] = [];
  console.log('  Mock cases: 0 (disabled - only show citizen cases)');
  
  // Try to load citizen cases from localStorage
  try {
    console.log('  Loading citizen cases...');
    const citizenCases = caseServiceModule.exportCasesForGovernment() || [];
    console.log('  ✅ Citizen cases found:', citizenCases.length);
    if (citizenCases.length > 0) {
      console.log('    Citizen cases data:', JSON.stringify(citizenCases, null, 2));
    }
    
    // Convert and add citizen cases
    const convertedCases = citizenCases.map((cc: any) => {
      console.log('    Converting citizen case:', cc.caseId);
      const govCase = convertCitizenCaseToGovernmentCase(cc);
      console.log('    Converted to:', JSON.stringify(govCase));
      return {
        ...govCase,
        isCitizenCase: true,
        citizenCase: cc
      };
    });
    
    const total = allCases.length + convertedCases.length;
    console.log('✅ Total cases to return:', total);
    const result = [...allCases, ...convertedCases];
    console.log('  Result array length:', result.length);
    return result;
  } catch (err) {
    console.error('❌ Error loading citizen cases:', err);
    if (err instanceof Error) {
      console.error('    Message:', err.message);
      console.error('    Stack:', err.stack);
    }
    // If caseService not available, just return empty array
    console.log('  Returning empty array');
    return allCases;
  }
}
