import { useQueryClient } from '@tanstack/react-query'
import FilterEmptyState from '@tapstate-web/ui/filter-empty-state'
import { Spinner } from '@tapstate-web/ui/spinner'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { PipelineClientError } from '@/service/pipelines/pipeline-client'

import { PipelineRefreshButton } from '../components/pipeline-refresh-controls'
import {
  deriveHealth,
  deriveJoinRecomputes,
  deriveKeyFigures,
  deriveNestStages,
  deriveTables,
  groupMetrics,
  lagOutputs,
  runStartedAt,
} from './pipeline-monitoring-model'
import styles from './pipeline-monitoring-page.module.css'
import { usePipelineMonitoringQueries } from './pipeline-monitoring-queries'
import {
  MonitoringAllMetrics,
  MonitoringHealthBanner,
  MonitoringKeyFigures,
  MonitoringTablesSection,
  MonitoringTransformState,
} from './pipeline-monitoring-sections'
import { PipelineReadSurface } from './pipeline-read-surface'

function isObservationUnavailable(error: unknown) {
  return error instanceof PipelineClientError && error.status === 404
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
  const { status, metrics, snapshot, explain, definition } = usePipelineMonitoringQueries(
    pipelineId,
    hasArtifact,
  )
  const [recordsOutRate, setRecordsOutRate] = useState<number | null>(null)
  const isLoading = status.isLoading || metrics.isLoading
  const error = status.error ?? metrics.error
  const hasError = status.isError || metrics.isError
  const lastUpdated = Math.max(status.dataUpdatedAt, metrics.dataUpdatedAt)
  const refreshMonitoring = () => {
    void status.refetch()
    void metrics.refetch()
    void snapshot.refetch()
    void explain.refetch()
    void queryClient.invalidateQueries({ queryKey: ['pipelines', pipelineId, 'metrics-history'] })
  }
  const isFetching =
    status.isFetching || metrics.isFetching || snapshot.isFetching || explain.isFetching
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
            isFetching={isFetching}
            label={refreshLabels.refresh}
            ariaLabel={refreshLabels.refreshAria}
            onRefresh={refreshMonitoring}
          />
        </div>
      </section>
    )
  }

  const health = deriveHealth(status.data, explain.data, snapshot.data)
  const { rows, outputs, showRole, showSource } = deriveTables(
    metrics.data,
    snapshot.data,
    definition.data,
  )

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
                  timeZoneName: 'short',
                }).format(lastUpdated),
              })}
          </p>
        </div>
        <div className="pipeline-monitoring__actions">
          <PipelineRefreshButton
            isFetching={isFetching}
            label={refreshLabels.refresh}
            ariaLabel={refreshLabels.refreshAria}
            onRefresh={refreshMonitoring}
          />
        </div>
      </div>

      <MonitoringHealthBanner health={health} explain={explain.data} />
      <MonitoringKeyFigures
        figures={deriveKeyFigures(metrics.data, snapshot.data)}
        recordsOutRate={recordsOutRate}
      />
      <MonitoringTablesSection
        rows={rows}
        outputs={outputs}
        showRole={showRole}
        showSource={showSource}
      />
      <PipelineReadSurface
        pipelineId={pipelineId}
        tables={lagOutputs(metrics.data)}
        startedAt={runStartedAt(metrics.data)}
        onRecordsOutRate={setRecordsOutRate}
      />
      <MonitoringTransformState
        stages={deriveNestStages(metrics.data)}
        joins={deriveJoinRecomputes(metrics.data)}
      />
      <MonitoringAllMetrics groups={groupMetrics(metrics.data)} />
    </section>
  )
}
