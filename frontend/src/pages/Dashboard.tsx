/**
 * Dashboard Page (Screen 1)
 * 
 * Displays:
 * - Product title and explanation
 * - Start audit button
 * - Recent/demo parcels
 */

export function Dashboard() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center">
      <div className="text-center max-w-2xl">
        <h1 className="text-4xl font-bold mb-4">LAND-AUDIT AI</h1>
        <p className="text-xl text-gray-600 mb-8">
          Geospatial AI platform for spatial pre-validation of construction
        </p>
        <button className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700">
          Start Audit
        </button>
      </div>
    </div>
  )
}
