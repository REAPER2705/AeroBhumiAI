/**
 * Drone Imagery Upload Component
 * 
 * Responsibilities:
 * - GeoTIFF file upload
 * - Progress display
 * - Metadata display (CRS, bounds, resolution)
 */

export function DroneUpload() {
  return (
    <div className="p-4 border-2 border-dashed border-gray-300 rounded">
      <h3 className="text-xl font-bold mb-4">Upload Drone Orthomosaic</h3>
      <p className="text-gray-600 mb-4">Drag & Drop or Choose GeoTIFF</p>
      <p className="text-sm text-gray-500">Supported: .tif / .tiff</p>
    </div>
  )
}
