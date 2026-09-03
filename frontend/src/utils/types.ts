/**
 * TypeScript Type Definitions
 */

export interface Parcel {
  parcel_id: string
  area?: number
  boundary_status: string
  source: string
  geometry: GeoJSONGeometry
  metadata?: Record<string, any>
}

export interface GeoJSONGeometry {
  type: string
  coordinates: any[]
}

export interface BuildCheckResult {
  success: boolean
  result: string
  metrics: {
    house_area_m2: number
    outside_area_m2: number
    outside_percentage: number
  }
  boundary_status: string
}

export interface AuditAnalysisResult {
  success: boolean
  result: string
  summary: string
  problem: string
  recommended_action: string
  verification_note?: string
}
