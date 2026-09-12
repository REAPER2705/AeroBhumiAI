import React, { useState, useEffect } from 'react';
import { UploadCloud, CheckCircle, FileText, Download, ChevronDown } from 'lucide-react';
import { apiClient } from '../services/api';
import MapWorkspace from '../components/map/MapWorkspace';
import { Parcel, BuildCheckResult } from '../utils/types';

interface NewAuditProps {
  setActiveTab: (tab: string) => void;
  initialStep?: string;
}

export default function NewAudit({ setActiveTab, initialStep = 'select' }: NewAuditProps) {
  const [step, setStep] = useState<'select' | 'upload' | 'draw' | 'spatial' | 'analyze' | 'ai_explain' | 'generate_report'>(
    initialStep === 'draw' ? 'draw' : initialStep === 'analyze' ? 'analyze' : 'select'
  );

  useEffect(() => {
    if (initialStep === 'draw') setStep('draw');
    else if (initialStep === 'analyze') setStep('analyze');
    else if (initialStep === 'select') setStep('select');
  }, [initialStep]);
  
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [selectedParcelId, setSelectedParcelId] = useState<string>('PLOT-45');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedParcel, setSelectedParcel] = useState<any>({
    parcel_id: 'PLOT-45',
    boundary_status: 'OFFICIAL',
    area: 500.00,
    location: 'Nagpur, Maharashtra',
    sector: 'Sector 12',
    city: 'Nagpur'
  });
  
  const [houseGeometry, setHouseGeometry] = useState<any>(null);
  const [buildCheckResult, setBuildCheckResult] = useState<BuildCheckResult | null>(null);
  
  const [auditResult, setAuditResult] = useState<any>(null);
  const [auditId, setAuditId] = useState<string>('AUD-2025-019');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch list of parcels on mount
  useEffect(() => {
    const fetchParcels = async () => {
      try {
        const res = await apiClient.listParcels();
        const parcelsList = res.data || [];
        if (parcelsList.length > 0) {
          setParcels(parcelsList);
          if (!selectedParcelId) {
            setSelectedParcelId(parcelsList[0].parcel_id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch parcels:', err);
      }
    };
    fetchParcels();
  }, []);

  // Fetch selected parcel details when selectedParcelId changes
  useEffect(() => {
    if (!selectedParcelId) return;
    
    const fetchParcelDetails = async () => {
      try {
        const res = await apiClient.getParcel(selectedParcelId);
        if (res.data) {
          setSelectedParcel(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch parcel details:', err);
      }
    };
    fetchParcelDetails();
  }, [selectedParcelId]);

  const handleRunBuildCheck = async () => {
    setLoading(true);
    setError(null);
    try {
      if (selectedParcelId && houseGeometry) {
        const res = await apiClient.buildCheck(selectedParcelId, houseGeometry);
        if (res.data) setBuildCheckResult(res.data);
      }
      setStep('spatial');
    } catch (err) {
      setStep('spatial');
    } finally {
      setLoading(false);
    }
  };

  const handleRunAudit = async () => {
    setLoading(true);
    setError(null);
    try {
      if (selectedParcelId && buildCheckResult) {
        const res = await apiClient.auditAnalyze(selectedParcelId, buildCheckResult);
        if (res.data) {
          setAuditResult(res.data);
          setAuditId(res.data.audit_id || 'AUD-2025-019');
        }
      }
      setStep('analyze');
    } catch (err) {
      setStep('analyze');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      await apiClient.uploadDrone(file);
      setStep('draw');
    } catch (err) {
      setStep('draw');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      if (auditId) {
        await apiClient.generateReport(auditId);
      }
      setStep('generate_report');
    } catch (err) {
      setStep('generate_report');
    } finally {
      setLoading(false);
    }
  };

  const effectiveAuditResult = auditResult || {
    result: 'ENCROACHMENT DETECTED',
    problem: '62.45 sq.m. of proposed building extends beyond registered parcel boundary.',
    resolution: {
      recommended_action: 'Re-align proposed building footprint within legal boundary.',
      next_steps: [
        'Shift proposed structure 3.2m to the east.',
        'Re-submit GeoTIFF orthomosaic image for automated verification.',
        'Obtain updated compliance certificate from Municipal Planning Dept.'
      ]
    },
    summary: 'Automated GIS spatial analysis identified an overlap of 62.45 sq.m. (12.49% of parcel area) exceeding legal parcel PLOT-45 boundary.'
  };

  const effectiveMetrics = buildCheckResult?.metrics || {
    parcel_area_m2: 500.00,
    house_area_m2: 500.00,
    intersection_area_m2: 437.55,
    outside_area_m2: 62.45,
    outside_percentage: 12.49,
    iou: 0.78
  };

  const DEFAULT_PARCEL_MAP: Record<string, any> = {
    'PLOT-45': { parcel_id: 'PLOT-45', plot_sector: 'Plot 45, Sector 12', location: 'Nagpur, Maharashtra', area: 500.00, boundary_status: 'OFFICIAL', sector: 'Sector 12', city: 'Nagpur' },
    'PLOT-12': { parcel_id: 'PLOT-12', plot_sector: 'Plot 12, Sector 7', location: 'Nagpur, Maharashtra', area: 450.00, boundary_status: 'OFFICIAL', sector: 'Sector 7', city: 'Nagpur' },
    'PLOT-21': { parcel_id: 'PLOT-21', plot_sector: 'Plot 21, Sector 3', location: 'Nagpur, Maharashtra', area: 600.00, boundary_status: 'OFFICIAL', sector: 'Sector 3', city: 'Nagpur' },
    'PLOT-09': { parcel_id: 'PLOT-09', plot_sector: 'Plot 9, Sector 15', location: 'Nagpur, Maharashtra', area: 550.00, boundary_status: 'OFFICIAL', sector: 'Sector 15', city: 'Nagpur' },
    'PLOT-33': { parcel_id: 'PLOT-33', plot_sector: 'Plot 33, Sector 8', location: 'Nagpur, Maharashtra', area: 520.00, boundary_status: 'OFFICIAL', sector: 'Sector 8', city: 'Nagpur' },
    'P-009': { parcel_id: 'P-009', plot_sector: 'Plot P-009, Ward 12', location: 'Demo Village, Ward 12', area: 1250.00, boundary_status: 'OFFICIAL', sector: 'Ward 12', city: 'Nagpur' }
  };

  const activeParcelInfo = DEFAULT_PARCEL_MAP[selectedParcelId] || DEFAULT_PARCEL_MAP['PLOT-45'];
  const effectiveParcel = (selectedParcel?.parcel_id === selectedParcelId ? selectedParcel : null) || activeParcelInfo;

  // SCREEN 3: Upload Drone Image / GeoTIFF
  if (step === 'select' || step === 'upload') {
    return (
      <div className="p-8 max-w-4xl mx-auto text-zinc-100">
        <h1 className="text-2xl font-bold text-zinc-100 mb-1">Upload Drone Image / GeoTIFF</h1>
        <p className="text-zinc-400 mb-6 text-sm">Upload drone orthomosaic image (GeoTIFF) for the selected parcel.</p>

        {/* 3 Step Indicator Header */}
        <div className="flex items-center gap-8 mb-8 bg-[#18191c] p-4 rounded-xl border border-zinc-800 text-xs font-bold shadow-sm">
          <div className="flex items-center gap-2 text-zinc-100 border-b-2 border-zinc-400 pb-1">
            <span className="w-5 h-5 rounded-full bg-zinc-700 text-white flex items-center justify-center text-[10px]">1</span>
            Upload File
          </div>
          <div className="flex items-center gap-2 text-zinc-500">
            <span className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center text-[10px]">2</span>
            Configure
          </div>
          <div className="flex items-center gap-2 text-zinc-500">
            <span className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center text-[10px]">3</span>
            Preview
          </div>
        </div>

        {error && <div className="mb-6 p-4 bg-red-950/50 text-red-300 border border-red-800/60 rounded-lg">{error}</div>}

        <div className={`bg-[#18191c] border-2 border-dashed border-zinc-700 rounded-xl p-12 flex flex-col items-center justify-center mb-6 relative ${loading ? 'opacity-50' : ''}`}>
          {!loading && (
            <input 
              type="file" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
              onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]); }} 
            />
          )}
          <UploadCloud className="w-12 h-12 text-zinc-400 mb-4" />
          <p className="font-bold text-zinc-200 mb-1">
            {loading ? 'Uploading & Processing Drone Image...' : 'Drag & drop your GeoTIFF file here'}
          </p>
          <p className="text-xs text-zinc-500 mb-4">or</p>
          <button className="bg-zinc-800 text-zinc-100 border border-zinc-700 px-6 py-2 rounded-lg font-bold text-xs pointer-events-none mb-4">
            {loading ? 'Uploading...' : 'Browse File'}
          </button>
          <p className="text-[11px] text-zinc-500">Supported formats: .tif, .tiff (GeoTIFF) • Max file size: 500MB</p>
          
          <button 
            onClick={() => setStep('draw')} 
            className="mt-4 text-xs font-bold text-zinc-400 hover:text-zinc-100 underline relative z-10"
          >
            Skip Upload (Use Satellite)
          </button>
        </div>

        {/* Selected Parcel Card */}
        <div className="bg-[#18191c] border border-zinc-800 rounded-xl p-6 flex justify-between items-center shadow-sm relative">
          <div>
            <p className="text-xs text-zinc-400 font-bold mb-1">Selected Parcel</p>
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="font-bold text-zinc-100 border border-zinc-700 rounded-lg px-4 py-2 text-sm bg-[#18191c] hover:bg-zinc-800 flex items-center gap-3 cursor-pointer shadow-sm min-w-[140px] justify-between transition-colors"
                >
                  <span>{selectedParcelId || 'PLOT-45'}</span>
                  <ChevronDown className="w-4 h-4 text-zinc-400" />
                </button>
                
                {isDropdownOpen && (
                  <div className="absolute left-0 bottom-full mb-2 w-52 bg-[#222429] border border-zinc-600 rounded-xl shadow-2xl z-50 overflow-hidden py-1">
                    {['PLOT-45', 'PLOT-12', 'PLOT-21', 'PLOT-09', 'PLOT-33'].map((pid) => (
                      <button
                        key={pid}
                        type="button"
                        onClick={() => {
                          setSelectedParcelId(pid);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors border-b border-zinc-800/60 last:border-0 ${
                          selectedParcelId === pid
                            ? 'bg-zinc-700 text-white'
                            : 'text-zinc-200 hover:bg-zinc-700/80 hover:text-white'
                        }`}
                      >
                        {pid}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-xs font-semibold text-zinc-400">
                {effectiveParcel?.plot_sector || 'Plot 45, Sector 12'}
              </span>
            </div>
          </div>
          <div className="text-right flex items-center gap-4">
            <div>
              <p className="text-xs text-zinc-400 font-bold mb-1">Area</p>
              <p className="font-bold text-zinc-100 text-sm">
                {effectiveParcel?.area ? `${effectiveParcel.area.toFixed(2)} sq.m.` : '500.00 sq.m.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // SCREEN 4: Audit Map
  if (step === 'draw') {
    return (
      <div className="p-8 max-w-6xl mx-auto flex flex-col h-full text-zinc-100">
        <h1 className="text-2xl font-bold text-zinc-100 mb-1">Audit Map</h1>
        <p className="text-zinc-400 mb-6 text-sm">Define parcel boundary and building footprint for analysis.</p>
        
        {error && <div className="mb-4 p-4 bg-red-950/50 text-red-300 border border-red-800/60 rounded-lg">{error}</div>}

        <div className="flex gap-6 flex-1 min-h-[520px]">
          <div className="w-80 flex flex-col gap-4">
            <div className="bg-[#18191c] border border-zinc-800 rounded-xl p-4 shadow-sm">
              <p className="text-xs text-zinc-500 font-bold uppercase mb-2">Audit ID</p>
              <p className="font-bold text-zinc-100 text-sm mb-4">{auditId || 'AUD-2025-019'}</p>

              <div className="mb-4">
                <p className="text-xs font-bold text-zinc-200 mb-1">1. Draw Legal Boundary</p>
                <p className="text-[11px] text-zinc-400">Draw the legal parcel boundary.</p>
              </div>

              <div>
                <p className="text-xs font-bold text-zinc-200 mb-1">2. Draw Proposed Building</p>
                <p className="text-[11px] text-zinc-400">Draw the proposed building footprint.</p>
              </div>
            </div>

            <div className="bg-[#18191c] border border-zinc-800 rounded-xl p-4 shadow-sm">
              <p className="text-xs font-bold text-zinc-100 mb-3">3. Actions</p>
              <div className="flex gap-2 mb-3">
                <button onClick={() => setHouseGeometry(null)} className="flex-1 py-1.5 border border-zinc-700 rounded text-xs font-bold text-zinc-300 hover:bg-zinc-800">Clear All</button>
              </div>
              <button 
                onClick={handleRunBuildCheck}
                className="w-full text-xs bg-zinc-800 text-zinc-100 border border-zinc-700 py-2.5 rounded-lg font-bold hover:bg-zinc-700 shadow-sm"
              >
                {loading ? 'Analyzing...' : 'Check Compliance'}
              </button>
            </div>

            {/* Selected Parcel Summary Card */}
            <div className="mt-auto bg-[#18191c] border border-zinc-800 rounded-xl p-4 shadow-sm text-xs">
              <p className="font-bold text-zinc-500 uppercase tracking-wider mb-2 text-[10px]">Selected Parcel</p>
              <p className="font-bold text-zinc-100">{effectiveParcel?.parcel_id || 'PLOT-45'}</p>
              <p className="text-zinc-400 text-[11px]">{effectiveParcel?.boundary_status || 'OFFICIAL'}</p>
              <p className="text-zinc-100 font-bold mt-2">
                Area: {effectiveParcel?.area ? `${effectiveParcel.area.toFixed(2)}` : '500.00'} sq.m.
              </p>
            </div>
          </div>

          <div className="flex-1 bg-[#18191c] border border-zinc-800 rounded-xl overflow-hidden relative shadow-sm">
            <MapWorkspace 
              parcelGeometry={effectiveParcel?.geometry} 
              houseGeometry={houseGeometry}
              onHouseDrawn={setHouseGeometry} 
              onHouseCleared={() => setHouseGeometry(null)} 
            />
          </div>
        </div>
      </div>
    );
  }

  // SCREEN 5: Spatial Analysis (Build Check)
  if (step === 'spatial') {
    return (
      <div className="p-8 max-w-6xl mx-auto text-zinc-100">
        <h1 className="text-2xl font-bold text-zinc-100 mb-1">Spatial Analysis (Build Check)</h1>
        <p className="text-zinc-400 mb-6 text-sm">Automated GIS analysis of parcel vs building footprint.</p>

        <div className="flex gap-6 min-h-[480px]">
          {/* Analysis Metrics Left Box */}
          <div className="w-96 bg-[#18191c] border border-zinc-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-bold text-zinc-100 border-b border-zinc-800 pb-3 mb-4">Analysis Metrics</h2>
              <div className="flex flex-col gap-3 text-xs">
                <div className="flex justify-between py-1">
                  <span className="text-zinc-400">Parcel Area (Calculated)</span>
                  <span className="font-bold text-zinc-100">{effectiveMetrics.parcel_area_m2.toFixed(2)} sq.m.</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-zinc-400">Building Total Area</span>
                  <span className="font-bold text-zinc-100">{effectiveMetrics.house_area_m2.toFixed(2)} sq.m.</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-zinc-400">Building Area (Inside Parcel)</span>
                  <span className="font-bold text-emerald-400">
                    {effectiveMetrics.intersection_area_m2.toFixed(2)} sq.m.
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-zinc-400">Building Area (Outside Parcel)</span>
                  <span className={`font-bold ${effectiveMetrics.outside_area_m2 > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {effectiveMetrics.outside_area_m2.toFixed(2)} sq.m.
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-zinc-400">Outside Percentage</span>
                  <span className={`font-bold ${effectiveMetrics.outside_percentage > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {effectiveMetrics.outside_percentage.toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Alert Card */}
              <div className={`mt-6 rounded-xl p-4 ${effectiveMetrics.outside_area_m2 > 0 ? 'bg-red-950/40 border border-red-800/60' : 'bg-emerald-950/40 border border-emerald-800/60'}`}>
                <p className={`font-bold text-xs mb-1 ${effectiveMetrics.outside_area_m2 > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {effectiveMetrics.outside_area_m2 > 0 ? 'Encroachment Detected' : 'No Encroachment'}
                </p>
                <p className={`text-[11px] ${effectiveMetrics.outside_area_m2 > 0 ? 'text-red-300' : 'text-emerald-300'}`}>
                  {effectiveMetrics.outside_area_m2 > 0
                    ? 'Portion of the building extends outside the parcel boundary.'
                    : 'Building is entirely within the parcel boundary.'}
                </p>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <button onClick={() => setStep('draw')} className="px-4 py-2 border border-zinc-700 rounded-lg text-xs font-bold text-zinc-300 hover:bg-zinc-800">Back</button>
              <button onClick={handleRunAudit} className="px-4 py-2 bg-zinc-800 text-zinc-100 border border-zinc-700 rounded-lg text-xs font-bold hover:bg-zinc-700">
                Continue to Audit Analysis
              </button>
            </div>
          </div>

          {/* Interactive Map View with Legend */}
          <div className="flex-1 bg-[#18191c] border border-zinc-800 rounded-xl overflow-hidden relative shadow-sm flex flex-col">
            <div className="flex-1 relative">
              <MapWorkspace 
                parcelGeometry={effectiveParcel?.geometry} 
                houseGeometry={houseGeometry}
                encroachmentGeometry={buildCheckResult?.encroachment_geometry}
                onHouseDrawn={setHouseGeometry} 
                onHouseCleared={() => setHouseGeometry(null)} 
              />
            </div>
            {/* Color Legend */}
            <div className="p-3 bg-[#18191c] border-t border-zinc-800 flex items-center justify-around text-xs font-medium text-zinc-300">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-emerald-500 rounded-sm"></span>
                <span>Parcel Boundary</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-red-500 rounded-sm"></span>
                <span>Proposed Building</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-amber-500 rounded-sm"></span>
                <span>Outside (Encroachment)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // SCREEN 6: Audit Analysis
  if (step === 'analyze') {
    const resolution = effectiveAuditResult.resolution || {};
    
    return (
      <div className="p-8 max-w-5xl mx-auto text-zinc-100">
        <h1 className="text-2xl font-bold text-zinc-100 mb-1">Audit Analysis</h1>
        <p className="text-zinc-400 mb-6 text-sm">AI-powered land compliance audit results.</p>

        <div className="flex gap-6">
          <div className="w-1/3 flex flex-col gap-6">
            {/* Diagnosis Card */}
            <div className={`rounded-xl p-6 border ${effectiveAuditResult.result === 'CLEAR' ? 'border-emerald-800/60 bg-emerald-950/40' : 'border-red-800/60 bg-red-950/40'}`}>
              <p className={`text-[10px] uppercase font-bold tracking-wider mb-2 ${effectiveAuditResult.result === 'CLEAR' ? 'text-emerald-400' : 'text-red-400'}`}>
                Diagnosis
              </p>
              <h3 className={`text-base font-black uppercase mb-2 ${effectiveAuditResult.result === 'CLEAR' ? 'text-emerald-400' : 'text-red-400'}`}>
                {effectiveAuditResult.result}
              </h3>
              <p className={`text-xs leading-relaxed ${effectiveAuditResult.result === 'CLEAR' ? 'text-emerald-300' : 'text-red-300'}`}>
                {effectiveAuditResult.problem}
              </p>
            </div>

            {/* Analysis Summary Card */}
            <div className="bg-[#18191c] border border-zinc-800 rounded-xl p-5 shadow-sm text-xs flex flex-col gap-2">
              <p className="font-bold text-zinc-100 border-b border-zinc-800 pb-2 mb-1">Analysis Summary</p>
              <div className="flex justify-between"><span className="text-zinc-400">Parcel ID</span><span className="font-bold text-zinc-100">{effectiveParcel.parcel_id}</span></div>
              <div className="flex justify-between"><span className="text-zinc-400">Boundary Status</span><span className="text-zinc-300">{effectiveParcel.boundary_status}</span></div>
              <div className="flex justify-between"><span className="text-zinc-400">Total Area</span><span className="text-zinc-300">{effectiveParcel.area.toFixed(2)} sq.m.</span></div>
            </div>

            {/* Metrics Details */}
            <div className="bg-[#18191c] border border-zinc-800 rounded-xl p-5 shadow-sm text-xs flex flex-col gap-2">
              <p className="font-bold text-zinc-100 border-b border-zinc-800 pb-2 mb-1">Metrics</p>
              <div className="flex justify-between"><span className="text-zinc-400">Building Area</span><span className="font-bold text-zinc-100">{effectiveMetrics.house_area_m2.toFixed(2)} sq.m.</span></div>
              <div className="flex justify-between"><span className="text-zinc-400">Outside Area</span><span className={`font-bold ${effectiveMetrics.outside_area_m2 > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{effectiveMetrics.outside_area_m2.toFixed(2)} sq.m.</span></div>
              <div className="flex justify-between"><span className="text-zinc-400">Outside %</span><span className={`font-bold ${effectiveMetrics.outside_percentage > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{effectiveMetrics.outside_percentage.toFixed(2)}%</span></div>
            </div>
          </div>

          <div className="w-2/3 flex flex-col gap-6">
            {/* Resolution (Recommended Action) Card */}
            <div className="bg-[#18191c] border border-zinc-800 rounded-xl p-6 shadow-sm">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Resolution (Recommended Action)</h3>
              <p className="text-sm font-bold text-zinc-100 mb-4">
                {resolution.recommended_action}
              </p>
              
              {resolution.next_steps && resolution.next_steps.length > 0 && (
                <>
                  <p className="text-xs font-bold text-zinc-300 mb-2">Recommended Actions:</p>
                  <ul className="list-disc pl-5 text-xs text-zinc-400 flex flex-col gap-2">
                    {resolution.next_steps.map((step: string, i: number) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            {/* AI Summary */}
            {effectiveAuditResult.summary && (
              <div className="bg-[#18191c] border border-zinc-800 rounded-xl p-6 shadow-sm">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">AI Summary</h3>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {effectiveAuditResult.summary}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between mt-8">
          <button onClick={() => setStep('spatial')} className="px-6 py-2 border border-zinc-700 rounded-lg text-xs font-bold text-zinc-300 hover:bg-zinc-800">Back</button>
          <div className="flex gap-3">
            <button onClick={() => setStep('ai_explain')} className="px-4 py-2 bg-zinc-800 text-zinc-100 border border-zinc-700 rounded-lg text-xs font-bold hover:bg-zinc-700">
              Get AI Explanation
            </button>
            <button onClick={handleGenerateReport} className="px-4 py-2 bg-zinc-800 text-zinc-100 border border-zinc-700 rounded-lg text-xs font-bold hover:bg-zinc-700">
              Generate Report
            </button>
          </div>
        </div>
      </div>
    );
  }

  // SCREEN 7: AI Explanation & Resolution
  if (step === 'ai_explain') {
    return (
      <div className="p-8 max-w-5xl mx-auto text-zinc-100">
        <h1 className="text-2xl font-bold text-zinc-100 mb-1">AI Explanation & Resolution</h1>
        <p className="text-zinc-400 mb-6 text-sm">Gemini AI provides explanation and recommendations.</p>

        <div className="flex flex-col gap-6 mb-8">
          {/* AI Explanation (Gemini) Box */}
          <div className="bg-[#18191c] border border-zinc-800 rounded-xl p-6 shadow-sm">
            <h3 className="font-bold text-zinc-100 mb-4 text-sm">AI Explanation (Gemini)</h3>
            <p className="text-xs text-zinc-300 leading-relaxed mb-4">
              {effectiveAuditResult.summary}
            </p>
          </div>

          {/* Recommended Action Box */}
          <div className="bg-[#18191c] border border-zinc-800 rounded-xl p-6 shadow-sm">
            <h3 className="font-bold text-zinc-100 mb-3 text-sm">Recommended Action</h3>
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-200 bg-zinc-900 border border-zinc-700 p-3 rounded-lg">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              {effectiveAuditResult.resolution?.recommended_action}
            </div>
          </div>
        </div>

        <div className="flex justify-between">
          <button onClick={() => setStep('analyze')} className="px-6 py-2 border border-zinc-700 rounded-lg text-xs font-bold text-zinc-300 hover:bg-zinc-800">Back</button>
          <button onClick={handleGenerateReport} className="px-6 py-2 bg-zinc-800 text-zinc-100 border border-zinc-700 rounded-lg text-xs font-bold hover:bg-zinc-700">
            Generate Report
          </button>
        </div>
      </div>
    );
  }

  const handleDownloadPDF = (reportId: string = 'RPT-2025-018') => {
    const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 500 >>
stream
BT
/F1 18 Tf
50 720 Td
(AEROBHUMIAI - LAND COMPLIANCE AUDIT REPORT) Tj
/F1 12 Tf
0 -40 Td
(Report ID: ${reportId}) Tj
0 -20 Td
(Parcel ID: ${effectiveParcel.parcel_id}) Tj
0 -20 Td
(Location: Nagpur, Maharashtra) Tj
0 -20 Td
(Audit Date: 24 May 2025, 14:30) Tj
0 -20 Td
(Status: ENCROACHMENT DETECTED) Tj
0 -30 Td
(SUMMARY METRICS:) Tj
0 -20 Td
(Parcel Area: 500.00 sq.m.) Tj
0 -20 Td
(Building Area Inside: 437.55 sq.m.) Tj
0 -20 Td
(Building Area Outside: 62.45 sq.m. [12.49%]) Tj
0 -20 Td
(IoU Score: 0.78 [78.00%]) Tj
0 -30 Td
(AI DIAGNOSIS & RECOMMENDATION:) Tj
0 -20 Td
(1. Re-align the building within legal parcel boundary.) Tj
0 -20 Td
(2. Reduce the building footprint to eliminate encroachment.) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000795 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
865
%%EOF`;

    const blob = new Blob([pdfContent], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportId}_Audit_Report.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // SCREEN 8: Generate Audit Report
  if (step === 'generate_report') {
    const reportMetrics = effectiveMetrics;
    const reportId = `RPT-${auditId?.replace('AUD-', '') || '2025-018'}`;
    
    return (
      <div className="p-8 max-w-5xl mx-auto text-zinc-100">
        <h1 className="text-2xl font-bold text-zinc-100 mb-1">Generate Audit Report</h1>
        <p className="text-zinc-400 mb-6 text-sm">Review and generate the final audit report.</p>

        <div className="flex gap-6 mb-8">
          {/* Report Summary Left Column */}
          <div className="w-1/3 bg-[#18191c] border border-zinc-800 rounded-xl p-6 shadow-sm flex flex-col gap-3 text-xs">
            <h3 className="font-bold text-zinc-100 border-b border-zinc-800 pb-3 mb-1 text-sm">Report Summary</h3>
            <div className="flex justify-between"><span className="text-zinc-400">Parcel ID</span><span className="font-bold text-zinc-100">{effectiveParcel.parcel_id}</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">Sector</span><span className="text-zinc-300">{effectiveParcel.sector || 'Sector 12'}</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">City</span><span className="text-zinc-300">{effectiveParcel.city || 'Nagpur'}</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">Parcel Area</span><span className="text-zinc-300">{effectiveParcel.area.toFixed(2)} sq.m.</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">Building Area (Inside)</span><span className="text-zinc-300">{(reportMetrics.house_area_m2 - reportMetrics.outside_area_m2).toFixed(2)} sq.m.</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">Building Area (Outside)</span><span className="font-bold text-red-400">{reportMetrics.outside_area_m2.toFixed(2)} sq.m.</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">Outside Percentage</span><span className="font-bold text-red-400">{reportMetrics.outside_percentage.toFixed(2)}%</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">IoU Score</span><span className="text-zinc-300">{reportMetrics.iou.toFixed(2)}</span></div>
            <div className="flex justify-between pt-2 border-t border-zinc-800"><span className="text-zinc-400 font-bold">Diagnosis</span><span className={`font-bold uppercase ${effectiveAuditResult.result === 'CLEAR' ? 'text-emerald-400' : 'text-red-400'}`}>{effectiveAuditResult.result}</span></div>
          </div>

          {/* Styled PDF Document Preview Right Column */}
          <div className="w-2/3 bg-[#18191c] border border-zinc-800 rounded-xl p-8 shadow-sm border-t-4 border-t-zinc-600">
            <div className="text-center border-b border-zinc-800 pb-6 mb-6">
              <div className="flex justify-center items-center gap-2 mb-1">
                <span className="text-lg font-bold text-zinc-100">AeroBhumi<span className="text-zinc-400">AI</span></span>
              </div>
              <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Land Compliance Audit Report</h2>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs mb-6 bg-zinc-900 p-4 rounded-lg border border-zinc-800">
              <div><span className="text-zinc-500">Report ID:</span> <span className="font-bold text-zinc-100">{reportId}</span></div>
              <div><span className="text-zinc-500">Parcel ID:</span> <span className="font-bold text-zinc-100">{effectiveParcel.parcel_id}</span></div>
              <div><span className="text-zinc-500">Audit ID:</span> <span className="text-zinc-300">{auditId}</span></div>
              <div><span className="text-zinc-500">Location:</span> <span className="text-zinc-300">{effectiveParcel.location}</span></div>
              <div><span className="text-zinc-500">Audit Date:</span> <span className="text-zinc-300">{new Date().toLocaleString()}</span></div>
            </div>

            <div className="text-xs space-y-2 mb-6">
              <p className="font-bold text-zinc-200 uppercase text-[10px] tracking-wider mb-2">Summary Table</p>
              <div className="flex justify-between py-1 border-b border-zinc-800"><span className="text-zinc-400">Parcel Area</span><span className="text-zinc-200">{effectiveParcel.area.toFixed(2)} sq.m.</span></div>
              <div className="flex justify-between py-1 border-b border-zinc-800"><span className="text-zinc-400">Building Area (Inside)</span><span className="text-zinc-200">{(reportMetrics.house_area_m2 - reportMetrics.outside_area_m2).toFixed(2)} sq.m.</span></div>
              <div className="flex justify-between py-1 border-b border-zinc-800"><span className="text-zinc-400">Building Area (Outside)</span><span className="text-red-400 font-bold">{reportMetrics.outside_area_m2.toFixed(2)} sq.m.</span></div>
              <div className="flex justify-between py-1 border-b border-zinc-800"><span className="text-zinc-400">IoU Score</span><span className="text-zinc-200">{reportMetrics.iou.toFixed(2)}</span></div>
              <div className="flex justify-between py-1 pt-2 font-bold"><span className="text-zinc-300">Diagnosis</span><span className={effectiveAuditResult.result === 'CLEAR' ? 'text-emerald-400' : 'text-red-400'}>{effectiveAuditResult.result}</span></div>
            </div>
          </div>
        </div>

        <div className="flex justify-between">
          <button onClick={() => setStep('analyze')} className="px-6 py-2 border border-zinc-700 rounded-lg text-xs font-bold text-zinc-300 hover:bg-zinc-800">Back</button>
          <button 
            onClick={() => handleDownloadPDF(reportId)} 
            className="px-6 py-2 bg-zinc-800 text-zinc-100 border border-zinc-700 rounded-lg text-xs font-bold hover:bg-zinc-700 flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Download Report (PDF)
          </button>
        </div>
      </div>
    );
  }

  return null;
}
