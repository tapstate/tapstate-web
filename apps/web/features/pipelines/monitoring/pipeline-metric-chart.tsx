import type { CSSProperties } from 'react'

import { useTranslation } from 'react-i18next'

import type { PipelineMetrics } from '@/service/pipelines/pipeline-client'

type MetricEntry = {
  name: string
  value: number
  ratio: number
}

function metricEntries(metrics: PipelineMetrics | undefined): MetricEntry[] {
  const entries = Object.entries(metrics?.metrics ?? {})
  const maximum = Math.max(...entries.map(([, value]) => Math.abs(value)), 0)

  return entries
    .sort(([, left], [, right]) => Math.abs(right) - Math.abs(left))
    .map(([name, value]) => ({
      name,
      value,
      ratio: maximum === 0 ? 0 : (Math.abs(value) / maximum) * 100,
    }))
}

export function PipelineMetricChart({ metrics }: { metrics: PipelineMetrics | undefined }) {
  const { i18n, t } = useTranslation()
  const entries = metricEntries(metrics)
  const formatter = new Intl.NumberFormat(i18n.language, {
    maximumFractionDigits: 3,
  })

  if (entries.length === 0) {
    return (
      <section className="pipeline-monitoring__empty-chart" aria-live="polite">
        <h2 className="pipeline-monitoring__empty-title">
          {t('pipelines.workspace.runtime.monitoring.noMetricsTitle')}
        </h2>
        <p className="pipeline-monitoring__empty-description">
          {t('pipelines.workspace.runtime.monitoring.noMetricsBody')}
        </p>
      </section>
    )
  }

  return (
    <div
      className="pipeline-monitoring__metric-chart"
      data-testid="pipeline-metric-chart"
      role="list"
      aria-label={t('pipelines.workspace.runtime.monitoring.chartLabel')}
    >
      {entries.map((entry) => (
        <div key={entry.name} className="pipeline-monitoring__metric-row" role="listitem">
          <span className="pipeline-monitoring__metric-name" title={entry.name}>
            {entry.name}
          </span>
          <span className="pipeline-monitoring__metric-track" aria-hidden="true">
            <span
              className="pipeline-monitoring__metric-bar"
              data-sign={entry.value < 0 ? 'negative' : 'positive'}
              style={{ '--pipeline-metric-ratio': `${entry.ratio}%` } as CSSProperties}
            />
          </span>
          <span className="pipeline-monitoring__metric-value">{formatter.format(entry.value)}</span>
        </div>
      ))}
    </div>
  )
}
