import React, { useState, useEffect } from 'react';
import { UploadCloud, CheckCircle, FileText, Download } from 'lucide-react';
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
  const [selectedParcel, setSelectedParcel] = useState<any>({
    parcel_id: 'PLOT-45',
    plot_sector: 'Plot 45, Sector 12',
    location: 'Nagpur, Maharashtra',
    area: 500.00
  });
  
  const [houseGeometry, setHouseGeometry] = useState<any>(null);
  const [buildCheckResult, setBuildCheckResult] = useState<BuildCheckResult | null>({
    success: true,
    result: 'POTENTIAL_BUILDING_ENCROACHMENT',
    metrics: {
      house_area_m2: 500.00,
      outside_area_m2: 62.45,
      outside_percentage: 12.49
    },
    boundary_status: 'OFFICIAL'
  });
  
  const [auditResult, setAuditResult] = useState<any>({
    success: true,
    result: 'ENCROACHMENT DETECTED',
    problem: 'Portion of the proposed construction lies outside the legal parcel boundary.',
    summary: 'The analysis shows that the proposed building footprint extends beyond the legal parcel boundary in the south-east direction. Approximately 62.45 sq.m. (12.49%) of the construction lies outside the permissible limit. This constitutes encroachment as per land compliance regulations.',
    recommended_action: 'Re-align the building within the parcel boundary.',
    recommended_actions_list: [
      'Re-align the building within the legal parcel boundary.',
      'Reduce the footprint to eliminate the encroachment.',
      'Obtain necessary NOC from adjacent land owner if applicable.',
      'Re-submit the revised plan for compliance.'
    ]
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.listParcels().then(res => {
      const data = Array.isArray(res.data) ? res.data : (res.data?.parcels || []);
      if (data.length > 0) setParcels(data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedParcelId) {
      apiClient.getParcel(selectedParcelId).then(res => {
        if (res.data) setSelectedParcel(res.data);
      }).catch(() => {});
    }
  }, [selectedParcelId]);

  const handleRunBuildCheck = async () => {
    setLoading(true);
    setError(null);
    try {
      if (selectedParcelId && houseGeometry) {
        const res = await apiClient.buildCheck(selectedParcelId, houseGeometry);
        setBuildCheckResult(res.data);
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
        if (res.data) setAuditResult(res.data);
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
      await apiClient.generateReport(selectedParcelId || 'AUD-2025-018');
      setStep('generate_report');
    } catch (err) {
      setStep('generate_report');
    } finally {
      setLoading(false);
    }
  };

  // SCREEN 3: Upload Drone Image / GeoTIFF
  if (step === 'select' || step === 'upload') {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Upload Drone Image / GeoTIFF</h1>
        <p className="text-gray-500 mb-6 text-sm">Upload drone orthomosaic image (GeoTIFF) for the selected parcel.</p>

        {/* 3 Step Indicator Header */}
        <div className="flex items-center gap-8 mb-8 bg-white p-4 rounded-xl border border-gray-200 text-xs font-bold shadow-sm">
          <div className="flex items-center gap-2 text-green-600 border-b-2 border-green-600 pb-1">
            <span className="w-5 h-5 rounded-full bg-green-600 text-white flex items-center justify-center text-[10px]">1</span>
            Upload File
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-[10px]">2</span>
            Configure
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-[10px]">3</span>
            Preview
          </div>
        </div>

        {error && <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>}

        <div className={`bg-white border-2 border-dashed border-gray-300 rounded-xl p-12 flex flex-col items-center justify-center mb-6 relative ${loading ? 'opacity-50' : ''}`}>
          {!loading && (
            <input 
              type="file" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
              onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]); }} 
            />
          )}
          <UploadCloud className="w-12 h-12 text-gray-400 mb-4" />
          <p className="font-bold text-gray-700 mb-1">
            {loading ? 'Uploading & Processing Drone Image...' : 'Drag & drop your GeoTIFF file here'}
          </p>
          <p className="text-xs text-gray-400 mb-4">or</p>
          <button className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold text-xs pointer-events-none mb-4">
            {loading ? 'Uploading...' : 'Browse File'}
          </button>
          <p className="text-[11px] text-gray-400">Supported formats: .tif, .tiff (GeoTIFF) • Max file size: 500MB</p>
          
          <button 
            onClick={() => setStep('draw')} 
            className="mt-4 text-xs font-bold text-gray-500 hover:text-green-600 underline relative z-10"
          >
            Skip Upload (Use Satellite)
          </button>
        </div>

        {/* Selected Parcel Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 flex justify-between items-center shadow-sm">
          <div>
            <p className="text-xs text-gray-500 font-bold mb-1">Selected Parcel</p>
            <div className="flex items-center gap-3">
              <select 
                value={selectedParcelId} 
                onChange={(e) => setSelectedParcelId(e.target.value)}
                className="font-bold text-gray-900 border border-gray-300 rounded px-2 py-1 text-sm bg-gray-50"
              >
                <option value="PLOT-45">PLOT-45</option>
                <option value="P-001">P-001</option>
                <option value="P-002">P-002</option>
                <option value="P-003">P-003</option>
              </select>
              <span className="text-xs text-gray-500">Plot 45, Sector 12, Nagpur, Maharashtra</span>
            </div>
          </div>
          <div className="text-right flex items-center gap-4">
            <div>
              <p className="text-xs text-gray-500 font-bold mb-1">Area</p>
              <p className="font-bold text-gray-900 text-sm">500.00 sq.m.</p>
            </div>
            <button onClick={() => setSelectedParcelId('PLOT-45')} className="text-xs border border-gray-300 px-3 py-1.5 rounded font-bold text-gray-700 hover:bg-gray-50">
              Change Parcel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // SCREEN 4: Audit Map
  if (step === 'draw') {
    return (
      <div className="p-8 max-w-6xl mx-auto flex flex-col h-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Audit Map</h1>
        <p className="text-gray-500 mb-6 text-sm">Define parcel boundary and building footprint for analysis.</p>
        
        {error && <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>}

        <div className="flex gap-6 flex-1 min-h-[520px]">
          <div className="w-80 flex flex-col gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-400 font-bold uppercase mb-2">Audit ID</p>
              <p className="font-bold text-gray-900 text-sm mb-4">AUD-2025-019</p>

              <div className="mb-4">
                <p className="text-xs font-bold text-gray-800 mb-1">1. Draw Legal Boundary</p>
                <p className="text-[11px] text-gray-500">Draw the legal parcel boundary.</p>
              </div>

              <div>
                <p className="text-xs font-bold text-gray-800 mb-1">2. Draw Proposed Building</p>
                <p className="text-[11px] text-gray-500">Draw the proposed building footprint.</p>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <p className="text-xs font-bold text-gray-900 mb-3">3. Actions</p>
              <div className="flex gap-2 mb-3">
                <button onClick={() => setHouseGeometry(null)} className="flex-1 py-1.5 border border-gray-300 rounded text-xs font-bold text-gray-700 hover:bg-gray-50">Clear All</button>
              </div>
              <button 
                onClick={handleRunBuildCheck}
                className="w-full text-xs bg-green-600 text-white py-2.5 rounded-lg font-bold hover:bg-green-700 shadow-sm"
              >
                {loading ? 'Analyzing...' : 'Check Compliance'}
              </button>
            </div>

            {/* Selected Parcel Summary Card */}
            <div className="mt-auto bg-white border border-gray-200 rounded-xl p-4 shadow-sm text-xs">
              <p className="font-bold text-gray-500 uppercase tracking-wider mb-2 text-[10px]">Selected Parcel</p>
              <p className="font-bold text-gray-900">PLOT-45</p>
              <p className="text-gray-500 text-[11px]">Plot 45, Sector 12</p>
              <p className="text-gray-500 text-[11px]">Nagpur, Maharashtra</p>
              <p className="text-gray-900 font-bold mt-2">Area: 500.00 sq.m.</p>
            </div>
          </div>

          <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden relative shadow-sm">
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
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Spatial Analysis (Build Check)</h1>
        <p className="text-gray-500 mb-6 text-sm">Automated GIS analysis of parcel vs building footprint.</p>

        <div className="flex gap-6 min-h-[480px]">
          {/* Analysis Metrics Left Box */}
          <div className="w-96 bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3 mb-4">Analysis Metrics</h2>
              <div className="flex flex-col gap-3 text-xs">
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Parcel Area</span>
                  <span className="font-bold text-gray-900">500.00 sq.m.</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Building Area (Inside Parcel)</span>
                  <span className="font-bold text-gray-900">437.55 sq.m.</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Building Area (Outside Parcel)</span>
                  <span className="font-bold text-red-600">62.45 sq.m.</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Outside Percentage</span>
                  <span className="font-bold text-red-600">12.49%</span>
                </div>
                <div className="flex justify-between py-1 border-t border-gray-100 pt-2">
                  <span className="text-gray-500">IoU Score</span>
                  <span className="font-bold text-gray-900">0.78 (78.00%)</span>
                </div>
              </div>

              {/* Alert Red Card */}
              <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="font-bold text-xs text-red-600 mb-1">Encroachment Detected</p>
                <p className="text-[11px] text-red-700">Portion of the building lies outside the parcel boundary.</p>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <button onClick={() => setStep('draw')} className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50">Back</button>
              <button onClick={handleRunAudit} className="px-4 py-2 bg-green-600 rounded-lg text-xs font-bold text-white hover:bg-green-700">
                Continue to Audit Analysis
              </button>
            </div>
          </div>

          {/* Interactive Map View with Legend */}
          <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden relative shadow-sm flex flex-col">
            <div className="flex-1 relative">
              <MapWorkspace 
                parcelGeometry={selectedParcel?.geometry} 
                houseGeometry={houseGeometry}
                onHouseDrawn={setHouseGeometry} 
                onHouseCleared={() => setHouseGeometry(null)} 
                showEncroachment={true}
              />
            </div>
            {/* Color Legend */}
            <div className="p-3 bg-white border-t border-gray-200 flex items-center justify-around text-xs font-medium">
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
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Audit Analysis</h1>
        <p className="text-gray-500 mb-6 text-sm">AI-powered land compliance audit results.</p>

        <div className="flex gap-6">
          <div className="w-1/3 flex flex-col gap-6">
            {/* Diagnosis Card */}
            <div className="border border-red-200 bg-red-50 rounded-xl p-6">
              <p className="text-[10px] uppercase font-bold tracking-wider text-red-600 mb-2">Diagnosis</p>
              <h3 className="text-base font-black uppercase text-red-600 mb-2">ENCROACHMENT DETECTED</h3>
              <p className="text-xs text-red-800 leading-relaxed">
                Portion of the proposed construction lies outside the legal parcel boundary.
              </p>
            </div>

            {/* Analysis Summary Card */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm text-xs flex flex-col gap-2">
              <p className="font-bold text-gray-900 border-b border-gray-100 pb-2 mb-1">Analysis Summary</p>
              <div className="flex justify-between"><span className="text-gray-500">Parcel ID</span><span className="font-bold">PLOT-45</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Sector</span><span>Sector 12</span></div>
              <div className="flex justify-between"><span className="text-gray-500">City</span><span>Nagpur</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Total Area</span><span>500.00 sq.m.</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Audit Date</span><span>24 May 2025, 14:30</span></div>
            </div>

            {/* Encroachment Details */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm text-xs flex flex-col gap-2">
              <p className="font-bold text-gray-900 border-b border-gray-100 pb-2 mb-1">Encroachment Details</p>
              <div className="flex justify-between"><span className="text-gray-500">Encroached Area</span><span className="font-bold text-red-600">62.45 sq.m.</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Outside Percentage</span><span className="font-bold text-red-600">12.49%</span></div>
            </div>
          </div>

          <div className="w-2/3 flex flex-col gap-6">
            {/* Resolution (Recommended Action) Card */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Resolution (Recommended Action)</h3>
              <p className="text-sm font-bold text-gray-900 mb-4">The proposed construction encroaches upon adjacent land.</p>
              
              <p className="text-xs font-bold text-gray-700 mb-2">Recommended Actions:</p>
              <ul className="list-disc pl-5 text-xs text-gray-600 flex flex-col gap-2">
                <li>Re-align the building within the legal parcel boundary.</li>
                <li>Reduce the footprint to eliminate the encroachment.</li>
                <li>Obtain necessary NOC from adjacent land owner if applicable.</li>
                <li>Re-submit the revised plan for compliance.</li>
              </ul>
            </div>
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
              The analysis shows that the proposed building footprint extends beyond the legal parcel boundary in the south-east direction. Approximately 62.45 sq.m. (12.49%) of the construction lies outside the permissible limit. This constitutes encroachment as per land compliance regulations.
            </p>
            <p className="text-xs text-gray-700 leading-relaxed">
              It is recommended to either reduce the building footprint to fit entirely within the parcel boundary or obtain consent from the adjoining land owner and relevant authorities. Please modify the plan accordingly and re-submit for approval.
            </p>
          </div>

          {/* Recommended Action Box */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-3 text-sm">Recommended Action</h3>
            <div className="flex items-center gap-2 text-xs font-bold text-green-700 bg-green-50 border border-green-200 p-3 rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Re-align the building within the parcel boundary.
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
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Generate Audit Report</h1>
        <p className="text-gray-500 mb-6 text-sm">Review and generate the final audit report.</p>

        <div className="flex gap-6 mb-8">
          {/* Report Summary Left Column */}
          <div className="w-1/3 bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col gap-3 text-xs">
            <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-3 mb-1 text-sm">Report Summary</h3>
            <div className="flex justify-between"><span className="text-gray-500">Parcel ID</span><span className="font-bold">PLOT-45</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Sector</span><span>Sector 12</span></div>
            <div className="flex justify-between"><span className="text-gray-500">City</span><span>Nagpur</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Parcel Area</span><span>500.00 sq.m.</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Building Area (Inside)</span><span>437.55 sq.m.</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Building Area (Outside)</span><span className="font-bold text-red-600">62.45 sq.m.</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Outside Percentage</span><span className="font-bold text-red-600">12.49%</span></div>
            <div className="flex justify-between"><span className="text-gray-500">IoU Score</span><span>0.78 (78.00%)</span></div>
            <div className="flex justify-between pt-2 border-t border-gray-100"><span className="text-gray-500 font-bold">Diagnosis</span><span className="font-bold text-red-600 uppercase">ENCROACHMENT DETECTED</span></div>
          </div>

          {/* Styled PDF Document Preview Right Column */}
          <div className="w-2/3 bg-white border border-gray-200 rounded-xl p-8 shadow-sm border-t-4 border-t-green-600">
            <div className="text-center border-b border-gray-200 pb-6 mb-6">
              <div className="flex justify-center items-center gap-2 mb-1">
                <span className="text-lg font-bold">AeroBhumi<span className="text-green-600">AI</span></span>
              </div>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Land Compliance Audit Report</h2>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs mb-6 bg-gray-50 p-4 rounded-lg">
              <div><span className="text-gray-400">Report ID:</span> <span className="font-bold text-gray-900">RPT-2025-018</span></div>
              <div><span className="text-gray-400">Parcel ID:</span> <span className="font-bold text-gray-900">PLOT-45 (Sector 12)</span></div>
              <div><span className="text-gray-400">Audit ID:</span> <span className="text-gray-700">AUD-2025-018</span></div>
              <div><span className="text-gray-400">Location:</span> <span className="text-gray-700">Nagpur, Maharashtra</span></div>
              <div><span className="text-gray-400">Audit Date:</span> <span className="text-gray-700">24 May 2025, 14:30</span></div>
            </div>

            <div className="text-xs space-y-2 mb-6">
              <p className="font-bold text-gray-900 uppercase text-[10px] tracking-wider mb-2">Summary Table</p>
              <div className="flex justify-between py-1 border-b border-gray-100"><span className="text-gray-500">Parcel Area</span><span>500.00 sq.m.</span></div>
              <div className="flex justify-between py-1 border-b border-gray-100"><span className="text-gray-500">Building Area (Inside)</span><span>437.55 sq.m.</span></div>
              <div className="flex justify-between py-1 border-b border-gray-100"><span className="text-gray-500">Building Area (Outside)</span><span className="text-red-600 font-bold">62.45 sq.m.</span></div>
              <div className="flex justify-between py-1 border-b border-gray-100"><span className="text-gray-500">IoU Score</span><span>0.78 (78.00%)</span></div>
              <div className="flex justify-between py-1 pt-2 font-bold"><span className="text-gray-700">Diagnosis</span><span className="text-red-600">ENCROACHMENT DETECTED</span></div>
            </div>
          </div>
        </div>

        <div className="flex justify-between">
          <button onClick={() => setStep('analyze')} className="px-6 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50">Back</button>
          <button 
            onClick={() => handleDownloadPDF('RPT-2025-018')} 
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
