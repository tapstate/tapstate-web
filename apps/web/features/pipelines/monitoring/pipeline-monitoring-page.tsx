import { Pause, Play, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PipelineClientError, type PipelineRuntimeState } from '@/service/pipelines/pipeline-client'

import { PipelineMetricChart } from './pipeline-metric-chart'
import { usePipelineMonitoringQueries } from './pipeline-monitoring-queries'

function isObservationUnavailable(error: unknown) {
  return error instanceof PipelineClientError && error.status === 404
}

function stateTone(state: PipelineRuntimeState) {
  return state.toLowerCase()
}

export function PipelineMonitoringPage({ pipelineId }: { pipelineId: string }) {
  const { i18n, t } = useTranslation()
  const [autoRefresh, setAutoRefresh] = useState(true)
  const { status, metrics } = usePipelineMonitoringQueries(pipelineId, autoRefresh)
  const isLoading = status.isLoading || metrics.isLoading
  const error = status.error ?? metrics.error
  const hasError = status.isError || metrics.isError
  const lastUpdated = Math.max(status.dataUpdatedAt, metrics.dataUpdatedAt)
  const offsetEntries = Object.entries(metrics.data?.perTableOffset ?? {})
  const metricCount = Object.keys(metrics.data?.metrics ?? {}).length

  if (isLoading) {
    return (
      <div className="pipeline-monitoring__state mt-6" role="status">
        {t('pipelines.workspace.runtime.monitoring.loading')}
      </div>
    )
  }

  if (hasError) {
    const unavailable = isObservationUnavailable(error)
    return (
      <section className="pipeline-monitoring__state mt-6" aria-live="polite">
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
        <Button
          className="mt-4"
          size="sm"
          onClick={() => {
            void status.refetch()
            void metrics.refetch()
          }}
          disabled={status.isFetching || metrics.isFetching}
        >
          <RefreshCw
            className={cn('size-3.5', (status.isFetching || metrics.isFetching) && 'animate-spin')}
            aria-hidden="true"
          />
          {t('pipelines.workspace.runtime.monitoring.refresh')}
        </Button>
      </section>
    )
  }

  return (
    <section className="pipeline-monitoring mt-6">
      <div className="pipeline-monitoring__toolbar">
        <div className="pipeline-monitoring__toolbar-heading">
          <p className="pipeline-monitoring__eyebrow">
            {t('pipelines.workspace.runtime.monitoring.snapshot')}
          </p>
          <p className="pipeline-monitoring__refresh-state" aria-live="polite">
            {autoRefresh
              ? t('pipelines.workspace.runtime.monitoring.active')
              : t('pipelines.workspace.runtime.monitoring.paused')}
            {lastUpdated > 0 &&
              ` · ${t('pipelines.workspace.runtime.monitoring.lastRefreshed', {
                time: new Intl.DateTimeFormat(i18n.language, {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                }).format(lastUpdated),
              })}`}
          </p>
        </div>
        <div className="pipeline-monitoring__actions">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={t('pipelines.workspace.runtime.monitoring.refreshAria')}
            title={t('pipelines.workspace.runtime.monitoring.refresh')}
            onClick={() => {
              void status.refetch()
              void metrics.refetch()
            }}
            disabled={status.isFetching || metrics.isFetching}
          >
            <RefreshCw
              className={cn(
                'size-3.5',
                (status.isFetching || metrics.isFetching) && 'animate-spin',
              )}
              aria-hidden="true"
            />
          </Button>
          <Button
            variant="outline"
            size="sm"
            aria-label={t(
              autoRefresh
                ? 'pipelines.workspace.runtime.monitoring.pauseAria'
                : 'pipelines.workspace.runtime.monitoring.resumeAria',
            )}
            onClick={() => setAutoRefresh((current) => !current)}
          >
            {autoRefresh ? (
              <Pause className="size-3.5" aria-hidden="true" />
            ) : (
              <Play className="size-3.5" aria-hidden="true" />
            )}
            {t(
              autoRefresh
                ? 'pipelines.workspace.runtime.monitoring.pause'
                : 'pipelines.workspace.runtime.monitoring.resume',
            )}
          </Button>
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
          <span
            className="pipeline-monitoring__state-badge"
            data-state={stateTone(status.data.state)}
          >
            <span className="pipeline-monitoring__state-dot" aria-hidden="true" />
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
    </section>
  )
}
