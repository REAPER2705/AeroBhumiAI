import React, { useRef, useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, FeatureGroup } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import L from 'leaflet';

interface MapWorkspaceProps {
  parcelGeometry: any;
  onHouseDrawn: (geojson: any) => void;
  onHouseCleared: () => void;
}

export default function MapWorkspace({ parcelGeometry, onHouseDrawn, onHouseCleared }: MapWorkspaceProps) {
  const mapRef = useRef<any>(null);

  // Convert parcelGeometry to Leaflet LatLng[] if it's GeoJSON
  const [parcelCoords, setParcelCoords] = useState<any[]>([]);

  useEffect(() => {
    if (parcelGeometry && parcelGeometry.type === 'Polygon') {
      // GeoJSON is [lng, lat], Leaflet wants [lat, lng]
      const coords = parcelGeometry.coordinates[0].map((coord: any[]) => [coord[1], coord[0]]);
      setParcelCoords(coords);
    }
  }, [parcelGeometry]);

  const onCreated = (e: any) => {
    const { layerType, layer } = e;
    if (layerType === 'polygon') {
      const geojson = layer.toGeoJSON();
      onHouseDrawn(geojson.geometry);
    }
  };

  const onDeleted = () => {
    onHouseCleared();
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
        
        {/* Official Boundary */}
        {parcelCoords.length > 0 && (
          <Polygon 
            positions={parcelCoords} 
            pathOptions={{ color: '#84cc16', weight: 2, fillColor: '#84cc16', fillOpacity: 0.1, dashArray: '5,5' }} 
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
                shapeOptions: { color: '#ef4444', fillOpacity: 0.4 }
              }
            }}
          />
        </FeatureGroup>
      </MapContainer>
    </div>
  );
}
