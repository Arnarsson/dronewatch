'use client'

import { useIncidentStore } from '@/lib/store/incidents'
import { Activity, AlertTriangle, Clock, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

export function TopBar() {
  const { filteredIncidents, loading } = useIncidentStore()

  const stats = {
    active: filteredIncidents.filter(i => i.incident.status === 'active').length,
    critical: filteredIncidents.filter(i => i.scores.severity >= 8).length,
    recent: filteredIncidents.filter(i => {
      const time = new Date(i.first_seen_utc).getTime()
      return Date.now() - time <= 86400000 // 24 hours
    }).length,
    total: filteredIncidents.length
  }

  return (
    <div className="h-14 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="flex h-full items-center justify-between px-4">
        {/* Logo and Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <span className="text-lg font-bold tracking-tight">DroneWatch</span>
          </div>
          <span className="hidden text-sm text-muted-foreground md:inline">
            Real-time Incident Monitoring
          </span>
        </div>

        {/* KPIs */}
        <div className="flex items-center gap-6">
          <KPI
            icon={Activity}
            label="Active"
            value={stats.active}
            variant="default"
          />
          <KPI
            icon={AlertTriangle}
            label="Critical"
            value={stats.critical}
            variant="critical"
          />
          <KPI
            icon={Clock}
            label="24h"
            value={stats.recent}
            variant="default"
          />
          <div className="hidden text-sm text-muted-foreground lg:block">
            {stats.total} total incidents
          </div>
        </div>
      </div>
    </div>
  )
}

interface KPIProps {
  icon: React.ElementType
  label: string
  value: number
  variant: 'default' | 'critical'
}

function KPI({ icon: Icon, label, value, variant }: KPIProps) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={cn(
        "h-4 w-4",
        variant === 'critical' ? 'text-destructive' : 'text-primary'
      )} />
      <div className="flex items-center gap-1">
        <span className="text-sm text-muted-foreground">{label}:</span>
        <span className={cn(
          "text-sm font-mono font-bold",
          variant === 'critical' ? 'text-destructive' : ''
        )}>
          {value}
        </span>
      </div>
    </div>
  )
}