import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { alertCall, type AlarmRow, type AlertPage, type DeliveryRow } from '@/service/alert-client'
import { useAuthStore } from '@/stores/auth-store'

import { AlertSelect } from './alert-select'
import { AlertDuration, Severity, Time } from './alert-shared'

export interface AlertSearch {
  view?: 'active' | 'history' | 'deliveries'
  key?: string
  episode?: number
  channel?: string
  result?: string
  delivery?: string
  severity?: string
  q?: string
  alarm?: string
  alarmEpisode?: number
  endReason?: string
}
export function AlertsPage() {
  const session = useAuthStore((s) => s.sessionRevision)
  return <AlertsContent key={session} />
}
function AlertsContent() {
  const { t } = useTranslation()
  const apiFetch = useAuthStore((s) => s.apiFetch)
  const search = useSearch({ from: '/_authenticated/alerts' })
  const navigate = useNavigate({ from: '/alerts' })
  const view = search.view ?? 'active'
  const [confirmRetry, setConfirmRetry] = useState(false)
  const [copyStatus, setCopyStatus] = useState<{
    key: string
    value: 'copied' | 'copyFallback'
  } | null>(null)
  useEffect(() => {
    setConfirmRetry(false)
    retry.reset()
  }, [search.delivery])
  const page = useInfiniteQuery({
    queryKey: [
      'alerts',
      'center',
      view,
      search.channel,
      search.result,
      search.q,
      search.severity,
      search.alarm,
      search.alarmEpisode,
      search.endReason,
    ],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      alertCall<AlertPage<AlarmRow | DeliveryRow>>(
        apiFetch,
        view === 'deliveries' ? 'deliveries' : 'center',
        {
          ...(view === 'deliveries'
            ? {
                channel: search.channel,
                result: search.result,
                key: search.alarm,
                episode: search.alarmEpisode,
              }
            : {
                view,
                search: search.q?.trim() || undefined,
                severity: search.severity,
                endReason: search.endReason,
              }),
          cursor: pageParam,
          limit: 25,
        },
        signal,
      ),
    getNextPageParam: (p) => p.nextCursor ?? undefined,
    refetchInterval: 5000,
  })
  const detail = useQuery({
    queryKey: ['alerts', 'detail', search.key, search.episode],
    enabled: Boolean(search.key),
    queryFn: ({ signal }) =>
      alertCall<AlarmRow>(apiFetch, 'detail', { key: search.key, episode: search.episode }, signal),
    refetchInterval: 5000,
  })
  const delivery = useQuery({
    queryKey: ['alerts', 'delivery', search.delivery],
    enabled: Boolean(search.delivery),
    queryFn: ({ signal }) =>
      alertCall<DeliveryRow>(apiFetch, 'deliveries', { id: search.delivery }, signal),
    refetchInterval: 5000,
  })
  const retry = useMutation({
    mutationFn: (r: DeliveryRow) => alertCall(apiFetch, 'retry', { id: r.id, etag: r.etag }),
    onSuccess: () => {
      void delivery.refetch()
      void page.refetch()
    },
  })
  const catalog = useQuery({
    queryKey: ['alerts', 'catalog'],
    queryFn: ({ signal }) =>
      alertCall<import('@/service/alert-client').Catalog>(apiFetch, 'catalog', {}, signal),
  })
  const onPrem = catalog.data?.deployment === 'ON_PREM'
  const managed = catalog.data?.deployment === 'CLOUD_MANAGED'
  function update(next: Partial<AlertSearch>) {
    void navigate({ search: { ...search, ...next } })
  }
  const rows = page.data?.pages.flatMap((p) => p.rows) ?? []
  const traceKey =
    detail.data?.key + ':' + detail.data?.episode + ':' + detail.data?.diagnostics?.observedAt
  async function copyTrace() {
    const text = detail.data?.diagnostics?.text
    if (!text) return
    const key = traceKey
    try {
      await navigator.clipboard.writeText(text)
      setCopyStatus({ key, value: 'copied' })
    } catch {
      const pre = document.getElementById('current-alert-stack')
      if (pre) {
        const range = document.createRange()
        range.selectNodeContents(pre)
        const selection = window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)
      }
      setCopyStatus({ key, value: 'copyFallback' })
    }
  }

  return (
    <section className="alerts-page">
      <header className="alerts-heading">
        <div>
          <h1>{t('alerts.center')}</h1>
          <p>{t('alerts.automatic')}</p>
        </div>
        <Link to="/settings/alerts" className="alert-table-action">
          {t('alerts.configuration')}
        </Link>
      </header>
      {view !== 'deliveries' && (
        <div className="alert-center-toolbar">
          {' '}
          {!search.delivery && (
            <div className="alert-page-actions">
              <div className="alert-segment" role="tablist" aria-label={t('alerts.center')}>
                {(['active', 'history'] as const).map((v) => (
                  <button
                    role="tab"
                    aria-selected={v === view}
                    key={v}
                    onClick={() => update({ view: v, key: undefined, delivery: undefined })}
                  >
                    {t(`alerts.${v}`)}
                    {v === view && page.data?.pages[0]?.total !== undefined && (
                      <span>{page.data.pages[0].total}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="alert-filters">
            <label className="alert-search-label">
              <input
                aria-label={t('alerts.search')}
                placeholder={t('alerts.search')}
                value={search.q ?? ''}
                maxLength={128}
                onChange={(e) => update({ q: e.target.value || undefined, key: undefined })}
              />
            </label>
            <label>
              {t('alerts.filterSeverity')}
              <AlertSelect
                value={search.severity ?? ''}
                onChange={(e) => update({ severity: e.target.value || undefined, key: undefined })}
              >
                <option value="">{t('alerts.allSeverities')}</option>
                {['CRITICAL', 'MAJOR', 'MINOR', 'WARNING'].map((v) => (
                  <option key={v} value={v}>
                    {t(`alerts.severity.${v}`)}
                  </option>
                ))}
              </AlertSelect>
            </label>
          </div>
        </div>
      )}
      {view === 'history' && (
        <div className="alert-filters">
          <label>
            {t('alerts.endReason')}
            <AlertSelect
              value={search.endReason ?? 'RECOVERED'}
              onChange={(e) => update({ endReason: e.target.value, key: undefined })}
            >
              {['RECOVERED', 'DISABLED', 'SUPERSEDED', 'RESOURCE_REMOVED'].map((v) => (
                <option value={v} key={v}>
                  {t(`alerts.endReasons.${v}`)}
                </option>
              ))}
            </AlertSelect>
          </label>
        </div>
      )}
      {view === 'deliveries' && !search.delivery && (
        <div className="alerts-toolbar">
          <h2>{t('alerts.deliveries')}</h2>
          <Button variant="ghost" onClick={() => update({ view: 'active', delivery: undefined })}>
            {t('alerts.backToAlerts')}
          </Button>
        </div>
      )}
      {view === 'deliveries' && !search.delivery && (
        <div className="alert-filters">
          <label>
            {t('alerts.channel')}
            <AlertSelect
              value={search.channel ?? ''}
              onChange={(e) =>
                update({ channel: e.target.value || undefined, delivery: undefined })
              }
            >
              <option value="">{t('alerts.all')}</option>
              {(managed ? ['cloud-sdk'] : onPrem ? ['email', 'webhook'] : []).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </AlertSelect>
          </label>
          <label>
            {t('alerts.result')}
            <AlertSelect
              value={search.result ?? ''}
              onChange={(e) => update({ result: e.target.value || undefined, delivery: undefined })}
            >
              <option value="">{t('alerts.all')}</option>
              {[
                'ACCEPTED',
                'WAITING_RETRY',
                'UNKNOWN',
                'PAUSED',
                'CANCELLED',
                'EXHAUSTED',
                'NOT_ACCEPTED',
              ].map((v) => (
                <option value={v} key={v}>
                  {t(`alerts.results.${v}`)}
                </option>
              ))}
            </AlertSelect>
          </label>
        </div>
      )}
      <div
        className={
          view === 'deliveries'
            ? 'alert-center-layout alert-center-layout--single'
            : 'alert-center-layout'
        }
      >
        {!search.delivery && (
          <div className="alert-panel">
            {page.isError && <p role="alert">{t('alerts.unavailable')}</p>}
            {page.isPending && <p>{t('alerts.loading')}</p>}
            {!page.isPending && !page.isError && !rows.length && (
              <p>{t(view === 'active' ? 'alerts.emptyActive' : 'alerts.emptyHistory')}</p>
            )}
            {page.data?.pages.some((p) => p.isolated) && (
              <p className="alert-warning">{t('alerts.isolated')}</p>
            )}
            {view === 'deliveries' ? (
              <DeliveryTable
                rows={rows.filter((r): r is DeliveryRow => 'channel' in r)}
                onOpen={(r) => update({ delivery: r.id })}
              />
            ) : (
              rows
                .filter((r): r is AlarmRow => !('channel' in r))
                .map((row) => (
                  <button
                    key={`${row.key}-${row.episode}`}
                    className={`alert-alarm-row ${search.key === row.key && search.episode === row.episode ? 'alert-alarm-row--selected' : ''}`}
                    onClick={() => update({ key: row.key, episode: row.episode })}
                  >
                    <span className="alert-row-heading">
                      <Severity value={row.severity} />
                      <span className="alert-row-age">
                        {view === 'active' ? (
                          <AlertDuration from={row.firedAt} />
                        ) : (
                          <Time value={row.recoveredAt ?? row.endedAt} />
                        )}
                      </span>
                    </span>
                    <strong className="alert-row-title">
                      {t(`alerts.types.${row.typeId}`, { defaultValue: row.typeId })}
                    </strong>
                    <span className="alert-row-resource">
                      {row.resource.id}
                      {row.quality && row.quality !== 'VALID' && (
                        <span className="alert-state">{t('alerts.observationInterrupted')}</span>
                      )}
                    </span>
                  </button>
                ))
            )}
            {page.hasNextPage && (
              <Button
                variant="outline"
                disabled={page.isFetchingNextPage}
                onClick={() => void page.fetchNextPage()}
              >
                {t('alerts.more')}
              </Button>
            )}
          </div>
        )}
        {view !== 'deliveries' && !search.key && (
          <aside className="alert-panel alert-select-detail">{t('alerts.selectAlert')}</aside>
        )}
        {search.key && (
          <aside className="alert-panel" aria-label={t('alerts.detail')}>
            {detail.isError && <p role="alert">{t('alerts.unavailable')}</p>}
            {detail.data && (
              <>
                <div className="alert-detail-state">
                  <Severity value={detail.data.severity} />
                  <span className="alert-state">{t(`alerts.status.${detail.data.status}`)}</span>
                </div>
                <h2>
                  {t(`alerts.types.${detail.data.typeId}`, { defaultValue: detail.data.typeId })}
                </h2>
                <p>{detail.data.resource.id}</p>
                {detail.data.quality && detail.data.quality !== 'VALID' && (
                  <p className="alert-warning">{t('alerts.unknownObservation')}</p>
                )}
                <dl className="alert-kv">
                  <dt>{t('alerts.occurred')}</dt>
                  <dd>
                    <Time value={detail.data.firedAt} />
                  </dd>
                  <dt>{t('alerts.elapsedDuration')}</dt>
                  <dd>
                    <AlertDuration
                      from={detail.data.firedAt}
                      to={detail.data.recoveredAt ?? detail.data.endedAt}
                    />
                  </dd>
                  <dt>{t('alerts.observed')}</dt>
                  <dd>
                    <Time value={detail.data.observedAt} />
                  </dd>
                  <dt>{t('alerts.recovered')}</dt>
                  <dd>
                    <Time value={detail.data.recoveredAt} />
                  </dd>
                </dl>
                {detail.data.endReason && <p>{t(`alerts.endReasons.${detail.data.endReason}`)}</p>}
                <h3>
                  {t(
                    detail.data.status === 'RECOVERED' ? 'alerts.recoveryReason' : 'alerts.reason',
                  )}
                </h3>
                <p>
                  {detail.data.status === 'RECOVERED'
                    ? detail.data.recovery
                    : (detail.data.diagnostics?.text?.split('\n')[0] ?? detail.data.condition)}
                </p>
                <h3>{t('alerts.troubleshooting')}</h3>
                <p>{detail.data.guidance}</p>
                <details className="alert-decision-details">
                  <summary>{t('alerts.basis')}</summary>
                  {detail.data.thresholds ? (
                    <dl>
                      {Object.entries(detail.data.thresholds).map(([k, v]) => (
                        <div key={k}>
                          <dt>{t(`alerts.parameters.${k}`, { defaultValue: k })} (s)</dt>
                          <dd>{v}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p>{t('alerts.originalParametersUnavailable')}</p>
                  )}
                  <dl>
                    {Object.entries(detail.data.basis ?? {}).map(([k, v]) => (
                      <div key={k}>
                        <dt>{t(`alerts.basisFields.${k}`, { defaultValue: k })}</dt>
                        <dd>{v == null ? '—' : String(v)}</dd>
                      </div>
                    ))}
                  </dl>
                </details>
                {detail.data.diagnostics?.text ? (
                  <details>
                    <summary>{t('alerts.stack')}</summary>
                    <Time value={detail.data.diagnostics.observedAt} />
                    <Button variant="ghost" onClick={() => void copyTrace()}>
                      {t('alerts.copy')}
                    </Button>
                    <pre id="current-alert-stack" className="alert-stack">
                      {detail.data.diagnostics.text}
                    </pre>
                    {copyStatus?.key === traceKey && (
                      <p role="status">{t(`alerts.${copyStatus.value}`)}</p>
                    )}
                    {detail.data.diagnostics.truncated && <p>{t('alerts.truncated')}</p>}
                  </details>
                ) : (
                  <p>
                    {t(`alerts.diagnostics.${detail.data.diagnostics?.status ?? 'NOT_CAPTURED'}`)}
                  </p>
                )}
                <Button
                  variant="outline"
                  onClick={() =>
                    update({
                      view: 'deliveries',
                      alarm: search.key,
                      alarmEpisode: search.episode,
                      key: undefined,
                    })
                  }
                >
                  {t('alerts.deliveries')}
                </Button>
              </>
            )}
          </aside>
        )}
        {search.delivery && (
          <aside className="alert-panel" aria-label={t('alerts.deliveryDetail')}>
            <Button variant="ghost" onClick={() => update({ delivery: undefined })}>
              {t('alerts.back')}
            </Button>
            {delivery.isError && <p role="alert">{t('alerts.unavailable')}</p>}
            {delivery.data && (
              <>
                <h2>{delivery.data.title ?? t('alerts.deliveryDetail')}</h2>
                <p>
                  {t('alerts.target')}: {delivery.data.target ?? '—'}
                </p>
                <p>
                  {delivery.data.channel} · <DeliveryResult value={delivery.data} />
                </p>
                <p>
                  {delivery.data.source === 'sdk-event-center'
                    ? t('alerts.cloudAccepted')
                    : localPlaceholder(delivery.data)
                      ? t('alerts.placeholder')
                      : t('alerts.acceptanceBoundary')}
                </p>
                {delivery.data.eventId && (
                  <p>
                    {t('alerts.eventId')}: {delivery.data.eventId}
                  </p>
                )}
                <p>
                  {t('alerts.deadline')}: <Time value={delivery.data.deadline} />
                </p>
                <p>
                  {t('alerts.nextAttempt')}: <Time value={delivery.data.nextAttemptAt} />
                </p>
                <details>
                  <summary>{t('alerts.technical')}</summary>
                  <code>{delivery.data.id}</code>
                </details>
                <dl className="alert-kv">
                  <dt>{t('alerts.occurred')}</dt>
                  <dd>
                    <Time value={delivery.data.createdAt} />
                  </dd>
                  <dt>{t('alerts.attemptLimit')}</dt>
                  <dd>{delivery.data.attempts}</dd>
                </dl>
                <h3>{t('alerts.recentSending')}</h3>
                <ol className="alert-timeline">
                  {delivery.data.attemptHistory?.map((a) => (
                    <li key={a.number}>
                      {a.number} ·{' '}
                      {t(
                        localPlaceholder(delivery.data!) && a.outcome === 'ACCEPTED'
                          ? 'alerts.placeholder'
                          : `alerts.results.${a.outcome}`,
                      )}{' '}
                      · <Time value={a.endedAt} />
                      <small>
                        {a.phase && t(`alerts.phases.${a.phase}`, { defaultValue: a.phase })}
                        {a.status ? ` · ${a.status}` : ''}
                      </small>
                    </li>
                  ))}
                  <li>
                    {t('alerts.notificationCreated')} · <Time value={delivery.data.createdAt} />
                  </li>
                </ol>
                {onPrem && delivery.data.canRetry && (
                  <>
                    <p className="alert-warning">{t('alerts.retryRisk')}</p>
                    <Button
                      disabled={retry.isPending || retry.isSuccess}
                      onClick={() => setConfirmRetry(true)}
                    >
                      {retry.isSuccess ? t('alerts.queued') : t('alerts.retry')}
                    </Button>
                  </>
                )}
                {retry.isError && <p role="alert">{t('alerts.refused')}</p>}
              </>
            )}
          </aside>
        )}
      </div>
      <Dialog open={confirmRetry} onOpenChange={setConfirmRetry}>
        <DialogContent showCloseButton={false}>
          <DialogTitle>{t('alerts.retry')}</DialogTitle>
          <DialogDescription>{t('alerts.retryRisk')}</DialogDescription>
          <p>
            {t('alerts.deadline')}: <Time value={delivery.data?.deadline} />
          </p>
          <div className="alert-actions">
            <Button variant="outline" onClick={() => setConfirmRetry(false)}>
              {t('alerts.cancel')}
            </Button>
            <Button
              disabled={retry.isPending}
              onClick={() => {
                if (delivery.data) retry.mutate(delivery.data)
                setConfirmRetry(false)
              }}
            >
              {t('alerts.confirmRetry')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
function DeliveryTable({
  rows,
  onOpen,
}: {
  rows: DeliveryRow[]
  onOpen: (r: DeliveryRow) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="alert-table-wrap">
      <table>
        <thead>
          <tr>
            {['notification', 'channel', 'result', 'attempts', 'actions'].map((k) => (
              <th scope="col" key={k}>
                {t(`alerts.${k}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                <strong>{r.title ?? t('alerts.contentExpired')}</strong>
                <small>{r.resources?.join(', ')}</small>
                <small>
                  {t('alerts.target')}: {r.target ?? '—'}
                </small>
                <small>
                  <Time value={r.createdAt} />
                </small>
              </td>
              <td>
                {r.channel === 'email'
                  ? 'Email'
                  : r.channel === 'webhook'
                    ? 'Webhook'
                    : t('alerts.managedChannel')}
              </td>
              <td>
                <span className="alert-state">
                  <DeliveryResult value={r} />
                </span>
                {r.source === 'sdk-event-center' && <small>{t('alerts.cloudAccepted')}</small>}
              </td>
              <td>
                {r.attempts}
                <small>{r.nextAttemptAt && <Time value={r.nextAttemptAt} />}</small>
              </td>
              <td>
                <button className="alert-table-action" onClick={() => onOpen(r)}>
                  {t('alerts.detail')}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function localPlaceholder(value: DeliveryRow) {
  return (
    value.channel === 'cloud-sdk' &&
    value.outcome === 'ACCEPTED' &&
    value.source !== 'sdk-event-center'
  )
}
function DeliveryResult({ value }: { value: DeliveryRow }) {
  const { t } = useTranslation()
  return (
    <>
      {t(localPlaceholder(value) ? 'alerts.placeholder' : `alerts.results.${value.displayState}`, {
        defaultValue: value.displayState,
      })}
    </>
  )
}
