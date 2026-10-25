import Chip, { type Item as ChipItem } from '@tapstate-web/ui/chip'
import {
  Drawer,
  DrawerBackdrop,
  DrawerContent,
  DrawerPopup,
  DrawerPortal,
  DrawerTrigger,
  DrawerViewport,
} from '@tapstate-web/ui/drawer'
import { SearchInput } from '@tapstate-web/ui/search-input'
import { Spinner } from '@tapstate-web/ui/spinner'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { PipelineLogLine } from '@/service/pipelines/pipeline-client'

import { cn } from '@/lib/utils'

import { PipelineRefreshControls } from '../components/pipeline-refresh-controls'
import { PipelineLogDetailPanel } from './pipeline-log-detail-panel'
import { PipelineLogsEmptyState } from './pipeline-logs-empty-state'
import styles from './pipeline-logs-page.module.css'
import { usePipelineLogsQuery } from './pipeline-logs-queries'

const logPeriodDefinitions = [
  ['today', 'today'],
  ['last7Days', 'last7Days'],
  ['last4Weeks', 'last4Weeks'],
  ['last3Months', 'last3Months'],
  ['last12Months', 'last12Months'],
  ['monthToDate', 'monthToDate'],
  ['quarterToDate', 'quarterToDate'],
  ['yearToDate', 'yearToDate'],
  ['allTime', 'allTime'],
] as const

const standardLogLevels = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR'] as const

type LogPeriod = (typeof logPeriodDefinitions)[number][0]

function startOfLocalDay(date: Date) {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  return start
}

function subtractCalendarMonths(date: Date, months: number) {
  const result = new Date(date)
  const day = result.getDate()
  result.setDate(1)
  result.setMonth(result.getMonth() - months)
  result.setDate(Math.min(day, new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()))
  return result
}

function getLogPeriodStart(period: LogPeriod, now: Date) {
  const start = startOfLocalDay(now)

  switch (period) {
    case 'today':
      return start
    case 'last7Days':
      start.setDate(start.getDate() - 7)
      return start
    case 'last4Weeks':
      start.setDate(start.getDate() - 28)
      return start
    case 'last3Months':
      return startOfLocalDay(subtractCalendarMonths(now, 3))
    case 'last12Months':
      return startOfLocalDay(subtractCalendarMonths(now, 12))
    case 'monthToDate':
      start.setDate(1)
      return start
    case 'quarterToDate':
      start.setMonth(Math.floor(start.getMonth() / 3) * 3, 1)
      return start
    case 'yearToDate':
      start.setMonth(0, 1)
      return start
    case 'allTime':
      return null
  }
}

function normalizedLevel(level: string) {
  return level.trim().toUpperCase()
}

function lineKey(line: PipelineLogLine, index: number) {
  return `${line.timestampMillis}-${index}`
}

function PipelineLogsIntro() {
  const { t } = useTranslation()

  return (
    <header className="pipeline-logs__intro">
      <h1 className="pipeline-logs__title">{t('pipelines.workspace.runtime.logs.title')}</h1>
    </header>
  )
}

