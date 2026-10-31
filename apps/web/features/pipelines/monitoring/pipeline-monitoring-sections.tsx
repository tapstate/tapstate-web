import { Button } from '@tapstate-web/ui/button'
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from '@tapstate-web/ui/collapsible'
import { Pagination } from '@tapstate-web/ui/pagination'
import { SearchInput } from '@tapstate-web/ui/search-input'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { PipelineExplain } from '@/service/pipelines/pipeline-observability-client'

import { formatBytes } from '@/features/views/views-model'

import {
  formatCount,
  formatDuration,
  formatMetricValue,
  formatPercent,
  formatRate,
} from './pipeline-monitoring-format'
import {
  STALL_THRESHOLD_MS,
  type JoinRecompute,
  type KeyFigures,
  type MetricGroup,
  type MonitoringHealth,
  type MonitoringOutput,
  type MonitoringTableRow,
  type NestStage,
} from './pipeline-monitoring-model'

const PAGE_SIZE = 25
const T = 'pipelines.workspace.runtime.monitoring'

export function MonitoringHealthBanner({
  health,
  explain,
}: {
  health: MonitoringHealth
  explain: PipelineExplain | undefined
}) {
  const { i18n, t } = useTranslation()
  const locale = i18n.language
  const title = (() => {
    switch (health.kind) {
      case 'loading': {
        const loading = health.loading!
        const read = formatCount(loading.rowsRead ?? 0, locale)
        return loading.rowsTotal === null
          ? t(`${T}.health.loading.titleNoTotal`, { table: loading.table, read })
          : t(`${T}.health.loading.title`, {
              table: loading.table,
              read,
              total: formatCount(loading.rowsTotal, locale),
              percent: formatPercent(loading.rowsRead ?? 0, loading.rowsTotal, locale),
            })
      }
      case 'stalled': {
        const longest = Math.max(0, ...(health.stalledTables ?? []).map((table) => table.stalledMs))
        return t(`${T}.health.stalled.title`, {
          tables: (health.stalledTables ?? []).map((table) => table.table).join(', '),
          duration: formatDuration(longest, locale),
        })
      }
      default:
        return t(`${T}.health.${health.kind}.title`)
    }
  })()
  const body = (() => {
    switch (health.kind) {
      case 'loading':
        return t(`${T}.health.loading.body`, {
          landed: health.landedTables ?? 0,
          total: health.totalTables ?? 0,
        })
      case 'failed':
        return health.failureCode
          ? t(`${T}.health.failed.bodyWithCode`, { code: health.failureCode })
          : t(`${T}.health.failed.body`)
      default:
        return t(`${T}.health.${health.kind}.body`)
    }
  })()

  return (
    <section
      className="pipeline-monitoring__health"
      data-tone={health.tone}
      aria-labelledby="pipeline-monitoring-health-title"
      role={health.tone === 'error' || health.tone === 'warning' ? 'alert' : 'status'}
    >
      <span
        className={`pipeline-monitoring__health-icon ${iconFor(health.kind)}`}
        aria-hidden="true"
      />
      <div className="pipeline-monitoring__health-copy">
        <h2 id="pipeline-monitoring-health-title" className="pipeline-monitoring__health-title">
          {title}
        </h2>
        <p className="pipeline-monitoring__health-body">{body}</p>
        {health.next && health.kind !== 'healthy' && (
          <p className="pipeline-monitoring__health-body">
            <span className="pipeline-monitoring__health-label">{t(`${T}.health.nextStep`)}</span>{' '}
            {health.next}
          </p>
        )}
        {explain && (explain.evidence.length > 0 || explain.cannotSay.length > 0) && (
          <Collapsible className="pipeline-monitoring__health-details">
            <CollapsibleTrigger className="pipeline-monitoring__disclosure">
              <span
                className="i-ri-arrow-right-s-line pipeline-monitoring__disclosure-icon"
                aria-hidden="true"
              />
              {t(`${T}.health.details`)}
            </CollapsibleTrigger>
            <CollapsiblePanel>
              <p className="pipeline-monitoring__health-body">{explain.message}</p>
              {explain.evidence.length > 0 && (
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
              )}
              {explain.cannotSay.length > 0 && (
                <ul className="pipeline-monitoring__cannot-say">
                  {explain.cannotSay.map((reason, index) => (
                    <li key={`${index}-${reason}`}>{reason}</li>
                  ))}
                </ul>
              )}
            </CollapsiblePanel>
          </Collapsible>
        )}
      </div>
      {health.observedAgeMillis !== null && health.observedAgeMillis !== undefined && (
        <p className="pipeline-monitoring__health-meta">
          {t(`${T}.health.observed`, { age: formatDuration(health.observedAgeMillis, locale) })}
        </p>
      )}
    </section>
  )
}

