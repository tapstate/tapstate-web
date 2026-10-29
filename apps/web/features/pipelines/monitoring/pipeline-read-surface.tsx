import { Button } from '@tapstate-web/ui/button'
import { Spinner } from '@tapstate-web/ui/spinner'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type {
  PipelineExplain,
  PipelineHistoryPoint,
  PipelineHistorySegment,
  PipelineMetricsHistory,
} from '@/service/pipelines/pipeline-observability-client'

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
  const axisMax = max === min ? min + 1 : max
  const extent = axisMax - min
  const project = (point: { at: string; value: number }) => ({
    ...point,
    x: 48 + ((Date.parse(point.at) - from) / span) * 656,
    y: 16 + ((axisMax - point.value) / extent) * 112,
  })
  const chunks: ReturnType<typeof project>[][] = []

  for (const segment of segments) {
    let chunk: ReturnType<typeof project>[] = []
    for (const point of segment.points) {
      const value = valueFor(point)
      if (value === undefined) {
        if (chunk.length > 0) chunks.push(chunk)
        chunk = []
        continue
      }
      chunk.push(project({ at: point.intervalEnd, value }))
    }
    if (chunk.length > 0) chunks.push(chunk)
  }

  const pathForChunk = (chunk: ReturnType<typeof project>[]) =>
    chunk
      .map(
        (point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)},${point.y.toFixed(2)}`,
      )
      .join(' ')
  const paths = chunks.map(pathForChunk)
  const areaPaths = chunks
    .filter((chunk) => chunk.length > 1)
    .map((chunk) => {
      const line = pathForChunk(chunk)
      const first = chunk[0]!
      const last = chunk.at(-1)!
      return `${line} L${last.x.toFixed(2)},128 L${first.x.toFixed(2)},128 Z`
    })
  const points = chunks.flat()

  return { paths, areaPaths, points, values, min, max: axisMax }
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
  const gradientId = useId().replaceAll(':', '')
  const areaOpacity = metric === 'recordsOut' ? [0.3, 0.1] : [0.2, 0.08]
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
          <div className="pipeline-monitoring__plot">
            <div className="pipeline-monitoring__value-axis" aria-hidden="true">
              <span>{formatter.format(result.max)}</span>
              <span>{formatter.format(result.min)}</span>
            </div>
            <svg
              className="pipeline-monitoring__trend-chart"
              viewBox="40 0 672 148"
              role="group"
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
              <defs>
                <linearGradient id={`${gradientId}-${metric}-area`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={areaOpacity[0]} />
                  <stop offset="100%" stopColor={color} stopOpacity={areaOpacity[1]} />
                </linearGradient>
              </defs>
              {result.areaPaths.map((path, index) => (
                <path
                  key={`${metric}-area-${index}`}
                  d={path}
                  fill={`url(#${gradientId}-${metric}-area)`}
                  stroke="none"
                />
              ))}
              {result.paths.map((path, index) => (
                <path
                  key={`${metric}-${index}`}
                  d={path}
                  fill="none"
                  stroke={color}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {result.points.map((point, index) => {
                const pointLabel = `${formatTime(point.at)} · ${formatter.format(point.value)}`
                return (
                  <circle
                    key={`${metric}-point-${point.at}-${index}`}
                    className="pipeline-monitoring__sample-point"
                    cx={point.x}
                    cy={point.y}
                    r="2"
                    fill={color}
                    tabIndex={0}
                    focusable="true"
                    role="img"
                    aria-label={pointLabel}
                  >
                    <title>{pointLabel}</title>
                  </circle>
                )
              })}
            </svg>
          </div>
          <div className="pipeline-monitoring__chart-axis">
            <span>{formatTime(range.from)}</span>
            <span>{formatTime(range.to)}</span>
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
        <div
          className="pipeline-monitoring__state pipeline-monitoring__inline-loading"
          role="status"
        >
          <Spinner
            aria-label={t('pipelines.workspace.runtime.monitoring.explainLoading')}
            className="text-text-accent"
          />
          {t('pipelines.workspace.runtime.monitoring.explainLoading')}
        </div>
      )}
      {explain.isError && (
        <section className="pipeline-monitoring__state" role="status">
          <p>{t('pipelines.workspace.runtime.monitoring.explainError')}</p>
          <Button size="small" variant="secondary" onClick={() => void explain.refetch()}>
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
                size="small"
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
          <div
            className="pipeline-monitoring__empty-inline pipeline-monitoring__inline-loading"
            role="status"
          >
            <Spinner
              aria-label={t('pipelines.workspace.runtime.monitoring.historyLoading')}
              className="text-text-accent"
            />
            {t('pipelines.workspace.runtime.monitoring.historyLoading')}
          </div>
        ) : history.isError ? (
          <div className="pipeline-monitoring__state pipeline-monitoring__history-error">
            <p>{t('pipelines.workspace.runtime.monitoring.historyError')}</p>
            <Button size="small" variant="secondary" onClick={() => void history.refetch()}>
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
                  size="small"
                  variant="secondary"
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
