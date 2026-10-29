import { Bell, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { EventSeverity, PlatformEvent } from '../../service/cloud-api'

import { cloudApi } from '../../service/cloud-api'
import { useCloudAppState } from '../../state/cloud-app-state'

function severityClass(severity: EventSeverity) {
  if (severity === 'CRITICAL') return 'bg-red-500'
  if (severity === 'WARNING') return 'bg-amber-500'
  return 'bg-sky-500'
}

function formatTime(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      }).format(date)
}

const PAGE_SIZE = 20

export function EventCenterPage({ embedded = false }: { embedded?: boolean } = {}) {
  const { t } = useTranslation()
  const { activeOrganization } = useCloudAppState()
  const organizationId = activeOrganization?.id
  const [events, setEvents] = useState<PlatformEvent[]>([])
  const [type, setType] = useState('')
  const [severity, setSeverity] = useState<EventSeverity | ''>('')
  const [selected, setSelected] = useState<PlatformEvent | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [pageIndex, setPageIndex] = useState(0)
  const [cursors, setCursors] = useState<(string | null)[]>([null])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const loadSequence = useRef(0)

  const load = useCallback(async () => {
    const sequence = ++loadSequence.current
    if (!organizationId) {
      setEvents([])
      setNextCursor(null)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setHasError(false)
    try {
      const page = await cloudApi.events(organizationId, {
        type: type || undefined,
        severity: severity || undefined,
        limit: PAGE_SIZE,
        cursor: cursors[pageIndex] ?? undefined,
      })
      if (sequence !== loadSequence.current) return
      setEvents(page.items)
      setNextCursor(page.nextCursor ?? null)
      setSelected((current) =>
        current && page.items.some((item) => item.id === current.id) ? current : null,
      )
    } catch {
      if (sequence === loadSequence.current) setHasError(true)
    } finally {
      if (sequence === loadSequence.current) setIsLoading(false)
    }
  }, [cursors, organizationId, pageIndex, severity, type])

  useEffect(() => {
    setEvents([])
    setSelected(null)
  }, [organizationId])

  useEffect(() => {
    setCursors((current) => (current.length === 1 && current[0] === null ? current : [null]))
    setPageIndex((current) => (current === 0 ? current : 0))
  }, [organizationId, severity, type])

  useEffect(() => {
    void load()
    return () => {
      loadSequence.current += 1
    }
  }, [load])

  const goNext = () => {
    if (!nextCursor) return
    setCursors((current) => [...current.slice(0, pageIndex + 1), nextCursor])
    setPageIndex((current) => current + 1)
  }

  const goPrevious = () => {
    if (pageIndex > 0) setPageIndex((current) => current - 1)
  }

  return (
    <div className="flex h-full flex-1 flex-col overflow-y-auto">
      {!embedded && (
        <header className="flex shrink-0 items-center justify-between border-b border-black/[0.05] px-6 py-4 dark:border-white/[0.05]">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">
              <Bell className="h-5 w-5 text-neutral-400" />
              {t('events.title')}
            </h1>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              {t('events.subtitle', {
                organization: activeOrganization?.name ?? t('events.organizationFallback'),
              })}
            </p>
          </div>
          <button
            className="flex items-center gap-1.5 rounded-lg border border-black/[0.08] px-2.5 py-1.5 text-xs text-neutral-600 transition-colors hover:bg-black/[0.03] dark:border-white/[0.08] dark:text-neutral-300 dark:hover:bg-white/[0.04]"
            onClick={() => void load()}
            type="button"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t('events.retry')}
          </button>
        </header>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            aria-label={t('events.filterType')}
            className="h-8 rounded-lg border border-black/[0.08] bg-transparent px-2.5 text-xs outline-none focus:border-neutral-400 dark:border-white/[0.1] dark:text-white"
            onChange={(event) => setType(event.target.value)}
            placeholder={t('events.filterTypePlaceholder')}
            value={type}
          />
          <select
            aria-label={t('events.filterSeverity')}
            className="h-8 rounded-lg border border-black/[0.08] bg-transparent px-2 text-xs outline-none dark:border-white/[0.1] dark:text-white"
            onChange={(event) => setSeverity(event.target.value as EventSeverity | '')}
            value={severity}
          >
            <option value="">{t('events.allSeverities')}</option>
            <option value="INFO">{t('events.severity.INFO')}</option>
            <option value="WARNING">{t('events.severity.WARNING')}</option>
            <option value="CRITICAL">{t('events.severity.CRITICAL')}</option>
          </select>
        </div>
        {embedded && (
          <button
            className="flex items-center gap-1.5 rounded-lg border border-black/[0.08] px-2.5 py-1.5 text-xs text-neutral-600 transition-colors hover:bg-black/[0.03] dark:border-white/[0.08] dark:text-neutral-300 dark:hover:bg-white/[0.04]"
            onClick={() => void load()}
            type="button"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t('events.retry')}
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 px-6 pb-6">
        {isLoading ? (
          <p className="text-xs text-neutral-500">{t('events.loading')}</p>
        ) : hasError ? (
          <p className="text-xs text-red-600 dark:text-red-400">{t('events.loadError')}</p>
        ) : events.length === 0 ? (
          <p className="text-xs text-neutral-500">{t('events.empty')}</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-black/[0.06] dark:border-white/[0.06]">
            <table className="w-full table-fixed text-left text-xs">
              <thead className="bg-black/[0.02] text-[10px] tracking-wider text-neutral-400 uppercase dark:bg-white/[0.03]">
                <tr>
                  <th className="w-40 px-3 py-2 font-medium">{t('events.columns.time')}</th>
                  <th className="px-3 py-2 font-medium">{t('events.columns.type')}</th>
                  <th className="w-24 px-3 py-2 font-medium">{t('events.columns.severity')}</th>
                  <th className="px-3 py-2 font-medium">{t('events.columns.subject')}</th>
                  <th className="w-48 px-3 py-2 font-medium">{t('events.columns.actor')}</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr
                    className="cursor-pointer border-t border-black/[0.05] hover:bg-black/[0.02] dark:border-white/[0.05] dark:hover:bg-white/[0.03]"
                    key={event.id}
                    onClick={() => setSelected(event)}
                  >
                    <td className="px-3 py-2 font-mono text-[11px] text-neutral-500">
                      {formatTime(event.occurredAt)}
                    </td>
                    <td className="truncate px-3 py-2 font-mono text-[11px]">{event.type}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${severityClass(event.severity)}`}
                        />
                        {t(`events.severity.${event.severity}`)}
                      </span>
                    </td>
                    <td className="truncate px-3 py-2 text-neutral-700 dark:text-neutral-200">
                      <button
                        className="w-full truncate text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-500"
                        onClick={() => setSelected(event)}
                        type="button"
                      >
                        {event.subject}
                      </button>
                    </td>
                    <td className="truncate px-3 py-2 text-neutral-500">{event.actor ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && !hasError && (events.length > 0 || pageIndex > 0) && (
          <div className="mt-3 flex items-center justify-end gap-3 text-[11px] text-neutral-500">
            <button
              className="rounded-lg border border-black/[0.08] px-2 py-1 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/[0.1]"
              disabled={pageIndex === 0}
              onClick={goPrevious}
              type="button"
            >
              {t('events.pagination.previous')}
            </button>
            <span>{t('events.pagination.page', { page: pageIndex + 1 })}</span>
            <button
              className="rounded-lg border border-black/[0.08] px-2 py-1 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/[0.1]"
              disabled={!nextCursor}
              onClick={goNext}
              type="button"
            >
              {t('events.pagination.next')}
            </button>
          </div>
        )}

        {selected && (
          <section className="mt-4 rounded-xl border border-black/[0.06] p-4 dark:border-white/[0.06]">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-neutral-900 dark:text-white">
                {t('events.detailTitle')}
              </h2>
              <button
                className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                onClick={() => setSelected(null)}
                type="button"
              >
                {t('events.actions.close')}
              </button>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt className="text-neutral-400">{t('events.columns.type')}</dt>
                <dd className="font-mono">{selected.type}</dd>
              </div>
              <div>
                <dt className="text-neutral-400">{t('events.columns.source')}</dt>
                <dd className="font-mono">{selected.source}</dd>
              </div>
              <div>
                <dt className="text-neutral-400">{t('events.detail.id')}</dt>
                <dd className="font-mono break-all">{selected.id}</dd>
              </div>
              <div>
                <dt className="text-neutral-400">{t('events.columns.actor')}</dt>
                <dd>{selected.actor ?? '—'}</dd>
              </div>
            </dl>
            <h3 className="mt-4 text-[11px] font-medium tracking-wider text-neutral-400 uppercase">
              {t('events.payload')}
            </h3>
            <pre className="mt-1 max-h-64 overflow-auto rounded-lg bg-black/[0.03] p-2 font-mono text-[11px] dark:bg-white/[0.04]">
              {selected.payload && Object.keys(selected.payload).length > 0
                ? JSON.stringify(selected.payload, null, 2)
                : t('events.noPayload')}
            </pre>
          </section>
        )}
      </div>
    </div>
  )
}
