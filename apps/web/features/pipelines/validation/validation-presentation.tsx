import { useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'

export const validationPrimaryActionClass = 'hover:bg-components-button-primary-bg'
const wideQuery = '(min-width: 1440px)'
function subscribeWide(listener: () => void) {
  const media = typeof window !== 'undefined' ? window.matchMedia?.(wideQuery) : undefined
  media?.addEventListener?.('change', listener)
  return () => media?.removeEventListener?.('change', listener)
}
function wideSnapshot() {
  return typeof window === 'undefined' || !window.matchMedia
    ? true
    : window.matchMedia(wideQuery).matches
}
export function useValidationWideLayout() {
  return useSyncExternalStore(subscribeWide, wideSnapshot, () => true)
}

/** Operational instants only. Business temporal values retain their exact wire representation. */
export function formatValidationInstant(value: string, locale: string, zone?: string) {
  if (
    !/^[+-]?\d{4,6}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
  )
    return { text: value, zone: null }
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return { text: value, zone: null }
  try {
    const formatter = new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
      timeZoneName: 'shortOffset',
      ...(zone ? { timeZone: zone } : {}),
    })
    return { text: formatter.format(date), zone: formatter.resolvedOptions().timeZone }
  } catch {
    return { text: value, zone: null }
  }
}
export function ValidationTimestamp({
  value,
  zone,
  showZone = true,
}: {
  value: string | null | undefined
  zone?: string
  showZone?: boolean
}) {
  const { t, i18n } = useTranslation()
  if (!value) return <span>{t('dataValidation.unknown')}</span>
  const display = formatValidationInstant(
    value,
    i18n?.resolvedLanguage ?? i18n?.language ?? 'en',
    zone,
  )
  return (
    <time dateTime={value} title={value} className="tabular-nums">
      {display.text}
      {showZone && display.zone && <span className="text-text-secondary"> · {display.zone}</span>}
    </time>
  )
}
