import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Bell, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { alertCall, type AlarmRow, type AlertPage, type Health } from '@/service/alert-client'
import { useAuthStore } from '@/stores/auth-store'

import './alerts.css'

export function AlertBell() {
  const { t } = useTranslation()
  const apiFetch = useAuthStore((s) => s.apiFetch)
  const [open, setOpen] = useState(false)
  const shell = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  function close() {
    trigger.current?.focus()
    setOpen(false)
  }
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !shell.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])
  const query = useQuery({
    queryKey: ['alerts', 'bell'],
    queryFn: ({ signal }) =>
      alertCall<AlertPage<AlarmRow>>(apiFetch, 'center', { limit: 5 }, signal),
    refetchInterval: 5000,
  })
  return (
    <div
      className="alert-bell"
      ref={shell}
      onKeyDown={(e) => {
        if (e.key === 'Escape') close()
      }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => {
        if (!shell.current?.contains(document.activeElement)) setOpen(false)
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false)
      }}
    >
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t('alerts.center')}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? 'alert-bell-preview' : undefined}
        ref={trigger}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false)
        }}
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {!query.isError && (query.data?.total ?? 0) > 0 && (
          <span className="alert-count">{query.data?.total}</span>
        )}
      </Button>
      {open && (
        <section
          className="alert-bell-panel"
          id="alert-bell-preview"
          role="dialog"
          aria-modal="false"
          aria-label={t('alerts.preview')}
        >
          <header>
            <strong>
              {t('alerts.active')} ({query.isError ? '—' : (query.data?.total ?? '—')})
            </strong>
            <button aria-label={t('alerts.close')} onClick={close}>
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
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
                  onClick={() => setOpen(false)}
                >
                  <Severity value={row.severity} />
                  <span>
                    {row.resource.id}
                    <small>{t(`alerts.types.${row.typeId}`)}</small>
                  </span>
                </Link>
              ))}
              {query.data?.isolated && <p>{t('alerts.isolated')}</p>}
            </>
          )}
          <Link to="/alerts" onClick={() => setOpen(false)}>
            {t('alerts.viewHistory')}
          </Link>
        </section>
      )}
    </div>
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
      <small>{t('alerts.coverageNote')}</small>
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
