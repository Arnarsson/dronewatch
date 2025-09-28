'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { TopBar } from '@/components/layout/TopBar'
import { RightDock } from '@/components/layout/RightDock'
import { FilterPanel } from '@/components/layout/FilterPanel'
import { CommandMenu } from '@/components/layout/CommandMenu'
import { useIncidentStore } from '@/lib/store/incidents'
import { useMapStore } from '@/lib/store/map'
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts'
import { cn } from '@/lib/utils'

// Lazy load map to prevent SSR issues
const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-surface animate-pulse flex items-center justify-center">
      <div className="text-muted">Loading map...</div>
    </div>
  ),
})

export default function DashboardPage() {
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)
  const [rightDockCollapsed, setRightDockCollapsed] = useState(false)
  const [commandMenuOpen, setCommandMenuOpen] = useState(false)

  const { incidents, selectedIncident, loadIncidents } = useIncidentStore()
  const { mapView } = useMapStore()

  // Load incidents on mount
  useEffect(() => {
    loadIncidents()
    const interval = setInterval(loadIncidents, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [loadIncidents])

  // Keyboard shortcuts
  useKeyboardShortcuts({
    'cmd+k': () => setCommandMenuOpen(true),
    'cmd+]': () => setRightDockCollapsed(!rightDockCollapsed),
    'f': () => setFilterPanelOpen(!filterPanelOpen),
    'escape': () => {
      setFilterPanelOpen(false)
      setCommandMenuOpen(false)
    },
  })

  // Calculate active incidents
  const activeIncidents = useMemo(
    () => incidents.filter(i => i.incident.status === 'active').length,
    [incidents]
  )

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Bar - 56px height */}
      <TopBar
        activeCount={activeIncidents}
        totalCount={incidents.length}
        onSearchClick={() => setCommandMenuOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden">
        <ResizablePanelGroup
          direction="horizontal"
          className="h-full"
          onLayout={(sizes) => {
            localStorage.setItem('dronewatch-layout', JSON.stringify(sizes))
          }}
        >
          {/* Map Panel - Primary Surface */}
          <ResizablePanel
            defaultSize={rightDockCollapsed ? 100 : 70}
            minSize={55}
            className="relative"
          >
            <MapView
              incidents={incidents}
              selectedIncident={selectedIncident}
              onIncidentSelect={(incident) => {
                useIncidentStore.setState({ selectedIncident: incident })
                if (rightDockCollapsed) {
                  setRightDockCollapsed(false)
                }
              }}
            />

            {/* Filter Panel Overlay */}
            <FilterPanel
              open={filterPanelOpen}
              onClose={() => setFilterPanelOpen(false)}
            />
          </ResizablePanel>

          {/* Resizable Handle */}
          {!rightDockCollapsed && (
            <>
              <ResizableHandle className="w-1 bg-border hover:bg-accent transition-colors" />

              {/* Right Dock Panel */}
              <ResizablePanel
                defaultSize={30}
                minSize={20}
                maxSize={45}
                className="bg-surface"
              >
                <RightDock
                  incident={selectedIncident}
                  incidents={incidents}
                  onClose={() => setRightDockCollapsed(true)}
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>

      {/* Command Menu */}
      <CommandMenu
        open={commandMenuOpen}
        onClose={() => setCommandMenuOpen(false)}
      />
    </div>
  )
}