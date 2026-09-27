/**
 * Citizen Case Tracking Page
 * 
 * Allows citizens to track the status of their flagged land compliance cases
 * by entering their Case ID.
 */

import React, { useState } from 'react';
import { Search, CheckCircle2, Clock, AlertCircle, MapPin } from 'lucide-react';
import * as caseService from '../services/caseService';

export default function CaseTracking() {
  const [caseIdInput, setCaseIdInput] = useState('');
  const [foundCase, setFoundCase] = useState<any>(null);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = () => {
    setError(null);
    setFoundCase(null);
    setSearched(true);

    if (!caseIdInput.trim()) {
      setError('Please enter a valid Case ID');
      return;
    }

    const result = caseService.getCaseById(caseIdInput.trim());
    if (result) {
      setFoundCase(result);
    } else {
      setError(`No case found with ID: ${caseIdInput.trim()}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'FLAGGED':
        return 'bg-orange-100 text-orange-700';
      case 'UNDER_REVIEW':
        return 'bg-blue-100 text-blue-700';
      case 'FIELD_VERIFICATION_REQUIRED':
        return 'bg-yellow-100 text-yellow-700';
      case 'VERIFIED':
        return 'bg-green-100 text-green-700';
      case 'RESOLVED':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'FLAGGED':
        return 'Your case has been flagged and is waiting for government review.';
      case 'UNDER_REVIEW':
        return 'Your case is currently under review by government officers.';
      case 'FIELD_VERIFICATION_REQUIRED':
        return 'Field verification has been requested. Officers will visit the site.';
      case 'VERIFIED':
        return 'Your case has been verified by government officers.';
      case 'RESOLVED':
        return 'Your case has been resolved.';
      default:
        return 'Status unknown.';
    }
  };

  const getNextStep = (status: string) => {
    switch (status) {
      case 'FLAGGED':
        return 'Waiting for government officer to review your case.';
      case 'UNDER_REVIEW':
        return 'Case is being analyzed. Field verification may be requested.';
      case 'FIELD_VERIFICATION_REQUIRED':
        return 'Government will conduct field verification and boundary verification.';
      case 'VERIFIED':
        return 'Case verification is complete. Awaiting final resolution.';
      case 'RESOLVED':
        return 'Case is closed. No further action required.';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Track Your Case</h1>
          <p className="text-gray-400">Enter your Case ID to view the current status of your land verification case</p>
        </div>

        {/* Search Section */}
        <div className="bg-[#1a1a1a] rounded-xl shadow-lg p-6 mb-8 border border-[#2a2a2a]">
          <label className="block text-sm font-semibold text-white mb-3">Case ID</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={caseIdInput}
              onChange={(e) => setCaseIdInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter your Case ID (e.g., CASE-1234567890-123)"
              className="flex-1 px-4 py-3 border border-[#2a2a2a] rounded-lg focus:outline-none focus:border-[#0066ff] focus:ring-1 focus:ring-[#0066ff] text-white bg-[#0f0f0f] placeholder-gray-500"
            />
            <button
              onClick={handleSearch}
              className="px-6 py-3 bg-[#0066ff] text-white rounded-lg font-semibold hover:brightness-110 transition-all flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Search
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-[#ff3333] bg-opacity-20 border border-[#ff3333] text-[#ff3333] px-4 py-4 rounded-lg mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Case Not Found</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Case Details */}
        {foundCase && (
          <div className="space-y-6">
            {/* Case Summary Card */}
            <div className="bg-[#1a1a1a] rounded-xl shadow-lg p-6 border border-[#2a2a2a]">
              <div className="grid grid-cols-2 gap-6 mb-6">
                {/* Case ID */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Case ID</p>
                  <p className="text-lg font-bold text-white font-mono">{foundCase.caseId}</p>
                </div>

                {/* Parcel ID */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Parcel / Property ID</p>
                  <p className="text-lg font-bold text-white">{foundCase.parcelId}</p>
                </div>

                {/* Created Date */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Flagged On</p>
                  <p className="text-sm text-gray-200">{new Date(foundCase.createdAt).toLocaleDateString()}</p>
                </div>

                {/* Last Updated */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Last Updated</p>
                  <p className="text-sm text-gray-200">{new Date(foundCase.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* Status Timeline Card */}
            <div className="bg-[#1a1a1a] rounded-xl shadow-lg p-6 border border-[#2a2a2a]">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#0066ff]" />
                Current Status
              </h2>

              <div className="mb-6">
                <div className={`inline-block px-4 py-2 rounded-lg font-bold text-sm ${getStatusColor(foundCase.status)}`}>
                  {foundCase.status.replace(/_/g, ' ')}
                </div>
              </div>

              <div className="bg-[#0066ff] bg-opacity-20 border border-[#0066ff] rounded-lg p-4 mb-4">
                <p className="text-sm text-[#00d4ff]">{getStatusMessage(foundCase.status)}</p>
              </div>

              <div className="bg-[#2a2a2a] border border-[#2a2a2a] rounded-lg p-4">
                <p className="text-xs font-semibold text-gray-300 mb-1">Next Step</p>
                <p className="text-sm text-gray-200">{getNextStep(foundCase.status)}</p>
              </div>
            </div>

            {/* Conflict Details Card */}
            <div className="bg-[#1a1a1a] rounded-xl shadow-lg p-6 border border-[#2a2a2a]">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-[#ff3333]" />
                Conflict Details
              </h2>

              <div className="grid grid-cols-2 gap-6">
                {/* Conflict Result */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Issue Type</p>
                  <p className="text-sm font-bold text-white">{foundCase.conflictResult}</p>
                </div>

                {/* Affected Area */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Affected Area</p>
                  <p className="text-sm font-bold text-[#ff3333]">{foundCase.affectedAreaM2} m²</p>
                </div>

                {/* Outside Percentage */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Outside Percentage</p>
                  <p className="text-sm font-bold text-[#ff3333]">{foundCase.outsidePercentage.toFixed(2)}%</p>
                </div>

                {/* Confidence */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Verification Confidence</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-[#0066ff]">{foundCase.spatialConfidence}%</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      foundCase.confidenceLevel === 'HIGH'
                        ? 'bg-[#ff3333] bg-opacity-20 text-[#ff3333]'
                        : foundCase.confidenceLevel === 'MEDIUM'
                        ? 'bg-[#ffcc00] bg-opacity-20 text-[#ffcc00]'
                        : 'bg-[#00ff66] bg-opacity-20 text-[#00ff66]'
                    }`}>
                      {foundCase.confidenceLevel}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Reason & Evidence */}
            <div className="bg-[#1a1a1a] rounded-xl shadow-lg p-6 border border-[#2a2a2a]">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-gray-400" />
                Your Report
              </h2>

              {/* Reason */}
              <div className="mb-6">
                <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Report / Reason</p>
                <p className="text-sm text-gray-200 bg-[#2a2a2a] border border-[#2a2a2a] rounded-lg p-3">{foundCase.reason}</p>
              </div>

              {/* Evidence Snapshot */}
              {foundCase.evidenceDataUrl && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Evidence Snapshot</p>
                  <div className="bg-[#2a2a2a] border border-[#2a2a2a] rounded-lg overflow-hidden">
                    <img
                      src={foundCase.evidenceDataUrl}
                      alt="Evidence Snapshot"
                      className="w-full max-h-64 object-cover"
                    />
                  </div>
                  {foundCase.evidenceFileName && (
                    <p className="text-xs text-gray-400 mt-2">File: {foundCase.evidenceFileName}</p>
                  )}
                </div>
              )}
            </div>

            {/* Government Notes */}
            {foundCase.governmentNotes && (
              <div className="bg-[#1a1a1a] rounded-xl shadow-lg p-6 border border-[#2a2a2a]">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#00ff66]" />
                  Government Officer Notes
                </h2>
                <p className="text-sm text-gray-200 bg-[#2a2a2a] border border-[#2a2a2a] rounded-lg p-3">
                  {foundCase.governmentNotes}
                </p>
              </div>
            )}

            {/* Confidence Factors */}
            {foundCase.confidenceFactors && foundCase.confidenceFactors.length > 0 && (
              <div className="bg-[#1a1a1a] rounded-xl shadow-lg p-6 border border-[#2a2a2a]">
                <h2 className="text-lg font-bold text-white mb-4">Confidence Factors</h2>
                <div className="bg-[#0066ff] bg-opacity-20 border border-[#0066ff] rounded-lg p-4 space-y-2">
                  {foundCase.confidenceFactors.map((factor: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-[#00d4ff]">
                      <span className="text-[#0066ff] font-bold mt-0.5">•</span>
                      <span>{factor}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!searched && !foundCase && (
          <div className="bg-[#1a1a1a] rounded-xl shadow-lg p-12 text-center border border-[#2a2a2a]">
            <Search className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">Enter your Case ID above to view case details and status updates</p>
          </div>
        )}
      </div>
    </div>
  );
}