export function PipelineLogsPage({ pipelineId }: { pipelineId: string }) {
  const { i18n, t } = useTranslation()
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<LogPeriod>('last7Days')
  const [search, setSearch] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedLineKey, setSelectedLineKey] = useState<string | null>(null)
  const logs = usePipelineLogsQuery(pipelineId, autoRefresh)

  const levels = useMemo(
    () =>
      [...new Set((logs.data?.lines ?? []).map((line) => normalizedLevel(line.level)))].filter(
        Boolean,
      ),
    [logs.data?.lines],
  )
  const levelOptions = [
    ...new Set([...standardLogLevels, ...levels, ...(selectedLevel ? [selectedLevel] : [])]),
  ]
  const levelFilterItems: ChipItem<string>[] = [
    { value: 'all', name: t('pipelines.workspace.runtime.logs.allFilterLevels') },
    ...levelOptions.map((level) => ({ value: level, name: level })),
  ]
  const periodFilterItems: ChipItem<string>[] = logPeriodDefinitions.map(([value, label]) => ({
    value,
    name: t(`pipelines.workspace.runtime.logs.periods.${label}`),
  }))
  const nowMillis = Date.now()
  const periodStartMillis =
    getLogPeriodStart(selectedPeriod, new Date(nowMillis))?.getTime() ?? null
  const visibleLines = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase(i18n.language)
    const matchingLines = (logs.data?.lines ?? []).flatMap((line, index) => {
      const level = normalizedLevel(line.level)
      const matchesLevel = selectedLevel === null || level === selectedLevel
      const matchesPeriod =
        periodStartMillis === null ||
        (line.timestampMillis >= periodStartMillis && line.timestampMillis <= nowMillis)
      const matchesSearch =
        normalizedSearch.length === 0 ||
        line.message.toLocaleLowerCase(i18n.language).includes(normalizedSearch) ||
        level.toLocaleLowerCase(i18n.language).includes(normalizedSearch)
      return matchesLevel && matchesPeriod && matchesSearch
        ? [{ key: lineKey(line, index), line }]
        : []
    })

    return matchingLines.sort(({ line: left, key: leftKey }, { line: right, key: rightKey }) => {
      const timestampOrder = left.timestampMillis - right.timestampMillis
      if (timestampOrder !== 0) return sortOrder === 'asc' ? timestampOrder : -timestampOrder
      return sortOrder === 'asc' ? leftKey.localeCompare(rightKey) : rightKey.localeCompare(leftKey)
    })
  }, [
    i18n.language,
    logs.data?.lines,
    nowMillis,
    periodStartMillis,
    search,
    selectedLevel,
    sortOrder,
  ])
  const selectedLine = useMemo(
    () => visibleLines.find(({ key }) => key === selectedLineKey)?.line ?? null,
    [selectedLineKey, visibleLines],
  )

  useEffect(() => {
    if (selectedLineKey !== null && selectedLine === null) setSelectedLineKey(null)
  }, [selectedLine, selectedLineKey])

  const formatTime = (timestampMillis: number) =>
    new Intl.DateTimeFormat(i18n.language, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(timestampMillis)

  const hasLines = (logs.data?.lines.length ?? 0) > 0
  const hasFilters =
    selectedLevel !== null || selectedPeriod !== 'allTime' || search.trim().length > 0
  const refreshLabels = {
    refresh: t('pipelines.workspace.runtime.logs.refresh'),
    refreshAria: t('pipelines.workspace.runtime.logs.refreshAria'),
    active: t('pipelines.workspace.runtime.logs.active'),
    paused: t('pipelines.workspace.runtime.logs.paused'),
    pause: t('pipelines.workspace.runtime.logs.pause'),
    pauseAria: t('pipelines.workspace.runtime.logs.pauseAria'),
    resume: t('pipelines.workspace.runtime.logs.resume'),
    resumeAria: t('pipelines.workspace.runtime.logs.resumeAria'),
  }

  return (
    <Drawer
      open={selectedLine !== null}
      modal
      swipeDirection="right"
      onOpenChange={(open) => {
        if (!open) setSelectedLineKey(null)
      }}
    >
      <section
        className={cn('pipeline-logs', styles.page)}
        aria-label={t('pipelines.workspace.navigation.logs')}
      >
        <PipelineLogsIntro />
        <div className="pipeline-logs__workbench">
          <header className="pipeline-logs__filter-header">
            <div className="pipeline-logs__filter-bar">
              <Chip
                value={selectedLevel ?? 'all'}
                items={levelFilterItems}
                selectLabel={t('pipelines.workspace.runtime.logs.level')}
                getClearLabel={(label) =>
                  `${t('pipelines.workspace.runtime.logs.clearLevelFilter')} ${label}`
                }
                onSelect={(item) => setSelectedLevel(item.value === 'all' ? null : item.value)}
                onClear={() => setSelectedLevel(null)}
              />
              <Chip
                className="min-w-37.5"
                panelClassName="w-[270px]"
                leftIcon={
                  <span
                    aria-hidden="true"
                    className="i-ri-calendar-line text-text-secondary block size-4"
                  />
                }
                value={selectedPeriod}
                items={periodFilterItems}
                selectLabel={t('pipelines.workspace.runtime.logs.timeRange')}
                getClearLabel={(label) =>
                  `${t('pipelines.workspace.runtime.logs.clearTimeRange')} ${label}`
                }
                onSelect={(item) => setSelectedPeriod(item.value as LogPeriod)}
                onClear={() => setSelectedPeriod('allTime')}
              />
              <SearchInput
                className="pipeline-logs__filter-search"
                data-testid="pipeline-log-search"
                value={search}
                onValueChange={setSearch}
                aria-label={t('pipelines.workspace.runtime.logs.search')}
                clearLabel={t('pipelines.workspace.nodeSelector.clearSearch')}
                placeholder={t('pipelines.workspace.runtime.logs.searchPlaceholder')}
              />
              <div className="pipeline-logs__filter-actions">
                <PipelineRefreshControls
                  autoRefresh={autoRefresh}
                  isFetching={logs.isFetching}
                  onRefresh={() => void logs.refetch()}
                  onToggle={() => setAutoRefresh((current) => !current)}
                  labels={refreshLabels}
                />
              </div>
            </div>
            <div className="pipeline-logs__filter-context">
              <p className="pipeline-logs__tail-note">
                {t('pipelines.workspace.runtime.logs.tail')}
              </p>
              <p className="pipeline-logs__refresh-state" aria-live="polite">
                {autoRefresh
                  ? t('pipelines.workspace.runtime.logs.active')
                  : t('pipelines.workspace.runtime.logs.paused')}
                {logs.dataUpdatedAt > 0 &&
                  ` · ${t('pipelines.workspace.runtime.logs.lastRefreshed', {
                    time: formatTime(logs.dataUpdatedAt),
                  })}`}
              </p>
            </div>
          </header>

          {logs.isLoading ? (
            <section
              className="pipeline-logs__state pipeline-logs__state--loading"
              role="status"
              aria-busy="true"
            >
              <Spinner
                aria-label={t('pipelines.workspace.runtime.logs.loading')}
                className="text-text-accent"
              />
              <p className="pipeline-logs__state-description">
                {t('pipelines.workspace.runtime.logs.loading')}
              </p>
            </section>
          ) : logs.isError ? (
            <section className="pipeline-logs__state" aria-live="polite">
              <div className="pipeline-logs__state-card">
                <h2 className="pipeline-logs__state-title">
                  {t('pipelines.workspace.runtime.logs.errorTitle')}
                </h2>
                <p className="pipeline-logs__state-description">
                  {t('pipelines.workspace.runtime.logs.errorBody')}
                </p>
                <div className="mt-4">
                  <PipelineRefreshControls
                    autoRefresh={autoRefresh}
                    isFetching={logs.isFetching}
                    onRefresh={() => void logs.refetch()}
                    onToggle={() => setAutoRefresh((current) => !current)}
                    labels={refreshLabels}
                  />
                </div>
              </div>
            </section>
          ) : !hasLines ? (
            <PipelineLogsEmptyState
              title={t('pipelines.workspace.runtime.logs.emptyTitle')}
              description={t('pipelines.workspace.runtime.logs.emptyBody')}
            />
          ) : visibleLines.length === 0 ? (
            <PipelineLogsEmptyState
              title={t('pipelines.workspace.runtime.logs.filteredEmptyTitle')}
              description={t(
                hasFilters
                  ? 'pipelines.workspace.runtime.logs.filteredEmptyBody'
                  : 'pipelines.workspace.runtime.logs.emptyBody',
              )}
            />
          ) : (
            <div className="pipeline-logs__content">
              <div className="pipeline-logs__table">
                <div className="pipeline-logs__table-header">
                  <button
                    type="button"
                    className="pipeline-logs__sort-button"
                    aria-label={t(
                      sortOrder === 'desc'
                        ? 'pipelines.workspace.runtime.logs.sortOldestFirst'
                        : 'pipelines.workspace.runtime.logs.sortNewestFirst',
                    )}
                    onClick={() => setSortOrder((current) => (current === 'desc' ? 'asc' : 'desc'))}
                  >
                    <span>{t('pipelines.workspace.runtime.logs.timestamp')}</span>
                    {sortOrder === 'desc' ? (
                      <ArrowDown className="size-3" aria-hidden="true" />
                    ) : (
                      <ArrowUp className="size-3" aria-hidden="true" />
                    )}
                  </button>
                  <span>{t('pipelines.workspace.runtime.logs.level')}</span>
                  <span>{t('pipelines.workspace.runtime.logs.message')}</span>
                </div>
                <ol className="pipeline-logs__list">
                  {visibleLines.map(({ key, line }) => {
                    const level = normalizedLevel(line.level)
                    const selected = key === selectedLineKey
                    return (
                      <li key={key} className="pipeline-logs__row" data-level={level}>
                        <DrawerTrigger
                          type="button"
                          className="pipeline-logs__row-button"
                          data-log-detail-trigger
                          aria-label={t('pipelines.workspace.runtime.logs.inspectAria', {
                            message: line.message,
                          })}
                          aria-pressed={selected}
                          onClick={() => setSelectedLineKey(key)}
                        >
                          <time
                            className="pipeline-logs__timestamp"
                            dateTime={new Date(line.timestampMillis).toISOString()}
                          >
                            {formatTime(line.timestampMillis)}
                          </time>
                          <span className="pipeline-logs__level">{level}</span>
                          <p className="pipeline-logs__message">{line.message}</p>
                        </DrawerTrigger>
                      </li>
                    )
                  })}
                </ol>
              </div>
            </div>
          )}
        </div>
      </section>
      <DrawerPortal>
        <DrawerBackdrop className="pipeline-logs__drawer-backdrop" />
        <DrawerViewport>
          <DrawerPopup className="pipeline-logs__drawer-popup data-[swipe-direction=right]:border-components-panel-border p-0! data-[swipe-direction=right]:top-16 data-[swipe-direction=right]:right-2 data-[swipe-direction=right]:bottom-3 data-[swipe-direction=right]:h-auto data-[swipe-direction=right]:w-full data-[swipe-direction=right]:max-w-150 data-[swipe-direction=right]:rounded-xl data-[swipe-direction=right]:border">
            <DrawerContent className="flex min-h-0 flex-1 flex-col p-0 pb-0">
              <div className={styles.drawerScope}>
                {selectedLine && <PipelineLogDetailPanel line={selectedLine} />}
              </div>
            </DrawerContent>
          </DrawerPopup>
        </DrawerViewport>
      </DrawerPortal>
    </Drawer>
  )
}
