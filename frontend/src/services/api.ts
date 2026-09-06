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
    // Backend returns {success: true, parcels: [...]}
    const parcels = res.data?.parcels || [];
    return { data: parcels };
  },
  
  getParcel: async (parcelId: string) => {
    const res = await api.get(`/parcels/${parcelId}`);
    // Backend returns {success: true, parcel: {...}}
    const parcel = res.data?.parcel || null;
    return { data: parcel };
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
