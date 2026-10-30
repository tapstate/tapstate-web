import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { PopoverClose, PopoverTrigger } from '@tapstate-web/ui/popover'
import { Bell, X } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent } from '@/components/ui/popover'
import { alertCall, type AlarmRow, type AlertPage, type Health } from '@/service/alert-client'
import { useAuthStore } from '@/stores/auth-store'

import './alerts.css'

export function AlertBell() {
  const { t } = useTranslation()
  const apiFetch = useAuthStore((s) => s.apiFetch)
  const [open, setOpen] = useState(false)
  const triggerId = useId()
  const trigger = useRef<HTMLButtonElement>(null)
  const focusOpened = useRef(false)
  const restoringFocus = useRef(false)
  const closeReason = useRef('')
  const query = useQuery({
    queryKey: ['alerts', 'bell'],
    queryFn: ({ signal }) =>
      alertCall<AlertPage<AlarmRow>>(apiFetch, 'center', { limit: 5 }, signal),
    refetchInterval: 5000,
  })
  return (
    <Popover
      open={open}
      triggerId={triggerId}
      onOpenChange={(next, details) => {
        if (!next && details.reason === 'trigger-press' && focusOpened.current) {
          focusOpened.current = false
          details.cancel()
          return
        }
        focusOpened.current = false
        closeReason.current = details.reason
        setOpen(next)
      }}
    >
      <PopoverTrigger
        id={triggerId}
        ref={trigger}
        onFocus={() => {
          if (restoringFocus.current) {
            restoringFocus.current = false
            return
          }
          if (!open) {
            focusOpened.current = true
            setOpen(true)
          }
        }}
        openOnHover
        delay={0}
        closeDelay={150}
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="alert-bell"
            aria-label={t('alerts.center')}
          />
        }
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {!query.isError && (query.data?.total ?? 0) > 0 && (
          <span className="alert-count">{query.data?.total}</span>
        )}
      </PopoverTrigger>
      <PopoverContent
        finalFocus={() => {
          if (['outside-press', 'focus-out', 'navigation'].includes(closeReason.current))
            return false
          restoringFocus.current = document.activeElement !== trigger.current
          return trigger.current
        }}
        className="alert-bell-panel"
        id="alert-bell-preview"
        role="dialog"
        aria-label={t('alerts.preview')}
      >
        <header>
          <strong>
            {t('alerts.active')} ({query.isError ? '—' : (query.data?.total ?? '—')})
          </strong>
          <PopoverClose
            render={<Button variant="ghost" size="icon-sm" aria-label={t('alerts.close')} />}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </PopoverClose>
        </header>
        <p className="alert-bell-order">{t('alerts.previewOrder')}</p>
        {query.isError ? (
          <p role="alert">{t('alerts.unavailable')}</p>
        ) : query.isPending ? (
          <p>{t('alerts.loading')}</p>
        ) : (
          <>
            {!query.data?.rows.length && <p>{t('alerts.emptyActive')}</p>}
            {query.data?.rows.slice(0, 5).map((row) => (
              <Link
                key={row.key}
                to="/alerts"
                search={{ key: row.key, episode: row.episode }}
                className="alert-preview-row"
                onClick={() => {
                  closeReason.current = 'navigation'
                  setOpen(false)
                }}
              >
                <Severity value={row.severity} />
                <span>
                  {row.resource.id}
                  <small>
                    {t(`alerts.types.${row.typeId}`, { defaultValue: row.typeId })} ·{' '}
                    <AlertDuration from={row.firedAt} />
                  </small>
                </span>
              </Link>
            ))}
            {query.data?.isolated && <p>{t('alerts.isolated')}</p>}
          </>
        )}
        <Link
          to="/alerts"
          search={{ view: (query.data?.total ?? 0) > 0 ? 'active' : 'history' }}
          onClick={() => {
            closeReason.current = 'navigation'
            setOpen(false)
          }}
        >
          {t((query.data?.total ?? 0) > 0 ? 'alerts.viewAll' : 'alerts.viewHistory')}
        </Link>
      </PopoverContent>
    </Popover>
  )
}
export function AlertDuration({ from, to }: { from?: string; to?: string }) {
  const { t } = useTranslation()
  const seconds = from
    ? Math.max(0, Math.floor(((to ? Date.parse(to) : Date.now()) - Date.parse(from)) / 1000))
    : NaN
  return (
    <span>
      {Number.isFinite(seconds)
        ? t(seconds < 60 ? 'alerts.elapsedSeconds' : 'alerts.elapsedMinutes', {
            count: seconds < 60 ? seconds : Math.floor(seconds / 60),
          })
        : '—'}
    </span>
  )
}
export function Severity({ value }: { value: string }) {
  const { t } = useTranslation()
  return (
    <span className={`alert-severity alert-severity--${value.toLowerCase()}`}>
      {t(`alerts.severity.${value}`, { defaultValue: value })}
    </span>
  )
}
export function HealthSummary() {
  const apiFetch = useAuthStore((s) => s.apiFetch)
  const { t } = useTranslation()
  const q = useQuery({
    queryKey: ['alerts', 'health'],
    queryFn: ({ signal }) => alertCall<Health>(apiFetch, 'health', {}, signal),
    refetchInterval: 10000,
  })
  return (
    <Link to="/health" className="alert-health-summary">
      <strong>{t('alerts.systemHealth')}</strong>
      <span>
        {q.isError
          ? t('alerts.unavailable')
          : !q.data
            ? t('alerts.loading')
            : q.data.degraded || q.data.closed
              ? t('alerts.degraded')
              : t('alerts.detectorRunning')}
      </span>
      <small title={t('alerts.coverageNote')}>{t('alerts.coverageShort')}</small>
      <span className="alert-health-link">{t('alerts.viewHealthDetails')}</span>
    </Link>
  )
}
export function Time({ value }: { value?: string | null }) {
  return <time dateTime={value ?? undefined}>{value ? new Date(value).toLocaleString() : '—'}</time>
}

export function AlertTopbar() {
  const apiFetch = useAuthStore((s) => s.apiFetch)
  const { t } = useTranslation()
  const q = useQuery({
    queryKey: ['alerts', 'catalog'],
    queryFn: ({ signal }) =>
      alertCall<import('@/service/alert-client').Catalog>(apiFetch, 'catalog', {}, signal),
  })
  return (
    <header className="app-alert-toolbar">
      <div className="alert-context">
        <span>{t('alerts.currentCluster')}</span>
        <span aria-hidden="true">/</span>
        <strong>{q.data?.clusterId ?? '—'}</strong>
        <span className="alert-scope-tag">{t('alerts.currentScope')}</span>
      </div>
      <div className="alert-topright">
        <span>
          {q.data?.deployment === 'CLOUD_MANAGED'
            ? 'Cloud'
            : q.data?.deployment === 'ON_PREM'
              ? 'OP'
              : '—'}
        </span>
        <AlertBell />
      </div>
    </header>
  )
}
