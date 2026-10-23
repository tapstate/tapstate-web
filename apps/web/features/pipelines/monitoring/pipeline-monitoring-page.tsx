import FilterEmptyState from '@langgenius/dify-ui/filter-empty-state'
import { Spinner } from '@langgenius/dify-ui/spinner'
import { StatusDot, type StatusDotStatus } from '@langgenius/dify-ui/status-dot'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { PipelineClientError, type PipelineCatalogState } from '@/service/pipelines/pipeline-client'

import { PipelineRefreshButton } from '../components/pipeline-refresh-controls'
import { PipelineMetricChart } from './pipeline-metric-chart'
import styles from './pipeline-monitoring-page.module.css'
import { usePipelineMonitoringQueries } from './pipeline-monitoring-queries'
import { PipelineReadSurface } from './pipeline-read-surface'

function isObservationUnavailable(error: unknown) {
  return error instanceof PipelineClientError && error.status === 404
}

const stateDotStatus: Record<PipelineCatalogState, StatusDotStatus> = {
  DRAFT: 'disabled',
  NEW: 'normal',
  STARTING: 'normal',
  RUNNING: 'success',
  PAUSING: 'warning',
  PAUSED: 'warning',
  RESUMING: 'normal',
  STOPPING: 'warning',
  STOPPED: 'disabled',
  COMPLETED: 'success',
  FAILED: 'error',
  UNAVAILABLE: 'disabled',
}

