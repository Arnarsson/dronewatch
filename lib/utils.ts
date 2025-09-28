import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const then = new Date(date)
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)

  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return then.toLocaleDateString()
}

export function getSeverityColor(severity: number): string {
  if (severity >= 8) return 'text-destructive'
  if (severity >= 6) return 'text-orange-500'
  if (severity >= 4) return 'text-yellow-500'
  return 'text-green-500'
}

export function getSeverityBg(severity: number): string {
  if (severity >= 8) return 'bg-destructive/10 border-destructive/20'
  if (severity >= 6) return 'bg-orange-500/10 border-orange-500/20'
  if (severity >= 4) return 'bg-yellow-500/10 border-yellow-500/20'
  return 'bg-green-500/10 border-green-500/20'
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}