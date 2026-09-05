import React, { useState, useRef, useEffect } from "react";
import { MapContainer, TileLayer, LayersControl, Polygon, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { UploadCloud, Map as MapIcon, AlertTriangle, CheckCircle, Layers, FileText, Activity, Search, X, Download, Moon, Sun, DownloadCloud, PieChart } from "lucide-react";

// Mock Data
const LEGAL_PARCELS = [
  { id: 1, plot: "41", owner: "Suresh Patil", area: 150, coordinates: [[18.5200, 73.8560], [18.5200, 73.8570], [18.5210, 73.8570], [18.5210, 73.8560]] }, 
  { id: 2, plot: "42", owner: "Ramesh Sharma", area: 200, coordinates: [[18.5200, 73.8575], [18.5200, 73.8585], [18.5210, 73.8585], [18.5210, 73.8575]] }  
];

const AI_PARCELS = [
  { id: 1, plot: "41", type: 'ok', area: 150, excess: 0, center: [18.5205, 73.8565], coordinates: [[18.5201, 73.8561], [18.5201, 73.8569], [18.5209, 73.8569], [18.5209, 73.8561]] }, 
  { id: 2, plot: "42", type: 'encroachment', area: 247, excess: 47, center: [18.5205, 73.8580], coordinates: [[18.5200, 73.8574], [18.5200, 73.8588], [18.5212, 73.8588], [18.5212, 73.8574]] } 
];

// Helper Component to animate map movement
function MapFlyTo({ centerPos }: { centerPos: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (centerPos) {
      map.flyTo(centerPos, 20, { animate: true, duration: 1.5 });
    }
  }, [centerPos, map]);
  return null;
}

