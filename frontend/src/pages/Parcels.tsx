import React, { useState, useEffect } from 'react';
import { Plus, Eye, Search } from 'lucide-react';
import { apiClient } from '../services/api';

export default function Parcels({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const [parcels, setParcels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const defaultParcels = [
    { parcel_id: 'PLOT-45', plot_sector: 'Plot 45, Sector 12', location: 'Nagpur, Maharashtra', area: 500.00 },
    { parcel_id: 'PLOT-12', plot_sector: 'Plot 12, Sector 7', location: 'Nagpur, Maharashtra', area: 450.00 },
    { parcel_id: 'PLOT-21', plot_sector: 'Plot 21, Sector 3', location: 'Nagpur, Maharashtra', area: 600.00 },
    { parcel_id: 'PLOT-09', plot_sector: 'Plot 9, Sector 15', location: 'Nagpur, Maharashtra', area: 550.00 },
    { parcel_id: 'PLOT-33', plot_sector: 'Plot 33, Sector 8', location: 'Nagpur, Maharashtra', area: 520.00 }
  ];

  useEffect(() => {
    const fetchParcels = async () => {
      try {
        const res = await apiClient.listParcels();
        const data = Array.isArray(res.data) ? res.data : [];
        if (data.length > 0) {
          setParcels(data.map((p: any) => ({
            parcel_id: p.parcel_id || 'PLOT-45',
            plot_sector: `${p.parcel_id || 'Plot'}, Sector 12`,
            location: 'Nagpur, Maharashtra',
            area: p.area || 500.00
          })));
        } else {
          setParcels(defaultParcels);
        }
      } catch (err) {
        setParcels(defaultParcels);
      } finally {
        setLoading(false);
      }
    };
    fetchParcels();
  }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto text-zinc-100">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Parcels</h1>
          <p className="text-zinc-400 mt-1 text-sm">Manage and view all registered parcels.</p>
        </div>
        <button 
          onClick={() => setActiveTab('Drone Upload')}
          className="bg-zinc-800 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-zinc-700 border border-zinc-700 shadow-sm"
        >
          <Plus className="w-4 h-4" /> + Add Parcel
        </button>
      </div>

      <div className="bg-[#18191c] rounded-xl border border-zinc-800/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-800/80 flex justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
            <input type="text" placeholder="Search parcels..." className="w-full pl-9 pr-4 py-2 bg-[#121316] border border-zinc-700/80 rounded-lg text-sm text-white placeholder-zinc-500 focus:ring-1 focus:ring-zinc-500" />
          </div>
          <select className="border border-zinc-700/80 rounded-lg px-4 py-2 text-sm text-zinc-200 bg-[#121316] font-medium">
            <option>All Sectors</option>
            <option>Sector 12</option>
            <option>Sector 7</option>
            <option>Sector 3</option>
          </select>
        </div>

        {loading ? (
          <div className="p-8 text-center text-zinc-400">Loading parcels...</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-[#121316] text-zinc-300 border-b border-zinc-800/80">
              <tr>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Parcel ID</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Plot / Sector</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Location</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Area (sq.m.)</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {parcels.map((p, i) => (
                <tr key={i} className="hover:bg-zinc-800/40">
                  <td className="px-6 py-4 font-bold text-zinc-100">{p.parcel_id}</td>
                  <td className="px-6 py-4 text-zinc-300 font-medium">{p.plot_sector}</td>
                  <td className="px-6 py-4 text-zinc-400">{p.location}</td>
                  <td className="px-6 py-4 text-white font-bold">{p.area}.00</td>
                  <td className="px-6 py-4 flex justify-center">
                    <button 
                      onClick={() => setActiveTab('Drone Upload')}
                      className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                      title="Start Audit / View Parcel"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="p-4 border-t border-zinc-800/80 flex justify-between items-center text-xs text-zinc-400">
          <span>Showing 1 to 5 of 24 parcels</span>
          <div className="flex gap-1">
            <button className="w-7 h-7 flex items-center justify-center rounded border border-zinc-700/80 hover:bg-zinc-800">&lt;</button>
            <button className="w-7 h-7 flex items-center justify-center rounded bg-zinc-800 text-white font-bold border border-zinc-700">1</button>
            <button className="w-7 h-7 flex items-center justify-center rounded border border-zinc-700/80 hover:bg-zinc-800">2</button>
            <button className="w-7 h-7 flex items-center justify-center rounded border border-zinc-700/80 hover:bg-zinc-800">3</button>
            <button className="w-7 h-7 flex items-center justify-center rounded border border-zinc-700/80 hover:bg-zinc-800">4</button>
            <button className="w-7 h-7 flex items-center justify-center rounded border border-zinc-700/80 hover:bg-zinc-800">5</button>
            <button className="w-7 h-7 flex items-center justify-center rounded border border-zinc-700/80 hover:bg-zinc-800">&gt;</button>
          </div>
        </div>
      </div>
    </div>
  );
}
