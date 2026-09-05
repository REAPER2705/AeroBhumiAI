import React, { useState } from "react";
import { MapContainer, TileLayer, LayersControl, Polygon } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { UploadCloud, Map as MapIcon, AlertTriangle, CheckCircle, Layers, FileText, Activity } from "lucide-react";

// Mock Data
const LEGAL_PARCELS = [
  { id: 1, coordinates: [[18.5200, 73.8560], [18.5200, 73.8570], [18.5210, 73.8570], [18.5210, 73.8560]] }, // Plot 41
  { id: 2, coordinates: [[18.5200, 73.8575], [18.5200, 73.8585], [18.5210, 73.8585], [18.5210, 73.8575]] }  // Plot 42
];

const AI_PARCELS = [
  { id: 1, type: 'ok', coordinates: [[18.5201, 73.8561], [18.5201, 73.8569], [18.5209, 73.8569], [18.5209, 73.8561]] }, // Plot 41 Inside
  { id: 2, type: 'encroachment', coordinates: [[18.5200, 73.8574], [18.5200, 73.8588], [18.5212, 73.8588], [18.5212, 73.8574]] } // Plot 42 Encroached
];

export default function App() {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'analyzing' | 'done'>('idle');
  const [showLegal, setShowLegal] = useState(true);
  const [showAI, setShowAI] = useState(true);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    processUpload();
  };

  const processUpload = () => {
    setStatus('uploading');
    setTimeout(() => {
      setStatus('analyzing');
      setTimeout(() => setStatus('done'), 2000);
    }, 1500);
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800 font-sans">
      
      {/* Sidebar */}
      <div className="w-96 bg-white border-r border-gray-200 flex flex-col shadow-lg z-[1000]">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-blue-900 text-white">
          <div className="flex items-center gap-3">
            <MapIcon className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">AeroBhumiAI</h1>
              <p className="text-xs text-blue-200 uppercase tracking-wider font-semibold mt-1">SIH 2026 - PS 26012</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          
          {/* Upload Zone */}
          {status === 'idle' && (
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-blue-300 rounded-xl p-8 flex flex-col items-center justify-center bg-blue-50/50 hover:bg-blue-50 transition cursor-pointer"
              onClick={processUpload}
            >
              <UploadCloud className="w-12 h-12 text-blue-500 mb-4" />
              <p className="text-sm font-semibold text-gray-700">Drag & Drop Drone Imagery</p>
              <p className="text-xs text-gray-500 mt-2 text-center">Supports .TIF, .PNG (Max 50MB)</p>
              <button className="mt-6 px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
                Browse Files
              </button>
            </div>
          )}

          {/* Loading States */}
          {(status === 'uploading' || status === 'analyzing') && (
            <div className="flex flex-col items-center justify-center py-12">
              <Activity className="w-12 h-12 text-blue-500 animate-pulse mb-4" />
              <h3 className="text-lg font-bold text-gray-800">
                {status === 'uploading' ? 'Uploading Drone Data...' : 'AI Segmenting Parcels...'}
              </h3>
              <p className="text-sm text-gray-500 mt-2 text-center">
                {status === 'uploading' ? 'Processing 45MB GeoTIFF' : 'Running Meta SAM 2 Model'}
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-6 overflow-hidden">
                <div className="bg-blue-600 h-2 rounded-full animate-[pulse_2s_ease-in-out_infinite]" style={{ width: status === 'uploading' ? '40%' : '85%' }}></div>
              </div>
            </div>
          )}

          {/* Results Dashboard */}
          {status === 'done' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3 mb-6">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-green-900">Analysis Complete</h3>
                  <p className="text-sm text-green-700 mt-1">Scanned 1.2 sq km in 3.4 seconds.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase font-bold">Parcels Found</p>
                  <p className="text-2xl font-black text-gray-800 mt-1">247</p>
                </div>
                <div className="bg-red-50 border border-red-200 p-4 rounded-xl">
                  <p className="text-xs text-red-500 uppercase font-bold">Conflicts</p>
                  <p className="text-2xl font-black text-red-700 mt-1">12</p>
                </div>
              </div>

              {/* Toggles */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm">
                <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2"><Layers className="w-4 h-4" /> Map Layers</h3>
                <div className="flex flex-col gap-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={showLegal} onChange={(e) => setShowLegal(e.target.checked)} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                    <span className="text-sm font-medium text-gray-700 flex items-center">Bhu-Naksha Records <span className="inline-block w-3 h-3 bg-blue-500 ml-2 rounded-sm opacity-50"></span></span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={showAI} onChange={(e) => setShowAI(e.target.checked)} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                    <span className="text-sm font-medium text-gray-700 flex items-center">AI Detected Area <span className="inline-block w-3 h-3 bg-red-500 ml-2 rounded-sm opacity-50"></span></span>
                  </label>
                </div>
              </div>

              {/* Encroachment List */}
              <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-500" /> Critical Encroachments</h3>
              <div className="flex flex-col gap-3">
                <div className="bg-white border-l-4 border-red-500 shadow-sm rounded-r-lg p-4 cursor-pointer hover:bg-gray-50 transition">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-gray-900">Plot 42</h4>
                    <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded">High Risk</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Owner: Ramesh Sharma</p>
                  <div className="mt-3 flex gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs">Legal Area</p>
                      <p className="font-semibold text-gray-800">200 sq m</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">AI Detected</p>
                      <p className="font-semibold text-red-600">247 sq m</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <button className="w-full mt-6 py-3 bg-gray-900 text-white text-sm font-bold rounded-lg hover:bg-gray-800 transition flex items-center justify-center gap-2">
                <FileText className="w-4 h-4" /> Generate Official Report
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative z-0 bg-gray-100">
        <MapContainer center={[18.5205, 73.8572]} zoom={18} style={{ height: "100%", width: "100%" }}>
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="Satellite View">
              <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Street Map">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            </LayersControl.BaseLayer>
          </LayersControl>

          {status === 'done' && (
            <>
              {/* Legal Boundaries (Blue) */}
              {showLegal && LEGAL_PARCELS.map((parcel) => (
                <Polygon 
                  key={`legal-${parcel.id}`} 
                  positions={parcel.coordinates as any} 
                  pathOptions={{ color: '#3b82f6', weight: 2, fillColor: '#3b82f6', fillOpacity: 0.2 }}
                />
              ))}

              {/* AI Boundaries (Red for encroachment, Green for ok) */}
              {showAI && AI_PARCELS.map((parcel) => (
                <Polygon 
                  key={`ai-${parcel.id}`} 
                  positions={parcel.coordinates as any} 
                  pathOptions={{ 
                    color: parcel.type === 'encroachment' ? '#ef4444' : '#22c55e', 
                    weight: 3, 
                    fillColor: parcel.type === 'encroachment' ? '#ef4444' : '#22c55e', 
                    fillOpacity: parcel.type === 'encroachment' ? 0.4 : 0.1,
                    dashArray: '5, 5'
                  }}
                />
              ))}
            </>
          )}
        </MapContainer>
      </div>
    </div>
  );
}
