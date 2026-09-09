/**
 * Government Land Verification Module
 * 
 * Professional government GIS interface for land record verification
 * - Upload scanned land maps
 * - Compare government records vs observed reality
 * - 2D/3D spatial visualization
 * - AI technical summaries with guardrails
 * 
 * IMPORTANT: This module is completely isolated from the citizen workflow
 */

import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Loader, 
  Bell, 
  User, 
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Map,
  Layers,
  Grid3X3
} from 'lucide-react';
import { apiClient } from '../services/api';
import GovernmentCaseMap from '../components/GovernmentCaseMap';
import Government3DVisualization from '../components/Government3DVisualization';
import { governmentCases, GovernmentCase, DEMO_MAP_IMAGE } from '../utils/governmentMockData';
interface MapView {
  id: string;
  label: string;
  icon: 'satellite' | 'cadastral' | 'comparison' | 'conflict';
}

const mapViews: MapView[] = [
  { id: 'satellite', label: 'Satellite', icon: 'satellite' },
  { id: 'cadastral', label: 'Cadastral', icon: 'cadastral' },
  { id: 'comparison', label: 'Comparison', icon: 'comparison' },
  { id: 'conflict', label: 'Conflict', icon: 'conflict' }
];

export default function GovernmentVerification() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCase, setSelectedCase] = useState<GovernmentCase | null>(governmentCases[0]);
  const [uploadedMap, setUploadedMap] = useState<{ dataUrl: string; fileName: string; fileSize: string } | null>(null);
  const [mapView, setMapView] = useState<string>('comparison');
  const [showMap3D, setShowMap3D] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiSummary, setAISummary] = useState<any>(null);

  const handleLoadDemoMap = () => {
    setUploadedMap({
      dataUrl: DEMO_MAP_IMAGE,
      fileName: 'land_survey_map.jpg',
      fileSize: '2.4 MB'
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setUploadedMap({
          dataUrl,
          fileName: file.name,
          fileSize: `${(file.size / 1024 / 1024).toFixed(1)} MB`
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateSummary = async () => {
    if (!selectedCase) return;
    
    setLoading(true);
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
        what_happened: 'Unable to generate AI summary at this time.',
        why_flagged: 'Please check your connection and try again.',
        what_to_verify: 'Refer to the spatial visualization for manual analysis.',
        llm_used: false,
        disclaimer: 'Unable to generate AI analysis at this time.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">Government Land Verification</h1>
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">Live</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">Spatial Intelligence for Record – Reality Verification</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <Bell className="w-5 h-5 text-gray-600" />
            </button>
            <button className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <User className="w-4 h-4 text-green-700" />
              </div>
              <div className="text-left text-sm">
                <p className="font-bold text-gray-900">Govt. Official</p>
                <p className="text-xs text-gray-600">Land Records Dept.</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Top Action Bar */}
      <div className="border-b border-gray-200 px-6 py-4 bg-gray-50">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm text-gray-900"
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
            />
            <p className="text-xs text-gray-600">Image / PDF / Hand-drawn Map</p>
            <div className="w-px h-6 bg-gray-300"></div>
            <button
              onClick={handleLoadDemoMap}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm"
            >
              <Grid3X3 className="w-4 h-4" />
              Load Demo Map
            </button>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <div className="text-center">
              <p className="text-xs text-gray-600 font-bold">Total Parcels</p>
              <p className="text-2xl font-bold text-gray-900">24</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-600 font-bold">Flagged Cases</p>
              <p className="text-2xl font-bold text-orange-600">7</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-600 font-bold">High Priority</p>
              <p className="text-2xl font-bold text-red-600">3</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 overflow-hidden flex gap-6 px-6 py-6">
        {/* LEFT: Uploaded Map Panel */}
        <div className="w-80 flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex-1 overflow-y-auto flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Uploaded Map</h3>
                {uploadedMap && (
                  <span className="flex items-center gap-1 text-xs font-bold text-green-600">
                    <CheckCircle2 className="w-3 h-3" /> Map Processed
                  </span>
                )}
              </div>
            </div>

            {uploadedMap ? (
              <div className="flex-1 flex flex-col overflow-hidden p-4">
                <div className="flex-1 bg-gray-100 rounded-lg overflow-hidden mb-4 flex items-center justify-center">
                  <img
                    src={uploadedMap.dataUrl}
                    alt="Uploaded Map"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="bg-gray-50 p-3 rounded-lg mb-4">
                  <p className="text-xs font-bold text-gray-900">{uploadedMap.fileName}</p>
                  <p className="text-xs text-gray-600">{uploadedMap.fileSize} • Processed</p>
                </div>
                <div className="space-y-2 mb-4 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="text-gray-700">Plot boundaries (extracted)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="text-gray-700">Plot numbers (OCR)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="text-gray-700">Map alignment (approx)</span>
                  </div>
                </div>
                <button className="w-full px-3 py-2 text-sm font-bold text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50">
                  View Original
                </button>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-4 text-center">
                <div>
                  <Map className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">No map uploaded yet</p>
                  <p className="text-xs text-gray-400 mt-1">Upload a scanned map or load the demo</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CENTER: GIS Map */}
        <div className="flex-1 flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* Map View Controls */}
          <div className="border-b border-gray-200 p-4 flex items-center gap-2">
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
              {mapViews.map((view) => (
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
            <div className="flex-1"></div>
            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setShowMap3D(false)}
                className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${
                  !showMap3D
                    ? 'bg-white text-green-600 border border-green-300'
                    : 'text-gray-600'
                }`}
              >
                2D
              </button>
              <button
                onClick={() => setShowMap3D(true)}
                className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${
                  showMap3D
                    ? 'bg-white text-green-600 border border-green-300'
                    : 'text-gray-600'
                }`}
              >
                3D
              </button>
            </div>
          </div>

          {/* Map Content */}
          <div className="flex-1 overflow-hidden">
            {showMap3D ? (
              <Government3DVisualization selectedCase={selectedCase} mapView={mapView} />
            ) : (
              <GovernmentCaseMap selectedCase={selectedCase} mapView={mapView} />
            )}
          </div>

          {/* Map Thumbnails */}
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <div className="flex items-center gap-3">
              {mapViews.map((view) => (
                <button
                  key={view.id}
                  onClick={() => {
                    setMapView(view.id);
                    setShowMap3D(false);
                  }}
                  className={`flex-1 h-16 rounded-lg border-2 transition-all ${
                    mapView === view.id
                      ? 'border-green-600 shadow-md'
                      : 'border-gray-200 hover:border-green-300'
                  } bg-white flex items-center justify-center text-xs font-bold text-gray-700`}
                >
                  {view.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Parcel Details & Analysis */}
        <div className="w-96 flex flex-col gap-4 overflow-y-auto">
          {/* Selected Parcel Details */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="font-bold text-gray-900 mb-4">Selected Parcel Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Parcel ID</span>
                <span className="font-bold text-gray-900">{selectedCase?.parcel_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Registered Area (Govt.)</span>
                <span className="font-bold text-gray-900">{selectedCase?.registered_area_m2} m²</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Observed Area (From Map)</span>
                <span className="font-bold text-gray-900">{selectedCase?.observed_area_m2} m²</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Area Variance</span>
                <span className="font-bold text-gray-900">{selectedCase?.area_variance_percent}%</span>
              </div>
              <hr className="my-2" />
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
                <span className={`text-xs px-2 py-1 rounded font-bold ${
                  selectedCase?.status === 'NO_ACTION'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  {selectedCase?.status}
                </span>
              </div>
            </div>
          </div>

          {/* Spatial Finding */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-gray-900">Potential Spatial Inconsistency</h4>
                <p className="text-sm text-gray-700 mt-2">
                  {selectedCase?.conflict_type === 'CLEAR'
                    ? 'No spatial conflicts detected. Parcel boundary matches government records.'
                    : `The observed structure appears to extend beyond the government recorded boundary on the ${selectedCase?.affected_side} side of the parcel.`}
                </p>
              </div>
            </div>
          </div>

          {/* Generate AI Summary Button */}
          <button
            onClick={handleGenerateSummary}
            disabled={loading || !selectedCase}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : '➕'}
            Generate AI Technical Summary
          </button>

          {/* AI Technical Summary */}
          {aiSummary && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-gray-900">AI Technical Summary</h4>
                <span className="text-xs font-bold text-blue-600">
                  {aiSummary.llm_used ? 'AI Generated' : 'Template'}
                </span>
              </div>

              <div className="space-y-3 mb-4">
                <div className="bg-white p-3 rounded-lg border border-blue-100">
                  <p className="text-xs font-bold text-gray-600 mb-1">What happened?</p>
                  <p className="text-sm text-gray-800">{aiSummary.what_happened}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-blue-100">
                  <p className="text-xs font-bold text-gray-600 mb-1">Why was it flagged?</p>
                  <p className="text-sm text-gray-800">{aiSummary.why_flagged}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-blue-100">
                  <p className="text-xs font-bold text-gray-600 mb-1">What should be verified?</p>
                  <p className="text-sm text-gray-800">{aiSummary.what_to_verify}</p>
                </div>
              </div>

              <div className="bg-white p-2 rounded border border-blue-100">
                <p className="text-xs text-gray-700">
                  <span className="font-bold">ℹ️</span> Spatial finding — Not a legal determination.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="border-t border-gray-200 px-6 py-3 bg-gray-50 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
            <User className="w-3 h-3 text-green-700" />
          </div>
          <div>
            <p className="font-bold text-gray-900">Govt. Official</p>
            <p className="text-xs text-gray-600">Land Records Department</p>
          </div>
        </div>
      </div>
    </div>
  );
}
