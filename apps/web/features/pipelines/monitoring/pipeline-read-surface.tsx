import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type {
  PipelineExplain,
  PipelineHistoryPoint,
  PipelineHistorySegment,
  PipelineMetricsHistory,
} from '@/service/pipelines/pipeline-observability-client'

import { Button } from '@/components/ui/button'

import {
  usePipelineReadSurfaceQueries,
  type PipelineHistoryWindow,
} from './pipeline-read-surface-queries'

type Range = '1h' | '6h' | '24h' | '7d'

const RANGE_MS: Record<Range, number> = {
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
}

function createWindow(range: Range): PipelineHistoryWindow {
  const to = new Date()
  return { from: new Date(to.getTime() - RANGE_MS[range]).toISOString(), to: to.toISOString() }
}

function pathForSegments(
  segments: PipelineHistorySegment[],
  range: PipelineHistoryWindow,
  valueFor: (point: PipelineHistoryPoint) => number | undefined,
) {
  const from = Date.parse(range.from)
  const span = Math.max(1, Date.parse(range.to) - from)
  const values = segments.flatMap((segment) =>
    segment.points.flatMap((point) => {
      const value = valueFor(point)
      return value === undefined ? [] : [{ at: point.intervalEnd, value }]
    }),
  )
  const max = Math.max(...values.map(({ value }) => value), 0)
  const min = Math.min(...values.map(({ value }) => value), 0)
  const extent = Math.max(1, max - min)
  let commands: string[] = []
  const paths: string[] = []

  for (const segment of segments) {
    for (const point of segment.points) {
      const value = valueFor(point)
      if (value === undefined) {
        if (commands.length > 0) paths.push(commands.join(' '))
        commands = []
        continue
      }
      const x = 48 + ((Date.parse(point.intervalEnd) - from) / span) * 656
      const y = 16 + ((max - value) / extent) * 112
      commands.push(`${commands.length === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`)
    }
    if (commands.length > 0) paths.push(commands.join(' '))
    commands = []
  }

  return { paths, values, min, max }
}

