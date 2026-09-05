import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Map, 
  UploadCloud, 
  FileText, 
  History, 
  User, 
  Search, 
  Plus, 
  Eye, 
  Download, 
  CheckCircle, 
  AlertTriangle,
  ChevronRight,
  MapPin,
  Edit2,
  Trash2,
  Layers
} from 'lucide-react';
import { MapContainer, TileLayer, Polygon } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [auditFlowStep, setAuditFlowStep] = useState('upload'); // upload, map, analysis, ai, report

  const renderContent = () => {
    switch (activeTab) {
      case 'Dashboard':
        return <DashboardScreen setActiveTab={setActiveTab} />;
      case 'Parcels':
        return <ParcelsScreen />;
      case 'Drone Upload':
        return <UploadFlow step={auditFlowStep} setStep={setAuditFlowStep} />;
      case 'Audit Map':
        return <AuditMapScreen setStep={setAuditFlowStep} setActiveTab={setActiveTab} />;
      case 'My Audits':
        return <div className="p-8"><h1>My Audits</h1><p>List of past audits would go here.</p></div>;
      case 'Reports':
        return <ReportsScreen />;
      default:
        return <DashboardScreen setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col justify-between">
        <div>
          <div className="p-6 flex items-center gap-2">
            <Layers className="w-6 h-6 text-green-600" />
            <span className="text-xl font-bold">AeroBhumi<span className="text-green-600">AI</span></span>
          </div>
          
          <nav className="mt-2 flex flex-col gap-1 px-3">
            {[
              { name: 'Dashboard', icon: LayoutDashboard },
              { name: 'Parcels', icon: MapPin },
              { name: 'Drone Upload', icon: UploadCloud },
              { name: 'Audit Map', icon: Map },
              { name: 'My Audits', icon: History },
              { name: 'Reports', icon: FileText }
            ].map((item) => (
              <button
                key={item.name}
                onClick={() => {
                  setActiveTab(item.name);
                  if (item.name === 'Drone Upload') setAuditFlowStep('upload');
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === item.name 
                    ? 'bg-green-600 text-white shadow-sm' 
                    : 'text-gray-600 hover:bg-green-50 hover:text-green-700'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </button>
            ))}
          </nav>
        </div>
        
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700">
              <User className="w-4 h-4" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-gray-900">Demo User</p>
              <p className="text-xs text-gray-500">Administrator</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-gray-50">
        {renderContent()}
      </div>
    </div>
  );
}

// --- SCREENS ---

function DashboardScreen({ setActiveTab }: any) {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back! Here's an overview of your land compliance audits.</p>
        </div>
        <button className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-green-700">
          <Plus className="w-4 h-4" /> New Audit
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Parcels', value: '24', sub: 'Registered' },
          { label: 'Audits Completed', value: '18', sub: 'This Month' },
          { label: 'Encroachments', value: '7', sub: 'Detected', text: 'text-red-600' },
          { label: 'Reports Generated', value: '12', sub: 'This Month' }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
            <p className={`text-3xl font-bold mt-2 ${stat.text || 'text-gray-900'}`}>{stat.value}</p>
            <p className="text-xs text-gray-400 mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-bold mb-4">Recent Audits</h2>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-gray-500 border-b">
                <th className="pb-3 font-medium">Audit ID</th>
                <th className="pb-3 font-medium">Parcel</th>
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                { id: 'AUD-2025-018', parcel: 'P-001', date: '24 May 2025', status: 'Encroachment', color: 'bg-red-100 text-red-700' },
                { id: 'AUD-2025-017', parcel: 'P-002', date: '24 May 2025', status: 'Clear', color: 'bg-green-100 text-green-700' },
                { id: 'AUD-2025-016', parcel: 'P-003', date: '23 May 2025', status: 'Variance', color: 'bg-yellow-100 text-yellow-700' }
              ].map((row, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-3 font-medium">{row.id}</td>
                  <td className="py-3 text-gray-600">{row.parcel}</td>
                  <td className="py-3 text-gray-600">{row.date}</td>
                  <td className="py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${row.color}`}>{row.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="mt-4 text-sm text-green-600 font-bold hover:underline w-full text-center">View All</button>
        </div>

        <div className="col-span-1 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-bold mb-4">Quick Start</h2>
          <div className="flex flex-col gap-6 relative">
            <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gray-100"></div>
            {[
              { step: 1, title: 'Select Parcel', desc: 'Choose a parcel to audit' },
              { step: 2, title: 'Upload Drone/GeoTIFF', desc: 'Upload imagery for analysis' },
              { step: 3, title: 'Run Audit', desc: 'Get AI-powered audit report' }
            ].map((s, i) => (
              <div key={i} className="flex gap-4 relative z-10 cursor-pointer group" onClick={() => setActiveTab('Drone Upload')}>
                <div className="w-7 h-7 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center text-xs font-bold group-hover:border-green-500 group-hover:text-green-600">
                  {s.step}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 group-hover:text-green-600">{s.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ParcelsScreen() {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Parcels</h1>
          <p className="text-gray-500 mt-1">Manage and view all registered parcels.</p>
        </div>
        <button className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-green-700">
          <Plus className="w-4 h-4" /> Add Parcel
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input type="text" placeholder="Search parcels..." className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-green-500" />
          </div>
          <select className="border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-700">
            <option>All Sectors</option>
          </select>
        </div>

        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-6 py-4 font-medium">Parcel ID</th>
              <th className="px-6 py-4 font-medium">Plot / Sector</th>
              <th className="px-6 py-4 font-medium">Location</th>
              <th className="px-6 py-4 font-medium">Area (sq.m.)</th>
              <th className="px-6 py-4 font-medium text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {[
              { id: 'P-001', sector: 'Sector 12', loc: 'Nagpur, Maharashtra', area: '1200.00' },
              { id: 'P-002', sector: 'Sector 7', loc: 'Nagpur, Maharashtra', area: '950.00' },
              { id: 'P-003', sector: 'Sector 3', loc: 'Nagpur, Maharashtra', area: '1350.00' }
            ].map((p, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{p.id}</td>
                <td className="px-6 py-4">{p.sector}</td>
                <td className="px-6 py-4 text-gray-500">{p.loc}</td>
                <td className="px-6 py-4">{p.area}</td>
                <td className="px-6 py-4 flex justify-center">
                  <button className="p-1.5 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50"><Eye className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="p-4 border-t border-gray-200 flex justify-between items-center text-sm text-gray-500">
          <span>Showing 1 to 5 of 24 parcels</span>
          <div className="flex gap-1">
            <button className="px-2 py-1 hover:bg-gray-100 rounded">&lt;</button>
            <button className="px-3 py-1 bg-green-600 text-white rounded">1</button>
            <button className="px-3 py-1 hover:bg-gray-100 rounded">2</button>
            <button className="px-3 py-1 hover:bg-gray-100 rounded">3</button>
            <button className="px-2 py-1 hover:bg-gray-100 rounded">&gt;</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function UploadFlow({ step, setStep }: any) {
  if (step === 'map') return <AuditMapScreen setStep={setStep} setActiveTab={null} />;
  if (step === 'spatial') return <SpatialAnalysisScreen setStep={setStep} />;
  if (step === 'analysis') return <AuditAnalysisScreen setStep={setStep} />;
  if (step === 'ai') return <AiExplanationScreen setStep={setStep} />;
  if (step === 'report_gen') return <GenerateReportScreen />;

  // Default: Drone Upload
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Upload Drone Image / GeoTIFF</h1>
      <p className="text-gray-500 mb-8">Upload drone orthomosaic image (GeoTIFF) for the selected parcel.</p>

      {/* Stepper */}
      <div className="flex items-center justify-between mb-8 px-12 relative">
        <div className="absolute top-1/2 left-12 right-12 h-0.5 bg-gray-200 -z-10"></div>
        {[
          { num: 1, label: 'Upload File', active: true },
          { num: 2, label: 'Configure', active: false },
          { num: 3, label: 'Preview', active: false }
        ].map((s) => (
          <div key={s.num} className="flex flex-col items-center gap-2 bg-gray-50 px-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${s.active ? 'bg-green-100 text-green-700 border-2 border-green-500' : 'bg-white border-2 border-gray-300 text-gray-400'}`}>
              {s.num}
            </div>
            <span className={`text-xs font-bold ${s.active ? 'text-green-700' : 'text-gray-500'}`}>{s.label}</span>
          </div>
        ))}
      </div>

      <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-12 flex flex-col items-center justify-center mb-6 hover:border-green-400 transition-colors">
        <UploadCloud className="w-12 h-12 text-gray-400 mb-4" />
        <p className="font-bold text-gray-700 mb-2">Drag & drop your GeoTIFF file here</p>
        <p className="text-sm text-gray-500 mb-6">or</p>
        <button onClick={() => setStep('map')} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700">Browse File</button>
        <p className="text-xs text-gray-400 mt-6">Supported formats: .tif, .tiff (GeoTIFF) • Max file size: 500MB</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 flex justify-between items-center shadow-sm">
        <div>
          <p className="text-xs text-gray-500 font-bold mb-1">Selected Parcel</p>
          <div className="flex items-center gap-2">
            <select className="font-bold text-gray-900 border border-gray-300 rounded px-2 py-1 text-sm bg-gray-50">
              <option>P-001</option>
              <option>P-002</option>
              <option>P-003</option>
            </select>
          </div>
          <p className="text-sm text-gray-600 mt-2">Sector 12, Nagpur, Maharashtra</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 font-bold mb-1">Area</p>
          <p className="font-bold text-gray-900 mb-2">1200.00 sq.m.</p>
        </div>
      </div>
    </div>
  );
}

function AuditMapScreen({ setStep, setActiveTab }: any) {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Audit Map</h1>
      <p className="text-gray-500 mb-6">Define parcel boundary and building footprint for analysis.</p>

      <div className="flex gap-6 h-[550px]">
        {/* Left Tools */}
        <div className="w-72 flex flex-col gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-3">1. Draw Legal Boundary</h3>
            <p className="text-xs text-gray-500 mb-4">Draw the legal parcel boundary.</p>
            <div className="flex gap-2">
              <button className="flex-1 bg-green-50 text-green-700 border border-green-200 py-2 rounded flex items-center justify-center gap-2"><Edit2 className="w-4 h-4" /> Draw</button>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-3">2. Draw Proposed Building</h3>
            <p className="text-xs text-gray-500 mb-4">Draw the proposed building footprint.</p>
            <div className="flex gap-2">
              <button className="flex-1 bg-green-600 text-white py-2 rounded flex items-center justify-center gap-2 hover:bg-green-700"><Edit2 className="w-4 h-4" /> Draw</button>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-3">3. Actions</h3>
            <div className="flex gap-2">
              <button className="flex-1 text-xs border border-gray-300 text-gray-700 py-2 rounded font-bold hover:bg-gray-50">Clear All</button>
              <button onClick={() => setStep('spatial')} className="flex-1 text-xs bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700">Check Compliance</button>
            </div>
          </div>

          <div className="bg-gray-100 rounded-xl p-5 border border-gray-200 mt-auto">
            <p className="text-xs text-gray-500 font-bold mb-1">Selected Parcel</p>
            <p className="font-bold text-sm text-gray-900">P-001</p>
            <p className="text-xs text-gray-600 mt-1">Sector 12<br/>Nagpur, Maharashtra</p>
            <p className="text-xs text-gray-600 mt-2">Area: 1200.00 sq.m.</p>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden relative shadow-sm">
           <MapContainer center={[18.5205, 73.8572]} zoom={18} style={{ height: "100%", width: "100%" }} zoomControl={false}>
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
            {/* Legal Boundary */}
            <Polygon positions={[[18.5200, 73.8560], [18.5200, 73.8570], [18.5210, 73.8570], [18.5210, 73.8560]]} pathOptions={{ color: '#84cc16', weight: 2, fillColor: '#84cc16', fillOpacity: 0.1, dashArray: '5,5' }} />
            {/* Building Footprint */}
            <Polygon positions={[[18.5202, 73.8562], [18.5202, 73.8571], [18.5208, 73.8571], [18.5208, 73.8562]]} pathOptions={{ color: '#ef4444', weight: 2, fillColor: '#ef4444', fillOpacity: 0.4 }} />
          </MapContainer>
        </div>
      </div>
    </div>
  );
}

function SpatialAnalysisScreen({ setStep }: any) {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Spatial Analysis (Build Check)</h1>
      <p className="text-gray-500 mb-6">Automated GIS analysis of parcel vs building footprint.</p>

      <div className="flex gap-6">
        <div className="flex-1 bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col">
          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-3 mb-4">Analysis Metrics</h2>
          
          <div className="flex flex-col gap-4 text-sm mb-8">
            <div className="flex justify-between">
              <span className="text-gray-500">Parcel Area</span>
              <span className="font-bold text-green-700">1200.00 sq.m.</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Building Area (Inside Parcel)</span>
              <span className="font-bold text-gray-900">1050.55 sq.m.</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Building Area (Outside Parcel)</span>
              <span className="font-bold text-red-600">149.45 sq.m.</span>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-4">
              <span className="text-gray-900 font-bold">Outside Percentage</span>
              <span className="font-bold text-red-600">12.45%</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-gray-500 font-bold">IoU Score</span>
              <span className="font-bold text-green-700">0.78 (78.00%)</span>
            </div>
          </div>

          <div className="mt-auto bg-red-50 border border-red-100 rounded-xl p-4">
            <p className="text-red-600 font-bold flex items-center gap-2 mb-1"><AlertTriangle className="w-4 h-4" /> Encroachment Detected</p>
            <p className="text-xs text-red-700">Portion of the building lies outside the parcel boundary.</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-4">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden relative shadow-sm h-72">
             <MapContainer center={[18.5205, 73.8565]} zoom={18} style={{ height: "100%", width: "100%" }} zoomControl={false} dragging={false}>
              <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
              <Polygon positions={[[18.5200, 73.8560], [18.5200, 73.8570], [18.5210, 73.8570], [18.5210, 73.8560]]} pathOptions={{ color: '#84cc16', weight: 3, fillColor: 'none', dashArray: '5,5' }} />
              <Polygon positions={[[18.5202, 73.8562], [18.5202, 73.8571], [18.5208, 73.8571], [18.5208, 73.8562]]} pathOptions={{ color: '#ef4444', weight: 0, fillColor: '#ef4444', fillOpacity: 0.5 }} />
            </MapContainer>
          </div>
          <div className="flex gap-4 justify-center text-xs text-gray-600 bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 border-2 border-green-500 border-dashed rounded-sm"></span> Parcel Boundary</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-red-500/50 rounded-sm"></span> Proposed Building</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-blue-500/50 rounded-sm"></span> Outside (Encroachment)</span>
          </div>
        </div>
      </div>

      <div className="flex justify-between mt-6">
        <button onClick={() => setStep('map')} className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50">Back</button>
        <button onClick={() => setStep('analysis')} className="px-6 py-2 bg-green-600 rounded-lg text-sm font-bold text-white hover:bg-green-700">Continue to Audit Analysis</button>
      </div>
    </div>
  );
}

function AuditAnalysisScreen({ setStep }: any) {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Audit Analysis</h1>
      <p className="text-gray-500 mb-6">AI-powered land compliance audit results.</p>

      <div className="flex gap-6">
        <div className="w-1/3 flex flex-col gap-6">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <p className="text-xs text-red-700 uppercase font-bold tracking-wider mb-2">Diagnosis</p>
            <h3 className="text-xl font-black text-red-600 uppercase">Encroachment Detected</h3>
            <p className="text-sm text-red-800 mt-2">The proposed construction lies outside the legal parcel boundary.</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-bold mb-4 border-b border-gray-100 pb-2">Analysis Summary</h3>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                <tr><td className="py-2 text-gray-500">Parcel ID</td><td className="py-2 text-right font-bold">P-001</td></tr>
                <tr><td className="py-2 text-gray-500">Sector</td><td className="py-2 text-right font-bold">Sector 12</td></tr>
                <tr><td className="py-2 text-gray-500">City</td><td className="py-2 text-right font-bold">Nagpur</td></tr>
                <tr><td className="py-2 text-gray-500">Total Area</td><td className="py-2 text-right font-bold">1200.00 sq.m.</td></tr>
                <tr><td className="py-2 text-gray-500">Audit Date</td><td className="py-2 text-right font-bold">24 May 2025, 14:30</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="w-2/3 flex flex-col gap-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-bold mb-4">Resolution (Recommended Action)</h3>
            <p className="text-sm text-gray-700 mb-4">The proposed construction encroaches upon adjacent land.</p>
            <p className="text-sm font-bold text-gray-900 mb-2">Recommended Actions:</p>
            <ul className="list-disc pl-5 text-sm text-gray-700 space-y-2">
              <li>Re-align the building within the legal parcel boundary.</li>
              <li>Reduce the footprint to eliminate the encroachment.</li>
              <li>Obtain necessary NOC from adjacent land owner if applicable.</li>
              <li>Re-submit the revised plan for compliance.</li>
            </ul>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-bold mb-4 border-b border-gray-100 pb-2">Encroachment Details</h3>
            <table className="w-full text-sm">
              <tbody>
                <tr><td className="py-2 text-gray-500">Encroached Area</td><td className="py-2 text-right font-bold text-red-600">149.45 sq.m.</td></tr>
                <tr><td className="py-2 text-gray-500">Outside Percentage</td><td className="py-2 text-right font-bold text-red-600">12.45%</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <button onClick={() => setStep('spatial')} className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50">Back</button>
        <div className="flex gap-3">
          <button onClick={() => setStep('ai')} className="px-6 py-2 bg-white border border-green-600 text-green-700 rounded-lg text-sm font-bold hover:bg-green-50">Get AI Explanation</button>
          <button onClick={() => setStep('report_gen')} className="px-6 py-2 bg-green-600 rounded-lg text-sm font-bold text-white hover:bg-green-700">Generate Report</button>
        </div>
      </div>
    </div>
  );
}

function AiExplanationScreen({ setStep }: any) {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">AI Explanation & Resolution</h1>
      <p className="text-gray-500 mb-6">Gemini AI provides explanation and recommendations.</p>

      <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm mb-6">
        <h3 className="font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">AI Explanation (Gemini)</h3>
        <p className="text-sm text-gray-700 leading-relaxed mb-4">
          The analysis shows that the proposed building footprint extends beyond the legal parcel boundary in the 
          south-east direction. Approximately 149.45 sq.m. (12.45%) of the construction lies outside the permissible limit. 
          This constitutes encroachment as per land compliance regulations.
        </p>
        <p className="text-sm text-gray-700 leading-relaxed">
          It is recommended to either reduce the building footprint to fit entirely within the parcel boundary or obtain 
          consent from the adjoining land owner and relevant authorities. Please modify the plan accordingly and re-submit for approval.
        </p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-xl p-6 shadow-sm mb-8">
        <h3 className="font-bold text-green-900 mb-3">Recommended Action</h3>
        <p className="text-sm text-green-800 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-600" /> Re-align the building within the parcel boundary.
        </p>
      </div>

      <div className="flex justify-between">
        <button onClick={() => setStep('analysis')} className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50">Back</button>
        <button onClick={() => setStep('report_gen')} className="px-6 py-2 bg-green-600 rounded-lg text-sm font-bold text-white hover:bg-green-700">Generate Report</button>
      </div>
    </div>
  );
}

function GenerateReportScreen() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Generate Audit Report</h1>
      <p className="text-gray-500 mb-6">Review and generate the final audit report.</p>

      <div className="flex gap-8">
        <div className="flex-1 bg-white border border-gray-200 rounded-xl p-6 shadow-sm h-fit">
          <h3 className="font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Report Summary</h3>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              <tr><td className="py-2 text-gray-500">Parcel ID</td><td className="py-2 text-right font-bold">P-001</td></tr>
              <tr><td className="py-2 text-gray-500">Sector</td><td className="py-2 text-right font-bold">Sector 12</td></tr>
              <tr><td className="py-2 text-gray-500">City</td><td className="py-2 text-right font-bold">Nagpur</td></tr>
              <tr><td className="py-2 text-gray-500">Parcel Area</td><td className="py-2 text-right font-bold">1200.00 sq.m.</td></tr>
              <tr><td className="py-2 text-gray-500">Building Area (Inside)</td><td className="py-2 text-right font-bold">1050.55 sq.m.</td></tr>
              <tr><td className="py-2 text-gray-500">Building Area (Outside)</td><td className="py-2 text-right font-bold text-red-600">149.45 sq.m.</td></tr>
              <tr><td className="py-2 text-gray-500">Outside Percentage</td><td className="py-2 text-right font-bold text-red-600">12.45%</td></tr>
              <tr><td className="py-2 text-gray-500">IoU Score</td><td className="py-2 text-right font-bold">0.78 (78.00%)</td></tr>
              <tr><td className="py-2 text-gray-500">Diagnosis</td><td className="py-2 text-right font-bold text-red-600 uppercase">Encroachment Detected</td></tr>
            </tbody>
          </table>
        </div>

        <div className="flex-1 flex flex-col gap-4">
          <h3 className="font-bold text-gray-900">Report Preview</h3>
          <div className="bg-white border border-gray-300 shadow-md p-8 min-h-[400px] flex flex-col items-center justify-center text-center">
             {/* Fake PDF Preview */}
             <div className="mb-6 border-b-2 border-gray-900 pb-4 w-full">
               <h2 className="text-xl font-black">AeroBhumiAI</h2>
               <p className="text-xs font-bold tracking-widest text-gray-500 uppercase">Land Compliance Audit Report</p>
             </div>
             <table className="text-left w-full text-xs font-mono mb-6 border border-gray-200">
               <tbody>
                 <tr className="border-b"><td className="p-2 bg-gray-50 font-bold w-1/3">Report ID</td><td className="p-2">RPT-2025-018</td></tr>
                 <tr className="border-b"><td className="p-2 bg-gray-50 font-bold">Audit ID</td><td className="p-2">AUD-2025-018</td></tr>
                 <tr className="border-b"><td className="p-2 bg-gray-50 font-bold">Parcel</td><td className="p-2">P-001, Sector 12</td></tr>
                 <tr className="border-b"><td className="p-2 bg-gray-50 font-bold">Location</td><td className="p-2">Nagpur, Maharashtra</td></tr>
                 <tr><td className="p-2 bg-gray-50 font-bold">Date</td><td className="p-2">24 May 2025, 14:30</td></tr>
               </tbody>
             </table>
             <div className="w-full text-left">
               <p className="text-xs font-bold mb-2 underline">Summary</p>
               <div className="text-xs flex flex-col gap-1 text-gray-700">
                 <div className="flex justify-between"><span>Parcel Area:</span><span>1200.00 sq.m.</span></div>
                 <div className="flex justify-between"><span>Building Area (Inside):</span><span>1050.55 sq.m.</span></div>
                 <div className="flex justify-between text-red-600 font-bold"><span>Building Area (Outside):</span><span>149.45 sq.m.</span></div>
                 <div className="flex justify-between text-red-600 font-bold"><span>Diagnosis:</span><span>ENCROACHMENT DETECTED</span></div>
               </div>
             </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between mt-6">
        <button className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50">Back</button>
        <button className="px-6 py-2 bg-green-600 rounded-lg text-sm font-bold text-white hover:bg-green-700 flex items-center gap-2"><Download className="w-4 h-4"/> Download Report (PDF)</button>
      </div>
    </div>
  );
}

function ReportsScreen() {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500 mt-1">View and download all generated audit reports.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input type="text" placeholder="Search reports..." className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-green-500" />
          </div>
        </div>

        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-6 py-4 font-medium">Report ID</th>
              <th className="px-6 py-4 font-medium">Audit ID</th>
              <th className="px-6 py-4 font-medium">Parcel</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Generated On</th>
              <th className="px-6 py-4 font-medium text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {[
              { rid: 'RPT-2025-018', aid: 'AUD-2025-018', parcel: 'P-001 (Sector 12)', status: 'Encroachment', date: '24 May 2025 14:30', c: 'text-red-600' },
              { rid: 'RPT-2025-017', aid: 'AUD-2025-017', parcel: 'P-002 (Sector 7)', status: 'Clear', date: '24 May 2025 11:20', c: 'text-green-600' },
              { rid: 'RPT-2025-016', aid: 'AUD-2025-016', parcel: 'P-003 (Sector 3)', status: 'Variance', date: '23 May 2025 16:15', c: 'text-yellow-600' }
            ].map((r, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{r.rid}</td>
                <td className="px-6 py-4 text-gray-500">{r.aid}</td>
                <td className="px-6 py-4">{r.parcel}</td>
                <td className={`px-6 py-4 font-bold ${r.c}`}>{r.status}</td>
                <td className="px-6 py-4 text-gray-500">{r.date}</td>
                <td className="px-6 py-4 flex justify-center">
                  <button className="p-1.5 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50"><Download className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="p-4 border-t border-gray-200 flex justify-between items-center text-sm text-gray-500">
          <span>Showing 1 to 6 of 18 reports</span>
          <div className="flex gap-1">
            <button className="px-2 py-1 hover:bg-gray-100 rounded">&lt;</button>
            <button className="px-3 py-1 bg-green-600 text-white rounded">1</button>
            <button className="px-3 py-1 hover:bg-gray-100 rounded">2</button>
            <button className="px-3 py-1 hover:bg-gray-100 rounded">3</button>
            <button className="px-2 py-1 hover:bg-gray-100 rounded">&gt;</button>
          </div>
        </div>
      </div>
    </div>
  );
}
