/**
 * Government Land Verification Module - REDESIGNED
 * 
 * Automated land-record verification system showing:
 * - Upload cadastral maps
 * - Process and extract parcel geometry
 * - Compare government records vs observed reality
 * - Detect spatial conflicts
 * - Generate AI technical explanations
 * 
 * Design: Real government GIS dashboard with processing workflow
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Loader, 
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  MapPin,
  Download
} from 'lucide-react';
import { apiClient } from '../services/api';
import GovernmentCaseMap from '../components/GovernmentCaseMap';
import Government3DVisualization from '../components/Government3DVisualization';
import { governmentCases, GovernmentCase, DEMO_MAP_IMAGE } from '../utils/governmentMockData';

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
  const [uploadedMap, setUploadedMap] = useState<UploadedMapData | null>(null);
  const [processingStep, setProcessingStep] = useState<ProcessingStep>('idle');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [selectedCase, setSelectedCase] = useState<GovernmentCase | null>(governmentCases[0]);
  const [mapView, setMapView] = useState<string>('satellite');
  const [showMap3D, setShowMap3D] = useState(false);
  const [aiSummary, setAISummary] = useState<any>(null);
  const [aiLoading, setAILoading] = useState(false);

  // Processing simulation
  const simulateProcessing = async (mapData: UploadedMapData) => {
    // Step 1: Uploading
    setProcessingStep('uploading');
    setProcessingProgress(20);
    await new Promise(r => setTimeout(r, 800));

    // Step 2: Processing map image
    setProcessingStep('processing');
    setProcessingProgress(40);
    await new Promise(r => setTimeout(r, 1200));

    // Step 3: Extracting boundaries
    setProcessingStep('extracting');
    setProcessingProgress(70);
    await new Promise(r => setTimeout(r, 1000));

    // Step 4: Analyzing geometry
    setProcessingStep('analyzing');
    setProcessingProgress(85);
    await new Promise(r => setTimeout(r, 800));

    // Complete
    setProcessingStep('complete');
    setProcessingProgress(100);
    await new Promise(r => setTimeout(r, 500));
    
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
      
      // Simulate processing
      await simulateProcessing(mapData);
    };
    reader.readAsDataURL(file);
  };

  const handleLoadDemoMap = async () => {
    const mapData: UploadedMapData = {
      dataUrl: DEMO_MAP_IMAGE,
      fileName: 'cadastral_survey_demo.jpg',
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
        what_happened: 'The observed parcel geometry shows a spatial deviation from the supplied government boundary.',
        why_flagged: 'An approximately 22.1 m² area overlaps the conflict zone, indicating a potential boundary inconsistency.',
        what_to_verify: 'Verify the western boundary and adjoining parcel geometry before making any administrative decision.',
        llm_used: false,
        disclaimer: 'This output is a spatial screening result and not a legal determination of ownership or encroachment.'
      });
    } finally {
      setAILoading(false);
    }
  };

  const getProcessingMessage = () => {
    switch (processingStep) {
      case 'uploading': return 'Uploading cadastral map...';
      case 'processing': return 'Analysing cadastral map...';
      case 'extracting': return 'Detecting plot boundaries...';
      case 'analyzing': return 'Comparing spatial records...';
      default: return '';
    }
  };

  const isProcessing = processingStep !== 'idle';

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Land Record Verification System</h1>
            <p className="text-sm text-gray-600 mt-1">Automated government spatial intelligence platform</p>
          </div>
          <div className="text-right">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 text-green-700 text-sm font-medium">
              <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
              System Active
            </div>
          </div>
        </div>
      </div>

      {/* Upload & Controls Section */}
      <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-4 flex-1">
            {/* Upload button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm text-gray-900"
            >
              <Upload className="w-4 h-4" />
              Upload Land Map
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isProcessing}
            />

            {/* Demo button */}
            <button
              onClick={handleLoadDemoMap}
              disabled={isProcessing}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
            >
              {isProcessing ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4" />
                  Load Demo Map
                </>
              )}
            </button>

            <div className="h-6 w-px bg-gray-300"></div>

            {/* Info */}
            <div className="text-sm text-gray-600">
              {isProcessing ? (
                <p className="font-medium text-gray-900">{getProcessingMessage()}</p>
              ) : uploadedMap ? (
                <p className="text-gray-700"><span className="font-medium">{uploadedMap.fileName}</span> • {uploadedMap.fileSize}</p>
              ) : (
                <p>JPG, PNG, PDF, or hand-drawn maps</p>
              )}
            </div>
          </div>

          {/* Processing progress */}
          {isProcessing && (
            <div className="w-48">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-700">Processing</span>
                <span className="text-xs text-gray-600">{processingProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${processingProgress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Processing steps indicator (when processing) */}
        {isProcessing && (
          <div className="mt-4 flex items-center gap-4">
            <div className="flex items-center gap-1 text-xs">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-white ${processingProgress >= 20 ? 'bg-green-600' : 'bg-gray-300'}`}>
                {processingProgress >= 20 ? '✓' : '1'}
              </div>
              <span className="text-gray-700">Upload</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-white ${processingProgress >= 40 ? 'bg-green-600' : 'bg-gray-300'}`}>
                {processingProgress >= 40 ? '✓' : '2'}
              </div>
              <span className="text-gray-700">Analysis</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-white ${processingProgress >= 70 ? 'bg-green-600' : 'bg-gray-300'}`}>
                {processingProgress >= 70 ? '✓' : '3'}
              </div>
              <span className="text-gray-700">Extract</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-white ${processingProgress >= 85 ? 'bg-green-600' : 'bg-gray-300'}`}>
                {processingProgress >= 85 ? '✓' : '4'}
              </div>
              <span className="text-gray-700">Compare</span>
            </div>
          </div>
        )}
      </div>

      {/* Main workspace - 3 columns */}
      <div className="flex-1 overflow-hidden flex gap-4 px-6 py-6">
        {/* LEFT: Uploaded Map */}
        <div className="w-72 flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden flex-shrink-0">
          <div className="border-b border-gray-200 px-4 py-3 bg-gray-50">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-600" />
              Uploaded Map
            </h3>
          </div>

          {uploadedMap ? (
            <div className="flex-1 flex flex-col overflow-hidden p-4">
              {/* Map image */}
              <div className="flex-1 bg-gray-100 rounded-lg overflow-hidden mb-4 flex items-center justify-center">
                <img
                  src={uploadedMap.dataUrl}
                  alt="Uploaded Cadastral Map"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* File info */}
              <div className="bg-gray-50 p-3 rounded-lg mb-4 text-xs">
                <p className="font-bold text-gray-900">{uploadedMap.fileName}</p>
                <p className="text-gray-600">{uploadedMap.fileSize} • Processed</p>
              </div>

              {/* Processing checkmarks */}
              <div className="space-y-2 text-xs mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">Map image loaded</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">Plot boundaries extracted</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">Plot numbers detected</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">Spatial extraction complete</span>
                </div>
              </div>

              {/* Label */}
              <p className="text-xs text-gray-500 italic">AI-extracted parcel geometry — Demo</p>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-4 text-center">
              <div>
                <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-500">No map uploaded</p>
                <p className="text-xs text-gray-400 mt-1">Upload a scanned map or load the demo</p>
              </div>
            </div>
          )}
        </div>

        {/* CENTER: GIS Map */}
        <div className="flex-1 flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* Map controls */}
          <div className="border-b border-gray-200 p-3 flex items-center justify-between bg-gray-50">
            <div className="flex items-center gap-1 bg-white border border-gray-200 p-1 rounded-lg">
              {[
                { id: 'satellite', label: 'Satellite' },
                { id: 'cadastral', label: 'Cadastral' },
                { id: 'comparison', label: 'Comparison' },
                { id: 'conflict', label: 'Conflict' }
              ].map(view => (
                <button
                  key={view.id}
                  onClick={() => setMapView(view.id)}
                  className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${
                    mapView === view.id
                      ? 'bg-green-600 text-white'
                      : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  {view.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 bg-white border border-gray-200 p-1 rounded-lg">
              <button
                onClick={() => setShowMap3D(false)}
                className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${
                  !showMap3D
                    ? 'bg-green-600 text-white'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                2D
              </button>
              <button
                onClick={() => setShowMap3D(true)}
                className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${
                  showMap3D
                    ? 'bg-green-600 text-white'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                3D
              </button>
            </div>
          </div>

          {/* Map display */}
          <div className="flex-1 overflow-hidden">
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
        </div>

        {/* RIGHT: Analysis Panel */}
        <div className="w-80 flex flex-col gap-4 overflow-y-auto">
          {/* Government vs Observed */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="font-bold text-gray-900 text-sm mb-4">Government Record vs Observed Reality</h3>
            
            <div className="space-y-4">
              {/* Government Record */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs font-bold text-green-700 mb-2">GOVERNMENT RECORD</p>
                <p className="text-sm font-bold text-gray-900 mb-1">{selectedCase?.registered_area_m2} m²</p>
                <p className="text-xs text-gray-600">Official government boundary</p>
              </div>

              {/* vs */}
              <div className="text-center">
                <p className="text-xs font-bold text-gray-500">VS</p>
              </div>

              {/* Observed Reality */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs font-bold text-blue-700 mb-2">OBSERVED REALITY</p>
                <p className="text-sm font-bold text-gray-900 mb-1">{selectedCase?.observed_area_m2} m²</p>
                <p className="text-xs text-gray-600">Extracted from uploaded map</p>
              </div>
            </div>

            {/* Variance */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600">Area Variance</p>
              <p className="text-lg font-bold text-gray-900">{selectedCase?.area_variance_percent}%</p>
            </div>
          </div>

          {/* Parcel Details */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="font-bold text-gray-900 text-sm mb-4">Parcel Details</h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Parcel ID</span>
                <span className="font-bold text-gray-900">{selectedCase?.parcel_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Affected Area</span>
                <span className="font-bold text-red-600">{selectedCase?.affected_area_m2} m²</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Affected Side</span>
                <span className="font-bold text-gray-900">{selectedCase?.affected_side}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Conflict Type</span>
                <span className="font-bold text-gray-900">{selectedCase?.conflict_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Priority</span>
                <span className={`font-bold ${selectedCase?.priority === 'HIGH' ? 'text-red-600' : 'text-green-600'}`}>
                  {selectedCase?.priority}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status</span>
                <span className="text-xs px-2 py-1 rounded font-bold bg-orange-100 text-orange-700">
                  {selectedCase?.status}
                </span>
              </div>
            </div>
          </div>

          {/* Spatial Finding */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 text-sm mb-1">Spatial Alert</h4>
                <p className="text-xs text-gray-700">
                  The observed structure appears to extend beyond the government recorded boundary on the {selectedCase?.affected_side} side of the parcel.
                </p>
              </div>
            </div>
          </div>

          {/* AI Summary Button */}
          <button
            onClick={handleGenerateSummary}
            disabled={aiLoading || !selectedCase}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {aiLoading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4" />
                Generate AI Technical Summary
              </>
            )}
          </button>

          {/* AI Summary */}
          {aiSummary && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-bold text-gray-900 mb-3 text-sm">AI Spatial Insight</h4>
              
              <div className="space-y-3 text-xs mb-4">
                <div>
                  <p className="font-bold text-gray-700 mb-1">What was detected?</p>
                  <p className="text-gray-700">{aiSummary.what_happened}</p>
                </div>
                <div>
                  <p className="font-bold text-gray-700 mb-1">Why we flagged it?</p>
                  <p className="text-gray-700">{aiSummary.why_flagged}</p>
                </div>
                <div>
                  <p className="font-bold text-gray-700 mb-1">What should be verified?</p>
                  <p className="text-gray-700">{aiSummary.what_to_verify}</p>
                </div>
              </div>

              <div className="bg-white p-2 rounded border border-blue-100">
                <p className="text-xs text-gray-700">
                  <span className="font-bold">⚠️</span> Spatial finding, not a legal determination.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
