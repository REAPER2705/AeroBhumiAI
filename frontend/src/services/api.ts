/**
 * API Service
 * 
 * Centralized API client for communicating with FastAPI backend
 * Handles all HTTP requests and error management
 */

import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

export const apiClient = {
  // Parcel endpoints
  listParcels: async () => {
    const res = await api.get('/parcels');
    const parcels = Array.isArray(res.data) ? res.data : (res.data?.parcels || []);
    // Map standard GeoJSON Feature to flat Parcel interface
    const formatted = parcels.map((p: any) => ({
      parcel_id: p.properties?.parcel_id,
      area: p.properties?.area,
      boundary_status: p.properties?.boundary_status,
      owner: p.properties?.owner,
      geometry: p.geometry
    }));
    return { data: formatted };
  },
  
  getParcel: async (parcelId: string) => {
    const res = await api.get(`/parcels/${parcelId}`);
    const p = res.data;
    // Map standard GeoJSON Feature to flat Parcel interface
    return { 
      data: {
        parcel_id: p.properties?.parcel_id,
        area: p.properties?.area,
        boundary_status: p.properties?.boundary_status,
        owner: p.properties?.owner,
        geometry: p.geometry
      }
    };
  },
  
  // Upload endpoints
  uploadDrone: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/upload/drone', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  
  // Spatial analysis endpoints
  buildCheck: (parcelId: string, houseGeometry: any) =>
    api.post('/spatial/build-check', { parcel_id: parcelId, house_geometry: houseGeometry }),
  
  // Audit endpoints
  auditAnalyze: (parcelId: string, buildCheck: any) =>
    api.post('/audit/analyze', { parcel_id: parcelId, build_check: buildCheck }),
  
  // Report endpoints
  generateReport: (auditId: string) =>
    api.post('/reports/generate', { audit_id: auditId }),
}

export default api
