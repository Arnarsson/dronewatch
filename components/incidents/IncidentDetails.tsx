'use client'

import { useIncidentStore } from '@/lib/store/incidents'
import { formatRelativeTime, getSeverityColor, getSeverityBg } from '@/lib/utils'
import {
  MapPin,
  Calendar,
  AlertTriangle,
  Shield,
  Clock,
  Link,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function IncidentDetails() {
  const { selectedIncident, setSelectedIncident } = useIncidentStore()

  if (!selectedIncident) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">
          Select an incident from the map to view details
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold">{selectedIncident.asset.name}</h2>
          <p className="text-sm text-muted-foreground">
            {selectedIncident.asset.type} • {selectedIncident.asset.iata || selectedIncident.asset.icao || 'N/A'}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSelectedIncident(null)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Status & Severity */}
      <div className="flex items-center gap-2">
        <Badge
          variant={selectedIncident.incident.status === 'active' ? 'destructive' : 'default'}
        >
          {selectedIncident.incident.status}
        </Badge>
        <Badge
          className={getSeverityBg(selectedIncident.scores.severity)}
        >
          Severity {selectedIncident.scores.severity}/10
        </Badge>
        <Badge variant="outline">
          {selectedIncident.incident.category}
        </Badge>
      </div>

      {/* Narrative */}
      {selectedIncident.incident.narrative && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Incident Details</h3>
          <p className="text-sm text-muted-foreground">
            {selectedIncident.incident.narrative}
          </p>
        </div>
      )}

      {/* Metadata */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>First seen: {formatRelativeTime(selectedIncident.first_seen_utc)}</span>
        </div>
        {selectedIncident.incident.duration_min && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>Duration: {selectedIncident.incident.duration_min} minutes</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span>
            {selectedIncident.asset.lat.toFixed(4)}, {selectedIncident.asset.lon.toFixed(4)}
          </span>
        </div>
        {selectedIncident.scores.risk_radius_m && (
          <div className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span>Risk radius: {(selectedIncident.scores.risk_radius_m / 1000).toFixed(1)} km</span>
          </div>
        )}
      </div>

      {/* Evidence */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Evidence</h3>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Strength: {selectedIncident.evidence.strength}/3
            </Badge>
            <Badge variant="outline" className="text-xs">
              {selectedIncident.evidence.attribution}
            </Badge>
          </div>
        </div>
        
        {/* Sources */}
        {selectedIncident.evidence.sources.length > 0 && (
          <div className="space-y-2 mt-3">
            <h4 className="text-xs font-semibold text-muted-foreground">Sources</h4>
            {selectedIncident.evidence.sources.map((source, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <Link className="h-3 w-3 mt-1 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium">{source.name}</p>
                  {source.url && (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      View source
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}