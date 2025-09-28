'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'
import { TopBar } from '@/components/layout/TopBar'
import { ResizableShell } from '@/components/layout/ResizableShell'
import { MobileShell } from '@/components/layout/MobileShell'
import { RightDock } from '@/components/layout/RightDock'
import { useIncidentStore } from '@/lib/store/incidents'

// Lazy load map to prevent SSR issues
const MapView = dynamic(
  () => import('@/components/map/MapView').then(mod => mod.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-surface animate-pulse flex items-center justify-center">
        <div className="text-muted-foreground">Loading map...</div>
      </div>
    ),
  }
)

export default function DashboardPage() {
  const loadIncidents = useIncidentStore(s => s.loadIncidents)

  // Load incidents on mount
  React.useEffect(() => {
    loadIncidents()
    const interval = setInterval(loadIncidents, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [loadIncidents])

  // Check if we're on desktop
  const [isDesktop, setIsDesktop] = React.useState(true)

  React.useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 768)
    checkDesktop()
    window.addEventListener('resize', checkDesktop)
    return () => window.removeEventListener('resize', checkDesktop)
  }, [])

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Bar with KPIs */}
      <TopBar />

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden">
        {isDesktop ? (
          // Desktop: Resizable panels
          <ResizableShell
            defaultSizes={[70, 30]}
            rightPanel={<RightDock />}
          >
            <MapView />
          </ResizableShell>
        ) : (
          // Mobile: Sheet-based layout
          <MobileShell sidePanel={<RightDock />}>
            <MapView />
          </MobileShell>
        )}
      </div>
    </div>
  )
}