function iconFor(kind: MonitoringHealth['kind']) {
  switch (kind) {
    case 'failed':
      return 'i-ri-error-warning-fill'
    case 'stale':
    case 'reconcileFailures':
    case 'noMovement':
    case 'stalled':
      return 'i-ri-alert-fill'
    case 'loading':
      return 'i-ri-time-line'
    case 'healthy':
      return 'i-ri-checkbox-circle-line'
    default:
      return 'i-ri-information-2-line'
  }
}

function Figure({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string
  hint?: string
  tone?: 'warning'
}) {
  return (
    <div className="pipeline-monitoring__figure" data-tone={tone}>
      <dt className="pipeline-monitoring__figure-label">{label}</dt>
      <dd className="pipeline-monitoring__figure-value">{value}</dd>
      {hint && <dd className="pipeline-monitoring__figure-hint">{hint}</dd>}
    </div>
  )
}

export function MonitoringKeyFigures({
  figures,
  recordsOutRate,
}: {
  figures: KeyFigures
  recordsOutRate: number | null
}) {
  const { i18n, t } = useTranslation()
  const locale = i18n.language
  const dash = '—'
  const loadStillRunning =
    figures.totalTables !== null &&
    figures.landedTables !== null &&
    figures.landedTables < figures.totalTables

  return (
    <dl className="pipeline-monitoring__figures" aria-label={t(`${T}.figures.label`)}>
      <Figure
        label={t(`${T}.figures.newestChange`)}
        value={
          figures.newestChangeSeconds === null
            ? dash
            : t(`${T}.figures.ago`, {
                duration: formatDuration(figures.newestChangeSeconds * 1_000, locale),
              })
        }
        hint={t(`${T}.figures.newestChangeHint`)}
      />
      <Figure
        label={t(`${T}.figures.recordsOut`)}
        value={
          recordsOutRate === null
            ? dash
            : t(`${T}.figures.perSecond`, { value: formatRate(recordsOutRate, locale) })
        }
        hint={t(`${T}.figures.recordsOutHint`, {
          total: figures.recordsOut === null ? dash : formatCount(figures.recordsOut, locale),
          bytes: figures.bytesOut === null ? dash : formatBytes(figures.bytesOut),
        })}
      />
      <Figure
        label={t(`${T}.figures.recordsIn`)}
        value={figures.recordsIn === null ? dash : formatCount(figures.recordsIn, locale)}
        hint={t(`${T}.figures.recordsInHint`, {
          bytes: figures.bytesIn === null ? dash : formatBytes(figures.bytesIn),
        })}
      />
      {figures.failures > 0 ? (
        <Figure
          tone="warning"
          label={t(`${T}.figures.failures`)}
          value={formatCount(figures.failures, locale)}
          hint={figures.failureCodes.join(', ')}
        />
      ) : (
        <Figure
          label={t(`${T}.figures.initialLoad`)}
          value={
            figures.totalTables === null
              ? dash
              : t(`${T}.figures.tablesLoaded`, {
                  landed: figures.landedTables,
                  total: figures.totalTables,
                })
          }
          hint={
            figures.rowsTotal === null
              ? t(`${T}.figures.rowsReadNoTotal`, { read: formatCount(figures.rowsRead, locale) })
              : t(loadStillRunning ? `${T}.figures.rowsReadOf` : `${T}.figures.rowsReadDone`, {
                  read: formatCount(figures.rowsRead, locale),
                  total: formatCount(figures.rowsTotal, locale),
                })
          }
        />
      )}
    </dl>
  )
}

