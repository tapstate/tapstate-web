import { formatBytes } from '@/features/views/views-model'

import type { MetricUnit } from './pipeline-monitoring-model'

function unit(
  locale: string,
  value: number,
  name: 'millisecond' | 'second' | 'minute' | 'hour' | 'day',
) {
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: name,
    unitDisplay: 'short',
    maximumFractionDigits: 0,
  }).format(value)
}

/** A duration in the two largest units that apply, e.g. "18 min 32 s"; localized by Intl. */
export function formatDuration(milliseconds: number, locale: string): string {
  const ms = Math.max(0, Math.round(milliseconds))
  if (ms < 1_000) return unit(locale, ms, 'millisecond')
  const seconds = Math.floor(ms / 1_000)
  if (seconds < 60) return unit(locale, seconds, 'second')
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    const rest = seconds % 60
    return rest === 0
      ? unit(locale, minutes, 'minute')
      : `${unit(locale, minutes, 'minute')} ${unit(locale, rest, 'second')}`
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    const rest = minutes % 60
    return rest === 0
      ? unit(locale, hours, 'hour')
      : `${unit(locale, hours, 'hour')} ${unit(locale, rest, 'minute')}`
  }
  const days = Math.floor(hours / 24)
  const rest = hours % 24
  return rest === 0
    ? unit(locale, days, 'day')
    : `${unit(locale, days, 'day')} ${unit(locale, rest, 'hour')}`
}

export function formatCount(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value)
}

export function formatRate(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: value < 100 ? 2 : 0 }).format(value)
}

export function formatPercent(part: number, whole: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(
    whole > 0 ? Math.min(1, part / whole) : 0,
  )
}

export function formatMetricValue(value: number, metricUnit: MetricUnit, locale: string): string {
  switch (metricUnit) {
    case 'bytes':
      return formatBytes(value)
    case 'milliseconds':
      return formatDuration(value, locale)
    case 'seconds':
      return formatDuration(value * 1_000, locale)
    case 'count':
      return formatCount(value, locale)
  }
}