export default function App() {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'analyzing' | 'done'>('idle');
  const [showLegal, setShowLegal] = useState(true);
  const [showAI, setShowAI] = useState(true);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  
  // New State for Features
  const [searchQuery, setSearchQuery] = useState("");
  const [flyToPos, setFlyToPos] = useState<[number, number] | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    setSelectedFileName(file.name);
    processUpload();
  };

  const handleBrowseClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const processUpload = () => {
    setStatus('uploading');
    setTimeout(() => {
      setStatus('analyzing');
      setTimeout(() => setStatus('done'), 2000);
    }, 1500);
  };

  const handleReset = () => {
    setStatus('idle');
    setSelectedFileName(null);
    setSearchQuery("");
    setFlyToPos(null);
  };

  const handleExportCSV = () => {
    const headers = "Plot Number,Owner,Status,Legal Area (sq m),Detected Area (sq m),Excess (sq m)\n";
    const rows = AI_PARCELS.map(p => {
      const legal = LEGAL_PARCELS.find(l => l.plot === p.plot);
      return `${p.plot},${legal?.owner || 'Unknown'},${p.type === 'ok' ? 'Safe' : 'Encroached'},${legal?.area || 0},${p.area},${p.excess}`;
    }).join("\n");
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AeroBhumiAI_Audit_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Filter encroachments based on search query
  const filteredEncroachments = AI_PARCELS.filter(p => 
    p.type === 'encroachment' && p.plot.includes(searchQuery)
  );

  return (
    <div className={`flex h-screen font-sans overflow-hidden ${isDarkMode ? 'dark' : ''}`}>
      
      {/* Sidebar */}
      <div className="w-[440px] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col shadow-2xl z-[1000] relative transition-colors duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-blue-900 dark:bg-gray-950 text-white flex justify-between items-center transition-colors duration-300">
          <div className="flex items-center gap-3">
            <MapIcon className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">AeroBhumiAI</h1>
              <p className="text-xs text-blue-200 uppercase tracking-wider font-semibold mt-1">SIH 2026 - PS 26012</p>
            </div>
          </div>
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)} 
            className="p-2 rounded-full hover:bg-white/10 transition"
            title="Toggle Dark Mode"
          >
            {isDarkMode ? <Sun className="w-5 h-5 text-yellow-300" /> : <Moon className="w-5 h-5 text-blue-200" />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          
          {/* Upload Zone */}
          {status === 'idle' && (
            <>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".tif,.tiff,.png,.jpg,.jpeg" className="hidden" />
              <div 
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={handleBrowseClick}
                className="border-2 border-dashed border-blue-300 dark:border-gray-700 rounded-xl p-8 flex flex-col items-center justify-center bg-blue-50/50 dark:bg-gray-800/50 hover:bg-blue-100 dark:hover:bg-gray-800 transition cursor-pointer group"
              >
                <UploadCloud className="w-12 h-12 text-blue-500 dark:text-blue-400 mb-4 group-hover:scale-110 transition-transform" />
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Drag & Drop Drone Imagery</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">Supports .TIF, .PNG, .JPG (Max 50MB)</p>
                <button className="mt-6 px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition pointer-events-none">
                  Browse Files
                </button>
              </div>
            </>
          )}

          {/* Loading States */}
          {(status === 'uploading' || status === 'analyzing') && (
            <div className="flex flex-col items-center justify-center py-12">
              <Activity className="w-12 h-12 text-blue-500 animate-pulse mb-4" />
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                {status === 'uploading' ? 'Uploading Drone Data...' : 'AI Segmenting Parcels...'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                {selectedFileName}
              </p>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-6 overflow-hidden">
                <div className="bg-blue-600 h-2 rounded-full animate-[pulse_2s_ease-in-out_infinite]" style={{ width: status === 'uploading' ? '40%' : '85%' }}></div>
              </div>
            </div>
          )}

          {/* Results Dashboard */}
          {status === 'done' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* Search Bar */}
              <div className="relative mb-6">
                <input 
                  type="text" 
                  placeholder="Search Plot Number..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm transition-colors"
                />
                <Search className="w-4 h-4 text-gray-400 absolute left-4 top-3.5" />
              </div>

              {/* Analytics Section */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-6 shadow-sm transition-colors">
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2"><PieChart className="w-4 h-4" /> Scan Analytics</h3>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Total Scanned: 247 Parcels</span>
                  <span className="text-xs font-bold text-red-500">12 Conflicts (4.8%)</span>
                </div>
                {/* Visual Progress Bar */}
                <div className="w-full h-3 flex rounded-full overflow-hidden mb-4 bg-gray-100">
                  <div className="bg-green-500 h-full" style={{ width: '95.2%' }} title="Safe Parcels"></div>
                  <div className="bg-red-500 h-full" style={{ width: '4.8%' }} title="Encroached Parcels"></div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3 rounded-lg text-center transition-colors">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold">Total Area</p>
                    <p className="text-xl font-black text-gray-800 dark:text-white mt-0.5">1.2 km²</p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 p-3 rounded-lg text-center transition-colors">
                    <p className="text-[10px] text-red-500 dark:text-red-400 uppercase font-bold">Excess Detected</p>
                    <p className="text-xl font-black text-red-700 dark:text-red-400 mt-0.5">47 m²</p>
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-6 shadow-sm transition-colors">
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2"><Layers className="w-4 h-4" /> Map Layers</h3>
                <div className="flex flex-col gap-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={showLegal} onChange={(e) => setShowLegal(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">Bhu-Naksha Records <span className="inline-block w-3 h-3 bg-blue-500 ml-2 rounded-sm opacity-50"></span></span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={showAI} onChange={(e) => setShowAI(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">AI Detected Area <span className="inline-block w-3 h-3 bg-red-500 ml-2 rounded-sm opacity-50"></span></span>
                  </label>
                </div>
              </div>

              {/* Encroachment List */}
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-500" /> Critical Encroachments</h3>
              <div className="flex flex-col gap-3 max-h-56 overflow-y-auto pr-1">
                {filteredEncroachments.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No matching plots found.</p>
                ) : (
                  filteredEncroachments.map(enc => (
                    <div 
                      key={enc.id}
                      onClick={() => setFlyToPos(enc.center as [number, number])}
                      className="bg-white dark:bg-gray-800 border-l-4 border-red-500 shadow-sm rounded-r-lg p-4 cursor-pointer hover:bg-red-50 dark:hover:bg-gray-700 transition border border-y-gray-100 dark:border-y-gray-700 border-r-gray-100 dark:border-r-gray-700"
                    >
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-gray-900 dark:text-white">Plot {enc.plot}</h4>
                        <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded">High Risk</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Owner: Ramesh Sharma</p>
                      <div className="mt-3 flex gap-4 text-sm">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 text-xs">AI Detected</p>
                          <p className="font-semibold text-red-600 dark:text-red-400">{enc.area} m²</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 text-xs">Excess</p>
                          <p className="font-semibold text-red-600 dark:text-red-400">+{enc.excess} m²</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-3 mt-6">
                <button onClick={() => setShowReportModal(true)} className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-bold rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition flex items-center justify-center gap-2 shadow-md">
                  <FileText className="w-4 h-4" /> Report Modal
                </button>
                <button onClick={handleExportCSV} className="w-full py-3 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 shadow-md">
                  <DownloadCloud className="w-4 h-4" /> Export CSV
                </button>
              </div>
              
              <button onClick={handleReset} className="w-full mt-4 py-2 text-blue-600 dark:text-blue-400 text-sm font-bold hover:underline transition flex items-center justify-center">
                Scan Another Image
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative z-0 bg-gray-100 dark:bg-gray-900">
        <MapContainer center={[18.5205, 73.8572]} zoom={18} style={{ height: "100%", width: "100%" }}>
          <MapFlyTo centerPos={flyToPos} />
          
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
                >
                  <Popup>
                    <div className="text-sm font-sans">
                      <strong className="text-blue-700 block text-base mb-1">Official Record</strong>
                      <span className="text-gray-600">Plot:</span> <b>{parcel.plot}</b><br/>
                      <span className="text-gray-600">Owner:</span> {parcel.owner}<br/>
                      <span className="text-gray-600">Registered Area:</span> {parcel.area} m²
                    </div>
                  </Popup>
                </Polygon>
              ))}

              {/* AI Boundaries (Red/Green) */}
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
                >
                  <Popup>
                    <div className="text-sm font-sans min-w-[150px]">
                      <strong className={parcel.type === 'encroachment' ? "text-red-600 block text-base mb-1" : "text-green-600 block text-base mb-1"}>
                        {parcel.type === 'encroachment' ? '🚨 Encroachment Detected' : '✅ Legal Boundary Valid'}
                      </strong>
                      <span className="text-gray-600">Plot:</span> <b>{parcel.plot}</b><br/>
                      <span className="text-gray-600">Detected Area:</span> {parcel.area} m²<br/>
                      {parcel.excess > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <span className="text-red-600 font-bold">Excess Area: +{parcel.excess} m²</span>
                        </div>
                      )}
                    </div>
                  </Popup>
                </Polygon>
              ))}
            </>
          )}
        </MapContainer>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center transition-colors">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Cadastral Discrepancy Report
              </h2>
              <button onClick={() => setShowReportModal(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Modal Body (Fake Document) */}
            <div className="p-8 overflow-y-auto bg-gray-200 dark:bg-gray-950 flex-1 transition-colors">
              <div className="bg-white p-10 border border-gray-300 shadow-sm mx-auto max-w-lg font-serif text-gray-900">
                <div className="text-center mb-8 border-b-2 border-gray-800 pb-4">
                  <h1 className="text-xl font-black uppercase tracking-widest text-gray-900">Department of Land Resources</h1>
                  <p className="text-sm font-bold text-gray-600 mt-1 uppercase">Government of India</p>
                </div>
                
                <div className="flex justify-between text-xs text-gray-500 mb-8 font-sans">
                  <span>Date: {new Date().toLocaleDateString()}</span>
                  <span>Ref: DLR/ENC/2026-8891</span>
                </div>

                <h3 className="text-lg font-bold text-center underline mb-6">NOTICE OF BOUNDARY ENCROACHMENT</h3>
                
                <p className="text-sm text-gray-800 leading-relaxed mb-4 text-justify">
                  This automated report is generated via the <span className="font-bold">AeroBhumiAI Pre-Validation System</span>. 
                  A drone-based geospatial analysis conducted on the provided imagery has detected a critical discrepancy between 
                  the official Bhu-Naksha records and the physical ground structures.
                </p>

                <div className="bg-gray-50 border border-gray-200 p-4 mb-6 font-sans text-sm">
                  <div className="grid grid-cols-2 gap-y-2">
                    <span className="text-gray-500 font-bold">Target Plot:</span> <span className="font-semibold text-gray-900">No. 42</span>
                    <span className="text-gray-500 font-bold">Registered Owner:</span> <span className="font-semibold text-gray-900">Ramesh Sharma</span>
                    <span className="text-gray-500 font-bold">Legal Area:</span> <span className="font-semibold text-gray-900">200 m²</span>
                    <span className="text-gray-500 font-bold text-red-600">Detected Area:</span> <span className="font-bold text-red-600">247 m²</span>
                  </div>
                </div>

                <p className="text-sm text-gray-800 leading-relaxed text-justify mb-8">
                  The physical construction has exceeded the legally registered boundaries by <span className="font-bold text-red-600">47 square meters</span>. 
                  This structural violation requires immediate field verification by the local Patwari/Surveyor.
                </p>

                <div className="text-right mt-12">
                  <p className="text-sm font-bold italic text-blue-800 border-t border-gray-400 inline-block pt-2">System Generated Signatory</p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end gap-3 transition-colors">
              <button onClick={() => setShowReportModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition">
                Cancel
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition flex items-center gap-2">
                <Download className="w-4 h-4" /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
