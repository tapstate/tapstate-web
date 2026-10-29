import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import type { ViewFreshness, ViewLocation } from '@/service/view-client'

import { cn } from '@/lib/utils'
import { MANAGED_VIEW_STORE_SOURCE_ID } from '@/service/source-client'

import { durationParts } from '../views-model'

export function useDurationText() {
  const { t } = useTranslation()
  return (seconds: number) => {
    const { value, unit } = durationParts(seconds)
    return t(`views.duration.${unit}`, { value })
  }
}

/** The one status wording shared by the Views list and a view's Overview tab. */
export function useFreshnessText() {
  const { t } = useTranslation()
  const duration = useDurationText()
  return (status: ViewFreshness) => {
    switch (status.state) {
      case 'fresh':
        return t('views.status.fresh', { behind: duration(status.behindSeconds) })
      case 'stale':
        if (status.reason === 'clock-or-time-unavailable') return t('views.status.clockUnavailable')
        if (status.reason === 'measurement-unavailable')
          return t('views.status.measurementUnavailable')
        return status.staleSeconds === null || status.staleSeconds === undefined
          ? t('views.status.staleUnknown')
          : t('views.status.stale', { age: duration(status.staleSeconds) })
      case 'loading':
        return status.percent === null || status.percent === undefined
          ? t('views.status.loadingUnknown')
          : t('views.status.loading', { percent: Math.round(status.percent) })
      case 'not-loaded':
        return t('views.status.notLoaded')
    }
  }
}

export function ViewStatus({ status }: { status: ViewFreshness }) {
  const text = useFreshnessText()
  const { t, i18n } = useTranslation()
  const time = (value: string) => new Date(value).toLocaleTimeString(i18n.language)
  return (
    <span className="inline-grid gap-1" title={t('views.measurementNote')}>
      <span className="views-status">
        <span
          className={cn('views-status__dot', `views-status__dot--${status.state}`)}
          aria-hidden="true"
        />
        {text(status)}
      </span>
      <span className="text-muted-foreground text-[11px]">
        {status.observedAt || status.refreshedAt
          ? t('views.status.times', {
              measured: status.observedAt ? time(status.observedAt) : t('views.status.unknownTime'),
              refreshed: status.refreshedAt
                ? time(status.refreshedAt)
                : t('views.status.unknownTime'),
            })
          : t('views.status.timeUnknown')}
      </span>
    </span>
  )
}

/** Where a view is kept, linking to the State stores page. Never shows connection details. */
export function StoredIn({ location }: { location: ViewLocation }) {
  const { t } = useTranslation()
  const label =
    location.storeId === MANAGED_VIEW_STORE_SOURCE_ID
      ? t('views.storedIn.managed')
      : location.database
        ? t('views.storedIn.store', { store: location.storeId, database: location.database })
        : location.storeId
  return (
    <Link to="/settings" className="views-link">
      {label}
    </Link>
  )
}
