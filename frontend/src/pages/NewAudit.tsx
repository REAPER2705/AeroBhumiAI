import React, { useState, useEffect } from 'react';
import { UploadCloud, Edit2, AlertTriangle, CheckCircle } from 'lucide-react';
import { apiClient } from '../services/api';
import MapWorkspace from '../components/map/MapWorkspace';
import { Parcel, BuildCheckResult } from '../utils/types';

export default function NewAudit({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const [step, setStep] = useState<'select' | 'upload' | 'draw' | 'spatial' | 'analyze'>('select');
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [selectedParcelId, setSelectedParcelId] = useState<string>('');
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [houseGeometry, setHouseGeometry] = useState<any>(null);
  const [buildCheckResult, setBuildCheckResult] = useState<BuildCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Final audit result states
  const [auditResult, setAuditResult] = useState<any>(null);

  useEffect(() => {
    apiClient.listParcels().then(res => {
      const data = Array.isArray(res.data) ? res.data : (res.data?.parcels || []);
      setParcels(data);
    }).catch(err => console.error(err));
  }, []);

  useEffect(() => {
    if (selectedParcelId) {
      apiClient.getParcel(selectedParcelId).then(res => {
        setSelectedParcel(res.data);
      }).catch(err => {
        setError("Parcel could not be loaded.");
      });
    }
  }, [selectedParcelId]);

  const handleRunBuildCheck = async () => {
    if (!selectedParcelId || !houseGeometry) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.buildCheck(selectedParcelId, houseGeometry);
      setBuildCheckResult(res.data);
      setStep('spatial');
    } catch (err) {
      setError("Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRunAudit = async () => {
    if (!selectedParcelId || !buildCheckResult) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.auditAnalyze(selectedParcelId, buildCheckResult);
      setAuditResult(res.data);
      setStep('analyze');
    } catch (err) {
      setError("Audit analysis could not be completed.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!selectedParcelId) return;
    setLoading(true);
    setError(null);
    try {
      await apiClient.uploadDrone(file);
      setStep('draw');
    } catch (err) {
      setError("Drone image upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Select & Upload
  if (step === 'select' || step === 'upload') {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Upload Drone Image / GeoTIFF</h1>
        <p className="text-gray-500 mb-8">Upload drone orthomosaic image (GeoTIFF) for the selected parcel.</p>

        {error && <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>}

        <div className={`bg-white border-2 border-dashed border-gray-300 rounded-xl p-12 flex flex-col items-center justify-center mb-6 relative ${!selectedParcelId || loading ? 'opacity-50' : ''}`}>
          {selectedParcelId && !loading && (
            <input 
              type="file" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
              onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]); }} 
            />
          )}
          <UploadCloud className="w-12 h-12 text-gray-400 mb-4" />
          <p className="font-bold text-gray-700 mb-2">
            {loading ? 'Uploading & Processing Drone Image...' : 'Drag & drop your GeoTIFF file here'}
          </p>
          <p className="text-sm text-gray-500 mb-6">or</p>
          <button className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold pointer-events-none">
            {loading ? 'Uploading...' : 'Browse File'}
          </button>
          <button 
            onClick={() => selectedParcelId && setStep('draw')} 
            disabled={!selectedParcelId || loading}
            className="mt-4 text-xs font-bold text-gray-500 hover:text-green-600 underline relative z-10 disabled:cursor-not-allowed"
          >
            Skip Upload (Use Satellite)
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 flex justify-between items-center shadow-sm">
          <div>
            <p className="text-xs text-gray-500 font-bold mb-1">Selected Parcel</p>
            <select 
              value={selectedParcelId} 
              onChange={(e) => setSelectedParcelId(e.target.value)}
              className="font-bold text-gray-900 border border-gray-300 rounded px-2 py-1 text-sm bg-gray-50"
            >
              <option value="">-- Select Parcel --</option>
              {parcels.map(p => (
                <option key={p.parcel_id} value={p.parcel_id}>{p.parcel_id}</option>
              ))}
            </select>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 font-bold mb-1">Area</p>
            <p className="font-bold text-gray-900 mb-2">{selectedParcel?.area ? `${selectedParcel.area} sq.m.` : '-'}</p>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Draw & Check
  if (step === 'draw') {
    return (
      <div className="p-8 max-w-6xl mx-auto flex flex-col h-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Audit Map</h1>
        <p className="text-gray-500 mb-6">Define parcel boundary and building footprint for analysis.</p>
        
        {error && <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>}

        <div className="flex gap-6 flex-1 min-h-[500px]">
          <div className="w-72 flex flex-col gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-3">1. Draw Proposed Building</h3>
              <p className="text-xs text-gray-500 mb-4">Use the toolbar on the map to draw the proposed building footprint.</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-3">2. Actions</h3>
              <button 
                onClick={handleRunBuildCheck}
                disabled={loading || !houseGeometry}
                className="w-full text-xs bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Analyzing...' : 'Check Construction'}
              </button>
            </div>
          </div>

          <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden relative shadow-sm">
            {selectedParcel ? (
              <MapWorkspace 
                parcelGeometry={selectedParcel.geometry} 
                onHouseDrawn={setHouseGeometry} 
                onHouseCleared={() => setHouseGeometry(null)} 
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">Loading map...</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Spatial Results
  if (step === 'spatial' && buildCheckResult) {
    const { metrics } = buildCheckResult;
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Spatial Analysis (Build Check)</h1>
        <p className="text-gray-500 mb-6">Automated GIS analysis of parcel vs building footprint.</p>

        {error && <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>}

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col">
          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-3 mb-4">Spatial Evidence</h2>
          <div className="flex flex-col gap-4 text-sm mb-8">
            <div className="flex justify-between">
              <span className="text-gray-500">Building Area (Inside Parcel)</span>
              <span className="font-bold text-gray-900">{metrics.house_area_m2} sq.m.</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Building Area (Outside Parcel)</span>
              <span className="font-bold text-red-600">{metrics.outside_area_m2} sq.m.</span>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-4">
              <span className="text-gray-900 font-bold">Outside Percentage</span>
              <span className="font-bold text-red-600">{metrics.outside_percentage}%</span>
            </div>
          </div>
          
          <div className={`mt-auto rounded-xl p-4 ${buildCheckResult.success ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
            <p className={`font-bold flex items-center gap-2 mb-1 ${buildCheckResult.success ? 'text-green-600' : 'text-red-600'}`}>
              {buildCheckResult.success ? <CheckCircle className="w-4 h-4"/> : <AlertTriangle className="w-4 h-4" />}
              {buildCheckResult.result || buildCheckResult.boundary_status}
            </p>
          </div>
        </div>

        <div className="flex justify-between mt-6">
          <button onClick={() => setStep('draw')} className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50">Back</button>
          <button onClick={handleRunAudit} disabled={loading} className="px-6 py-2 bg-green-600 rounded-lg text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50">
            {loading ? 'Running Audit...' : 'Run Full Audit'}
          </button>
        </div>
      </div>
    );
  }

  // Step 4: Full Audit Analysis Result
  if (step === 'analyze' && auditResult) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Audit Result</h1>
        <p className="text-gray-500 mb-6">AI-powered land compliance audit results.</p>

        <div className="flex gap-6">
          <div className="w-1/3 flex flex-col gap-6">
            <div className={`border rounded-xl p-6 ${auditResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <p className={`text-xs uppercase font-bold tracking-wider mb-2 ${auditResult.success ? 'text-green-700' : 'text-red-700'}`}>Diagnosis</p>
              <h3 className={`text-xl font-black uppercase ${auditResult.success ? 'text-green-600' : 'text-red-600'}`}>
                {auditResult.result}
              </h3>
              <p className={`text-sm mt-2 ${auditResult.success ? 'text-green-800' : 'text-red-800'}`}>
                {auditResult.problem || "No significant spatial conflict detected."}
              </p>
            </div>
          </div>

          <div className="w-2/3 flex flex-col gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-bold mb-4">Recommended Action</h3>
              <p className="text-sm font-bold text-gray-900 mb-2">{auditResult.recommended_action}</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">AI-assisted explanation</h3>
              <p className="text-sm text-gray-700 leading-relaxed mb-4">
                {auditResult.summary}
              </p>
              {auditResult.verification_note && (
                <p className="text-xs text-gray-500 mt-4 italic border-t border-gray-100 pt-4">
                  Note: {auditResult.verification_note}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-between mt-8">
          <button onClick={() => setActiveTab('Dashboard')} className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50">Back to Dashboard</button>
          <button className="px-6 py-2 bg-green-600 rounded-lg text-sm font-bold text-white hover:bg-green-700">Generate Report</button>
        </div>
      </div>
    );
  }

  return null;
}
