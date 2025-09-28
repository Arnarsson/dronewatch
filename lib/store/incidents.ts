import { create } from 'zustand'
import { Incident, FilterState } from '@/lib/types'

interface IncidentStore {
  incidents: Incident[]
  filteredIncidents: Incident[]
  selectedIncident: Incident | null
  filters: FilterState
  loading: boolean
  error: string | null

  loadIncidents: () => Promise<void>
  setSelectedIncident: (incident: Incident | null) => void
  updateFilters: (filters: Partial<FilterState>) => void
  applyFilters: () => void
  clearFilters: () => void
}

const defaultFilters: FilterState = {
  status: 'all',
  timeRange: '7d',
  severity: 'all',
  evidence: 'all',
  assetType: 'all',
  search: '',
}

export const useIncidentStore = create<IncidentStore>((set, get) => ({
  incidents: [],
  filteredIncidents: [],
  selectedIncident: null,
  filters: defaultFilters,
  loading: false,
  error: null,

  loadIncidents: async () => {
    set({ loading: true, error: null })
    try {
      const response = await fetch('/incidents.json')
      if (!response.ok) throw new Error('Failed to load incidents')
      const data = await response.json()
      set({ incidents: data, loading: false })
      get().applyFilters()
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  setSelectedIncident: (incident) => set({ selectedIncident: incident }),

  updateFilters: (filters) => {
    set(state => ({ filters: { ...state.filters, ...filters } }))
    get().applyFilters()
  },

  applyFilters: () => {
    const { incidents, filters } = get()
    let filtered = [...incidents]

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(i => i.incident.status === filters.status)
    }

    // Time range filter
    if (filters.timeRange !== 'all') {
      const now = Date.now()
      const ranges = {
        '24h': 86400000,
        '7d': 604800000,
        '30d': 2592000000,
      }
      const range = ranges[filters.timeRange as keyof typeof ranges]
      filtered = filtered.filter(i => {
        const time = new Date(i.first_seen_utc).getTime()
        return now - time <= range
      })
    }

    // Severity filter
    if (filters.severity !== 'all') {
      filtered = filtered.filter(i => {
        const s = i.scores.severity
        if (filters.severity === 'critical') return s >= 8
        if (filters.severity === 'high') return s >= 6 && s < 8
        if (filters.severity === 'medium') return s >= 4 && s < 6
        if (filters.severity === 'low') return s < 4
        return true
      })
    }

    // Evidence filter
    if (filters.evidence !== 'all') {
      filtered = filtered.filter(i => {
        const e = i.evidence.strength
        if (filters.evidence === 'official') return e === 3
        if (filters.evidence === 'verified') return e === 2
        if (filters.evidence === 'reported') return e === 1
        if (filters.evidence === 'unconfirmed') return e === 0
        return true
      })
    }

    // Asset type filter
    if (filters.assetType !== 'all') {
      filtered = filtered.filter(i => i.asset.type === filters.assetType)
    }

    // Search filter
    if (filters.search) {
      const search = filters.search.toLowerCase()
      filtered = filtered.filter(i =>
        i.asset.name.toLowerCase().includes(search) ||
        i.incident.narrative?.toLowerCase().includes(search) ||
        i.asset.iata?.toLowerCase().includes(search) ||
        i.asset.icao?.toLowerCase().includes(search)
      )
    }

    set({ filteredIncidents: filtered })
  },

  clearFilters: () => {
    set({ filters: defaultFilters })
    get().applyFilters()
  },
}))