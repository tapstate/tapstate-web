import type { ViewSummary } from '@/service/view-client'

export interface ViewsSummary {
  total: number
  fresh: number
  stale: number
  /** Largest lag among fresh views, or null when none is fresh. */
  slowestBehindSeconds: number | null
}

export function summarizeViews(views: ViewSummary[]): ViewsSummary {
  let fresh = 0
  let stale = 0
  let slowest: number | null = null
  for (const view of views) {
    if (view.status.state === 'fresh') {
      fresh += 1
      slowest = Math.max(slowest ?? 0, view.status.behindSeconds)
    } else if (view.status.state === 'stale') {
      stale += 1
    }
  }
  return { total: views.length, fresh, stale, slowestBehindSeconds: slowest }
}

/** Views sorted by collection name, so the list reads the same on every refresh. */
export function sortViews(views: ViewSummary[]): ViewSummary[] {
  return [...views].sort((a, b) => a.location.collection.localeCompare(b.location.collection))
}

export type DurationUnit = 's' | 'min' | 'h' | 'd'

/** A lag or age rounded down to its largest whole unit: 3 s, 12 min, 2 h, 4 d. */
export function durationParts(seconds: number): { value: number; unit: DurationUnit } {
  const whole = Math.max(0, Math.floor(seconds))
  if (whole < 60) return { value: whole, unit: 's' }
  if (whole < 3600) return { value: Math.floor(whole / 60), unit: 'min' }
  if (whole < 86400) return { value: Math.floor(whole / 3600), unit: 'h' }
  return { value: Math.floor(whole / 86400), unit: 'd' }
}

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const

export function formatBytes(bytes: number): string {
  let value = Math.max(0, bytes)
  let unit = 0
  while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024
    unit += 1
  }
  const rounded = unit === 0 || value >= 10 ? Math.round(value) : Math.round(value * 10) / 10
  return `${rounded} ${BYTE_UNITS[unit]}`
}
