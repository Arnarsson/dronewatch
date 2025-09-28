import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DroneWatch | Real-Time Drone Incident Monitoring',
  description: 'Professional operations center for monitoring drone incidents across Europe',
  keywords: 'drone, monitoring, incidents, aviation, security, europe',
  authors: [{ name: 'DroneWatch' }],
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  themeColor: '#0B1220',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-background text-foreground antialiased`}>
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            className: 'bg-card border-border',
          }}
        />
      </body>
    </html>
  )
}