export function PipelineMonitoringPage({
  pipelineId,
  hasArtifact = true,
}: {
  pipelineId: string
  hasArtifact?: boolean
}) {
  const { i18n, t } = useTranslation()
  const queryClient = useQueryClient()
  const { status, metrics } = usePipelineMonitoringQueries(pipelineId, hasArtifact)
  const isLoading = status.isLoading || metrics.isLoading
  const error = status.error ?? metrics.error
  const hasError = status.isError || metrics.isError
  const lastUpdated = Math.max(status.dataUpdatedAt, metrics.dataUpdatedAt)
  const offsetEntries = Object.entries(
    metrics.data?.targetAckedPosition ?? metrics.data?.perTableOffset ?? {},
  )
  const metricCount = Object.keys(metrics.data?.metrics ?? {}).length
  const refreshMonitoring = () => {
    void status.refetch()
    void metrics.refetch()
    void queryClient.invalidateQueries({ queryKey: ['pipelines', pipelineId, 'metrics-history'] })
    void queryClient.invalidateQueries({ queryKey: ['pipelines', pipelineId, 'explain'] })
  }
  const refreshLabels = {
    refresh: t('pipelines.workspace.runtime.monitoring.refresh'),
    refreshAria: t('pipelines.workspace.runtime.monitoring.refreshAria'),
  }

  if (!hasArtifact) {
    return (
      <section className={`${styles.page} ${styles.emptyState} mt-6`} role="status">
        <FilterEmptyState
          className="[&_p]:max-w-full [&>div:last-child>div]:max-w-full"
          title={
            <span className="block max-w-100 text-center whitespace-normal">
              <span className="system-sm-semibold text-text-secondary block">
                {t('pipelines.workspace.runtime.monitoring.draftTitle')}
              </span>
              <span className="mt-2 block">
                {t('pipelines.workspace.runtime.monitoring.draftBody')}
              </span>
            </span>
          }
        />
      </section>
    )
  }

  if (isLoading) {
    return (
      <div
        className={`${styles.page} ${styles.loadingState} pipeline-monitoring__state mt-6`}
        role="status"
        aria-busy="true"
      >
        <Spinner
          aria-label={t('pipelines.workspace.runtime.monitoring.loading')}
          className="text-text-accent"
        />
        {t('pipelines.workspace.runtime.monitoring.loading')}
      </div>
    )
  }

  if (hasError) {
    const unavailable = isObservationUnavailable(error)
    return (
      <section className={`${styles.page} pipeline-monitoring__state mt-6`} aria-live="polite">
        <h2 className="pipeline-monitoring__state-title">
          {t(
            unavailable
              ? 'pipelines.workspace.runtime.monitoring.unavailableTitle'
              : 'pipelines.workspace.runtime.monitoring.errorTitle',
          )}
        </h2>
        <p className="pipeline-monitoring__state-description">
          {t(
            unavailable
              ? 'pipelines.workspace.runtime.monitoring.unavailableBody'
              : 'pipelines.workspace.runtime.monitoring.errorBody',
          )}
        </p>
        <div className="mt-4">
          <PipelineRefreshButton
            isFetching={status.isFetching || metrics.isFetching}
            label={refreshLabels.refresh}
            ariaLabel={refreshLabels.refreshAria}
            onRefresh={refreshMonitoring}
          />
        </div>
      </section>
    )
  }

  return (
    <section className={`${styles.page} pipeline-monitoring mt-6`}>
      <div className="pipeline-monitoring__toolbar">
        <div className="pipeline-monitoring__toolbar-heading">
          <p className="pipeline-monitoring__eyebrow">
            {t('pipelines.workspace.runtime.monitoring.snapshot')}
          </p>
          <p className="pipeline-monitoring__refresh-state" aria-live="polite">
            {lastUpdated > 0 &&
              t('pipelines.workspace.runtime.monitoring.lastRefreshed', {
                time: new Intl.DateTimeFormat(i18n.language, {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                }).format(lastUpdated),
              })}
          </p>
        </div>
        <div className="pipeline-monitoring__actions">
          <PipelineRefreshButton
            isFetching={status.isFetching || metrics.isFetching}
            label={refreshLabels.refresh}
            ariaLabel={refreshLabels.refreshAria}
            onRefresh={refreshMonitoring}
          />
        </div>
      </div>

      <div className="pipeline-monitoring__summary">
        <div className="pipeline-monitoring__summary-copy">
          <span className="pipeline-monitoring__summary-label">
            {t('pipelines.workspace.runtime.state')}
          </span>
          <span className="pipeline-monitoring__summary-pipeline">{pipelineId}</span>
        </div>
        {status.data && (
          <span className="system-xs-medium text-text-secondary inline-flex shrink-0 items-center gap-1.5">
            <StatusDot
              className="rounded-full"
              size="small"
              status={stateDotStatus[status.data.state]}
            />
            {t(`pipelines.workspace.runtime.states.${status.data.state}`)}
          </span>
        )}
      </div>

      {status.data?.failure && (
        <div className="pipeline-monitoring__failure">
          <p className="pipeline-monitoring__failure-code">{status.data.failure.code}</p>
          <p className="pipeline-monitoring__failure-message">{status.data.failure.message}</p>
        </div>
      )}

      <div className="pipeline-monitoring__grid">
        <section className="pipeline-monitoring__card pipeline-monitoring__card--metrics">
          <div className="pipeline-monitoring__card-header">
            <div>
              <h2 className="pipeline-monitoring__card-title">
                {t('pipelines.workspace.runtime.monitoring.metricsTitle')}
              </h2>
              <p className="pipeline-monitoring__card-description">
                {t('pipelines.workspace.runtime.monitoring.metricsBody')}
              </p>
            </div>
            <span className="pipeline-monitoring__count">
              {t('pipelines.workspace.runtime.monitoring.metricCount', { count: metricCount })}
            </span>
          </div>
          <PipelineMetricChart metrics={metrics.data} />
        </section>

        <section className="pipeline-monitoring__card">
          <div className="pipeline-monitoring__card-header">
            <div>
              <h2 className="pipeline-monitoring__card-title">
                {t('pipelines.workspace.runtime.monitoring.offsetsTitle')}
              </h2>
              <p className="pipeline-monitoring__card-description">
                {t('pipelines.workspace.runtime.monitoring.offsetsBody')}
              </p>
            </div>
          </div>
          {offsetEntries.length === 0 ? (
            <p className="pipeline-monitoring__empty-inline">
              {t('pipelines.workspace.runtime.monitoring.noOffsets')}
            </p>
          ) : (
            <dl className="pipeline-monitoring__offset-list">
              {offsetEntries.map(([table, offset]) => (
                <div key={table} className="pipeline-monitoring__offset-row">
                  <dt title={table}>{table}</dt>
                  <dd title={offset}>{offset}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      </div>

      <PipelineReadSurface
        pipelineId={pipelineId}
        tables={Object.keys(
          metrics.data?.targetAckedPosition ?? metrics.data?.perTableOffset ?? {},
        ).sort()}
      />
    </section>
  )
}
