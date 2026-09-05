import React, { useState, useEffect } from 'react';
import { Plus, Eye, Search } from 'lucide-react';
import { apiClient } from '../services/api';
import { Parcel } from '../utils/types';

export default function Parcels({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchParcels = async () => {
      try {
        const res = await apiClient.listParcels();
        const data = Array.isArray(res.data) ? res.data : (res.data?.parcels || []);
        setParcels(data);
      } catch (err) {
        console.error(err);
        setError("Failed to load parcels from backend.");
      } finally {
        setLoading(false);
      }
    };
    fetchParcels();
  }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Parcels</h1>
          <p className="text-gray-500 mt-1">Manage and view all registered parcels.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input type="text" placeholder="Search parcels..." className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-green-500" />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading parcels...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : parcels.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No parcels available.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-6 py-4 font-medium">Parcel ID</th>
                <th className="px-6 py-4 font-medium">Area (sq.m.)</th>
                <th className="px-6 py-4 font-medium">Boundary Status</th>
                <th className="px-6 py-4 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {parcels.map((p, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{p.parcel_id}</td>
                  <td className="px-6 py-4">{p.area || '-'}</td>
                  <td className="px-6 py-4 text-gray-500">{p.boundary_status || 'Unknown'}</td>
                  <td className="px-6 py-4 flex justify-center gap-2">
                    <button 
                      onClick={() => setActiveTab('New Audit')}
                      className="text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded hover:bg-green-100 font-bold"
                    >
                      Start Audit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
