import React, { useRef, useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, FeatureGroup } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import L from 'leaflet';

interface MapWorkspaceProps {
  parcelGeometry?: any;
  houseGeometry?: any;
  onHouseDrawn?: (geojson: any) => void;
  onHouseCleared?: () => void;
  showEncroachment?: boolean;
}

export default function MapWorkspace({ parcelGeometry, houseGeometry, onHouseDrawn, onHouseCleared, showEncroachment = false }: MapWorkspaceProps) {
  const mapRef = useRef<any>(null);

  // Default demo coordinates around Nagpur (21.1400, 79.0800) matching prototype
  const defaultParcelCoords = [
    [21.1400, 79.0800],
    [21.1405, 79.0800],
    [21.1405, 79.0805],
    [21.1400, 79.0805]
  ];

  const defaultHouseCoords = [
    [21.1401, 79.0801],
    [21.1406, 79.0801],
    [21.1406, 79.0806],
    [21.1401, 79.0806]
  ];

  const defaultEncroachmentCoords = [
    [21.1405, 79.0801],
    [21.1406, 79.0801],
    [21.1406, 79.0806],
    [21.1405, 79.0806]
  ];

  const [parcelCoords, setParcelCoords] = useState<any[]>(defaultParcelCoords);
  const [houseCoords, setHouseCoords] = useState<any[]>(defaultHouseCoords);
  const [encroachmentCoords, setEncroachmentCoords] = useState<any[]>(defaultEncroachmentCoords);

  useEffect(() => {
    if (parcelGeometry && parcelGeometry.type === 'Polygon' && parcelGeometry.coordinates?.[0]?.length) {
      const coords = parcelGeometry.coordinates[0].map((coord: any[]) => [coord[1], coord[0]]);
      setParcelCoords(coords);
    }
  }, [parcelGeometry]);

  useEffect(() => {
    if (houseGeometry && houseGeometry.type === 'Polygon' && houseGeometry.coordinates?.[0]?.length) {
      const coords = houseGeometry.coordinates[0].map((coord: any[]) => [coord[1], coord[0]]);
      setHouseCoords(coords);
    }
  }, [houseGeometry]);

  const onCreated = (e: any) => {
    const { layerType, layer } = e;
    if (layerType === 'polygon' && onHouseDrawn) {
      const geojson = layer.toGeoJSON();
      onHouseDrawn(geojson.geometry);
      if (geojson.geometry?.coordinates?.[0]) {
        const coords = geojson.geometry.coordinates[0].map((coord: any[]) => [coord[1], coord[0]]);
        setHouseCoords(coords);
      }
    }
  };

  const onDeleted = () => {
    if (onHouseCleared) onHouseCleared();
  };

  const mapCenter = parcelCoords.length > 0 ? parcelCoords[0] : [21.1400, 79.0800];

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer 
        center={mapCenter} 
        zoom={18} 
        style={{ height: "100%", width: "100%" }} 
        ref={mapRef}
      >
        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
        
        {/* Official Legal Parcel Boundary (Green) */}
        {parcelCoords.length > 0 && (
          <Polygon 
            positions={parcelCoords} 
            pathOptions={{ color: '#22c55e', weight: 3, fillColor: '#22c55e', fillOpacity: 0.15, dashArray: '6,6' }} 
          />
        )}

        {/* Proposed Building Footprint (Red) */}
        {houseCoords.length > 0 && (
          <Polygon 
            positions={houseCoords} 
            pathOptions={{ color: '#ef4444', weight: 2, fillColor: '#ef4444', fillOpacity: 0.45 }} 
          />
        )}

        {/* Outside Encroachment Area (Blue/Purple Overlay) */}
        {showEncroachment && encroachmentCoords.length > 0 && (
          <Polygon 
            positions={encroachmentCoords} 
            pathOptions={{ color: '#3b82f6', weight: 2, fillColor: '#3b82f6', fillOpacity: 0.65 }} 
          />
        )}

        <FeatureGroup>
          <EditControl
            position="topright"
            onCreated={onCreated}
            onDeleted={onDeleted}
            draw={{
              rectangle: false,
              circle: false,
              circlemarker: false,
              marker: false,
              polyline: false,
              polygon: {
                allowIntersection: false,
                drawError: { color: '#e1e100', message: '<strong>Oh snap!<strong> you can\'t draw that!' },
                shapeOptions: { color: '#ef4444', fillOpacity: 0.45, weight: 2 }
              }
            }}
          />
        </FeatureGroup>
      </MapContainer>
    </div>
  );
}
