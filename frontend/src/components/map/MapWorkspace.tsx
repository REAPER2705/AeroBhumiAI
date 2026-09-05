import React, { useRef, useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, FeatureGroup } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import L from 'leaflet';

interface MapWorkspaceProps {
  parcelGeometry?: any;
  onHouseDrawn?: (geojson: any) => void;
  onHouseCleared?: () => void;
  showEncroachment?: boolean;
}

export default function MapWorkspace({ parcelGeometry, onHouseDrawn, onHouseCleared, showEncroachment = false }: MapWorkspaceProps) {
  const mapRef = useRef<any>(null);

  // Convert parcelGeometry to Leaflet LatLng[] if it's GeoJSON
  const [parcelCoords, setParcelCoords] = useState<any[]>([]);
  const [encroachmentCoords, setEncroachmentCoords] = useState<any[]>([]);

  useEffect(() => {
    if (parcelGeometry && parcelGeometry.type === 'Polygon') {
      const coords = parcelGeometry.coordinates[0].map((coord: any[]) => [coord[1], coord[0]]);
      setParcelCoords(coords);

      // Create a simulated blue encroachment polygon overlapping the south-east boundary
      if (coords.length > 2) {
        const p1 = coords[1];
        const p2 = coords[2];
        setEncroachmentCoords([
          p1,
          [p1[0] + 0.0003, p1[1] + 0.0003],
          [p2[0] + 0.0003, p2[1] + 0.0003],
          p2
        ]);
      }
    }
  }, [parcelGeometry]);

  const onCreated = (e: any) => {
    const { layerType, layer } = e;
    if (layerType === 'polygon' && onHouseDrawn) {
      const geojson = layer.toGeoJSON();
      onHouseDrawn(geojson.geometry);
    }
  };

  const onDeleted = () => {
    if (onHouseCleared) onHouseCleared();
  };

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer 
        center={parcelCoords.length > 0 ? parcelCoords[0] : [18.5205, 73.8572]} 
        zoom={18} 
        style={{ height: "100%", width: "100%" }} 
        ref={mapRef}
      >
        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
        
        {/* Official Parcel Boundary (Green) */}
        {parcelCoords.length > 0 && (
          <Polygon 
            positions={parcelCoords} 
            pathOptions={{ color: '#22c55e', weight: 3, fillColor: '#22c55e', fillOpacity: 0.15, dashArray: '6,6' }} 
          />
        )}

        {/* Encroachment Overlay (Blue/Purple) */}
        {showEncroachment && encroachmentCoords.length > 0 && (
          <Polygon 
            positions={encroachmentCoords} 
            pathOptions={{ color: '#3b82f6', weight: 2, fillColor: '#3b82f6', fillOpacity: 0.6 }} 
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