function RateChart({
  history,
  range,
  metric,
  label,
  color,
  formatter,
}: {
  history: PipelineMetricsHistory
  range: PipelineHistoryWindow
  metric: 'recordsOut' | 'bytesOut'
  label: string
  color: string
  formatter: Intl.NumberFormat
}) {
  const { i18n, t } = useTranslation()
  const result = pathForSegments(history.segments, range, (point) => point[metric]?.averageRate)
  const latest = result.values.at(-1)
  const formatTime = (value: string) => {
    const longRange = Date.parse(range.to) - Date.parse(range.from) >= RANGE_MS['24h']
    return new Intl.DateTimeFormat(i18n.language, {
      ...(longRange ? { month: 'short', day: 'numeric' } : {}),
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value))
  }

  return (
    <div className="pipeline-monitoring__trend">
      <div className="pipeline-monitoring__trend-heading">
        <span>{label}</span>
        <strong>
          {latest !== undefined ? formatter.format(latest.value) : '—'}
          <span>{metric === 'recordsOut' ? ' /s' : ' B/s'}</span>
        </strong>
      </div>
      {result.values.length === 0 ? (
        <p className="pipeline-monitoring__empty-inline">
          {t('pipelines.workspace.runtime.monitoring.rateUnavailable', { metric: label })}
        </p>
      ) : (
        <>
          <svg
            className="pipeline-monitoring__trend-chart"
            viewBox="0 0 720 148"
            role="img"
            aria-label={`${label}: ${formatter.format(result.min)} to ${formatter.format(result.max)}`}
            preserveAspectRatio="none"
          >
            {[16, 72, 128].map((y) => (
              <line
                key={y}
                x1="48"
                x2="704"
                y1={y}
                y2={y}
                className="pipeline-monitoring__chart-gridline"
              />
            ))}
            {result.paths.map((path, index) => (
              <path
                key={`${metric}-${index}`}
                d={path}
                fill="none"
                stroke={color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
          <div className="pipeline-monitoring__chart-axis">
            <span>{formatTime(history.effectiveFrom)}</span>
            <span>{formatTime(history.effectiveTo)}</span>
          </div>
        </>
      )}
    </div>
  )
}

function LagSummary({
  history,
  formatter,
}: {
  history: PipelineMetricsHistory
  formatter: Intl.NumberFormat
}) {
  const latestByTable = new Map<string, { observedAt: string; last: number; max: number }>()
  for (const segment of history.segments) {
    for (const point of segment.points) {
      for (const lag of point.lag) {
        const previous = latestByTable.get(lag.table)
        latestByTable.set(lag.table, {
          observedAt: lag.observedAt,
          last: lag.last,
          max: Math.max(previous?.max ?? 0, lag.max),
        })
      }
    }
  }
  const rows = [...latestByTable.entries()].sort(([left], [right]) => left.localeCompare(right))

  if (rows.length === 0) {
    return null
  }

  return (
    <dl className="pipeline-monitoring__lag-list">
      {rows.map(([table, lag]) => (
        <div className="pipeline-monitoring__lag-row" key={table}>
          <dt title={table}>{table}</dt>
          <dd>{formatter.format(lag.last)} s</dd>
          <dd className="pipeline-monitoring__lag-max">max {formatter.format(lag.max)} s</dd>
        </div>
      ))}
    </dl>
  )
}

function ExplainPanel({ explain }: { explain: PipelineExplain | undefined }) {
  const { t } = useTranslation()
  if (!explain) return null

  return (
    <section className="pipeline-monitoring__card pipeline-monitoring__diagnosis">
      <div className="pipeline-monitoring__card-header">
        <div>
          <h2 className="pipeline-monitoring__card-title">
            {t('pipelines.workspace.runtime.monitoring.explainTitle')}
          </h2>
          <p className="pipeline-monitoring__card-description">
            {t(`pipelines.workspace.runtime.monitoring.freshness.${explain.freshness}`)}
            {explain.observedAgeMillis !== undefined &&
              ` · ${t('pipelines.workspace.runtime.monitoring.observationAge', {
                seconds: Math.round(explain.observedAgeMillis / 1000),
              })}`}
          </p>
        </div>
        <span className="pipeline-monitoring__count">
          {t(`pipelines.workspace.runtime.monitoring.explainKind.${explain.kind}`)}
        </span>
      </div>
      <div className="pipeline-monitoring__diagnosis-body">
        <p className="pipeline-monitoring__diagnosis-message">{explain.message}</p>
        {explain.evidence.length > 0 && (
          <div>
            <h3 className="pipeline-monitoring__detail-heading">
              {t('pipelines.workspace.runtime.monitoring.evidence')}
            </h3>
            <dl className="pipeline-monitoring__evidence-list">
              {explain.evidence.map((item, index) => (
                <div key={`${item.source}-${item.field}-${index}`}>
                  <dt>
                    {item.source} · {item.field}
                  </dt>
                  <dd>
                    {typeof item.value === 'string' ? item.value : JSON.stringify(item.value)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
        {explain.cannotSay.length > 0 && (
          <div>
            <h3 className="pipeline-monitoring__detail-heading">
              {t('pipelines.workspace.runtime.monitoring.cannotSay')}
            </h3>
            <ul className="pipeline-monitoring__cannot-say">
              {explain.cannotSay.map((reason, index) => (
                <li key={`${index}-${reason}`}>{reason}</li>
              ))}
            </ul>
          </div>
        )}
        {explain.next && (
          <p className="pipeline-monitoring__next-action">
            <span>{t('pipelines.workspace.runtime.monitoring.nextAction')}</span>
            {explain.next.message}
          </p>
        )}
      </div>
    </section>
  )
}

export function PipelineReadSurface({
  pipelineId,
  tables,
}: {
  pipelineId: string
  tables: string[]
}) {
  const { i18n, t } = useTranslation()
  const [selectedRange, setSelectedRange] = useState<Range>('24h')
  const [window, setWindow] = useState(() => createWindow('24h'))
  const { history, explain, requestedTableCount } = usePipelineReadSurfaceQueries(
    pipelineId,
    window,
    tables,
  )
  const pages = history.data?.pages ?? []
  const firstPage = pages[0]
  const segments = pages.flatMap((page) => page.segments)
  const chartHistory = firstPage
    ? { ...firstPage, segments, gaps: pages.flatMap((page) => page.gaps) }
    : undefined
  const formatter = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2 })
  const unavailableMetrics = [
    ...new Set(pages.flatMap((page) => page.unavailable.map((item) => item.metric))),
  ]
  const resetCount =
    chartHistory?.segments.filter((segment) => segment.startReason === 'COUNTER_RESET').length ?? 0

  return (
    <div className="pipeline-monitoring__read-surfaces">
      <ExplainPanel explain={explain.data} />
      {explain.isLoading && (
        <div className="pipeline-monitoring__state" role="status">
          {t('pipelines.workspace.runtime.monitoring.explainLoading')}
        </div>
      )}
      {explain.isError && (
        <section className="pipeline-monitoring__state" role="status">
          <p>{t('pipelines.workspace.runtime.monitoring.explainError')}</p>
          <Button size="sm" variant="outline" onClick={() => void explain.refetch()}>
            {t('pipelines.workspace.runtime.monitoring.retry')}
          </Button>
        </section>
      )}

      <section className="pipeline-monitoring__card">
        <div className="pipeline-monitoring__card-header pipeline-monitoring__history-header">
          <div>
            <h2 className="pipeline-monitoring__card-title">
              {t('pipelines.workspace.runtime.monitoring.historyTitle')}
            </h2>
            <p className="pipeline-monitoring__card-description">
              {firstPage?.status === 'NO_RETAINED_SAMPLES'
                ? t('pipelines.workspace.runtime.monitoring.noRetainedSamples')
                : t('pipelines.workspace.runtime.monitoring.historyDescription', {
                    resolution: firstPage?.effectiveResolution ?? '—',
                  })}
            </p>
          </div>
          <div
            className="pipeline-monitoring__range"
            role="group"
            aria-label={t('pipelines.workspace.runtime.monitoring.rangeLabel')}
          >
            {(['1h', '6h', '24h', '7d'] as const).map((range) => (
              <Button
                key={range}
                size="sm"
                variant={selectedRange === range ? 'secondary' : 'ghost'}
                aria-pressed={selectedRange === range}
                onClick={() => {
                  setSelectedRange(range)
                  setWindow(createWindow(range))
                }}
              >
                {t(`pipelines.workspace.runtime.monitoring.ranges.${range}`)}
              </Button>
            ))}
          </div>
        </div>

        {history.isLoading ? (
          <p className="pipeline-monitoring__empty-inline" role="status">
            {t('pipelines.workspace.runtime.monitoring.historyLoading')}
          </p>
        ) : history.isError ? (
          <div className="pipeline-monitoring__state pipeline-monitoring__history-error">
            <p>{t('pipelines.workspace.runtime.monitoring.historyError')}</p>
            <Button size="sm" variant="outline" onClick={() => void history.refetch()}>
              {t('pipelines.workspace.runtime.monitoring.retry')}
            </Button>
          </div>
        ) : firstPage?.status === 'NO_RETAINED_SAMPLES' ? null : chartHistory ? (
          <>
            {chartHistory.gaps.length > 0 && (
              <p className="pipeline-monitoring__history-note">
                {t('pipelines.workspace.runtime.monitoring.gapsNote', {
                  count: chartHistory.gaps.length,
                })}
              </p>
            )}
            {resetCount > 0 && (
              <p className="pipeline-monitoring__history-note">
                {t('pipelines.workspace.runtime.monitoring.resetsNote', { count: resetCount })}
              </p>
            )}
            <div className="pipeline-monitoring__trend-grid">
              <RateChart
                history={chartHistory}
                range={window}
                metric="recordsOut"
                label={t('pipelines.workspace.runtime.monitoring.recordsRate')}
                color="var(--pipeline-selection)"
                formatter={formatter}
              />
              <RateChart
                history={chartHistory}
                range={window}
                metric="bytesOut"
                label={t('pipelines.workspace.runtime.monitoring.bytesRate')}
                color="var(--pipeline-status-running-text)"
                formatter={formatter}
              />
            </div>
            <section className="pipeline-monitoring__lag-section">
              <div className="pipeline-monitoring__lag-heading">
                <h3 className="pipeline-monitoring__detail-heading">
                  {t('pipelines.workspace.runtime.monitoring.lagTitle')}
                </h3>
                {requestedTableCount > 20 && (
                  <span className="pipeline-monitoring__card-description">
                    {t('pipelines.workspace.runtime.monitoring.lagTableLimit', { count: 20 })}
                  </span>
                )}
              </div>
              <LagSummary history={chartHistory} formatter={formatter} />
              {chartHistory.segments.every((segment) =>
                segment.points.every((point) => point.lag.length === 0),
              ) && (
                <p className="pipeline-monitoring__empty-inline">
                  {t('pipelines.workspace.runtime.monitoring.noLagSamples')}
                </p>
              )}
            </section>
            {unavailableMetrics.length > 0 && (
              <p className="pipeline-monitoring__history-note">
                {t('pipelines.workspace.runtime.monitoring.unavailableSeries', {
                  metrics: unavailableMetrics.join(', '),
                })}
              </p>
            )}
            {history.hasNextPage && (
              <div className="pipeline-monitoring__load-more">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void history.fetchNextPage()}
                  disabled={history.isFetchingNextPage}
                >
                  {history.isFetchingNextPage
                    ? t('pipelines.workspace.runtime.monitoring.historyLoading')
                    : t('pipelines.workspace.runtime.monitoring.loadMore')}
                </Button>
              </div>
            )}
          </>
        ) : null}
      </section>
    </div>
  )
}
