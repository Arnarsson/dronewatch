'use client'

import { ReactNode, useState } from 'react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'

interface MobileShellProps {
  children: ReactNode
  sidePanel: ReactNode
}

export function MobileShell({ children, sidePanel }: MobileShellProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative h-full w-full">
      {/* Main content (map) */}
      <div className="h-full w-full">
        {children}
      </div>

      {/* Mobile menu trigger */}
      <div className="absolute left-4 top-4 z-10 md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              size="icon"
              variant="secondary"
              className="h-10 w-10 bg-background/80 backdrop-blur-sm"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>

          <SheetContent
            side="left"
            className="w-[300px] p-0 sm:w-[400px]"
          >
            <div className="h-full overflow-y-auto">
              {sidePanel}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}