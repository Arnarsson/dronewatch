'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { IncidentDetails } from '@/components/incidents/IncidentDetails'
import { IncidentFeed } from '@/components/incidents/IncidentFeed'
import { AnalyticsPanel } from '@/components/analytics/AnalyticsPanel'
import { FilterPanel } from '@/components/filters/FilterPanel'
import { useIncidentStore } from '@/lib/store/incidents'

export function RightDock() {
  const selectedIncident = useIncidentStore(s => s.selectedIncident)

  return (
    <div className="flex h-full flex-col bg-surface">
      {/* Filter Panel */}
      <div className="border-b border-border p-4">
        <FilterPanel />
      </div>

      {/* Tabs */}
      <Tabs defaultValue={selectedIncident ? 'details' : 'feed'} className="flex-1">
        <TabsList className="w-full rounded-none border-b bg-background">
          <TabsTrigger value="details" className="flex-1">
            Details
          </TabsTrigger>
          <TabsTrigger value="feed" className="flex-1">
            Feed
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex-1">
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="m-0 h-[calc(100%-40px)] overflow-y-auto">
          <IncidentDetails />
        </TabsContent>

        <TabsContent value="feed" className="m-0 h-[calc(100%-40px)] overflow-y-auto">
          <IncidentFeed />
        </TabsContent>

        <TabsContent value="analytics" className="m-0 h-[calc(100%-40px)] overflow-y-auto">
          <AnalyticsPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}