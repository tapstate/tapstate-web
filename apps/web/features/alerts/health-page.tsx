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
  const health = query.data
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
      state: 'notIndependentlyMeasured',
      detail: t('alerts.storageHealthNote'),
      to: '/settings',
    },
    {
      id: 'sending',
      state: 'verifyFromDeliveries',
      detail: t('alerts.acceptanceBoundary'),
      to: '/alerts',
    },
    { id: 'cleanup', state: 'inputUnavailable', detail: t('alerts.cleanupPending'), to: null },
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
          <strong>—</strong>
          <small>{t('alerts.notMeasured')}</small>
        </div>
        <div className="alert-health-stat">
          <span>
            {t(
              health?.deployment === 'CLOUD_MANAGED'
                ? 'alerts.managedChannel'
                : 'alerts.deliveryAttention',
            )}
          </span>
          <strong>—</strong>
          <small>{t('alerts.notMeasured')}</small>
        </div>
        <div className="alert-health-stat">
          <span>{t('alerts.lastCleanup')}</span>
          <strong>—</strong>
          <small>{t('alerts.inputUnavailable')}</small>
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
                    className={`alert-state ${row.id === 'evaluation' && !degraded ? 'alert-state--good' : ''}`}
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
