import { ArrowDown, ArrowUp, Pause, Play, RefreshCw, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { PipelineLogLine } from '@/service/pipelines/pipeline-client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

import { PipelineLogDetailPanel } from './pipeline-log-detail-panel'
import { usePipelineLogsQuery } from './pipeline-logs-queries'

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
      <p className="pipeline-logs__description">
        {t('pipelines.workspace.runtime.logs.description')}
      </p>
    </header>
  )
}

export function PipelineLogsPage({ pipelineId }: { pipelineId: string }) {
  const { i18n, t } = useTranslation()
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null)
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
  const visibleLines = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase(i18n.language)
    const matchingLines = (logs.data?.lines ?? []).flatMap((line, index) => {
      const level = normalizedLevel(line.level)
      const matchesLevel = selectedLevel === null || level === selectedLevel
      const matchesSearch =
        normalizedSearch.length === 0 ||
        line.message.toLocaleLowerCase(i18n.language).includes(normalizedSearch) ||
        level.toLocaleLowerCase(i18n.language).includes(normalizedSearch)
      return matchesLevel && matchesSearch ? [{ key: lineKey(line, index), line }] : []
    })

    return matchingLines.sort(({ line: left, key: leftKey }, { line: right, key: rightKey }) => {
      const timestampOrder = left.timestampMillis - right.timestampMillis
      if (timestampOrder !== 0) return sortOrder === 'asc' ? timestampOrder : -timestampOrder
      return sortOrder === 'asc' ? leftKey.localeCompare(rightKey) : rightKey.localeCompare(leftKey)
    })
  }, [i18n.language, logs.data?.lines, search, selectedLevel, sortOrder])
  const selectedLine = useMemo(
    () => visibleLines.find(({ key }) => key === selectedLineKey)?.line ?? null,
    [selectedLineKey, visibleLines],
  )

  const formatTime = (timestampMillis: number) =>
    new Intl.DateTimeFormat(i18n.language, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(timestampMillis)

  const hasLines = (logs.data?.lines.length ?? 0) > 0
  const hasFilters = selectedLevel !== null || search.trim().length > 0

  return (
    <section className="pipeline-logs" aria-label={t('pipelines.workspace.navigation.logs')}>
      <PipelineLogsIntro />
      <div className="pipeline-logs__workbench">
        <header className="pipeline-logs__controls">
          <div className="pipeline-logs__toolbar">
            <div className="pipeline-logs__toolbar-heading">
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
            <div className="pipeline-logs__actions">
              <Button
                variant="outline"
                size="icon-sm"
                aria-label={t('pipelines.workspace.runtime.logs.refreshAria')}
                title={t('pipelines.workspace.runtime.logs.refresh')}
                onClick={() => void logs.refetch()}
                disabled={logs.isFetching}
              >
                <RefreshCw
                  className={cn('size-3.5', logs.isFetching && 'animate-spin')}
                  aria-hidden="true"
                />
              </Button>
              <Button
                variant="outline"
                size="sm"
                aria-label={t(
                  autoRefresh
                    ? 'pipelines.workspace.runtime.logs.pauseAria'
                    : 'pipelines.workspace.runtime.logs.resumeAria',
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
                    ? 'pipelines.workspace.runtime.logs.pause'
                    : 'pipelines.workspace.runtime.logs.resume',
                )}
              </Button>
            </div>
          </div>

          <div className="pipeline-logs__filters">
            <div
              className="pipeline-logs__level-filters"
              aria-label={t('pipelines.workspace.runtime.logs.level')}
            >
              <Button
                type="button"
                variant={selectedLevel === null ? 'secondary' : 'ghost'}
                size="xs"
                aria-pressed={selectedLevel === null}
                onClick={() => setSelectedLevel(null)}
              >
                {t('pipelines.workspace.runtime.logs.allLevels')}
              </Button>
              {levels.map((level) => (
                <Button
                  key={level}
                  type="button"
                  variant={selectedLevel === level ? 'secondary' : 'ghost'}
                  size="xs"
                  data-log-level={level}
                  aria-pressed={selectedLevel === level}
                  onClick={() => setSelectedLevel(level)}
                >
                  {level}
                </Button>
              ))}
            </div>
            <label className="pipeline-logs__search">
              <Search className="size-3.5" aria-hidden="true" />
              <span className="sr-only">{t('pipelines.workspace.runtime.logs.search')}</span>
              <Input
                data-testid="pipeline-log-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('pipelines.workspace.runtime.logs.search')}
              />
            </label>
          </div>
        </header>

        {logs.isLoading ? (
          <section className="pipeline-logs__state" role="status">
            <p className="pipeline-logs__state-description">
              {t('pipelines.workspace.runtime.logs.loading')}
            </p>
          </section>
        ) : logs.isError ? (
          <section className="pipeline-logs__state" aria-live="polite">
            <h2 className="pipeline-logs__state-title">
              {t('pipelines.workspace.runtime.logs.errorTitle')}
            </h2>
            <p className="pipeline-logs__state-description">
              {t('pipelines.workspace.runtime.logs.errorBody')}
            </p>
            <Button
              className="mt-4"
              size="sm"
              onClick={() => void logs.refetch()}
              disabled={logs.isFetching}
            >
              <RefreshCw
                className={cn('size-3.5', logs.isFetching && 'animate-spin')}
                aria-hidden="true"
              />
              {t('pipelines.workspace.runtime.logs.refresh')}
            </Button>
          </section>
        ) : !hasLines ? (
          <section className="pipeline-logs__state">
            <h2 className="pipeline-logs__state-title">
              {t('pipelines.workspace.runtime.logs.emptyTitle')}
            </h2>
            <p className="pipeline-logs__state-description">
              {t('pipelines.workspace.runtime.logs.emptyBody')}
            </p>
          </section>
        ) : visibleLines.length === 0 ? (
          <section className="pipeline-logs__state">
            <h2 className="pipeline-logs__state-title">
              {t('pipelines.workspace.runtime.logs.filteredEmptyTitle')}
            </h2>
            <p className="pipeline-logs__state-description">
              {t(
                hasFilters
                  ? 'pipelines.workspace.runtime.logs.filteredEmptyBody'
                  : 'pipelines.workspace.runtime.logs.emptyBody',
              )}
            </p>
          </section>
        ) : (
          <div
            className={cn(
              'pipeline-logs__content',
              selectedLine && 'pipeline-logs__content--with-detail',
            )}
          >
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
                      <button
                        type="button"
                        className="pipeline-logs__row-button"
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
                      </button>
                    </li>
                  )
                })}
              </ol>
            </div>
            {selectedLine && (
              <PipelineLogDetailPanel
                line={selectedLine}
                onClose={() => setSelectedLineKey(null)}
              />
            )}
          </div>
        )}
      </div>
    </section>
  )
}
