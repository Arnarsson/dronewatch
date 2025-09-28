import { create } from 'zustand'
import { MapView } from '@/lib/types'

interface MapStore {
  mapView: MapView
  basemap: 'streets' | 'imagery'
  showHeatmap: boolean
  showClusters: boolean

  setMapView: (view: MapView) => void
  setBasemap: (basemap: 'streets' | 'imagery') => void
  toggleHeatmap: () => void
  toggleClusters: () => void
}

const DEFAULT_CENTER: [number, number] = [54.5, 15.0] // Central Europe
const DEFAULT_ZOOM = 5

export const useMapStore = create<MapStore>((set) => ({
  mapView: {
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
  },
  basemap: 'streets',
  showHeatmap: false,
  showClusters: true,

  setMapView: (view) => set({ mapView: view }),
  setBasemap: (basemap) => set({ basemap }),
  toggleHeatmap: () => set(state => ({ showHeatmap: !state.showHeatmap })),
  toggleClusters: () => set(state => ({ showClusters: !state.showClusters })),
}))