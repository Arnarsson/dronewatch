'use client'

import { useIncidentStore } from '@/lib/store/incidents'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { X, Search } from 'lucide-react'
import { FilterState } from '@/lib/types'

export function FilterPanel() {
  const { filters, updateFilters, clearFilters } = useIncidentStore()

  const activeFiltersCount = Object.values(filters).filter(v => 
    v !== 'all' && v !== '' && v !== null
  ).length

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search incidents..."
          value={filters.search}
          onChange={(e) => updateFilters({ search: e.target.value })}
          className="pl-8"
        />
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        <Select
          value={filters.status}
          onValueChange={(value) => updateFilters({ status: value as FilterState['status'] })}
        >
          <SelectTrigger className="h-8 w-[120px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.timeRange}
          onValueChange={(value) => updateFilters({ timeRange: value as FilterState['timeRange'] })}
        >
          <SelectTrigger className="h-8 w-[100px]">
            <SelectValue placeholder="Time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">24 Hours</SelectItem>
            <SelectItem value="7d">7 Days</SelectItem>
            <SelectItem value="30d">30 Days</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.severity}
          onValueChange={(value) => updateFilters({ severity: value as FilterState['severity'] })}
        >
          <SelectTrigger className="h-8 w-[120px]">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="critical">Critical (8+)</SelectItem>
            <SelectItem value="high">High (6-8)</SelectItem>
            <SelectItem value="medium">Medium (4-6)</SelectItem>
            <SelectItem value="low">Low (1-4)</SelectItem>
          </SelectContent>
        </Select>

        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8 px-2 text-xs"
          >
            Clear ({activeFiltersCount})
          </Button>
        )}
      </div>

      {/* Active Filter Chips */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-1">
          {filters.status !== 'all' && (
            <Badge variant="secondary" className="text-xs">
              Status: {filters.status}
              <button
                onClick={() => updateFilters({ status: 'all' })}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.timeRange !== 'all' && (
            <Badge variant="secondary" className="text-xs">
              Time: {filters.timeRange}
              <button
                onClick={() => updateFilters({ timeRange: 'all' })}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.severity !== 'all' && (
            <Badge variant="secondary" className="text-xs">
              Severity: {filters.severity}
              <button
                onClick={() => updateFilters({ severity: 'all' })}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.search && (
            <Badge variant="secondary" className="text-xs">
              Search: {filters.search}
              <button
                onClick={() => updateFilters({ search: '' })}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}