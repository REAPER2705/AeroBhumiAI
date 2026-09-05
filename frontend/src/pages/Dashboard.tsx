import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { apiClient } from '../services/api';

export default function Dashboard({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const [totalParcels, setTotalParcels] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await apiClient.listParcels();
        // Fallback to length if it's an array
        setTotalParcels(Array.isArray(res.data) ? res.data.length : (res.data?.parcels?.length || 0));
      } catch (err) {
        console.error("Failed to load parcels", err);
        setError("Backend disconnected");
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Land & Construction Pre-Validation</p>
        </div>
        <button 
          onClick={() => setActiveTab('New Audit')}
          className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-green-700"
        >
          <Plus className="w-4 h-4" /> Start New Audit
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-500 font-medium">Total Parcels</p>
          <p className="text-3xl font-bold mt-2 text-gray-900">
            {totalParcels !== null ? totalParcels : '-'}
          </p>
          <p className="text-xs text-gray-400 mt-1">Available Demo Parcels</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-bold mb-4">Quick Start</h2>
        <div className="flex flex-col gap-6 relative">
          <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gray-100"></div>
          {[
            { step: 1, title: 'Select Parcel', desc: 'Choose a parcel to audit' },
            { step: 2, title: 'Upload Drone/GeoTIFF', desc: 'Optional: Upload imagery for analysis' },
            { step: 3, title: 'Run Audit', desc: 'Get AI-powered spatial pre-validation' }
          ].map((s, i) => (
            <div key={i} className="flex gap-4 relative z-10 cursor-pointer group" onClick={() => setActiveTab('New Audit')}>
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
  );
}
