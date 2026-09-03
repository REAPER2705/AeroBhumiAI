/**
 * Audit Map Page (Screen 3)
 * 
 * Main interactive workflow screen
 * 
 * Displays:
 * - Interactive map
 * - Parcel boundary
 * - Drone imagery
 * - House drawing tools
 * - Control buttons
 */

export function AuditMap() {
  return (
    <div className="flex h-screen">
      <div className="flex-1" id="map"></div>
      <div className="w-80 bg-gray-100 p-4 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Audit Tools</h2>
        {/* Tools will be rendered here */}
      </div>
    </div>
  )
}
