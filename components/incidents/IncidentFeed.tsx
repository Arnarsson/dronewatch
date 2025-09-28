'use client'

import { useIncidentStore } from '@/lib/store/incidents'
import { formatRelativeTime, getSeverityColor } from '@/lib/utils'
import { MapPin, AlertTriangle, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

export function IncidentFeed() {
  const { filteredIncidents, setSelectedIncident } = useIncidentStore()

  if (filteredIncidents.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">
          No incidents match current filters
        </p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2">
        {filteredIncidents.map((incident) => (
          <button
            key={incident.id}
            onClick={() => setSelectedIncident(incident)}
            className="w-full rounded-lg border border-border bg-card p-3 mb-2 text-left transition-colors hover:bg-accent"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h3 className="font-semibold text-sm">
                  {incident.asset.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {incident.asset.type} • {incident.asset.iata || incident.asset.icao || 'N/A'}
                </p>
              </div>
              <Badge
                variant={incident.incident.status === 'active' ? 'destructive' : 'default'}
                className="text-xs"
              >
                {incident.incident.status}
              </Badge>
            </div>

            {/* Description */}
            {incident.incident.narrative && (
              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                {incident.incident.narrative}
              </p>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatRelativeTime(incident.first_seen_utc)}
                </span>
                <span className="flex items-center gap-1">
                  <AlertTriangle className={`h-3 w-3 ${getSeverityColor(incident.scores.severity)}`} />
                  {incident.scores.severity}/10
                </span>
              </div>
              <Badge variant="outline" className="text-xs">
                {incident.incident.category}
              </Badge>
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  )
}