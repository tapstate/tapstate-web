import { StatusDot } from '@tapstate-web/ui/status-dot'
import { Link } from '@tanstack/react-router'
import { Database } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { ConnectorSummary, SourceView } from '@/service/source-client'
import type { ViewFreshness, ViewLocation } from '@/service/view-client'

import { ConnectorIcon } from '@/components/connector-icon'
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
  const dotStatus = {
    fresh: 'success',
    stale: 'warning',
    loading: 'normal',
    'not-loaded': 'disabled',
  } as const
  return (
    <span className="views-status">
      <StatusDot className="views-status__dot rounded-full" status={dotStatus[status.state]} />
      {text(status)}
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

/** A subdued source link for the Views table, with the registered connector mark. */
export function StoredInSourceLink({
  location,
  source,
  connector,
}: {
  location: ViewLocation
  source: SourceView | undefined
  connector: ConnectorSummary | undefined
}) {
  const { t } = useTranslation()
  const label =
    location.storeId === MANAGED_VIEW_STORE_SOURCE_ID
      ? t('views.storedIn.managed')
      : location.database
        ? t('views.storedIn.store', { store: location.storeId, database: location.database })
        : location.storeId

  return (
    <Link
      to="/sources/$sourceId"
      params={{ sourceId: location.storeId }}
      className="views-stored-in"
    >
      {source && connector?.icon ? (
        <ConnectorIcon
          connectorId={source.connector}
          name={connector.name}
          iconPath={connector.icon}
          size={16}
          className="size-4 rounded-none border-0 bg-transparent"
        />
      ) : (
        <Database className="size-4 shrink-0" aria-hidden="true" />
      )}
      <span className="truncate">{label}</span>
    </Link>
  )
}
