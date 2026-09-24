/**
 * Government Land Verification Module - SIH Prototype
 * 
 * Professional government officer interface for:
 * - Upload and verify cadastral maps
 * - Extract and validate parcel geometry
 * - Compare government records vs observed reality
 * - Detect spatial inconsistencies
 * - Generate technical verification reports
 * 
 * Design: Clean, professional government dashboard
 * Theme: White backgrounds, green accents, professional typography
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Loader, 
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Clock,
  File,
  Badge,
  Check
} from 'lucide-react';
import { apiClient } from '../services/api';
import * as caseService from '../services/caseService';
import GovernmentCaseMap from '../components/GovernmentCaseMap';
import Government3DVisualization from '../components/Government3DVisualization';
import { getAllGovernmentCases, GovernmentCase, DEMO_MAP_IMAGE } from '../utils/governmentMockData';
import { CitizenCase } from '../utils/types';

type ProcessingStep = 'idle' | 'uploading' | 'processing' | 'extracting' | 'analyzing' | 'complete';

interface UploadedMapData {
  dataUrl: string;
  fileName: string;
  fileSize: string;
  uploadTime: Date;
}

export default function GovernmentVerification() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State management
  const [allGovernmentCases, setAllGovernmentCases] = useState<(GovernmentCase & { isCitizenCase?: boolean; citizenCase?: any })[]>([]);
  const [uploadedMap, setUploadedMap] = useState<UploadedMapData | null>(null);
  const [processingStep, setProcessingStep] = useState<ProcessingStep>('idle');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [selectedCase, setSelectedCase] = useState<(GovernmentCase & { isCitizenCase?: boolean; citizenCase?: any }) | null>(null);
  const [mapView, setMapView] = useState<string>('comparison');
  const [showMap3D, setShowMap3D] = useState(false);
  const [aiSummary, setAISummary] = useState<any>(null);
  const [aiLoading, setAILoading] = useState(false);
  
  // Parcel identification form state
  const [location, setLocation] = useState('');
  const [plotNumber, setPlotNumber] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [surveyReference, setSurveyReference] = useState('');

  // Load cases on mount and setup auto-refresh
  useEffect(() => {
    loadCases();
    
    // Auto-refresh cases every 2 seconds to see real-time updates from citizen
    const interval = setInterval(() => {
      console.log('📝 Auto-refresh tick');
      loadCases();
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  // When allGovernmentCases updates, check for new cases
  useEffect(() => {
    if (allGovernmentCases.length > 0) {
      // If no case is selected, select the MOST RECENT case (highest index)
      if (!selectedCase) {
        const mostRecentCase = allGovernmentCases[allGovernmentCases.length - 1];
        console.log('📝 No case selected, selecting most recent:', mostRecentCase.caseId || mostRecentCase.parcel_id);
        setSelectedCase(mostRecentCase);
      } else {
        // If a case is selected, verify it still exists in the list
        const stillExists = allGovernmentCases.find(c => 
          c.caseId === selectedCase.caseId || 
          (c.parcel_id === selectedCase.parcel_id && !selectedCase.caseId)
        );
        
        if (!stillExists) {
          console.log('📝 Selected case no longer exists, selecting most recent');
          const mostRecentCase = allGovernmentCases[allGovernmentCases.length - 1];
          setSelectedCase(mostRecentCase);
        }
      }
    }
  }, [allGovernmentCases]);

  const loadCases = () => {
    console.log('=== loadCases called (government) ===');
    const cases = getAllGovernmentCases();
    console.log('✅ Cases loaded:', cases.length);
    
    if (cases.length > 0) {
      cases.forEach((c: any, i: number) => {
        console.log(`  [${i}] ${c.caseId || c.parcel_id} - ${c.isCitizenCase ? 'CITIZEN' : 'MOCK'} - ${c.status || 'N/A'}`);
      });
    }
    
    setAllGovernmentCases(cases);
    // Note: Don't set selectedCase here - let the useEffect handle it
  };

  // Government action handlers
  const handleCaseStatusUpdate = (newStatus: CitizenCase['status']) => {
    if (!selectedCase?.isCitizenCase || !selectedCase?.citizenCase) return;

    const updated = caseService.updateCaseStatus(
      selectedCase.citizenCase.caseId,
      newStatus,
      `Updated by government officer on ${new Date().toLocaleString()}`
    );

    if (updated) {
      // Refresh cases list
      loadCases();
      // Reselect updated case
      const updatedCase = getAllGovernmentCases().find(
        (c) => c.isCitizenCase && c.citizenCase?.caseId === updated.caseId
      );
      if (updatedCase) {
        setSelectedCase(updatedCase);
      }
    }
  };

  // Processing simulation
  const simulateProcessing = async (mapData: UploadedMapData) => {
    setProcessingStep('uploading');
    setProcessingProgress(15);
    await new Promise(r => setTimeout(r, 600));

    setProcessingStep('processing');
    setProcessingProgress(40);
    await new Promise(r => setTimeout(r, 900));

    setProcessingStep('extracting');
    setProcessingProgress(70);
    await new Promise(r => setTimeout(r, 800));

    setProcessingStep('analyzing');
    setProcessingProgress(90);
    await new Promise(r => setTimeout(r, 600));

    setProcessingStep('complete');
    setProcessingProgress(100);
    await new Promise(r => setTimeout(r, 400));
    
    setProcessingStep('idle');
    setProcessingProgress(0);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      const mapData: UploadedMapData = {
        dataUrl,
        fileName: file.name,
        fileSize: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        uploadTime: new Date()
      };

      setUploadedMap(mapData);
      await simulateProcessing(mapData);
    };
    reader.readAsDataURL(file);
  };

  const handleLoadDemoMap = async () => {
    const mapData: UploadedMapData = {
      dataUrl: DEMO_MAP_IMAGE,
      fileName: 'cadastral_survey_BTP-667-2024.svg',
      fileSize: '2.4 MB',
      uploadTime: new Date()
    };

    setUploadedMap(mapData);
    await simulateProcessing(mapData);
  };

  const handleGenerateSummary = async () => {
    if (!selectedCase) return;
    
    setAILoading(true);
    try {
      const response = await apiClient.generateGovernmentCaseSummary({
        parcel_id: selectedCase.parcel_id,
        registered_area_m2: selectedCase.registered_area_m2,
        observed_area_m2: selectedCase.observed_area_m2,
        area_variance_percent: selectedCase.area_variance_percent,
        affected_area_m2: selectedCase.affected_area_m2,
        affected_side: selectedCase.affected_side,
        conflict_type: selectedCase.conflict_type,
        priority: selectedCase.priority
      });
      setAISummary(response.data);
    } catch (err) {
      console.error('Failed to generate summary:', err);
      setAISummary({
        what_happened: 'The observed parcel geometry extends beyond the official government recorded boundary.',
        why_flagged: `An area of ${selectedCase.affected_area_m2} m² on the ${selectedCase.affected_side} boundary shows a spatial variance of ${selectedCase.area_variance_percent}%.`,
        what_to_verify: 'Field verification required. Compare physical boundary markers with government records. Verify adjoining parcel boundaries.',
        llm_used: false,
        disclaimer: 'Spatial analysis result. Not a legal determination of ownership or encroachment.'
      });
    } finally {
      setAILoading(false);
    }
  };

  const isProcessing = processingStep !== 'idle';

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header Bar */}
      <div className="border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-gray-500 tracking-wide">GOVERNMENT OFFICER</span>
              <div className="w-1 h-1 rounded-full bg-gray-300"></div>
              <span className="text-xs font-semibold text-green-700">VERIFICATION MODE ACTIVE</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">Land Record Verification System</h1>
          </div>
          <div className="text-right text-xs text-gray-600">
            <p>Automated Cadastral Analysis Platform</p>
            <p className="text-gray-400 mt-1">Maharashtra Revenue Department</p>
          </div>
        </div>
      </div>

      {/* Parcel Identification Form */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mb-3">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Identify Parcel / Land Record</h3>
        </div>
        <div className="grid grid-cols-4 gap-3 mb-3">
          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Street 45, Icon Colony"
              className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-700 focus:ring-1 focus:ring-green-700"
            />
          </div>

          {/* Plot Number */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Plot Number</label>
            <input
              type="text"
              value={plotNumber}
              onChange={(e) => setPlotNumber(e.target.value)}
              placeholder="P-009"
              className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-700 focus:ring-1 focus:ring-green-700"
            />
          </div>

          {/* Registration / Record Number */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Registration / Record No.</label>
            <input
              type="text"
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              placeholder="REG-2026-009"
              className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-700 focus:ring-1 focus:ring-green-700"
            />
          </div>

          {/* Survey / Khasra Reference */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Survey / Khasra Ref.</label>
            <input
              type="text"
              value={surveyReference}
              onChange={(e) => setSurveyReference(e.target.value)}
              placeholder="KSR-1189"
              className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-700 focus:ring-1 focus:ring-green-700"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-700 text-white rounded text-xs font-semibold hover:bg-green-800 transition-colors">
            Continue to Map Verification
          </button>

          {/* Case List Dropdown */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-600 font-semibold">Cases in Queue:</span>
            <select
              value={selectedCase?.caseId || selectedCase?.parcel_id || ''}
              onChange={(e) => {
                const selectedId = e.target.value;
                console.log('=== Dropdown changed ===');
                console.log('  Selected value:', selectedId);
                console.log('  Total cases:', allGovernmentCases.length);
                
                if (!selectedId) {
                  console.log('  Empty selection, skipping');
                  return;
                }
                
                // Try to find by caseId first (citizen cases)
                let matchedCase = allGovernmentCases.find((c) => {
                  const matches = c.caseId === selectedId;
                  if (matches) {
                    console.log('  ✅ Found by caseId:', c.caseId);
                  }
                  return matches;
                });
                
                // If not found by caseId, try by parcel_id (legacy)
                if (!matchedCase) {
                  matchedCase = allGovernmentCases.find((c) => c.parcel_id === selectedId);
                  if (matchedCase) {
                    console.log('  ✅ Found by parcel_id:', matchedCase.parcel_id);
                  }
                }
                
                if (matchedCase) {
                  console.log('  Setting selectedCase:', matchedCase.caseId || matchedCase.parcel_id);
                  console.log('  Has evidence:', !!matchedCase.citizenCase?.evidenceDataUrl);
                  setSelectedCase(matchedCase);
                } else {
                  console.log('  ❌ No match found for:', selectedId);
                  console.log('  Available cases:', allGovernmentCases.map(c => c.caseId || c.parcel_id).join(', '));
                }
              }}
              className="px-2.5 py-1 text-xs border border-gray-300 rounded bg-white text-gray-900 font-semibold focus:outline-none focus:border-green-700"
            >
              <option value="">-- Select a case --</option>
              {allGovernmentCases.map((c, idx) => {
                // For citizen cases, use caseId as the value and display it prominently
                const displayLabel = c.isCitizenCase 
                  ? `${c.caseId} (Citizen - ${c.status})` 
                  : `${c.parcel_id} (Mock)`;
                const optionValue = c.caseId || c.parcel_id;
                
                return (
                  <option key={`${c.caseId || c.parcel_id}-${idx}`} value={optionValue}>
                    {displayLabel}
                  </option>
                );
              })}
            </select>
            <span className="text-gray-600 font-semibold">
              ({allGovernmentCases.filter(c => c.isCitizenCase).length} citizen cases)
            </span>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
        <div className="flex items-center gap-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="inline-flex items-center gap-2 px-3 py-2 bg-green-700 text-white rounded text-sm font-semibold hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload Map
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileUpload}
            className="hidden"
            disabled={isProcessing}
          />

          <button
            onClick={handleLoadDemoMap}
            disabled={isProcessing}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded text-sm font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Processing
              </>
            ) : (
              <>
                <File className="w-4 h-4" />
                Demo Map
              </>
            )}
          </button>

          {uploadedMap && (
            <>
              <div className="h-5 w-px bg-gray-300"></div>
              <div className="text-sm text-gray-700">
                <p className="font-semibold text-gray-900">{uploadedMap.fileName}</p>
                <p className="text-xs text-gray-500">{uploadedMap.fileSize}</p>
              </div>
            </>
          )}

          {isProcessing && (
            <>
              <div className="h-5 w-px bg-gray-300 ml-auto mr-4"></div>
              <div className="w-40">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-700">Processing</span>
                  <span className="text-xs font-semibold text-gray-700">{processingProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded h-1.5">
                  <div 
                    className="bg-green-700 h-1.5 rounded transition-all duration-300"
                    style={{ width: `${processingProgress}%` }}
                  ></div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Content Area - 3 Columns */}
      <div className="flex-1 overflow-hidden flex gap-4 px-6 py-4">
        {/* LEFT PANEL: Uploaded Map */}
        <div className="w-72 flex flex-col bg-white border border-gray-200 rounded text-sm flex-shrink-0">
          {/* Panel Header */}
          <div className="border-b border-gray-200 px-4 py-2.5 bg-gray-50">
            <h3 className="font-bold text-gray-900 text-sm">UPLOADED MAP</h3>
          </div>

          {uploadedMap ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Map Preview */}
              <div className="flex-1 m-3 bg-gray-100 rounded border border-gray-200 overflow-hidden flex items-center justify-center">
                <img
                  src={uploadedMap.dataUrl}
                  alt="Uploaded Map"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* File Info */}
              <div className="px-3 pb-3">
                <div className="bg-gray-50 border border-gray-200 rounded p-2.5 mb-3">
                  <p className="text-xs font-semibold text-gray-900">{uploadedMap.fileName}</p>
                  <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                    <Clock className="w-3 h-3" />
                    <span>{uploadedMap.uploadTime.toLocaleTimeString()}</span>
                  </div>
                </div>

                {/* Processing Checkmarks */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-700 flex-shrink-0" />
                    <span className="text-xs text-gray-700">Map image loaded</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-700 flex-shrink-0" />
                    <span className="text-xs text-gray-700">Boundaries extracted</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-700 flex-shrink-0" />
                    <span className="text-xs text-gray-700">Parcel numbers detected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-700 flex-shrink-0" />
                    <span className="text-xs text-gray-700">Geometry validated</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 text-center">
              <MapPin className="w-10 h-10 text-gray-300 mb-2" />
              <p className="text-xs text-gray-500 font-semibold mb-1">No Map Uploaded</p>
              <p className="text-xs text-gray-400">Upload scanned/hand-drawn map or load demo</p>
            </div>
          )}
        </div>

        {/* CENTER PANEL: Spatial Map - Only show if map uploaded */}
        {uploadedMap ? (
          <div className="flex-1 flex flex-col bg-white border border-gray-200 rounded overflow-hidden">
            {/* Map Controls */}
            <div className="border-b border-gray-200 px-4 py-2.5 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2 bg-white border border-gray-300 rounded p-1">
                {[
                  { id: 'satellite', label: 'Satellite' },
                  { id: 'cadastral', label: 'Cadastral' },
                  { id: 'comparison', label: 'Comparison' },
                  { id: 'conflict', label: 'Conflict' }
                ].map(view => (
                  <button
                    key={view.id}
                    onClick={() => setMapView(view.id)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                      mapView === view.id
                        ? view.id === 'conflict'
                          ? 'bg-red-600 text-white'
                          : 'bg-green-700 text-white'
                        : 'text-gray-700 hover:text-gray-900'
                    }`}
                  >
                    {view.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 bg-white border border-gray-300 rounded p-1">
                <button
                  onClick={() => setShowMap3D(false)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                    !showMap3D
                      ? 'bg-green-700 text-white'
                      : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  2D
                </button>
                <button
                  onClick={() => setShowMap3D(true)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                    showMap3D
                      ? 'bg-green-700 text-white'
                      : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  3D
                </button>
              </div>
            </div>

            {/* Map Display */}
            <div className="flex-1 overflow-hidden bg-gray-50">
              {showMap3D ? (
                <Government3DVisualization selectedCase={selectedCase} mapView={mapView} />
              ) : (
                <GovernmentCaseMap 
                  selectedCase={selectedCase} 
                  mapView={mapView}
                  isProcessing={isProcessing}
                />
              )}
            </div>

            {/* Map Legend */}
            <div className="border-t border-gray-200 bg-gray-50 px-4 py-2.5 text-xs">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-green-700"></div>
                  <span className="text-gray-700 font-semibold">Government Record</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-blue-500" style={{borderStyle: 'dashed'}}></div>
                  <span className="text-gray-700 font-semibold">Observed Boundary</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-red-600"></div>
                  <span className="text-gray-700 font-semibold">Conflict Area</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col bg-white border border-gray-200 rounded overflow-hidden">
            {/* Empty Map Placeholder */}
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50">
              <MapPin className="w-16 h-16 text-gray-200 mb-4" />
              <p className="text-sm font-semibold text-gray-500 mb-1">No Land Map Uploaded</p>
              <p className="text-xs text-gray-400 text-center max-w-xs">
                Upload a scanned, hand-drawn or cadastral map to begin spatial verification.
              </p>
            </div>
          </div>
        )}

        {/* RIGHT PANEL: Details & Analysis */}
        <div className="w-80 flex flex-col bg-white border border-gray-200 rounded overflow-y-auto flex-shrink-0">
          {/* Parcel Details */}
          <div className="border-b border-gray-200 px-4 py-2.5 bg-gray-50 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-sm">PARCEL DETAILS</h3>
            {selectedCase?.isCitizenCase && (
              <Badge className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5">
                CITIZEN CASE
              </Badge>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="px-4 py-3 space-y-3">
              {/* Parcel / Case ID */}
              <div className="border-b border-gray-100 pb-3">
                <p className="text-xs text-gray-600 font-semibold mb-1">{selectedCase?.isCitizenCase ? 'CASE ID (Citizen)' : 'Parcel ID'}</p>
                <p className="text-sm font-bold text-gray-900">{selectedCase?.isCitizenCase ? selectedCase?.caseId : selectedCase?.parcel_id}</p>
                {selectedCase?.isCitizenCase && selectedCase?.parcel_id && (
                  <p className="text-xs text-gray-500 mt-1">Parcel: {selectedCase.parcel_id}</p>
                )}
              </div>

              {/* Citizen Case Specific Fields */}
              {selectedCase?.isCitizenCase && selectedCase?.citizenCase && (
                <>
                  {/* Citizen Parcel Reference */}
                  <div className="border-b border-gray-100 pb-3">
                    <p className="text-xs text-gray-600 font-semibold mb-1">Referenced Parcel ID</p>
                    <p className="text-sm font-bold text-gray-900">{selectedCase.citizenCase.parcelId}</p>
                  </div>

                  {/* Citizen Reason / Evidence */}
                  <div className="border-b border-gray-100 pb-3">
                    <p className="text-xs text-gray-600 font-semibold mb-1">Citizen Report</p>
                    <p className="text-xs text-gray-700">{selectedCase.citizenCase.reason}</p>
                  </div>

                  {/* Confidence Score */}
                  <div className="border-b border-gray-100 pb-3">
                    <p className="text-xs text-gray-600 font-semibold mb-1">Spatial Verification Confidence</p>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-blue-700">{selectedCase.citizenCase.spatialConfidence}%</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        selectedCase.citizenCase.confidenceLevel === 'HIGH'
                          ? 'bg-red-100 text-red-700'
                          : selectedCase.citizenCase.confidenceLevel === 'MEDIUM'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {selectedCase.citizenCase.confidenceLevel}
                      </span>
                    </div>
                  </div>

                  {/* Affected Area */}
                  <div className="border-b border-gray-100 pb-3">
                    <p className="text-xs text-gray-600 font-semibold mb-1">Affected Area</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-lg font-bold text-red-600">{selectedCase.citizenCase.affectedAreaM2}</p>
                      <p className="text-xs text-gray-600">m²</p>
                    </div>
                  </div>

                  {/* Outside Percentage */}
                  <div className="border-b border-gray-100 pb-3">
                    <p className="text-xs text-gray-600 font-semibold mb-1">Outside Percentage</p>
                    <p className="text-sm font-bold text-red-600">{selectedCase.citizenCase.outsidePercentage.toFixed(2)}%</p>
                  </div>

                  {/* Confidence Factors */}
                  {selectedCase.citizenCase.confidenceFactors && selectedCase.citizenCase.confidenceFactors.length > 0 && (
                    <div className="border-b border-gray-100 pb-3">
                      <p className="text-xs text-gray-600 font-semibold mb-1.5">Confidence Factors</p>
                      <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs text-blue-800 space-y-0.5">
                        {selectedCase.citizenCase.confidenceFactors.map((factor, i) => (
                          <div key={i} className="flex items-start gap-1.5">
                            <span className="text-blue-600 font-bold mt-0.5">•</span>
                            <span>{factor}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Citizen Case Status */}
                  <div className="border-b border-gray-100 pb-3">
                    <p className="text-xs text-gray-600 font-semibold mb-1">Case Status</p>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                      selectedCase.citizenCase.status === 'FLAGGED'
                        ? 'bg-orange-100 text-orange-700'
                        : selectedCase.citizenCase.status === 'VERIFIED'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {selectedCase.citizenCase.status}
                    </span>
                  </div>

                  {/* Evidence Snapshot */}
                  {selectedCase.citizenCase.evidenceDataUrl && (
                    <div className="border-b border-gray-100 pb-3">
                      <p className="text-xs text-gray-600 font-semibold mb-1.5">Citizen Evidence Snapshot</p>
                      <div className="bg-gray-100 rounded border border-gray-300 overflow-hidden max-h-32">
                        <img
                          src={selectedCase.citizenCase.evidenceDataUrl}
                          alt="Evidence"
                          className="w-full h-32 object-cover"
                        />
                      </div>
                      {selectedCase.citizenCase.evidenceFileName && (
                        <p className="text-xs text-gray-600 mt-1 truncate">{selectedCase.citizenCase.evidenceFileName}</p>
                      )}
                    </div>
                  )}

                  {/* Government Notes */}
                  {selectedCase.citizenCase.governmentNotes && (
                    <div className="pb-3">
                      <p className="text-xs text-gray-600 font-semibold mb-1">Government Notes</p>
                      <p className="text-xs text-gray-700 bg-yellow-50 border border-yellow-200 rounded p-2">{selectedCase.citizenCase.governmentNotes}</p>
                    </div>
                  )}
                </>
              )}

              {/* Mock Government Case Fields */}
              {!selectedCase?.isCitizenCase && (
                <>
                  {/* Government Record */}
                  <div className="border-b border-gray-100 pb-3">
                    <p className="text-xs text-gray-600 font-semibold mb-1">Registered Area (Govt Record)</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-lg font-bold text-green-700">{selectedCase?.registered_area_m2}</p>
                      <p className="text-xs text-gray-600">m²</p>
                    </div>
                  </div>

                  {/* Observed Area */}
                  <div className="border-b border-gray-100 pb-3">
                    <p className="text-xs text-gray-600 font-semibold mb-1">Observed Area (Extracted)</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-lg font-bold text-blue-600">{selectedCase?.observed_area_m2}</p>
                      <p className="text-xs text-gray-600">m²</p>
                    </div>
                  </div>

                  {/* Variance */}
                  <div className="border-b border-gray-100 pb-3">
                    <p className="text-xs text-gray-600 font-semibold mb-1">Area Variance</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-lg font-bold text-gray-900">{selectedCase?.area_variance_percent}%</p>
                      <p className="text-xs text-gray-600">difference</p>
                    </div>
                  </div>

                  {/* Conflict Information */}
                  {selectedCase?.affected_area_m2 > 0 && (
                    <>
                      <div className="border-b border-gray-100 pb-3">
                        <p className="text-xs text-gray-600 font-semibold mb-1">Affected Area</p>
                        <div className="flex items-baseline gap-2">
                          <p className="text-lg font-bold text-red-600">{selectedCase?.affected_area_m2}</p>
                          <p className="text-xs text-gray-600">m²</p>
                        </div>
                      </div>

                      <div className="border-b border-gray-100 pb-3">
                        <p className="text-xs text-gray-600 font-semibold mb-1">Affected Side</p>
                        <p className="text-sm font-semibold text-gray-900">{selectedCase?.affected_side}</p>
                      </div>

                      <div className="border-b border-gray-100 pb-3">
                        <p className="text-xs text-gray-600 font-semibold mb-1">Conflict Type</p>
                        <p className="text-sm font-semibold text-red-600">{selectedCase?.conflict_type}</p>
                      </div>

                      <div className="border-b border-gray-100 pb-3">
                        <p className="text-xs text-gray-600 font-semibold mb-1">Priority</p>
                        <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                          selectedCase?.priority === 'HIGH'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {selectedCase?.priority}
                        </span>
                      </div>

                      <div className="pb-3">
                        <p className="text-xs text-gray-600 font-semibold mb-1">Status</p>
                        <span className="inline-block px-2 py-1 rounded text-xs font-bold bg-orange-100 text-orange-700">
                          {selectedCase?.status}
                        </span>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Conflict Alert Box */}
            {!selectedCase?.isCitizenCase && selectedCase?.affected_area_m2 > 0 && (
              <div className="mx-4 mb-4 p-3 bg-red-50 border border-red-300 rounded">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-700 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-red-800">
                    <p className="font-bold mb-1">Potential Spatial Inconsistency</p>
                    <p>Observed boundary extends beyond government record on {selectedCase.affected_side.toLowerCase()} side.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Citizen Case Conflict Alert */}
            {selectedCase?.isCitizenCase && selectedCase?.citizenCase?.affectedAreaM2 > 0 && (
              <div className="mx-4 mb-4 p-3 bg-red-50 border border-red-300 rounded">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-700 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-red-800">
                    <p className="font-bold mb-1">Potential Boundary Conflict</p>
                    <p>Citizen-flagged case with {selectedCase.citizenCase.affectedAreaM2}m² affected area. Manual verification recommended.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Government Action Buttons - Only for Citizen Cases */}
            {selectedCase?.isCitizenCase && selectedCase?.citizenCase && (
              <div className="mx-4 mb-4 space-y-2">
                <p className="text-xs font-bold text-gray-900 mb-2 uppercase">Government Actions</p>
                
                {selectedCase.citizenCase.status === 'FLAGGED' && (
                  <>
                    <button
                      onClick={() => handleCaseStatusUpdate('UNDER_REVIEW')}
                      className="w-full px-3 py-2 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 transition-colors"
                    >
                      <Check className="w-3 h-3 inline mr-1" />
                      Mark Under Review
                    </button>
                    <button
                      onClick={() => handleCaseStatusUpdate('FIELD_VERIFICATION_REQUIRED')}
                      className="w-full px-3 py-2 bg-orange-600 text-white rounded text-xs font-semibold hover:bg-orange-700 transition-colors"
                    >
                      Request Field Verification
                    </button>
                  </>
                )}

                {selectedCase.citizenCase.status === 'UNDER_REVIEW' && (
                  <>
                    <button
                      onClick={() => handleCaseStatusUpdate('FIELD_VERIFICATION_REQUIRED')}
                      className="w-full px-3 py-2 bg-orange-600 text-white rounded text-xs font-semibold hover:bg-orange-700 transition-colors"
                    >
                      Request Field Verification
                    </button>
                    <button
                      onClick={() => handleCaseStatusUpdate('VERIFIED')}
                      className="w-full px-3 py-2 bg-green-600 text-white rounded text-xs font-semibold hover:bg-green-700 transition-colors"
                    >
                      <Check className="w-3 h-3 inline mr-1" />
                      Mark Verified
                    </button>
                  </>
                )}

                {selectedCase.citizenCase.status === 'FIELD_VERIFICATION_REQUIRED' && (
                  <>
                    <button
                      onClick={() => handleCaseStatusUpdate('VERIFIED')}
                      className="w-full px-3 py-2 bg-green-600 text-white rounded text-xs font-semibold hover:bg-green-700 transition-colors"
                    >
                      <Check className="w-3 h-3 inline mr-1" />
                      Mark Verified
                    </button>
                  </>
                )}

                {(selectedCase.citizenCase.status === 'VERIFIED' || selectedCase.citizenCase.status === 'UNDER_REVIEW') && (
                  <button
                    onClick={() => handleCaseStatusUpdate('RESOLVED')}
                    className="w-full px-3 py-2 bg-purple-600 text-white rounded text-xs font-semibold hover:bg-purple-700 transition-colors"
                  >
                    <Check className="w-3 h-3 inline mr-1" />
                    Resolve Case
                  </button>
                )}
              </div>
            )}

            {/* AI Summary Button */}
            <div className="mx-4 mb-4">
              <button
                onClick={handleGenerateSummary}
                disabled={aiLoading || !selectedCase}
                className="w-full px-3 py-2 bg-green-700 text-white rounded text-sm font-semibold hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {aiLoading ? (
                  <>
                    <Loader className="w-3 h-3 inline mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  'Generate Technical Report'
                )}
              </button>
            </div>

            {/* AI Summary */}
            {aiSummary && (
              <div className="mx-4 mb-4 p-3 bg-blue-50 border border-blue-300 rounded">
                <h4 className="font-bold text-gray-900 text-sm mb-2">AI TECHNICAL ANALYSIS</h4>
                
                <div className="space-y-2 text-xs mb-3">
                  <div>
                    <p className="font-bold text-gray-700 mb-0.5">What happened?</p>
                    <p className="text-gray-700">{aiSummary.what_happened}</p>
                  </div>
                  <div>
                    <p className="font-bold text-gray-700 mb-0.5">Why flagged?</p>
                    <p className="text-gray-700">{aiSummary.why_flagged}</p>
                  </div>
                  <div>
                    <p className="font-bold text-gray-700 mb-0.5">Verification required?</p>
                    <p className="text-gray-700">{aiSummary.what_to_verify}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-blue-200">
                  <p className="text-xs text-gray-600">
                    <span className="font-bold">Note:</span> {aiSummary.disclaimer}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
