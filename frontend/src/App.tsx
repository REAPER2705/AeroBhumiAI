import React, { useState, useRef, useEffect } from "react";
import { MapContainer, TileLayer, LayersControl, Polygon, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { UploadCloud, Map as MapIcon, AlertTriangle, CheckCircle, Layers, FileText, Activity, Search, X, Download, Moon, Sun, DownloadCloud, PieChart } from "lucide-react";
// @ts-ignore
import html2pdf from "html2pdf.js";

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
  
  const [searchQuery, setSearchQuery] = useState("");
  const [flyToPos, setFlyToPos] = useState<[number, number] | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

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

  const handleDownloadPDF = () => {
    if (reportRef.current) {
      const opt = {
        margin:       0.5,
        filename:     `Cadastral_Report_Plot42_${new Date().toISOString().split('T')[0]}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
      };
      html2pdf().set(opt).from(reportRef.current).save();
    }
  };

  const filteredEncroachments = AI_PARCELS.filter(p => 
    p.type === 'encroachment' && p.plot.includes(searchQuery)
  );

  return (
    <div className={`flex h-screen font-sans overflow-hidden ${isDarkMode ? 'dark' : ''}`}>
      
      {/* Sidebar - Slate theme */}
      <div className="w-[440px] bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl z-[1000] relative transition-colors duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-black text-slate-900 dark:text-white flex justify-between items-center transition-colors duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg">
              <MapIcon className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">AeroBhumi<span className="text-indigo-600 dark:text-indigo-400">AI</span></h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-semibold mt-0.5">SIH 2026 - PS 26012</p>
            </div>
          </div>
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)} 
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-300 transition"
            title="Toggle Dark Mode"
          >
            {isDarkMode ? <Sun className="w-5 h-5 text-amber-300" /> : <Moon className="w-5 h-5" />}
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
                className="border-2 border-dashed border-indigo-200 dark:border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center bg-indigo-50/30 dark:bg-slate-900/50 hover:bg-indigo-50 dark:hover:bg-slate-800 transition cursor-pointer group"
              >
                <UploadCloud className="w-12 h-12 text-indigo-500 dark:text-indigo-400 mb-4 group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Drag & Drop Drone Imagery</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">Supports .TIF, .PNG, .JPG (Max 50MB)</p>
                <button className="mt-6 px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 shadow-md shadow-indigo-500/20 transition pointer-events-none">
                  Browse Files
                </button>
              </div>
            </>
          )}

          {/* Loading States */}
          {(status === 'uploading' || status === 'analyzing') && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <Activity className="w-12 h-12 text-indigo-500 animate-pulse mb-6" />
                <div className="absolute inset-0 bg-indigo-400 blur-xl opacity-20 animate-pulse"></div>
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {status === 'uploading' ? 'Uploading Drone Data...' : 'AI Segmenting Parcels...'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center font-mono bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700">
                {selectedFileName}
              </p>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-8 overflow-hidden border border-slate-200 dark:border-slate-700">
                <div className="bg-indigo-600 h-2 rounded-full animate-[pulse_2s_ease-in-out_infinite]" style={{ width: status === 'uploading' ? '40%' : '85%' }}></div>
              </div>
            </div>
          )}

          {/* Results Dashboard */}
          {status === 'done' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* Search Bar */}
              <div className="relative mb-6 group">
                <input 
                  type="text" 
                  placeholder="Search Plot Number..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm shadow-sm transition-all group-hover:border-indigo-300 dark:group-hover:border-slate-600"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5 group-hover:text-indigo-500 transition-colors" />
              </div>

              {/* Analytics Section */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 mb-6 shadow-sm transition-colors">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2"><PieChart className="w-4 h-4 text-indigo-500" /> Scan Analytics</h3>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Scanned: 247 Parcels</span>
                  <span className="text-xs font-bold text-rose-500">12 Conflicts (4.8%)</span>
                </div>
                {/* Visual Progress Bar */}
                <div className="w-full h-2.5 flex rounded-full overflow-hidden mb-5 bg-slate-100 dark:bg-slate-800">
                  <div className="bg-emerald-500 h-full" style={{ width: '95.2%' }} title="Safe Parcels"></div>
                  <div className="bg-rose-500 h-full" style={{ width: '4.8%' }} title="Encroached Parcels"></div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-xl text-center transition-colors">
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold">Total Area</p>
                    <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">1.2 km²</p>
                  </div>
                  <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 p-4 rounded-xl text-center transition-colors">
                    <p className="text-[10px] text-rose-600 dark:text-rose-400 uppercase tracking-widest font-bold">Excess Detected</p>
                    <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">47 m²</p>
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 mb-6 shadow-sm transition-colors">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2"><Layers className="w-4 h-4 text-indigo-500" /> Map Layers</h3>
                <div className="flex flex-col gap-3.5">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" checked={showLegal} onChange={(e) => setShowLegal(e.target.checked)} className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500" />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      Official Bhu-Naksha Records 
                      <span className="inline-block w-3 h-3 bg-blue-500 ml-2 rounded-[3px] opacity-70"></span>
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" checked={showAI} onChange={(e) => setShowAI(e.target.checked)} className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500" />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      AI Boundary Detection 
                      <span className="inline-block w-3 h-3 bg-rose-500 ml-2 rounded-[3px] opacity-70"></span>
                    </span>
                  </label>
                </div>
              </div>

              {/* Encroachment List */}
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-rose-500" /> Critical Encroachments</h3>
              <div className="flex flex-col gap-3 max-h-56 overflow-y-auto pr-2 custom-scrollbar">
                {filteredEncroachments.length === 0 ? (
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 text-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400">No matching plots found.</p>
                  </div>
                ) : (
                  filteredEncroachments.map(enc => (
                    <div 
                      key={enc.id}
                      onClick={() => setFlyToPos(enc.center as [number, number])}
                      className="bg-white dark:bg-slate-900 border-l-4 border-rose-500 shadow-sm rounded-r-xl p-4 cursor-pointer hover:bg-rose-50 dark:hover:bg-slate-800 transition-all border border-y-slate-200 dark:border-y-slate-800 border-r-slate-200 dark:border-r-slate-800 hover:-translate-y-0.5"
                    >
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-slate-900 dark:text-white">Plot {enc.plot}</h4>
                        <span className="bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 text-[10px] uppercase tracking-wider font-black px-2.5 py-1 rounded-md">High Risk</span>
                      </div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Owner: Ramesh Sharma</p>
                      <div className="mt-3 flex gap-6 text-sm bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                        <div>
                          <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-0.5">AI Detected</p>
                          <p className="font-bold text-slate-700 dark:text-slate-300">{enc.area} m²</p>
                        </div>
                        <div>
                          <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-0.5">Excess</p>
                          <p className="font-bold text-rose-600 dark:text-rose-400">+{enc.excess} m²</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-3 mt-6">
                <button onClick={() => setShowReportModal(true)} className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 shadow-md">
                  <FileText className="w-4 h-4" /> Legal Report
                </button>
                <button onClick={handleExportCSV} className="w-full py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20">
                  <DownloadCloud className="w-4 h-4" /> Export CSV
                </button>
              </div>
              
              <button onClick={handleReset} className="w-full mt-4 py-2 text-slate-500 dark:text-slate-400 text-sm font-semibold hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center justify-center">
                Scan Another Area
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative z-0 bg-slate-100 dark:bg-slate-950">
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
                  pathOptions={{ color: '#3b82f6', weight: 2, fillColor: '#3b82f6', fillOpacity: 0.15 }}
                >
                  <Popup className="premium-popup">
                    <div className="text-sm font-sans p-1">
                      <strong className="text-blue-600 block text-sm uppercase tracking-wider mb-2 border-b border-blue-100 pb-1">Official Record</strong>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        <span className="text-slate-500 text-xs">Plot:</span> <b className="text-slate-800 text-right">{parcel.plot}</b>
                        <span className="text-slate-500 text-xs">Owner:</span> <span className="text-slate-800 text-right">{parcel.owner}</span>
                        <span className="text-slate-500 text-xs">Reg. Area:</span> <span className="text-slate-800 text-right font-medium">{parcel.area} m²</span>
                      </div>
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
                    color: parcel.type === 'encroachment' ? '#f43f5e' : '#10b981', 
                    weight: 3, 
                    fillColor: parcel.type === 'encroachment' ? '#f43f5e' : '#10b981', 
                    fillOpacity: parcel.type === 'encroachment' ? 0.35 : 0.15,
                    dashArray: '6, 6'
                  }}
                >
                  <Popup className="premium-popup">
                    <div className="text-sm font-sans p-1 min-w-[180px]">
                      <strong className={parcel.type === 'encroachment' ? "text-rose-600 block text-sm uppercase tracking-wider mb-2 border-b border-rose-100 pb-1" : "text-emerald-600 block text-sm uppercase tracking-wider mb-2 border-b border-emerald-100 pb-1"}>
                        {parcel.type === 'encroachment' ? '🚨 Encroachment' : '✅ Verified Legal'}
                      </strong>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        <span className="text-slate-500 text-xs">Plot:</span> <b className="text-slate-800 text-right">{parcel.plot}</b>
                        <span className="text-slate-500 text-xs">AI Area:</span> <span className="text-slate-800 text-right font-medium">{parcel.area} m²</span>
                      </div>
                      {parcel.excess > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-100 bg-rose-50 -mx-1 -mb-1 px-2 py-1.5 rounded-b text-center">
                          <span className="text-rose-600 font-bold text-xs uppercase tracking-wide">Excess: +{parcel.excess} m²</span>
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
        <div className="fixed inset-0 bg-slate-900/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
            
            {/* Modal Header */}
            <div className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-6 py-5 flex justify-between items-center transition-colors">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Cadastral Discrepancy Report
              </h2>
              <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 p-1.5 rounded-full transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Modal Body (Fake Document) to be converted to PDF */}
            <div className="p-8 overflow-y-auto bg-slate-100 dark:bg-slate-950 flex-1 transition-colors">
              <div ref={reportRef} className="bg-white p-10 border border-slate-300 shadow-md mx-auto max-w-lg font-serif text-slate-900">
                <div className="text-center mb-8 border-b-2 border-slate-900 pb-4">
                  <h1 className="text-2xl font-black uppercase tracking-widest text-slate-900">Department of Land Resources</h1>
                  <p className="text-sm font-bold text-slate-600 mt-1 uppercase tracking-widest">Government of India</p>
                </div>
                
                <div className="flex justify-between text-xs text-slate-500 mb-8 font-sans font-medium">
                  <span>Date: {new Date().toLocaleDateString()}</span>
                  <span>Ref: DLR/ENC/2026-8891</span>
                </div>

                <h3 className="text-lg font-bold text-center underline mb-6 tracking-wide">NOTICE OF BOUNDARY ENCROACHMENT</h3>
                
                <p className="text-sm text-slate-800 leading-relaxed mb-5 text-justify">
                  This automated report is generated via the <span className="font-bold">AeroBhumiAI Pre-Validation System</span>. 
                  A drone-based geospatial analysis conducted on the provided imagery has detected a critical discrepancy between 
                  the official Bhu-Naksha records and the physical ground structures.
                </p>

                <div className="bg-slate-50 border border-slate-200 p-5 mb-6 font-sans text-sm rounded-lg">
                  <div className="grid grid-cols-2 gap-y-3">
                    <span className="text-slate-500 font-bold text-xs uppercase tracking-wider">Target Plot:</span> <span className="font-semibold text-slate-900">No. 42</span>
                    <span className="text-slate-500 font-bold text-xs uppercase tracking-wider">Registered Owner:</span> <span className="font-semibold text-slate-900">Ramesh Sharma</span>
                    <span className="text-slate-500 font-bold text-xs uppercase tracking-wider">Legal Area:</span> <span className="font-semibold text-slate-900">200 m²</span>
                    <span className="text-rose-600 font-bold text-xs uppercase tracking-wider">Detected Area:</span> <span className="font-bold text-rose-600">247 m²</span>
                  </div>
                </div>

                <p className="text-sm text-slate-800 leading-relaxed text-justify mb-10">
                  The physical construction has exceeded the legally registered boundaries by <span className="font-bold text-rose-600 underline decoration-rose-300 underline-offset-2">47 square meters</span>. 
                  This structural violation requires immediate field verification by the local Patwari/Surveyor.
                </p>

                <div className="text-right mt-16">
                  <p className="text-xs font-bold italic text-indigo-900 border-t border-slate-400 inline-block pt-2 w-48 text-center">System Generated Signatory</p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 py-4 flex justify-end gap-3 transition-colors">
              <button onClick={() => setShowReportModal(false)} className="px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition">
                Cancel
              </button>
              <button onClick={handleDownloadPDF} className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition flex items-center gap-2 shadow-md shadow-indigo-500/20">
                <Download className="w-4 h-4" /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
