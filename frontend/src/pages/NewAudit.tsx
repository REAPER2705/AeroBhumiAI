import React, { useState, useEffect } from 'react';
import { UploadCloud, CheckCircle, FileText, Download } from 'lucide-react';
import { apiClient } from '../services/api';
import * as caseService from '../services/caseService';
import MapWorkspace from '../components/map/MapWorkspace';
import { Parcel, BuildCheckResult } from '../utils/types';

interface NewAuditProps {
  setActiveTab: (tab: string) => void;
  initialStep?: string;
}

export default function NewAudit({ setActiveTab, initialStep = 'select' }: NewAuditProps) {
  const [step, setStep] = useState<'select' | 'upload' | 'draw' | 'spatial' | 'analyze' | 'ai_explain' | 'report_and_flag' | 'generate_report'>(
    initialStep === 'draw' ? 'draw' : initialStep === 'analyze' ? 'analyze' : 'select'
  );

  useEffect(() => {
    if (initialStep === 'draw') setStep('draw');
    else if (initialStep === 'analyze') setStep('analyze');
    else if (initialStep === 'select') setStep('select');
  }, [initialStep]);
  
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [selectedParcelId, setSelectedParcelId] = useState<string>('');
  const [selectedParcel, setSelectedParcel] = useState<any>(null);
  
  const [houseGeometry, setHouseGeometry] = useState<any>(null);
  const [buildCheckResult, setBuildCheckResult] = useState<BuildCheckResult | null>(null);
  
  const [auditResult, setAuditResult] = useState<any>(null);
  const [auditId, setAuditId] = useState<string>('');
  
  // Case flagging state
  const [evidenceSnapshot, setEvidenceSnapshot] = useState<{dataUrl: string; fileName: string} | null>(null);
  const [flaggedCaseId, setFlaggedCaseId] = useState<string | null>(null);
  const [flagging, setFlagging] = useState(false);
  const [mapSnapshot, setMapSnapshot] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch list of parcels on mount
  useEffect(() => {
    const fetchParcels = async () => {
      try {
        const res = await apiClient.listParcels();
        const parcelsList = res.data || [];
        setParcels(parcelsList);
        // Set first parcel as default if available
        if (parcelsList.length > 0) {
          setSelectedParcelId(parcelsList[0].parcel_id);
        }
      } catch (err) {
        console.error('Failed to fetch parcels:', err);
        setError('Failed to load parcels');
      }
    };
    fetchParcels();
  }, []);

  // Preserve buildCheckResult in sessionStorage whenever it changes
  useEffect(() => {
    console.log('📝 buildCheckResult useEffect fired, value:', buildCheckResult ? 'EXISTS' : 'NULL');
    if (buildCheckResult) {
      console.log('📝 Effect: Saving buildCheckResult to sessionStorage');
      sessionStorage.setItem('currentBuildCheckResult', JSON.stringify(buildCheckResult));
    }
  }, [buildCheckResult]);

  // Preserve selectedParcelId in sessionStorage for resilience
  useEffect(() => {
    if (selectedParcelId) {
      console.log('📝 Effect: Saving selectedParcelId to sessionStorage');
      sessionStorage.setItem('currentSelectedParcelId', selectedParcelId);
    }
  }, [selectedParcelId]);

  // Fetch selected parcel details when selectedParcelId changes
  useEffect(() => {
    if (!selectedParcelId) return;
    
    console.log('📝 Parcel effect triggered for:', selectedParcelId);
    
    const fetchParcelDetails = async () => {
      try {
        const res = await apiClient.getParcel(selectedParcelId);
        if (res.data) {
          setSelectedParcel(res.data);
          // Only clear buildCheckResult if we're on draw or spatial step
          // Don't clear it if we've already done the analysis and are moving to report
          if (step === 'draw' || step === 'select') {
            console.log('📝 Clearing buildCheckResult due to parcel change (step=' + step + ')');
            setHouseGeometry(null);
            setBuildCheckResult(null);
            setAuditResult(null);
          } else {
            console.log('📝 NOT clearing buildCheckResult (step=' + step + ') - preserving analysis');
          }
        }
      } catch (err) {
        console.error('Failed to fetch parcel details:', err);
        setError(`Failed to load parcel ${selectedParcelId}`);
      }
    };
    fetchParcelDetails();
  }, [selectedParcelId, step]);

  const handleRunBuildCheck = async () => {
    setLoading(true);
    setError(null);
    try {
      if (selectedParcelId && houseGeometry) {
        const res = await apiClient.buildCheck(selectedParcelId, houseGeometry);
        console.log('✅ buildCheckResult received:', res.data);
        setBuildCheckResult(res.data);
        // Store in sessionStorage as backup
        sessionStorage.setItem('currentBuildCheckResult', JSON.stringify(res.data));
        console.log('✅ buildCheckResult stored in sessionStorage');
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
          setAuditId(res.data.audit_id || '');
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

  const handleEvidenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setEvidenceSnapshot({
        dataUrl,
        fileName: file.name
      });
    };
    reader.readAsDataURL(file);
  };

  const handleFlagForVerification = async () => {
    console.log('=== handleFlagForVerification called ===');
    
    // Restore critical data from sessionStorage - DO THIS IMMEDIATELY
    let actualSelectedParcelId = selectedParcelId;
    let actualBuildCheckResult = buildCheckResult;
    
    console.log('Initial state check:');
    console.log('  selectedParcelId:', selectedParcelId ? 'YES: ' + selectedParcelId : 'EMPTY');
    console.log('  buildCheckResult:', buildCheckResult ? 'YES - has data' : 'NULL');
    
    // Try to restore buildCheckResult from sessionStorage if lost
    if (!actualBuildCheckResult) {
      console.log('⚠️  buildCheckResult is null, trying to restore from sessionStorage');
      const stored = sessionStorage.getItem('currentBuildCheckResult');
      console.log('  sessionStorage.currentBuildCheckResult:', stored ? 'FOUND (' + stored.length + ' chars)' : 'NOT FOUND');
      if (stored) {
        try {
          actualBuildCheckResult = JSON.parse(stored);
          console.log('✅ Restored buildCheckResult from sessionStorage');
          console.log('  Result:', actualBuildCheckResult.result);
          console.log('  Metrics:', actualBuildCheckResult.metrics);
        } catch (e) {
          console.error('❌ Could not parse stored buildCheckResult:', e);
        }
      }
    }
    
    // Try to restore selectedParcelId from sessionStorage if lost
    if (!actualSelectedParcelId) {
      console.log('⚠️  selectedParcelId is empty, trying to restore from sessionStorage');
      const stored = sessionStorage.getItem('currentSelectedParcelId');
      if (stored) {
        actualSelectedParcelId = stored;
        console.log('✅ Restored selectedParcelId from sessionStorage:', actualSelectedParcelId);
      }
    }
    
    // Validate we have all required data
    if (!actualSelectedParcelId) {
      const errMsg = 'Missing parcel ID - please select a parcel first';
      console.error('❌', errMsg);
      setError(errMsg);
      setFlagging(false);
      return;
    }
    
    if (!actualBuildCheckResult) {
      const errMsg = 'Missing spatial analysis data - please run compliance check first';
      console.error('❌', errMsg);
      console.error('  buildCheckResult:', actualBuildCheckResult);
      setError(errMsg);
      setFlagging(false);
      return;
    }

    console.log('✅ Data validation passed - all required data present');
    console.log('  ParcelId:', actualSelectedParcelId);
    console.log('  BuildCheckResult result:', actualBuildCheckResult.result);
    console.log('  Metrics available:', !!actualBuildCheckResult.metrics);
    
    setFlagging(true);
    console.log('✅ flagging state set to true');
    
    try {
      console.log('📝 Creating case with parameters:');
      console.log('  parcelId:', actualSelectedParcelId);
      console.log('  auditId:', auditId || 'AUD-DRAFT');
      console.log('  conflictResult:', auditResult?.result || actualBuildCheckResult.result);
      console.log('  affectedAreaM2:', actualBuildCheckResult.metrics.outside_area_m2);
      console.log('  outsidePercentage:', actualBuildCheckResult.metrics.outside_percentage);
      console.log('  reason:', auditResult?.problem || 'Boundary conflict');
      
      const newCase = caseService.createCase({
        parcelId: actualSelectedParcelId,
        auditId: auditId || 'AUD-DRAFT',
        conflictResult: auditResult?.result || actualBuildCheckResult.result,
        affectedAreaM2: actualBuildCheckResult.metrics.outside_area_m2,
        outsidePercentage: actualBuildCheckResult.metrics.outside_percentage,
        reason: auditResult?.problem || 'Potential boundary conflict detected during spatial analysis',
        evidenceDataUrl: evidenceSnapshot?.dataUrl || mapSnapshot,
        evidenceFileName: evidenceSnapshot?.fileName || 'evidence.png'
      });

      console.log('✅ Case created successfully!');
      console.log('  Case ID:', newCase.caseId);
      console.log('  Status:', newCase.status);
      console.log('  ParcelId:', newCase.parcelId);
      
      // Update state to show confirmation
      setFlaggedCaseId(newCase.caseId);
      setError(null);
      
      console.log('✅ State updated - confirmation screen should appear');
      console.log('CASE CREATION COMPLETE');
    } catch (err) {
      console.error('❌ Error creating case:', err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError('Failed to flag case: ' + errorMsg);
    } finally {
      console.log('✅ Cleanup: Setting flagging to false');
      setFlagging(false);
    }
  };

  const handleGenerateReportAndFlag = () => {
    // Try to capture map if not already done
    if (!mapSnapshot && !evidenceSnapshot) {
      const mapContainer = document.querySelector('[data-test="map-workspace"]');
      if (mapContainer && (mapContainer as any).querySelector('canvas')) {
        try {
          const canvas = (mapContainer as any).querySelector('canvas');
          setMapSnapshot(canvas.toDataURL('image/png'));
        } catch (e) {
          console.log('Could not capture map canvas, using upload fallback');
        }
      }
    }
    // Move to report_and_flag step
    setStep('report_and_flag');
  };

  // SCREEN 3: Upload Drone Image / GeoTIFF
  if (step === 'select' || step === 'upload') {
    return (
      <div className="p-8 max-w-4xl mx-auto bg-[#0f0f0f]">
        <h1 className="text-2xl font-bold text-white mb-1">Upload Drone Image / GeoTIFF</h1>
        <p className="text-gray-400 mb-6 text-sm">Upload drone orthomosaic image (GeoTIFF) for the selected parcel.</p>

        {/* 3 Step Indicator Header */}
        <div className="flex items-center gap-8 mb-8 bg-[#1a1a1a] p-4 rounded-xl border border-[#2a2a2a] text-xs font-bold shadow-sm">
          <div className="flex items-center gap-2 text-[#00ff66] border-b-2 border-[#00ff66] pb-1">
            <span className="w-5 h-5 rounded-full bg-[#00ff66] text-[#0f0f0f] flex items-center justify-center text-[10px]">1</span>
            Upload File
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <span className="w-5 h-5 rounded-full bg-[#2a2a2a] text-gray-500 flex items-center justify-center text-[10px]">2</span>
            Configure
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <span className="w-5 h-5 rounded-full bg-[#2a2a2a] text-gray-500 flex items-center justify-center text-[10px]">3</span>
            Preview
          </div>
        </div>

        {error && <div className="mb-6 p-4 bg-[#ff3333] bg-opacity-20 text-[#ff3333] rounded-lg">{error}</div>}

        <div className={`bg-[#1a1a1a] border-2 border-dashed border-[#2a2a2a] rounded-xl p-12 flex flex-col items-center justify-center mb-6 relative ${loading ? 'opacity-50' : ''}`}>
          {!loading && (
            <input 
              type="file" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
              onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]); }} 
            />
          )}
          <UploadCloud className="w-12 h-12 text-gray-500 mb-4" />
          <p className="font-bold text-gray-100 mb-1">
            {loading ? 'Uploading & Processing Drone Image...' : 'Drag & drop your GeoTIFF file here'}
          </p>
          <p className="text-xs text-gray-500 mb-4">or</p>
          <button className="bg-[#00ff66] text-[#0f0f0f] px-6 py-2 rounded-lg font-bold text-xs pointer-events-none mb-4">
            {loading ? 'Uploading...' : 'Browse File'}
          </button>
          <p className="text-[11px] text-gray-500">Supported formats: .tif, .tiff (GeoTIFF) • Max file size: 500MB</p>
          
          <button 
            onClick={() => setStep('draw')} 
            className="mt-4 text-xs font-bold text-gray-400 hover:text-[#00ff66] underline relative z-10"
          >
            Skip Upload (Use Satellite)
          </button>
        </div>

        {/* Selected Parcel Card */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 flex justify-between items-center shadow-sm">
          <div>
            <p className="text-xs text-gray-400 font-bold mb-1">Selected Parcel</p>
            <div className="flex items-center gap-3">
              <select 
                value={selectedParcelId} 
                onChange={(e) => setSelectedParcelId(e.target.value)}
                className="font-bold text-white border border-[#2a2a2a] rounded px-2 py-1 text-sm bg-[#2a2a2a]"
              >
                <option value="">-- Select a Parcel --</option>
                {parcels.map((p) => (
                  <option key={p.parcel_id} value={p.parcel_id}>
                    {p.parcel_id}
                  </option>
                ))}
              </select>
              <span className="text-xs text-gray-400">
                {selectedParcel?.parcel_id || 'No parcel selected'}
              </span>
            </div>
          </div>
          <div className="text-right flex items-center gap-4">
            <div>
              <p className="text-xs text-gray-400 font-bold mb-1">Area</p>
              <p className="font-bold text-white text-sm">
                {selectedParcel?.area ? `${selectedParcel.area.toFixed(2)} sq.m.` : 'N/A'}
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
      <div className="p-8 max-w-6xl mx-auto flex flex-col h-full bg-[#0f0f0f]">
        <h1 className="text-2xl font-bold text-white mb-1">Audit Map</h1>
        <p className="text-gray-400 mb-6 text-sm">Define parcel boundary and building footprint for analysis.</p>
        
        {error && <div className="mb-4 p-4 bg-[#ff3333] bg-opacity-20 text-[#ff3333] rounded-lg">{error}</div>}

        <div className="flex gap-6 flex-1 min-h-[520px]">
          <div className="w-80 flex flex-col gap-4">
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-400 font-bold uppercase mb-2">Audit ID</p>
              <p className="font-bold text-white text-sm mb-4">AUD-2025-019</p>

              <div className="mb-4">
                <p className="text-xs font-bold text-gray-100 mb-1">1. Draw Legal Boundary</p>
                <p className="text-[11px] text-gray-400">Draw the legal parcel boundary.</p>
              </div>

              <div>
                <p className="text-xs font-bold text-gray-100 mb-1">2. Draw Proposed Building</p>
                <p className="text-[11px] text-gray-400">Draw the proposed building footprint.</p>
              </div>
            </div>

            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 shadow-sm">
              <p className="text-xs font-bold text-white mb-3">3. Actions</p>
              <div className="flex gap-2 mb-3">
                <button onClick={() => setHouseGeometry(null)} className="flex-1 py-1.5 border border-[#2a2a2a] rounded text-xs font-bold text-gray-300 hover:bg-[#2a2a2a]">Clear All</button>
              </div>
              <button 
                onClick={handleRunBuildCheck}
                className="w-full text-xs bg-[#00ff66] text-[#0f0f0f] py-2.5 rounded-lg font-bold hover:brightness-110 shadow-sm transition-all"
              >
                {loading ? 'Analyzing...' : 'Check Compliance'}
              </button>
            </div>

            {/* Selected Parcel Summary Card */}
            <div className="mt-auto bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 shadow-sm text-xs">
              <p className="font-bold text-gray-400 uppercase tracking-wider mb-2 text-[10px]">Selected Parcel</p>
              <p className="font-bold text-white">{selectedParcel?.parcel_id || 'None'}</p>
              <p className="text-gray-400 text-[11px]">{selectedParcel?.boundary_status || 'Unknown'}</p>
              <p className="text-gray-100 font-bold mt-2">
                Area: {selectedParcel?.area ? `${selectedParcel.area.toFixed(2)}` : 'N/A'} sq.m.
              </p>
            </div>
          </div>

          <div className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden relative shadow-sm">
            <MapWorkspace 
              parcelGeometry={selectedParcel?.geometry} 
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
    const metrics = buildCheckResult?.metrics || {};
    return (
      <div className="p-8 max-w-6xl mx-auto bg-[#0f0f0f]">
        <h1 className="text-2xl font-bold text-white mb-1">Spatial Analysis (Build Check)</h1>
        <p className="text-gray-400 mb-6 text-sm">Automated GIS analysis of parcel vs building footprint.</p>

        <div className="flex gap-6 min-h-[480px]">
          {/* Analysis Metrics Left Box */}
          <div className="w-96 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-bold text-white border-b border-[#2a2a2a] pb-3 mb-4">Analysis Metrics</h2>
              <div className="flex flex-col gap-3 text-xs">
                <div className="flex justify-between py-1">
                  <span className="text-gray-400">Parcel Area (Calculated)</span>
                  <span className="font-bold text-white">{metrics.parcel_area_m2 ? metrics.parcel_area_m2.toFixed(2) : 'N/A'} sq.m.</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-400">Building Total Area</span>
                  <span className="font-bold text-white">{metrics.house_area_m2 ? metrics.house_area_m2.toFixed(2) : 'N/A'} sq.m.</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-400">Building Area (Inside Parcel)</span>
                  <span className="font-bold text-[#00ff66]">
                    {metrics.intersection_area_m2 ? metrics.intersection_area_m2.toFixed(2) : '0.00'} sq.m.
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-400">Building Area (Outside Parcel)</span>
                  <span className={`font-bold ${metrics.outside_area_m2 > 0 ? 'text-[#ff3333]' : 'text-[#00ff66]'}`}>
                    {metrics.outside_area_m2 ? metrics.outside_area_m2.toFixed(2) : '0.00'} sq.m.
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-400">Outside Percentage</span>
                  <span className={`font-bold ${metrics.outside_percentage > 0 ? 'text-[#ff3333]' : 'text-[#00ff66]'}`}>
                    {metrics.outside_percentage ? metrics.outside_percentage.toFixed(2) : '0.00'}%
                  </span>
                </div>
              </div>

              {/* Alert Card */}
              <div className={`mt-6 rounded-xl p-4 ${metrics.outside_area_m2 > 0 ? 'bg-[#ff3333] bg-opacity-10 border border-[#ff3333] border-opacity-30' : 'bg-[#00ff66] bg-opacity-10 border border-[#00ff66] border-opacity-30'}`}>
                <p className={`font-bold text-xs mb-1 ${metrics.outside_area_m2 > 0 ? 'text-[#ff3333]' : 'text-[#00ff66]'}`}>
                  {buildCheckResult?.result === 'CLEAR' ? 'No Encroachment' : 'Encroachment Detected'}
                </p>
                <p className={`text-[11px] ${metrics.outside_area_m2 > 0 ? 'text-[#ff3333] text-opacity-80' : 'text-[#00ff66] text-opacity-80'}`}>
                  {buildCheckResult?.result === 'CLEAR' 
                    ? 'Building is entirely within the parcel boundary.' 
                    : 'Portion of the building extends outside the parcel boundary.'}
                </p>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <button onClick={() => setStep('draw')} className="px-4 py-2 border border-[#2a2a2a] rounded-lg text-xs font-bold text-gray-300 hover:bg-[#2a2a2a]">Back</button>
              <div className="flex gap-2">
                {/* Show flag button if conflict detected */}
                {buildCheckResult?.result !== 'CLEAR' && (
                  <button 
                    onClick={handleGenerateReportAndFlag}
                    className="px-4 py-2 bg-[#ff3333] text-white rounded-lg text-xs font-bold hover:brightness-110 transition-all"
                  >
                    Generate Report & Flag
                  </button>
                )}
                <button onClick={handleRunAudit} className="px-4 py-2 bg-[#00ff66] text-[#0f0f0f] rounded-lg text-xs font-bold hover:brightness-110 disabled:opacity-50 transition-all" disabled={!buildCheckResult}>
                  Continue to Audit Analysis
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Map View with Legend */}
          <div className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden relative shadow-sm flex flex-col">
            <div className="flex-1 relative">
              <MapWorkspace 
                parcelGeometry={selectedParcel?.geometry} 
                houseGeometry={houseGeometry}
                encroachmentGeometry={buildCheckResult?.encroachment_geometry}
                onHouseDrawn={setHouseGeometry} 
                onHouseCleared={() => setHouseGeometry(null)} 
              />
            </div>
            {/* Color Legend */}
            <div className="p-3 bg-[#2a2a2a] border-t border-[#2a2a2a] flex items-center justify-around text-xs font-medium text-gray-300">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-sm"></span>
                <span>Parcel Boundary</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-red-500 rounded-sm"></span>
                <span>Proposed Building</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-blue-600 rounded-sm"></span>
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
    const diagnosis = auditResult?.diagnosis || {};
    const resolution = auditResult?.resolution || {};
    
    return (
      <div className="p-8 max-w-5xl mx-auto bg-[#0f0f0f]">
        <h1 className="text-2xl font-bold text-white mb-1">Audit Analysis</h1>
        <p className="text-gray-400 mb-6 text-sm">AI-powered land compliance audit results.</p>

        <div className="flex gap-6">
          <div className="w-1/3 flex flex-col gap-6">
            {/* Diagnosis Card */}
            <div className={`rounded-xl p-6 border ${auditResult?.result === 'CLEAR' ? 'border-[#00ff66] border-opacity-30 bg-[#00ff66] bg-opacity-10' : 'border-[#ff3333] border-opacity-30 bg-[#ff3333] bg-opacity-10'}`}>
              <p className={`text-[10px] uppercase font-bold tracking-wider mb-2 ${auditResult?.result === 'CLEAR' ? 'text-[#00ff66]' : 'text-[#ff3333]'}`}>
                Diagnosis
              </p>
              <h3 className={`text-base font-black uppercase mb-2 ${auditResult?.result === 'CLEAR' ? 'text-[#00ff66]' : 'text-[#ff3333]'}`}>
                {auditResult?.result || 'ANALYSIS'}
              </h3>
              <p className={`text-xs leading-relaxed ${auditResult?.result === 'CLEAR' ? 'text-[#00ff66] text-opacity-80' : 'text-[#ff3333] text-opacity-80'}`}>
                {auditResult?.problem || 'Performing analysis...'}
              </p>
            </div>

            {/* Analysis Summary Card */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 shadow-sm text-xs flex flex-col gap-2">
              <p className="font-bold text-white border-b border-[#2a2a2a] pb-2 mb-1">Analysis Summary</p>
              <div className="flex justify-between"><span className="text-gray-400">Parcel ID</span><span className="font-bold text-white">{selectedParcel?.parcel_id || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Boundary Status</span><span className="text-gray-300">{selectedParcel?.boundary_status || 'Unknown'}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Total Area</span><span className="text-gray-300">{selectedParcel?.area ? selectedParcel.area.toFixed(2) : 'N/A'} sq.m.</span></div>
            </div>

            {/* Metrics Details */}
            {buildCheckResult?.metrics && (
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 shadow-sm text-xs flex flex-col gap-2">
                <p className="font-bold text-white border-b border-[#2a2a2a] pb-2 mb-1">Metrics</p>
                <div className="flex justify-between"><span className="text-gray-400">Building Area</span><span className="font-bold text-white">{buildCheckResult.metrics.house_area_m2?.toFixed(2)} sq.m.</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Outside Area</span><span className={`font-bold ${buildCheckResult.metrics.outside_area_m2 > 0 ? 'text-[#ff3333]' : 'text-[#00ff66]'}`}>{buildCheckResult.metrics.outside_area_m2?.toFixed(2)} sq.m.</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Outside %</span><span className={`font-bold ${buildCheckResult.metrics.outside_percentage > 0 ? 'text-[#ff3333]' : 'text-[#00ff66]'}`}>{buildCheckResult.metrics.outside_percentage?.toFixed(2)}%</span></div>
              </div>
            )}
          </div>

          <div className="w-2/3 flex flex-col gap-6">
            {/* Resolution (Recommended Action) Card */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 shadow-sm">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Resolution (Recommended Action)</h3>
              <p className="text-sm font-bold text-white mb-4">
                {resolution.recommended_action || 'Analyzing...'}
              </p>
              
              {resolution.next_steps && resolution.next_steps.length > 0 && (
                <>
                  <p className="text-xs font-bold text-gray-300 mb-2">Recommended Actions:</p>
                  <ul className="list-disc pl-5 text-xs text-gray-400 flex flex-col gap-2">
                    {resolution.next_steps.map((step: string, i: number) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            {/* AI Summary */}
            {auditResult?.summary && (
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 shadow-sm">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">AI Summary</h3>
                <p className="text-xs text-gray-700 leading-relaxed">
                  {auditResult.summary}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between mt-8">
          <button onClick={() => setStep('spatial')} className="px-6 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50">Back</button>
          <div className="flex gap-3">
            <button onClick={() => setStep('ai_explain')} className="px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700">
              Get AI Explanation
            </button>
            <button onClick={handleGenerateReport} className="px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700">
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
      <div className="p-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">AI Explanation & Resolution</h1>
        <p className="text-gray-500 mb-6 text-sm">Gemini AI provides explanation and recommendations.</p>

        <div className="flex flex-col gap-6 mb-8">
          {/* AI Explanation (Gemini) Box */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4 text-sm">AI Explanation (Gemini)</h3>
            <p className="text-xs text-gray-700 leading-relaxed mb-4">
              {auditResult?.summary || 'Loading AI explanation...'}
            </p>
          </div>

          {/* Recommended Action Box */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-3 text-sm">Recommended Action</h3>
            <div className="flex items-center gap-2 text-xs font-bold text-green-700 bg-green-50 border border-green-200 p-3 rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-600" />
              {auditResult?.resolution?.recommended_action || 'Analyzing...'}
            </div>
          </div>
        </div>

        <div className="flex justify-between">
          <button onClick={() => setStep('analyze')} className="px-6 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50">Back</button>
          <button onClick={handleGenerateReport} className="px-6 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700">
            Generate Report
          </button>
        </div>
      </div>
    );
  }

  // Show case confirmation BEFORE report_and_flag so it takes priority
  if (flaggedCaseId) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Case Successfully Flagged</h1>
        
        <div className="bg-green-50 border-2 border-green-300 rounded-xl p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-900 mb-3">Government Case Created</h2>
          
          <div className="bg-white rounded-lg p-6 inline-block mb-6 text-left border border-gray-200">
            <p className="text-sm mb-2"><span className="font-bold text-gray-600">Case ID:</span></p>
            <p className="font-mono font-bold text-lg text-green-700 mb-4">{flaggedCaseId}</p>
            
            <p className="text-sm mb-2"><span className="font-bold text-gray-600">Parcel ID:</span> <span className="text-gray-900">{selectedParcelId}</span></p>
            <p className="text-sm mb-2"><span className="font-bold text-gray-600">Status:</span> <span className="inline-block px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-bold">PENDING REVIEW</span></p>
            <p className="text-sm"><span className="font-bold text-gray-600">Submitted:</span> <span className="text-gray-900">{new Date().toLocaleString()}</span></p>
          </div>

          <p className="text-gray-700 mb-6">
            Your case has been submitted for official government verification. Use your Case ID to track the status.
          </p>

          <div className="flex gap-3 justify-center">
            <button 
              onClick={() => setActiveTab('Track Case')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700"
            >
              Track This Case
            </button>
            <button 
              onClick={() => {
                setStep('select');
                setFlaggedCaseId(null);
                setEvidenceSnapshot(null);
                setMapSnapshot(null);
                setAuditResult(null);
                setBuildCheckResult(null);
                setHouseGeometry(null);
              }}
              className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700"
            >
              Start New Audit
            </button>
          </div>
        </div>
      </div>
    );
  }

  // SCREEN: Report & Flag for Verification (NEW - Between Spatial and Generate Report)
  if (step === 'report_and_flag') {
    console.log('=== report_and_flag screen rendered ===');
    
    // Immediately restore buildCheckResult from sessionStorage if it's null
    let displayBuildCheckResult = buildCheckResult;
    if (!displayBuildCheckResult) {
      const stored = sessionStorage.getItem('currentBuildCheckResult');
      if (stored) {
        try {
          displayBuildCheckResult = JSON.parse(stored);
          console.log('📝 Restored buildCheckResult from sessionStorage on report screen');
          // Also restore to state so submit button has it
          setBuildCheckResult(displayBuildCheckResult);
        } catch (e) {
          console.error('❌ Could not parse buildCheckResult from sessionStorage');
        }
      }
    }
    
    console.log('buildCheckResult:', displayBuildCheckResult);
    console.log('selectedParcelId:', selectedParcelId);
    console.log('auditResult:', auditResult);
    
    const metrics = displayBuildCheckResult?.metrics || {};
    const confidence = caseService.calculateSpatialConfidence({
      outsidePercentage: metrics.outside_percentage || 0,
      affectedAreaM2: metrics.outside_area_m2 || 0,
      hasEvidenceSnapshot: !!evidenceSnapshot || !!mapSnapshot,
      auditResult: displayBuildCheckResult?.result || ''
    });

    return (
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Flag for Official Verification</h1>
        <p className="text-gray-500 mb-8 text-sm">Review the conflict evidence below and submit for government verification.</p>

        {error && <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        {/* Conflict Summary Box */}
        <div className="bg-red-50 border border-red-300 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-bold text-red-900 mb-4">Potential Boundary Conflict</h2>
          
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-xs font-semibold text-red-700 uppercase mb-1">Affected Area</p>
              <p className="text-2xl font-bold text-red-700">{metrics.outside_area_m2?.toFixed(2)} m²</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-red-700 uppercase mb-1">Outside Percentage</p>
              <p className="text-2xl font-bold text-red-700">{metrics.outside_percentage?.toFixed(2)}%</p>
            </div>
          </div>

          <div className="border-t border-red-200 pt-4">
            <p className="text-xs font-semibold text-red-700 uppercase mb-1">Why Flagged</p>
            <p className="text-sm text-red-800">{auditResult?.problem || 'Portion of the proposed building extends outside the recorded parcel boundary.'}</p>
          </div>
        </div>

        {/* Spatial Verification Confidence */}
        <div className="bg-blue-50 border border-blue-300 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-bold text-blue-900 mb-3">Spatial Verification Confidence</h2>
          
          <div className="flex items-center gap-4 mb-4">
            <div>
              <p className="text-sm font-semibold text-blue-700 mb-1">Confidence Score</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-blue-700">{confidence.score}</span>
                <span className="text-sm text-blue-600">/ 100</span>
              </div>
            </div>
            <div>
              <span className={`inline-block px-3 py-1 rounded-lg font-bold text-sm ${
                confidence.level === 'HIGH'
                  ? 'bg-red-100 text-red-700'
                  : confidence.level === 'MEDIUM'
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-green-100 text-green-700'
              }`}>
                {confidence.level} CONFIDENCE
              </span>
            </div>
          </div>

          <div className="bg-white rounded-lg p-3 border border-blue-200">
            <p className="text-xs font-semibold text-gray-900 mb-2">Evidence Factors:</p>
            {confidence.factors.map((factor, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-gray-700 mb-1">
                <span className="text-blue-600 font-bold">•</span>
                <span>{factor}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Evidence Snapshot Section */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Conflict Evidence Snapshot</h2>

          {/* Show Map Snapshot if Available */}
          {(mapSnapshot || evidenceSnapshot) ? (
            <div className="mb-4">
              <div className="bg-gray-100 border border-gray-300 rounded-lg overflow-hidden max-h-64 flex items-center justify-center">
                <img
                  src={evidenceSnapshot?.dataUrl || mapSnapshot || ''}
                  alt="Conflict Evidence"
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-xs text-gray-600 mt-2">
                {evidenceSnapshot ? `Uploaded: ${evidenceSnapshot.fileName}` : 'Map Evidence Captured'}
              </p>
            </div>
          ) : (
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4">
              <p className="text-sm text-gray-600">No snapshot uploaded. Please upload an evidence photo below.</p>
            </div>
          )}

          {/* Upload Evidence */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-700 mb-2">Upload Evidence Snapshot (Optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleEvidenceUpload}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">Recommended: Screenshot showing the conflict area with legend</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {mapSnapshot || evidenceSnapshot ? (
              <button
                onClick={() => {
                  setMapSnapshot(null);
                  setEvidenceSnapshot(null);
                }}
                className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200"
              >
                Replace Snapshot
              </button>
            ) : null}
          </div>
        </div>

        {/* Final Submission Section */}
        <div className="bg-green-50 border border-green-300 rounded-xl p-6 mb-8">
          <p className="text-sm text-gray-700 mb-4">
            When you submit this report, a Government Case ID will be generated. Government officers will receive:
          </p>
          <ul className="text-xs text-gray-700 space-y-1 pl-5 list-disc">
            <li>This conflict analysis with measurements</li>
            <li>The conflict map/evidence snapshot</li>
            <li>Spatial verification confidence score</li>
            <li>Your report details</li>
          </ul>
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button 
            onClick={() => { console.log('Back clicked'); setStep('spatial'); }} 
            className="px-6 py-2 border border-[#2a2a2a] rounded-lg text-xs font-bold text-[#00d4ff] hover:brightness-125 transition-all"
          >
            Back
          </button>
          <button
            onClick={() => {
              console.log('SUBMIT BUTTON CLICKED!');
              handleFlagForVerification();
            }}
            disabled={flagging}
            className="px-6 py-3 bg-[#00ff66] text-dark-bg rounded-lg text-xs font-bold hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {flagging ? 'Submitting...' : 'Submit for Government Verification'}
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
(Parcel ID: ${selectedParcelId || 'PLOT-45'}) Tj
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
    const reportMetrics = buildCheckResult?.metrics || {};
    const reportId = `RPT-${auditId?.replace('AUD-', '') || '2025-018'}`;
    const confidence = caseService.calculateSpatialConfidence({
      outsidePercentage: reportMetrics.outside_percentage || 0,
      affectedAreaM2: reportMetrics.outside_area_m2 || 0,
      hasEvidenceSnapshot: !!evidenceSnapshot,
      auditResult: auditResult?.result || ''
    });
    
    // If already flagged, show confirmation
    if (flaggedCaseId) {
      return (
        <div className="p-8 max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Case Flagged for Official Verification</h1>
          <div className="bg-green-50 border-2 border-green-300 rounded-xl p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-900 mb-2">Case Successfully Flagged</h2>
            <p className="text-green-700 mb-6">Your case has been submitted for official government verification.</p>
            <div className="bg-white rounded-lg p-6 inline-block mb-6 text-left">
              <p className="text-sm text-gray-600 mb-2"><span className="font-bold">Case ID:</span> <span className="font-mono font-bold text-green-700">{flaggedCaseId}</span></p>
              <p className="text-sm text-gray-600 mb-2"><span className="font-bold">Parcel ID:</span> {selectedParcelId}</p>
              <p className="text-sm text-gray-600 mb-2"><span className="font-bold">Conflict:</span> {auditResult?.result}</p>
              <p className="text-sm text-gray-600"><span className="font-bold">Confidence:</span> {confidence.score}% ({confidence.level})</p>
            </div>
            <p className="text-sm text-gray-600 mb-6">Government officers will review your submission and update the status. You can track your case using the Case ID.</p>
            <button onClick={() => setActiveTab('Dashboard')} className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700">Return to Dashboard</button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Generate Audit Report</h1>
        <p className="text-gray-500 mb-6 text-sm">Review results and optionally flag for official verification with evidence.</p>

        {error && <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

        <div className="flex gap-6 mb-8">
          {/* Left Column: Report Summary + Confidence */}
          <div className="w-1/3 flex flex-col gap-4">
            {/* Report Summary */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col gap-3 text-xs">
              <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-3 mb-1 text-sm">Report Summary</h3>
              <div className="flex justify-between"><span className="text-gray-500">Parcel ID</span><span className="font-bold">{selectedParcel?.parcel_id || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Sector</span><span>{selectedParcel?.sector || 'Unknown'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">City</span><span>{selectedParcel?.city || 'Unknown'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Parcel Area</span><span>{selectedParcel?.area ? selectedParcel.area.toFixed(2) : 'N/A'} sq.m.</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Building Area (Inside)</span><span>{reportMetrics.house_area_m2 ? (reportMetrics.house_area_m2 - reportMetrics.outside_area_m2).toFixed(2) : 'N/A'} sq.m.</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Building Area (Outside)</span><span className="font-bold text-red-600">{reportMetrics.outside_area_m2 ? reportMetrics.outside_area_m2.toFixed(2) : '0.00'} sq.m.</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Outside Percentage</span><span className="font-bold text-red-600">{reportMetrics.outside_percentage ? reportMetrics.outside_percentage.toFixed(2) : '0.00'}%</span></div>
              <div className="flex justify-between"><span className="text-gray-500">IoU Score</span><span>{reportMetrics.iou ? reportMetrics.iou.toFixed(2) : 'N/A'}</span></div>
              <div className="flex justify-between pt-2 border-t border-gray-100"><span className="text-gray-500 font-bold">Diagnosis</span><span className={`font-bold uppercase ${auditResult?.result === 'CLEAR' ? 'text-green-600' : 'text-red-600'}`}>{auditResult?.result || 'N/A'}</span></div>
            </div>

            {/* Spatial Verification Confidence */}
            <div className="bg-blue-50 border border-blue-300 rounded-xl p-6 shadow-sm">
              <p className="text-xs font-bold text-blue-900 mb-3 uppercase">Spatial Verification Confidence</p>
              <div className="mb-4">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-3xl font-bold text-blue-700">{confidence.score}</span>
                  <span className="text-xs text-blue-600 font-semibold">/ 100</span>
                </div>
                <span className={`inline-block px-2.5 py-1 rounded text-xs font-bold ${
                  confidence.level === 'HIGH'
                    ? 'bg-red-100 text-red-700'
                    : confidence.level === 'MEDIUM'
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {confidence.level} CONFIDENCE
                </span>
              </div>
              <div className="bg-white rounded p-3 text-xs text-gray-700 space-y-1 border border-blue-200">
                <p className="font-semibold text-gray-900 mb-1.5">Evidence Factors:</p>
                {confidence.factors.map((factor, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>{factor}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Center Column: PDF Preview */}
          <div className="w-1/3 bg-white border border-gray-200 rounded-xl p-8 shadow-sm border-t-4 border-t-green-600">
            <div className="text-center border-b border-gray-200 pb-6 mb-6">
              <div className="flex justify-center items-center gap-2 mb-1">
                <span className="text-lg font-bold">AeroBhumi<span className="text-green-600">AI</span></span>
              </div>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Land Compliance Audit Report</h2>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs mb-6 bg-gray-50 p-4 rounded-lg">
              <div><span className="text-gray-400">Report ID:</span> <span className="font-bold text-gray-900">{reportId}</span></div>
              <div><span className="text-gray-400">Parcel ID:</span> <span className="font-bold text-gray-900">{selectedParcel?.parcel_id || 'N/A'}</span></div>
              <div><span className="text-gray-400">Audit ID:</span> <span className="text-gray-700">{auditId}</span></div>
              <div><span className="text-gray-400">Location:</span> <span className="text-gray-700">{selectedParcel?.location || 'Unknown'}</span></div>
              <div><span className="text-gray-400">Audit Date:</span> <span className="text-gray-700">{new Date().toLocaleString()}</span></div>
            </div>

            <div className="text-xs space-y-2 mb-6">
              <p className="font-bold text-gray-900 uppercase text-[10px] tracking-wider mb-2">Summary Table</p>
              <div className="flex justify-between py-1 border-b border-gray-100"><span className="text-gray-500">Parcel Area</span><span>{selectedParcel?.area ? selectedParcel.area.toFixed(2) : 'N/A'} sq.m.</span></div>
              <div className="flex justify-between py-1 border-b border-gray-100"><span className="text-gray-500">Building Area (Inside)</span><span>{reportMetrics.house_area_m2 ? (reportMetrics.house_area_m2 - reportMetrics.outside_area_m2).toFixed(2) : 'N/A'} sq.m.</span></div>
              <div className="flex justify-between py-1 border-b border-gray-100"><span className="text-gray-500">Building Area (Outside)</span><span className="text-red-600 font-bold">{reportMetrics.outside_area_m2 ? reportMetrics.outside_area_m2.toFixed(2) : '0.00'} sq.m.</span></div>
              <div className="flex justify-between py-1 border-b border-gray-100"><span className="text-gray-500">IoU Score</span><span>{reportMetrics.iou ? reportMetrics.iou.toFixed(2) : 'N/A'}</span></div>
              <div className="flex justify-between py-1 pt-2 font-bold"><span className="text-gray-700">Diagnosis</span><span className={auditResult?.result === 'CLEAR' ? 'text-green-600' : 'text-red-600'}>{auditResult?.result || 'N/A'}</span></div>
            </div>
          </div>

          {/* Right Column: Evidence Upload & Flag Button */}
          <div className="w-1/3 flex flex-col gap-4">
            {/* Evidence Snapshot Upload */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <p className="text-xs font-bold text-gray-900 mb-3 uppercase">Evidence Snapshot (Optional)</p>
              
              {!evidenceSnapshot ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-600 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleEvidenceUpload}
                    className="hidden"
                    id="evidence-upload"
                  />
                  <label htmlFor="evidence-upload" className="cursor-pointer block">
                    <UploadCloud className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-gray-700 mb-0.5">Upload Conflict Photo</p>
                    <p className="text-[11px] text-gray-500">Click to upload or drag</p>
                  </label>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="mb-3 bg-white rounded overflow-hidden border border-gray-200 max-h-32">
                    <img
                      src={evidenceSnapshot.dataUrl}
                      alt="Evidence Preview"
                      className="w-full h-32 object-cover"
                    />
                  </div>
                  <p className="text-xs text-gray-700 font-semibold mb-2 truncate">{evidenceSnapshot.fileName}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEvidenceSnapshot(null)}
                      className="flex-1 px-2 py-1.5 bg-red-50 text-red-700 text-xs font-semibold rounded hover:bg-red-100 transition-colors"
                    >
                      Remove
                    </button>
                    <label htmlFor="evidence-replace" className="flex-1">
                      <button
                        className="w-full px-2 py-1.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded hover:bg-gray-200 transition-colors"
                        type="button"
                        onClick={() => document.getElementById('evidence-replace')?.click()}
                      >
                        Replace
                      </button>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleEvidenceUpload}
                        className="hidden"
                        id="evidence-replace"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Flag for Verification Button */}
            {auditResult?.result !== 'CLEAR' && (
              <button
                onClick={handleFlagForVerification}
                disabled={flagging || !selectedParcelId || !buildCheckResult}
                className="w-full px-4 py-3 bg-green-700 text-white rounded-lg font-bold text-sm hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {flagging ? 'Flagging...' : 'Flag for Official Verification'}
              </button>
            )}

            {auditResult?.result === 'CLEAR' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-xs text-green-800">
                <p className="font-semibold mb-1">No Conflicts Detected</p>
                <p>Flagging is not available for clear results. The parcel is compliant.</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between mt-8">
          <button onClick={() => setStep('analyze')} className="px-6 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50">Back</button>
          <button 
            onClick={() => handleDownloadPDF(reportId)} 
            className="px-6 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Download Report (PDF)
          </button>
        </div>
      </div>
    );
  }

  return null;
}
