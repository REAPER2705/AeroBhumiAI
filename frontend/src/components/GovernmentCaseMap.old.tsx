/**
 * Government Case 2D Map Visualization
 * 
 * Displays satellite imagery with overlaid GIS geometries:
 * - Government Record boundary (green solid)
 * - Observed boundary (blue dashed)
 * - Building structure (gray/red filled)
 * - Conflict area (red highlighted)
 * 
 * Geometry is overlaid ON TOP of satellite imagery for visual comparison
 */

import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { GovernmentCase, getCaseGeometry, DEMO_GEOMETRY } from '../utils/governmentMockData';

interface GovernmentCaseMapProps {
  selectedCase: GovernmentCase | null;
  mapView?: string;
}

export default function GovernmentCaseMap({ selectedCase, mapView = 'comparison' }: GovernmentCaseMapProps) {
  const [governmentCoords, setGovernmentCoords] = useState<any[]>([]);
  const [observedCoords, setObservedCoords] = useState<any[]>([]);
  const [buildingCoords, setBuildingCoords] = useState<any[]>([]);
  const [conflictCoords, setConflictCoords] = useState<any[]>([]);

  useEffect(() => {
    if (selectedCase) {
      const geometry = getCaseGeometry(selectedCase.parcel_id);
      
      // Extract coordinates for Leaflet [lat, lon] format
      if (geometry.official?.coordinates?.[0]) {
        // Convert GeoJSON [lon, lat] to Leaflet [lat, lon]
        const coords = geometry.official.coordinates[0].map((coord: any[]) => [coord[1], coord[0]]);
        setGovernmentCoords(coords);
      }
      
      if (geometry.observed?.coordinates?.[0]) {
        const coords = geometry.observed.coordinates[0].map((coord: any[]) => [coord[1], coord[0]]);
        setObservedCoords(coords);
      }
      
      // Building geometry (fixed for all cases)
      setBuildingCoords(DEMO_GEOMETRY.building);
      
      if (geometry.conflict?.coordinates?.[0]) {
        const coords = geometry.conflict.coordinates[0].map((coord: any[]) => [coord[1], coord[0]]);
        setConflictCoords(coords);
      } else {
        setConflictCoords([]);
      }
    }
  }, [selectedCase]);

  const mapCenter = DEMO_GEOMETRY.center as [number, number];

  if (!selectedCase) {
    return (
      <div className="w-full h-full bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Select a case to view map</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <MapContainer 
        center={mapCenter} 
        zoom={18} 
        style={{ height: "100%", width: "100%" }}
      >
        {/* Satellite Imagery Tile Layer */}
        <TileLayer 
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution='&copy; Esri'
        />
        
        {/* Government Record Boundary - Green Solid */}
        {governmentCoords.length > 0 && (
          <Polygon 
            positions={governmentCoords} 
            pathOptions={{ 
              color: '#22c55e',        // Green
              weight: 3, 
              fillColor: '#22c55e', 
              fillOpacity: 0.15,       // Transparent fill
              dashArray: null          // Solid line
            }} 
          />
        )}

        {/* Observed Boundary - Blue Dashed */}
        {(mapView === 'comparison' || mapView === 'conflict') && observedCoords.length > 0 && (
          <Polygon 
            positions={observedCoords} 
            pathOptions={{ 
              color: '#3b82f6',        // Blue
              weight: 2, 
              fillColor: 'none',       // No fill
              fillOpacity: 0,
              dashArray: '5,5'         // Dashed line
            }} 
          />
        )}

        {/* Building/Structure - Gray/Red Filled Polygon */}
        {buildingCoords.length > 0 && (
          <Polygon 
            positions={buildingCoords} 
            pathOptions={{ 
              color: '#666666',        // Dark gray border
              weight: 1.5, 
              fillColor: '#f87171',    // Light red fill
              fillOpacity: 0.5
            }} 
          />
        )}

        {/* Conflict Area - Red Highlighted */}
        {(mapView === 'conflict' || mapView === 'comparison') && conflictCoords.length > 0 && (
          <Polygon 
            positions={conflictCoords} 
            pathOptions={{ 
              color: '#dc2626',        // Red
              weight: 2, 
              fillColor: '#ef4444',    // Bright red
              fillOpacity: 0.7
            }} 
          />
        )}

        {/* Center marker for reference */}
        <CircleMarker 
          center={mapCenter} 
          radius={3}
          pathOptions={{ 
            color: '#1f2937', 
            fillColor: '#1f2937',
            fillOpacity: 0.3,
            weight: 1
          }} 
        />
      </MapContainer>

      {/* Map Legend - Bottom Left */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 z-10 text-xs">
        <div className="font-bold text-gray-900 mb-2">Map Legend</div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 border-2 border-green-600"></div>
            <span className="text-gray-700">Government Record</span>
          </div>
          {(mapView === 'comparison' || mapView === 'conflict') && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-500" style={{borderStyle: 'dashed'}}></div>
              <span className="text-gray-700">Observed Boundary</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-400 border border-gray-600"></div>
            <span className="text-gray-700">Detected Structure</span>
          </div>
          {(mapView === 'conflict' || mapView === 'comparison') && conflictCoords.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-600 border border-red-700"></div>
              <span className="text-gray-700">Conflict Area</span>
            </div>
          )}
        </div>
      </div>

      {/* Conflict Info Tooltip - Top Right (when in conflict view) */}
      {mapView === 'conflict' && conflictCoords.length > 0 && (
        <div className="absolute top-4 right-4 bg-red-600 text-white rounded-lg px-3 py-2 z-10 shadow-lg text-xs font-bold">
          <div>Conflict Area</div>
          <div>{selectedCase.affected_area_m2} m²</div>
        </div>
      )}
    </div>
  );
}
