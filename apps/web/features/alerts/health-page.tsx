import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { alertCall, type Health } from '@/service/alert-client'
import { useAuthStore } from '@/stores/auth-store'

import { Time } from './alert-shared'

export function HealthPage() {
  const { t } = useTranslation()
  const apiFetch = useAuthStore((s) => s.apiFetch)
  const query = useQuery({
    queryKey: ['alerts', 'health'],
    queryFn: ({ signal }) => alertCall<Health>(apiFetch, 'health', {}, signal),
    refetchInterval: 10000,
  })
  if (query.isPending)
    return (
      <section className="alerts-page">
        <header className="alerts-heading">
          <h1>{t('alerts.systemHealth')}</h1>
        </header>
        <p role="status">{t('alerts.loading')}</p>
      </section>
    )
  const health = query.isError ? undefined : query.data
  const maintenance = health?.maintenance
  const measured = maintenance && !maintenance.capacitySampleStale
  const pressure = maintenance
    ? t(`alerts.capacityPressure.${maintenance.pressure}`)
    : t('alerts.notMeasured')
  const degraded = !health || health.degraded || health.closed || query.isError
  const checks = [
    {
      id: 'observations',
      state: query.isError ? 'unavailable' : 'partialCoverage',
      detail:
        health?.coverage.map((c) => t(`alerts.types.${c}`, { defaultValue: c })).join(', ') ??
        t('alerts.unavailable'),
      to: '/alerts',
    },
    {
      id: 'evaluation',
      state: query.isError ? 'unavailable' : degraded ? 'degraded' : 'detectorRunning',
      detail:
        (health?.code ?? t('alerts.evaluationNote')) +
        ` · ${t('alerts.currentProcess')}: ${t('alerts.queuedInputs')} ${health?.queuedInputs ?? '—'}, ${t('alerts.rejected')} ${health?.rejected ?? '—'}`,
      to: '/alerts',
    },
    {
      id: 'storage',
      state: measured
        ? maintenance.degraded
          ? 'degraded'
          : 'maintenanceRunning'
        : 'notIndependentlyMeasured',
      detail: measured
        ? t('alerts.capacityMeasured', {
            bytes: (maintenance.logicalBytes ?? 0) + (maintenance.admissionReservedBytes ?? 0),
            limit: maintenance.capacityBytes,
            pressure,
          })
        : t('alerts.storageHealthNote'),
      to: '/settings',
    },
    {
      id: 'sending',
      state: 'verifyFromDeliveries',
      detail: measured
        ? t('alerts.deliveryMeasured', {
            pending: maintenance.pending ?? 0,
            age: maintenance.oldestPendingAgeSeconds ?? 0,
            failed: maintenance.failed ?? 0,
            exhausted: maintenance.exhausted ?? 0,
          })
        : t('alerts.acceptanceBoundary'),
      to: '/alerts',
    },
    {
      id: 'cleanup',
      state: maintenance?.lastSuccess
        ? maintenance.degraded
          ? 'degraded'
          : 'maintenanceRunning'
        : 'inputUnavailable',
      detail: maintenance
        ? t('alerts.cleanupMeasured', {
            changed: maintenance.changed,
            failures: maintenance.failures,
            age: maintenance.oldestCandidateAgeSeconds,
          })
        : t(query.isError ? 'alerts.unavailable' : 'alerts.cleanupPending'),
      to: null,
    },
  ]
  return (
    <section className="alerts-page">
      <header className="alerts-heading">
        <div>
          <p>{t('alerts.healthPath')}</p>
          <h1>{t('alerts.systemHealth')}</h1>
          <p>{t('alerts.coverageNote')}</p>
        </div>
        <span className="alert-clock">
          {t('alerts.refreshed')} <Time value={health?.refreshedAt} />
        </span>
      </header>
      <div className="alerts-toolbar">
        <div>
          <h2>{t('alerts.alertModule')}</h2>
          <p>{t('alerts.healthScope')}</p>
        </div>
        <Link className="alert-table-action" to="/alerts">
          {t('alerts.viewAlerts')}
        </Link>
      </div>
      {query.isError && (
        <p role="alert" className="alert-warning">
          {t('alerts.unavailable')}
        </p>
      )}
      {health?.degraded && (
        <p className="alert-warning">
          {t('alerts.degraded')} {health.code}
        </p>
      )}
      <div className="alert-health-grid">
        <div className="alert-health-stat">
          <span>{t('alerts.evaluationLag')}</span>
          <strong>
            {health?.evaluationLagMillis == null
              ? '—'
              : `${(health.evaluationLagMillis / 1000).toFixed(1)} s`}
          </strong>
          <small>
            {t('alerts.lastEvaluated')} <Time value={health?.lastEvaluatedAt} />
          </small>
        </div>
        <div className="alert-health-stat">
          <span>
            {t(
              health?.deployment === 'CLOUD_MANAGED'
                ? 'alerts.managedChannel'
                : query.isError
                  ? 'alerts.deliveryQueue'
                  : 'alerts.deliveryAttention',
            )}
          </span>
          <strong>{measured ? (maintenance.pending ?? 0) : '—'}</strong>
          <small>{t('alerts.acceptanceBoundary')}</small>
        </div>
        <div className="alert-health-stat">
          <span>{t('alerts.lastCleanup')}</span>
          <strong>
            <time dateTime={maintenance?.lastSuccess} title={maintenance?.lastSuccess}>
              {maintenance?.lastSuccess
                ? new Date(maintenance.lastSuccess).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  })
                : '—'}
            </time>
          </strong>
          <small>
            {maintenance
              ? t('alerts.cleanupCadence', { minutes: maintenance.cadenceSeconds / 60 })
              : t('alerts.inputUnavailable')}
          </small>
        </div>
      </div>
      <div className="alert-table-wrap">
        <table>
          <thead>
            <tr>
              {['check', 'state', 'guidance', 'actions'].map((key) => (
                <th scope="col" key={key}>
                  {t(`alerts.${key}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {checks.map((row) => (
              <tr key={row.id}>
                <td>{t(`alerts.healthChecks.${row.id}`)}</td>
                <td>
                  <span
                    className={`alert-state ${row.state === 'maintenanceRunning' || (row.id === 'evaluation' && !degraded) ? 'alert-state--good' : ''}`}
                  >
                    {t(`alerts.${row.state}`)}
                  </span>
                </td>
                <td>{row.detail}</td>
                <td>
                  {row.to === '/alerts' ? (
                    <Link
                      className="alert-table-action"
                      to="/alerts"
                      search={row.id === 'sending' ? { view: 'deliveries' } : {}}
                    >
                      {t(row.id === 'sending' ? 'alerts.deliveries' : 'alerts.viewAlerts')}
                    </Link>
                  ) : row.to === '/settings' ? (
                    <Link className="alert-table-action" to="/settings">
                      {t('nav.settings')}
                    </Link>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="alert-note alert-health-foot">{t('alerts.stoppedProcess')}</p>
    </section>
  )
}
