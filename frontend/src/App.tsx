import React, { useState } from "react";
import { MapContainer, TileLayer, GeoJSON, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function App() {
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleUpload = () => {
    setLoading(true);
    // Simulated upload delay
    setTimeout(() => {
      setLoading(false);
      setParcels([
        {
          id: 1,
          area: 247,
          encroachment: 47,
          geometry: {
            type: "Polygon",
            coordinates: [[[73.8567, 18.5204], [73.8570, 18.5204], [73.8570, 18.5207], [73.8567, 18.5207], [73.8567, 18.5204]]]
          }
        }
      ]);
    }, 2000);
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <div className="w-80 p-6 flex flex-col border-r border-gray-700 bg-gray-800">
        <h1 className="text-2xl font-bold mb-2">?? AeroBhumiAI</h1>
        <p className="text-sm text-gray-400 mb-6">Cadastral AI Pre-Validation</p>
        
        <button 
          onClick={handleUpload}
          className="bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded mb-6 transition"
        >
          {loading ? "Analyzing Drone Photo..." : "Upload Drone Image"}
        </button>

        {parcels.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-green-400 mb-2">? Analysis Complete</h2>
            <div className="bg-red-900/40 border border-red-500 p-4 rounded-lg">
              <h3 className="font-bold text-red-400">?? Encroachment Detected</h3>
              <p className="text-sm mt-1">Plot 42 - Ramesh Sharma</p>
              <p className="text-sm mt-1">Legal Area: 200 m²</p>
              <p className="text-sm mt-1">Actual: 247 m²</p>
              <p className="text-sm font-bold text-red-400 mt-2">Excess: 47 m²</p>
            </div>
          </div>
        )}
      </div>

      {/* Map Area */}
      <div className="flex-1 relative z-0">
        <MapContainer center={[18.5204, 73.8567]} zoom={18} style={{ height: "100%", width: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {parcels.length > 0 && (
            <GeoJSON 
              data={{
                type: "FeatureCollection",
                features: parcels.map(p => ({
                  type: "Feature",
                  geometry: p.geometry,
                  properties: p
                }))
              }}
              style={{ color: "#ff0000", weight: 2, fillColor: "#ff0000", fillOpacity: 0.4 }}
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
}
