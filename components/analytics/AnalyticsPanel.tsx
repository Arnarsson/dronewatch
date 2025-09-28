'use client'

import { useIncidentStore } from '@/lib/store/incidents'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Activity, AlertTriangle, MapPin, Shield } from 'lucide-react'

export function AnalyticsPanel() {
  const { filteredIncidents } = useIncidentStore()

  // Calculate statistics
  const stats = {
    total: filteredIncidents.length,
    active: filteredIncidents.filter(i => i.incident.status === 'active').length,
    resolved: filteredIncidents.filter(i => i.incident.status === 'resolved').length,
    unconfirmed: filteredIncidents.filter(i => i.incident.status === 'unconfirmed').length,
  }

  const severityDistribution = {
    critical: filteredIncidents.filter(i => i.scores.severity >= 8).length,
    high: filteredIncidents.filter(i => i.scores.severity >= 6 && i.scores.severity < 8).length,
    medium: filteredIncidents.filter(i => i.scores.severity >= 4 && i.scores.severity < 6).length,
    low: filteredIncidents.filter(i => i.scores.severity < 4).length,
  }

  const categoryDistribution = filteredIncidents.reduce((acc, incident) => {
    acc[incident.incident.category] = (acc[incident.incident.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const assetTypeDistribution = filteredIncidents.reduce((acc, incident) => {
    acc[incident.asset.type] = (acc[incident.asset.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="p-4 space-y-4">
      {/* Status Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Status Distribution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Active</span>
            <span className="font-mono">{stats.active}</span>
          </div>
          <Progress value={(stats.active / stats.total) * 100} className="h-2" />
          
          <div className="flex justify-between text-sm">
            <span>Resolved</span>
            <span className="font-mono">{stats.resolved}</span>
          </div>
          <Progress value={(stats.resolved / stats.total) * 100} className="h-2" />
          
          <div className="flex justify-between text-sm">
            <span>Unconfirmed</span>
            <span className="font-mono">{stats.unconfirmed}</span>
          </div>
          <Progress value={(stats.unconfirmed / stats.total) * 100} className="h-2" />
        </CardContent>
      </Card>

      {/* Severity Distribution */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Severity Levels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-destructive">Critical (8-10)</span>
              <span className="font-mono">{severityDistribution.critical}</span>
            </div>
            <Progress 
              value={(severityDistribution.critical / stats.total) * 100} 
              className="h-2 [&>div]:bg-destructive"
            />
            
            <div className="flex justify-between text-sm">
              <span className="text-orange-500">High (6-8)</span>
              <span className="font-mono">{severityDistribution.high}</span>
            </div>
            <Progress 
              value={(severityDistribution.high / stats.total) * 100} 
              className="h-2 [&>div]:bg-orange-500"
            />
            
            <div className="flex justify-between text-sm">
              <span className="text-yellow-500">Medium (4-6)</span>
              <span className="font-mono">{severityDistribution.medium}</span>
            </div>
            <Progress 
              value={(severityDistribution.medium / stats.total) * 100} 
              className="h-2 [&>div]:bg-yellow-500"
            />
            
            <div className="flex justify-between text-sm">
              <span className="text-green-500">Low (1-4)</span>
              <span className="font-mono">{severityDistribution.low}</span>
            </div>
            <Progress 
              value={(severityDistribution.low / stats.total) * 100} 
              className="h-2 [&>div]:bg-green-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Category Distribution */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Incident Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {Object.entries(categoryDistribution).map(([category, count]) => (
              <div key={category} className="flex justify-between text-sm">
                <span className="capitalize">{category}</span>
                <span className="font-mono">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Asset Types */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Asset Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {Object.entries(assetTypeDistribution).map(([type, count]) => (
              <div key={type} className="flex justify-between text-sm">
                <span className="capitalize">{type}</span>
                <span className="font-mono">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}