'use client'

import { useEffect, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { useMapStore } from '@/lib/store/map'
import { useIncidentStore } from '@/lib/store/incidents'
import { MapPin, AlertTriangle } from 'lucide-react'

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then(mod => mod.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import('react-leaflet').then(mod => mod.TileLayer),
  { ssr: false }
)
const Marker = dynamic(
  () => import('react-leaflet').then(mod => mod.Marker),
  { ssr: false }
)
const Popup = dynamic(
  () => import('react-leaflet').then(mod => mod.Popup),
  { ssr: false }
)
const MarkerClusterGroup = dynamic(async () => {
  const mod = await import('react-leaflet-cluster')
  const ClusterComponent = (mod as any)?.default ?? (mod as any)?.MarkerClusterGroup

  if (typeof ClusterComponent === 'function') {
    return ClusterComponent
  }

  // Fall back to a pass-through component if the cluster module is unavailable.
  return function MarkerClusterGroupFallback({ children }: { children?: ReactNode }) {
    return <>{children}</>
  }
}, {
  ssr: false,
  loading: () => null,
})

import 'leaflet/dist/leaflet.css'
import 'react-leaflet-cluster/lib/ClusterDefault.css'
import L from 'leaflet'

// Fix Leaflet icon issue in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
})

export function MapView() {
  const { mapView, basemap, showClusters, showHeatmap } = useMapStore()
  const { filteredIncidents, selectedIncident, setSelectedIncident, loadIncidents } = useIncidentStore()

  // Load incidents on mount
  useEffect(() => {
    loadIncidents()
  }, [loadIncidents])

  // Custom icon based on severity
  const createIcon = (severity: number) => {
    const color = severity >= 8 ? '#ef4444' : severity >= 6 ? '#f97316' : severity >= 4 ? '#eab308' : '#22c55e'
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: ${color};
          border: 2px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        ">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
            <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
          </svg>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12],
    })
  }

  const tileUrl = basemap === 'imagery'
    ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

  const markers = filteredIncidents.map(incident => (
    <Marker
      key={incident.id}
      position={[incident.asset.lat, incident.asset.lon]}
      icon={createIcon(incident.scores.severity)}
      eventHandlers={{
        click: () => setSelectedIncident(incident),
      }}
    >
      <Popup>
        <div className="p-2">
          <h3 className="font-bold text-sm">{incident.asset.name}</h3>
          <p className="text-xs text-gray-600">{incident.incident.category}</p>
          <p className="text-xs mt-1">{incident.incident.narrative?.slice(0, 100)}...</p>
          <div className="mt-2 flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded ${
              incident.incident.status === 'active' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
            }`}>
              {incident.incident.status}
            </span>
            <span className="text-xs text-gray-500">
              Severity: {incident.scores.severity}/10
            </span>
          </div>
        </div>
      </Popup>
    </Marker>
  ))

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={mapView.center}
        zoom={mapView.zoom}
        className="h-full w-full"
        style={{ background: '#0B1220' }}
      >
        <TileLayer
          url={tileUrl}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          opacity={0.8}
        />

        {showClusters ? (
          <MarkerClusterGroup
            chunkedLoading
            maxClusterRadius={80}
            spiderfyOnMaxZoom={true}
            showCoverageOnHover={false}
            iconCreateFunction={(cluster: any) => {
              const count = cluster.getChildCount()
              const size = count < 10 ? 'small' : count < 50 ? 'medium' : 'large'
              const sizeClass = size === 'small' ? 30 : size === 'medium' ? 40 : 50

              return L.divIcon({
                html: `
                  <div style="
                    width: ${sizeClass}px;
                    height: ${sizeClass}px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #FF8A00, #FF6B00);
                    border: 3px solid white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    font-weight: bold;
                    color: white;
                    font-size: ${size === 'small' ? 12 : size === 'medium' ? 14 : 16}px;
                  ">
                    ${count}
                  </div>
                `,
                className: 'custom-cluster',
                iconSize: [sizeClass, sizeClass],
                iconAnchor: [sizeClass / 2, sizeClass / 2],
              })
            }}
          >
            {markers}
          </MarkerClusterGroup>
        ) : (
          markers
        )}
      </MapContainer>

      {/* Map Controls Overlay */}
      <div className="absolute right-4 top-4 z-[1000] flex flex-col gap-2">
        <button
          onClick={() => useMapStore.getState().toggleClusters()}
          className="rounded-lg bg-background/80 px-3 py-2 text-sm backdrop-blur-sm hover:bg-background/90"
        >
          {showClusters ? 'Disable' : 'Enable'} Clustering
        </button>
        <button
          onClick={() => useMapStore.getState().setBasemap(basemap === 'streets' ? 'imagery' : 'streets')}
          className="rounded-lg bg-background/80 px-3 py-2 text-sm backdrop-blur-sm hover:bg-background/90"
        >
          {basemap === 'streets' ? 'Satellite' : 'Streets'} View
        </button>
      </div>

      {/* Incident Counter */}
      <div className="absolute bottom-4 left-4 z-[1000]">
        <div className="rounded-lg bg-background/80 px-3 py-2 backdrop-blur-sm">
          <span className="text-sm font-mono">
            {filteredIncidents.length} incidents
          </span>
        </div>
      </div>
    </div>
  )
}
