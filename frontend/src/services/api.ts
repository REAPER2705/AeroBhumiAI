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
  listParcels: () => api.get('/parcels'),
  getParcel: (parcelId: string) => api.get(`/parcels/${parcelId}`),
  
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
