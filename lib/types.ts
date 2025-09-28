export interface Incident {
  id: string
  first_seen_utc: string
  asset: {
    type: 'airport' | 'harbour' | 'military' | 'city' | 'infrastructure'
    name: string
    iata?: string
    icao?: string
    lat: number
    lon: number
  }
  incident: {
    category: 'sighting' | 'closure' | 'breach' | 'threat' | 'collision'
    status: 'active' | 'resolved' | 'unconfirmed'
    duration_min?: number
    narrative?: string
  }
  evidence: {
    strength: 0 | 1 | 2 | 3
    attribution: 'confirmed' | 'suspected' | 'alleged'
    sources: Array<{
      name: string
      url?: string
      timestamp?: string
    }>
  }
  scores: {
    severity: number // 1-10
    risk_radius_m?: number
  }
  date_verification?: {
    is_old_incident: boolean
    days_since_incident?: number
  }
}

export interface FilterState {
  status: 'all' | 'active' | 'resolved'
  timeRange: '24h' | '7d' | '30d' | 'all'
  severity: 'all' | 'low' | 'medium' | 'high' | 'critical'
  evidence: 'all' | 'official' | 'verified' | 'reported' | 'unconfirmed'
  assetType: 'all' | 'airport' | 'harbour' | 'military' | 'city' | 'infrastructure'
  search: string
}

export interface MapView {
  center: [number, number]
  zoom: number
}

export interface MapMarker {
  id: string
  position: [number, number]
  incident: Incident
}