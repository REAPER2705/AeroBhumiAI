/**
 * Government Case Map - Redesigned for Automated Verification System
 * 
 * Shows realistic cadastral layout with 20+ parcels, satellite overlay,
 * government boundaries, observed boundaries, and conflict zones.
 */

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup } from 'react-leaflet';
import { govetl_CaseMap } from '../utils/governmentMockData';
import L from 'leaflet';

interface GovernmentCaseMapProps {
  selectedCase: any | null;
  mapView?: string;
  isProcessing?: boolean;
  uploadedMap?: { dataUrl: string; fileName: string; fileSize: string; uploadTime: Date } | null;
  conflictParcelIds?: string[]; // List of parcel IDs that have conflicts
}

export default function GovernmentCaseMap({ 
  selectedCase, 
  mapView = 'comparison',
  isProcessing = false,
  uploadedMap = null,
  conflictParcelIds = ['P-009', 'P-010'] // Default conflict parcels
}: GovernmentCaseMapProps) {
  const [governmentCoords, setGovernmentCoords] = useState<any[]>([]);
  const [observedCoords, setObservedCoords] = useState<any[]>([]);
  const [conflictCoords, setConflictCoords] = useState<any[]>([]);
  const [cadastralParcels, setCadastralParcels] = useState<any[]>([]);

  // Always load cadastral parcels when component mounts or uploadedMap changes
  useEffect(() => {
    // Always load all cadastral parcels - they should always be visible
    setCadastralParcels(getCadastralParcels());
    
    // Load selected case geometry if a case is selected
    if (selectedCase) {
      const geometry = getCaseGeometry(selectedCase.parcel_id);
      
      if (geometry.official?.coordinates?.[0]) {
        const coords = geometry.official.coordinates[0].map((coord: any[]) => [coord[1], coord[0]]);
        setGovernmentCoords(coords);
      }
      
      if (geometry.observed?.coordinates?.[0]) {
        const coords = geometry.observed.coordinates[0].map((coord: any[]) => [coord[1], coord[0]]);
        setObservedCoords(coords);
      }
      
      if (geometry.conflict?.coordinates?.[0]) {
        const coords = geometry.conflict.coordinates[0].map((coord: any[]) => [coord[1], coord[0]]);
        setConflictCoords(coords);
      } else {
        setConflictCoords([]);
      }
    }
  }, [selectedCase, uploadedMap]);

  const mapCenter = DEMO_GEOMETRY.center as [number, number];

  // Show map if either selectedCase exists OR map is uploaded
  const shouldShowMap = !!selectedCase || !!uploadedMap;

  if (!shouldShowMap) {
    return (
      <div className="w-full h-full bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Upload a map or select a case to view</p>
      </div>
    );
  }

  const getMapOpacity = () => mapView === 'cadastral' ? 0.3 : 0.5;

  return (
    <div className="w-full h-full relative">
      {/* Processing overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-50">
          <div className="animate-spin mb-4">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-green-600 rounded-full"></div>
          </div>
          <p className="text-sm font-medium text-gray-700">Processing cadastral map...</p>
        </div>
      )}

      <MapContainer 
        center={mapCenter} 
        zoom={18} 
        style={{ height: "100%", width: "100%" }}
      >
        {/* Satellite Tile Layer */}
        {(mapView === 'satellite' || mapView === 'comparison') && (
          <TileLayer 
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='&copy; Esri'
            opacity={getMapOpacity()}
          />
        )}

        {/* Cadastral-style base layer */}
        {(mapView === 'cadastral' || mapView === 'comparison') && (
          <TileLayer 
            url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
            opacity={mapView === 'cadastral' ? 1 : 0.2}
          />
        )}

        {/* Render all cadastral parcels with labels */}
        {cadastralParcels.map((parcel, idx) => {
          const isConflictParcel = conflictParcelIds.includes(parcel.parcel_id);
          const isMapUploaded = uploadedMap !== null && uploadedMap !== undefined; // Check if map has been uploaded
          
          return (
            <React.Fragment key={`parcel-group-${idx}`}>
              {/* Parcel boundary polygon */}
              <Polygon 
                key={`parcel-${idx}`}
                positions={parcel.coordinates}
                pathOptions={{
                  color: isConflictParcel && isMapUploaded ? '#dc2626' : '#999999',
                  weight: isConflictParcel && isMapUploaded ? 3 : 1,
                  fillColor: isConflictParcel && isMapUploaded ? '#ef4444' : '#f5f5f5',
                  fillOpacity: isConflictParcel && isMapUploaded ? 0.25 : 0.3,
                  dashArray: null
                }}
              >
                <Popup>
                  <div className="text-xs">
                    <p className="font-bold">{parcel.parcel_id}</p>
                    <p className="text-gray-600">{Math.round(parcel.area_m2)} m²</p>
                    {isConflictParcel && <p className="text-red-600 font-bold">⚠ CONFLICT AREA</p>}
                  </div>
                </Popup>
              </Polygon>
              
              {/* Parcel number label */}
              {parcel.center && (
                <Marker
                  key={`label-${idx}`}
                  position={parcel.center}
                  icon={L.divIcon({
                    html: `<div style="
                      background: transparent;
                      border: none;
                      text-align: center;
                      font-size: 10px;
                      font-weight: bold;
                      color: ${isConflictParcel && isMapUploaded ? '#dc2626' : '#222222'};
                      text-shadow: 1px 1px 3px rgba(255,255,255,0.9), -1px -1px 3px rgba(255,255,255,0.9), 1px -1px 3px rgba(255,255,255,0.9), -1px 1px 3px rgba(255,255,255,0.9);
                      pointer-events: none;
                      font-weight: 900;
                    ">${parcel.parcel_id.replace('P-', '')}</div>`,
                    className: 'parcel-label',
                    iconSize: [30, 16],
                    iconAnchor: [15, 8]
                  })}
                />
              )}
            </React.Fragment>
          );
        })}

        {/* Government Record Boundary - White (always show) */}
        {governmentCoords.length > 0 && (
          <Polygon 
            positions={governmentCoords}
            pathOptions={{
              color: '#ffffff',
              weight: 2,
              fillColor: '#ffffff',
              fillOpacity: mapView === 'satellite' ? 0.1 : 0.15,
              dashArray: null,
              className: 'government-boundary'
            }}
          >
            <Popup>
              <div className="text-xs">
                <p className="font-bold text-gray-900">Government Record</p>
                <p className="text-gray-700">{selectedCase?.parcel_id}</p>
                <p className="text-gray-600">{selectedCase?.registered_area_m2} m² (official)</p>
              </div>
            </Popup>
          </Polygon>
        )}

        {/* Observed Boundary - REMOVED (no longer shown) */}

        {/* Conflict Area - Red highlight (conflict views) */}
        {conflictCoords.length > 0 && (mapView === 'conflict' || mapView === 'comparison') && (
          <>
            <Polygon 
              positions={conflictCoords}
              pathOptions={{
                color: '#dc2626',
                weight: 2.5,
                fillColor: '#ef4444',
                fillOpacity: 0.7,
                dashArray: null,
                className: 'conflict-area'
              }}
            >
              <Popup>
                <div className="text-xs">
                  <p className="font-bold text-red-700">⚠ Conflict Area</p>
                  <p className="text-gray-700">{selectedCase?.affected_area_m2} m²</p>
                  <p className="text-gray-600">{selectedCase?.affected_side} boundary</p>
                </div>
              </Popup>
            </Polygon>
            
            {/* Conflict label marker */}
            <Marker
              position={[
                (conflictCoords[0][0] + conflictCoords[2][0]) / 2,
                (conflictCoords[0][1] + conflictCoords[2][1]) / 2
              ]}
              icon={L.divIcon({
                html: `<div style="
                  background: white;
                  border: 2px solid #dc2626;
                  border-radius: 4px;
                  padding: 2px 6px;
                  text-align: center;
                  font-size: 10px;
                  font-weight: bold;
                  color: #dc2626;
                  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                ">CONFLICT<br/>${selectedCase?.affected_area_m2} m²</div>`,
                className: 'conflict-label',
                iconSize: [60, 40],
                iconAnchor: [30, 20]
              })}
            />
          </>
        )}

        {/* Center marker */}
        <Marker 
          position={mapCenter}
          icon={L.icon({
            iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI3IiBmaWxsPSIjMTZhMzRhIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMiIvPjwvc3ZnPg==',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
            popupAnchor: [0, -12]
          })}
        >
          <Popup>Map Center: Nagpur</Popup>
        </Marker>
      </MapContainer>

    </div>
  );
}

// Import functions from mock data
import { DEMO_GEOMETRY, getCaseGeometry, getCadastralParcels } from '../utils/governmentMockData';
