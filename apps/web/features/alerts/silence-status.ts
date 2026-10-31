import type { AlertForm } from '@/service/alert-client'

export function silenceStatus(row: AlertForm, now: number) {
  if (!row.active) return 'disabled'
  const start = Date.parse(row.startsAt ?? '')
  const duration = (row.durationSeconds ?? 0) * 1000
  const period = row.periodSeconds == null ? null : row.periodSeconds * 1000
  const end = row.endsAt == null ? Infinity : Date.parse(row.endsAt)
  if (
    !Number.isFinite(start) ||
    duration <= 0 ||
    Number.isNaN(end) ||
    (period !== null && (!Number.isFinite(period) || period < duration))
  )
    return 'silenceUnknown'
  if (now >= end) return 'silenceEnded'
  if (now < start) return 'scheduled'
  const elapsed = now - start
  if (period === null) return elapsed < duration ? 'silenceActive' : 'silenceEnded'
  const offset = elapsed % period
  if (offset < duration) return 'silenceActive'
  return now + period - offset < end ? 'scheduled' : 'silenceEnded'
}
