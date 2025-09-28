'use client'

import { ReactNode } from 'react'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'

interface ResizableShellProps {
  children: ReactNode
  rightPanel: ReactNode
  defaultSizes?: number[]
}

export function ResizableShell({
  children,
  rightPanel,
  defaultSizes = [70, 30]
}: ResizableShellProps) {
  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="h-full w-full"
    >
      <ResizablePanel
        defaultSize={defaultSizes[0]}
        minSize={50}
        maxSize={85}
        className="relative"
      >
        {children}
      </ResizablePanel>

      <ResizableHandle withHandle className="bg-border/50 hover:bg-border" />

      <ResizablePanel
        defaultSize={defaultSizes[1]}
        minSize={15}
        maxSize={50}
        collapsible
        className="relative"
      >
        {rightPanel}
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}