function loadCell(
  row: MonitoringTableRow,
  locale: string,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  if (row.rowsRead === null) return '—'
  const read = formatCount(row.rowsRead, locale)
  if (row.phase === 'loading' || row.phase === 'pending') {
    return row.rowsTotal === null
      ? read
      : `${read} / ~${formatCount(row.rowsTotal, locale)} (${formatPercent(row.rowsRead, row.rowsTotal, locale)})`
  }
  return row.phase === 'unknown' ? read : t(`${T}.tables.loadedRows`, { read })
}

export function MonitoringTablesSection({
  rows,
  outputs,
  showRole = false,
  showSource = false,
}: {
  rows: MonitoringTableRow[]
  outputs: MonitoringOutput[]
  showRole?: boolean
  showSource?: boolean
}) {
  const { i18n, t } = useTranslation()
  const locale = i18n.language
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const filtered = query.trim()
    ? rows.filter((row) => row.table.toLowerCase().includes(query.trim().toLowerCase()))
    : rows
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const notLoadingYet = (row: MonitoringTableRow) =>
    row.phase === 'loading' || row.phase === 'pending'

  if (rows.length === 0 && outputs.length === 0) return null

  return (
    <section
      className="pipeline-monitoring__card"
      aria-labelledby="pipeline-monitoring-tables-title"
    >
      <div className="pipeline-monitoring__card-header">
        <div>
          <h2 id="pipeline-monitoring-tables-title" className="pipeline-monitoring__card-title">
            {t(`${T}.tables.title`, { count: rows.length })}
          </h2>
          <p className="pipeline-monitoring__card-description">{t(`${T}.tables.description`)}</p>
        </div>
        {rows.length > PAGE_SIZE / 5 && (
          <SearchInput
            className="pipeline-monitoring__table-search"
            value={query}
            onValueChange={(value) => {
              setQuery(value)
              setPage(1)
            }}
            aria-label={t(`${T}.tables.search`)}
            clearLabel={t(`${T}.tables.clearSearch`)}
          />
        )}
      </div>

      {filtered.length === 0 ? (
        <div
          className="pipeline-monitoring__empty-inline pipeline-monitoring__filter-empty"
          role="status"
        >
          <p>{t(`${T}.tables.noMatch`, { query: query.trim() })}</p>
          <Button size="small" variant="secondary" onClick={() => setQuery('')}>
            {t(`${T}.tables.clearSearch`)}
          </Button>
        </div>
      ) : (
        <div className="pipeline-monitoring__table-scroll">
          <table className="pipeline-monitoring__table">
            <thead>
              <tr>
                <th scope="col">{t(`${T}.tables.columns.table`)}</th>
                {showSource && <th scope="col">{t(`${T}.tables.columns.source`)}</th>}
                {showRole && <th scope="col">{t(`${T}.tables.columns.role`)}</th>}
                <th scope="col">{t(`${T}.tables.columns.phase`)}</th>
                <th scope="col" data-align="end">
                  {t(`${T}.tables.columns.initialLoad`)}
                </th>
                <th scope="col" data-align="end">
                  {t(`${T}.tables.columns.newestChange`)}
                </th>
                <th scope="col" data-align="end">
                  {t(`${T}.tables.columns.notAdvancing`)}
                </th>
                <th scope="col" data-align="end">
                  {t(`${T}.tables.columns.gap`)}
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const stalled = (row.stalledMs ?? 0) > STALL_THRESHOLD_MS && !notLoadingYet(row)
                return (
                  <tr key={row.table} data-phase={row.phase} data-stalled={stalled || undefined}>
                    <th scope="row" className="pipeline-monitoring__table-name" title={row.table}>
                      {row.table}
                    </th>
                    {showSource && <td>{row.sources.join(', ') || '—'}</td>}
                    {showRole && (
                      <td>
                        {row.roles
                          .map((role) =>
                            role.kind === 'root'
                              ? t(`${T}.tables.role.root`)
                              : t(`${T}.tables.role.embed`, { path: role.path }),
                          )
                          .join(', ') || '—'}
                      </td>
                    )}
                    <td>{t(`${T}.tables.phase.${row.phase}`)}</td>
                    <td data-align="end">{loadCell(row, locale, t)}</td>
                    <td data-align="end">
                      {notLoadingYet(row)
                        ? t(`${T}.tables.afterLoad`)
                        : row.newestChangeSeconds === null
                          ? '—'
                          : formatDuration(row.newestChangeSeconds * 1_000, locale)}
                    </td>
                    <td data-align="end">
                      {notLoadingYet(row)
                        ? t(`${T}.tables.afterLoad`)
                        : stalled
                          ? formatDuration(row.stalledMs ?? 0, locale)
                          : '—'}
                    </td>
                    <td data-align="end">
                      {row.gap === null
                        ? t(`${T}.tables.notReported`)
                        : formatCount(row.gap, locale)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > PAGE_SIZE && (
        <Pagination
          className="pipeline-monitoring__pagination"
          page={currentPage}
          totalPages={totalPages}
          onPageChange={setPage}
          labels={{
            previous: t(`${T}.tables.previousPage`),
            next: t(`${T}.tables.nextPage`),
          }}
        />
      )}

      {outputs.length > 0 && (
        <div className="pipeline-monitoring__outputs">
          <h3 className="pipeline-monitoring__detail-heading">{t(`${T}.tables.outputsTitle`)}</h3>
          <dl className="pipeline-monitoring__lag-list">
            {outputs.map((output) => (
              <div className="pipeline-monitoring__lag-row" key={output.output}>
                <dt title={output.output}>{output.output}</dt>
                <dd>
                  {t(`${T}.figures.ago`, {
                    duration: formatDuration(output.newestChangeSeconds * 1_000, locale),
                  })}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </section>
  )
}

function stageLabel(
  stage: NestStage,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  if (stage.step === null) return t(`${T}.transform.unnamedStage`)
  const level =
    stage.path === null
      ? '?'
      : stage.path.length === 0
        ? t(`${T}.transform.root`)
        : stage.path.join('.')
  const map = stage.map === null || stage.map === 'state' ? '' : ` · ${stage.map}`
  return `${stage.step} · ${level}${map}`
}

export function MonitoringTransformState({
  stages,
  joins,
}: {
  stages: NestStage[]
  joins: JoinRecompute[]
}) {
  const { i18n, t } = useTranslation()
  const locale = i18n.language
  const count = (value: number | null) => (value === null ? '—' : formatCount(value, locale))

  if (stages.length === 0 && joins.length === 0) return null

  return (
    <Collapsible className="pipeline-monitoring__card pipeline-monitoring__collapsible">
      <CollapsibleTrigger className="pipeline-monitoring__disclosure pipeline-monitoring__card-title">
        <span
          className="i-ri-arrow-right-s-line pipeline-monitoring__disclosure-icon"
          aria-hidden="true"
        />
        {t(`${T}.transform.title`)}
      </CollapsibleTrigger>
      <CollapsiblePanel>
        {stages.length > 0 && (
          <div className="pipeline-monitoring__table-scroll">
            <table className="pipeline-monitoring__table">
              <caption className="pipeline-monitoring__detail-heading">
                {t(`${T}.transform.nest`)}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{t(`${T}.transform.columns.stage`)}</th>
                  <th scope="col" data-align="end">
                    {t(`${T}.transform.columns.entries`)}
                  </th>
                  <th scope="col" data-align="end">
                    {t(`${T}.transform.columns.accesses`)}
                  </th>
                  <th scope="col" data-align="end">
                    {t(`${T}.transform.columns.backfills`)}
                  </th>
                  <th scope="col" data-align="end">
                    {t(`${T}.transform.columns.backfillTime`)}
                  </th>
                  <th scope="col" data-align="end">
                    {t(`${T}.transform.columns.pendingHighWater`)}
                  </th>
                </tr>
              </thead>
              <tbody>
                {stages.map((stage) => (
                  <tr key={stage.namespace}>
                    <th
                      scope="row"
                      className="pipeline-monitoring__table-name"
                      title={stage.namespace}
                    >
                      {stageLabel(stage, t)}
                    </th>
                    <td data-align="end">{count(stage.entries)}</td>
                    <td data-align="end">{count(stage.accesses)}</td>
                    <td data-align="end">{count(stage.backfills)}</td>
                    <td data-align="end">
                      {stage.backfillMillis === null
                        ? '—'
                        : formatDuration(stage.backfillMillis, locale)}
                    </td>
                    <td data-align="end">{count(stage.pendingHighWater)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {joins.length > 0 && (
          <div className="pipeline-monitoring__table-scroll">
            <table className="pipeline-monitoring__table">
              <caption className="pipeline-monitoring__detail-heading">
                {t(`${T}.transform.join`)}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{t(`${T}.transform.columns.dimension`)}</th>
                  <th scope="col" data-align="end">
                    {t(`${T}.transform.columns.rebuilt`)}
                  </th>
                </tr>
              </thead>
              <tbody>
                {joins.map((join) => (
                  <tr key={join.namespace}>
                    <th scope="row" className="pipeline-monitoring__table-name">
                      {join.namespace}
                    </th>
                    <td data-align="end">
                      {join.expected === null
                        ? formatCount(join.done, locale)
                        : `${formatCount(join.done, locale)} / ${formatCount(join.expected, locale)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CollapsiblePanel>
    </Collapsible>
  )
}

export function MonitoringAllMetrics({ groups }: { groups: MetricGroup[] }) {
  const { i18n, t } = useTranslation()
  const total = groups.reduce((sum, group) => sum + group.metrics.length, 0)

  if (total === 0) return null

  return (
    <Collapsible className="pipeline-monitoring__card pipeline-monitoring__collapsible">
      <CollapsibleTrigger className="pipeline-monitoring__disclosure pipeline-monitoring__card-title">
        <span
          className="i-ri-arrow-right-s-line pipeline-monitoring__disclosure-icon"
          aria-hidden="true"
        />
        {t(`${T}.allMetrics.title`, { count: total })}
        <span className="pipeline-monitoring__group-chips">
          {groups.map((group) => (
            <span key={group.id} className="pipeline-monitoring__group-chip">
              {t(`${T}.allMetrics.groups.${group.id}`)} {group.metrics.length}
            </span>
          ))}
        </span>
      </CollapsibleTrigger>
      <CollapsiblePanel>
        {groups.map((group) => (
          <div key={group.id} className="pipeline-monitoring__metric-group">
            <h3 className="pipeline-monitoring__detail-heading">
              {t(`${T}.allMetrics.groups.${group.id}`)}
            </h3>
            <dl>
              {group.metrics.map((metric) => (
                <div key={metric.name} className="pipeline-monitoring__metric-row">
                  <dt title={metric.name}>{metric.name}</dt>
                  <dd>{formatMetricValue(metric.value, metric.unit, i18n.language)}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </CollapsiblePanel>
    </Collapsible>
  )
}
