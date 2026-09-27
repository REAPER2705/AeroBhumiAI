import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { apiClient } from '../services/api';

export default function Dashboard({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const [totalParcels, setTotalParcels] = useState<number>(24);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await apiClient.listParcels();
        const len = Array.isArray(res.data) ? res.data.length : 0;
        if (len > 0) setTotalParcels(len);
      } catch (err) {
        console.error("Failed to load parcels", err);
      }
    };
    fetchStats();
  }, []);

  const recentAudits = [
    { id: 'AUD-2025-019', location: 'Plot 12, Sector 7', date: '24 May 2025', status: 'Encroachment', statusBg: 'bg-[#ff3333] bg-opacity-20 text-[#ff3333] border-status-error border-opacity-30' },
    { id: 'AUD-2025-018', location: 'Plot 45, Sector 12', date: '24 May 2025', status: 'Clear', statusBg: 'bg-[#00ff66] bg-opacity-20 text-[#00ff66] border-status-success border-opacity-30' },
    { id: 'AUD-2025-017', location: 'Plot 21, Sector 3', date: '23 May 2025', status: 'Variance', statusBg: 'bg-[#ffcc00] bg-opacity-20 text-[#ffcc00] border-status-warning border-opacity-30' },
    { id: 'AUD-2025-016', location: 'Plot 9, Sector 15', date: '23 May 2025', status: 'Clear', statusBg: 'bg-[#00ff66] bg-opacity-20 text-[#00ff66] border-status-success border-opacity-30' }
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Dashboard</h1>
          <p className="text-gray-400 mt-1 text-sm">Welcome back! Here's an overview of your land compliance audits.</p>
        </div>
        <button 
          onClick={() => setActiveTab('Drone Upload')}
          className="bg-[#0066ff] text-white px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-[#0066ff] hover:brightness-110 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" /> + New Audit
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-[#ff3333] bg-opacity-20 text-[#ff3333] border border-status-error border-opacity-30 rounded-lg">
          {error}
        </div>
      )}

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-[#1a1a1a] p-5 rounded-xl border border-[#2a2a2a] shadow-sm">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Parcels</p>
          <p className="text-3xl font-bold mt-2 text-[#00d4ff]">{totalParcels}</p>
          <p className="text-xs text-gray-500 mt-1">Registered</p>
        </div>
        <div className="bg-[#1a1a1a] p-5 rounded-xl border border-[#2a2a2a] shadow-sm">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Audits Completed</p>
          <p className="text-3xl font-bold mt-2 text-[#00ff66]">18</p>
          <p className="text-xs text-gray-500 mt-1">This Month</p>
        </div>
        <div className="bg-[#1a1a1a] p-5 rounded-xl border border-[#2a2a2a] shadow-sm">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Encroachments</p>
          <p className="text-3xl font-bold mt-2 text-[#ff3333]">7</p>
          <p className="text-xs text-gray-500 mt-1">Detected</p>
        </div>
        <div className="bg-[#1a1a1a] p-5 rounded-xl border border-[#2a2a2a] shadow-sm">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Reports Generated</p>
          <p className="text-3xl font-bold mt-2 text-[#00d4ff]">12</p>
          <p className="text-xs text-gray-500 mt-1">This Month</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Recent Audits Card (Left 2 cols) */}
        <div className="col-span-2 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] shadow-sm p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-100 mb-4">Recent Audits</h2>
            <div className="divide-y divide-dark-tertiary">
              {recentAudits.map((item, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-[#00d4ff]">{item.id}</p>
                    <p className="text-xs text-gray-400">{item.location}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-500">{item.date}</span>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${item.statusBg}`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button 
            onClick={() => setActiveTab('Reports')}
            className="mt-4 w-full text-center py-2 text-xs font-bold text-[#00d4ff] bg-[#2a2a2a] hover:bg-[#2a2a2a] hover:brightness-125 rounded-lg border border-[#2a2a2a] transition-all"
          >
            View All
          </button>
        </div>

        {/* Quick Start Card (Right 1 col) */}
        <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-100 mb-6">Quick Start</h2>
          <div className="flex flex-col gap-6 relative">
            <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-[#2a2a2a]"></div>
            {[
              { step: 1, title: 'Select Parcel', desc: 'Choose a parcel to audit', tab: 'Parcels' },
              { step: 2, title: 'Upload Drone/GeoTIFF', desc: 'Upload imagery for analysis', tab: 'Drone Upload' },
              { step: 3, title: 'Run Audit', desc: 'Get AI-powered audit report', tab: 'Audit Map' }
            ].map((s, i) => (
              <div key={i} className="flex gap-4 relative z-10 cursor-pointer group" onClick={() => setActiveTab(s.tab)}>
                <div className="w-7 h-7 rounded-full bg-[#0f0f0f] border-2 border-[#2a2a2a] flex items-center justify-center text-xs font-bold group-hover:border-accent-cyan group-hover:text-[#00d4ff] transition-colors">
                  {s.step}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-100 group-hover:text-[#00d4ff] transition-colors">{s.title}</h3>
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
