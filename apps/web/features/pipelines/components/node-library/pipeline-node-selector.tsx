import {
  ArrowDownToLine,
  Boxes,
  Braces,
  ChevronDown,
  ChevronRight,
  Code2,
  Combine,
  Filter,
  GitFork,
  GitMerge,
  ListPlus,
  Plus,
  Regex,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'

import type { ConnectorSummary, SourceView } from '@/service/source-client'

import { ConnectorIcon } from '@/components/connector-icon'
import { cn } from '@/lib/utils'

import type {
  PipelineSchemaOption,
  PipelineTableLoader,
} from '../node-config/pipeline-data-node-schema'
import type {
  PipelineNodeChoice,
  PipelineNodeInsertionContext,
  PipelineTransformType,
} from './pipeline-node-library-types'

interface PipelineNodeSelectorProps {
  open: boolean
  insertion: PipelineNodeInsertionContext | null
  sources: SourceView[] | undefined
  connectors: ConnectorSummary[] | undefined
  sourceState: 'loading' | 'success' | 'error'
  onChoose: (choice: PipelineNodeChoice) => void
  onChooseMany?: (choices: readonly PipelineNodeChoice[]) => void
  loadTables?: PipelineTableLoader
  onOpenChange: (open: boolean) => void
}

interface DirectChoice {
  id: string
  kind: Exclude<PipelineNodeChoice['kind'], 'source'>
  transformType?: PipelineTransformType
  icon: typeof Filter
  section: 'processing' | 'output'
}

interface SourceScopeEntry {
  value: string
  selectable: boolean
  kind: 'literal' | 'regex'
}

const directChoices: DirectChoice[] = [
  { id: 'filter', kind: 'transform', transformType: 'filter', icon: Filter, section: 'processing' },
  { id: 'map', kind: 'transform', transformType: 'map', icon: Braces, section: 'processing' },
  { id: 'join', kind: 'transform', transformType: 'join', icon: GitMerge, section: 'processing' },
  { id: 'union', kind: 'transform', transformType: 'union', icon: Combine, section: 'processing' },
  { id: 'nest', kind: 'transform', transformType: 'nest', icon: Boxes, section: 'processing' },
  { id: 'js', kind: 'transform', transformType: 'js', icon: Code2, section: 'processing' },
  { id: 'view', kind: 'view', icon: GitFork, section: 'output' },
  { id: 'target', kind: 'target', icon: ArrowDownToLine, section: 'output' },
]

function normalized(value: string) {
  return value.trim().toLocaleLowerCase()
}

function anchorStyle(insertion: PipelineNodeInsertionContext | null): CSSProperties {
  const position = insertion?.screenPosition ?? { x: 288, y: 96 }
  const selectorWidth = 400
  const selectorHeight = 540
  if (typeof window === 'undefined') return { left: position.x, top: position.y }
  const safeWidth = Math.min(selectorWidth, window.innerWidth - 24)
  const safeHeight = Math.min(selectorHeight, window.innerHeight - 24)
  const left = Math.max(12, Math.min(position.x, window.innerWidth - safeWidth - 12))
  const top = Math.max(12, Math.min(position.y, window.innerHeight - safeHeight - 12))
  return { left, top }
}

function choiceForDirectItem(choice: DirectChoice): PipelineNodeChoice {
  if (choice.kind === 'transform') {
    return { kind: 'transform', transformType: choice.transformType! }
  }
  return { kind: choice.kind }
}

/** A shared, compact selector for inserting a configured Source or a Pipeline operation. */
export function PipelineNodeSelector({
  open,
  insertion,
  sources,
  connectors,
  sourceState,
  onChoose,
  onChooseMany,
  loadTables,
  onOpenChange,
}: PipelineNodeSelectorProps) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [expandedSourceId, setExpandedSourceId] = useState<string | null>(null)
  const [discoveredTablesBySourceId, setDiscoveredTablesBySourceId] = useState<
    Record<string, readonly PipelineSchemaOption[]>
  >({})
  const [loadingSourceId, setLoadingSourceId] = useState<string | null>(null)
  const [sourceTableErrorId, setSourceTableErrorId] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setExpandedSourceId(null)
    const frame = requestAnimationFrame(() => searchRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onOpenChange(false)
      }
    }
    function onPointerDown(event: PointerEvent) {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        onOpenChange(false)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [onOpenChange, open])

  useEffect(() => {
    if (!open || !expandedSourceId || !loadTables) return
    const source = (sources ?? []).find((candidate) => candidate.id === expandedSourceId)
    if (!source || source.tables !== null || Object.hasOwn(discoveredTablesBySourceId, source.id)) {
      return
    }

    let cancelled = false
    setLoadingSourceId(source.id)
    setSourceTableErrorId(null)
    void loadTables(source.id)
      .then((options) => {
        if (cancelled) return
        setDiscoveredTablesBySourceId((current) => ({ ...current, [source.id]: [...options] }))
      })
      .catch(() => {
        if (!cancelled) setSourceTableErrorId(source.id)
      })
      .finally(() => {
        if (!cancelled) setLoadingSourceId((current) => (current === source.id ? null : current))
      })

    return () => {
      cancelled = true
    }
  }, [discoveredTablesBySourceId, expandedSourceId, loadTables, open, sources])

  const connectorsById = useMemo(
    () => new Map((connectors ?? []).map((item) => [item.id, item])),
    [connectors],
  )
  const matchingSources = useMemo(() => {
    const match = normalized(query)
    return (sources ?? []).filter((source) => {
      if (!match) return true
      if (normalized(source.id).includes(match)) return true
      if (
        (discoveredTablesBySourceId[source.id] ?? []).some((table) =>
          normalized(table.label).includes(match),
        )
      ) {
        return true
      }
      return (source.tables ?? []).some((table) =>
        normalized(table.name ?? table.pattern ?? '').includes(match),
      )
    })
  }, [discoveredTablesBySourceId, query, sources])
  const matchingChoices = useMemo(() => {
    const match = normalized(query)
    return directChoices.filter(
      (choice) =>
        !match || normalized(t(`pipelines.workspace.nodeSelector.${choice.id}`)).includes(match),
    )
  }, [query, t])

  if (!open || !insertion) return null

  const hasResults = matchingSources.length > 0 || matchingChoices.length > 0

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onOpenChange(false)
    }
  }

  function selectSourceTable(
    source: SourceView,
    table: string,
    tableKind: 'literal' | 'regex' = 'literal',
  ) {
    onChoose({
      kind: 'source',
      sourceId: source.id,
      table,
      ...(tableKind === 'regex' ? { tableKind } : {}),
      connectorId: source.connector || null,
    })
  }

  function selectAllSourceTables(source: SourceView, tables: readonly string[]) {
    const choices = tables.map(
      (table): PipelineNodeChoice => ({
        kind: 'source',
        sourceId: source.id,
        table,
        connectorId: source.connector || null,
      }),
    )
    if (choices.length === 0) return
    if (onChooseMany) {
      onChooseMany(choices)
      return
    }
    onChoose(choices[0])
  }

  return (
    <div
      ref={dialogRef}
      className="pipeline-node-selector"
      style={anchorStyle(insertion)}
      role="dialog"
      aria-modal={false}
      aria-label={t('pipelines.workspace.nodeSelector.title')}
      onKeyDown={handleKeyDown}
    >
      <div className="pipeline-node-selector__header">
        <span className="pipeline-node-selector__title">
          <SlidersHorizontal className="size-3.5" aria-hidden="true" />
          {t('pipelines.workspace.nodeSelector.title')}
        </span>
        <button
          type="button"
          className="pipeline-node-selector__close"
          aria-label={t('pipelines.workspace.nodeSelector.close')}
          onClick={() => onOpenChange(false)}
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      </div>
      <label className="pipeline-node-selector__search">
        <Search className="size-3.5" aria-hidden="true" />
        <input
          ref={searchRef}
          data-node-selector-search
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('pipelines.workspace.nodeSelector.searchPlaceholder')}
        />
      </label>
      <div className="pipeline-node-selector__content">
        <section aria-labelledby="pipeline-node-selector-sources">
          <h2 id="pipeline-node-selector-sources" className="pipeline-node-selector__section-title">
            {t('pipelines.workspace.nodeSelector.sources')}
          </h2>
          {sourceState === 'loading' && (
            <p className="pipeline-node-selector__status">
              {t('pipelines.workspace.nodeSelector.loadingSources')}
            </p>
          )}
          {sourceState === 'error' && (
            <p className="pipeline-node-selector__status pipeline-node-selector__status--error">
              {t('pipelines.workspace.nodeSelector.sourcesError')}
            </p>
          )}
          {sourceState === 'success' && matchingSources.length === 0 && (
            <p className="pipeline-node-selector__status">
              {t('pipelines.workspace.nodeSelector.emptySources')}
            </p>
          )}
          <div
            className="pipeline-node-selector__source-list"
            aria-label={t('pipelines.workspace.nodeSelector.sources')}
          >
            {matchingSources.map((source) => {
              const discoveredTables = discoveredTablesBySourceId[source.id] ?? []
              const scopeEntries: SourceScopeEntry[] =
                source.tables === null
                  ? discoveredTables.map((table) => ({
                      value: table.value,
                      selectable: true,
                      kind: 'literal' as const,
                    }))
                  : (source.tables ?? []).flatMap((table) => {
                      const value = table.name ?? table.pattern
                      return value
                        ? [
                            {
                              value,
                              selectable: Boolean(table.name),
                              kind: table.name ? ('literal' as const) : ('regex' as const),
                            },
                          ]
                        : []
                    })
              const literalTables = scopeEntries
                .filter((entry) => entry.selectable)
                .map((entry) => entry.value)
              const scopedEntries = scopeEntries.filter(
                (entry) =>
                  !query ||
                  normalized(entry.value).includes(normalized(query)) ||
                  normalized(source.id).includes(normalized(query)),
              )
              const tables = scopedEntries.filter((entry) => entry.selectable)
              const expanded = expandedSourceId === source.id
              const isDiscovering = loadingSourceId === source.id
              const hasDiscoveryError = sourceTableErrorId === source.id
              const connector = connectorsById.get(source.connector)
              const scopeCount =
                source.tables === null
                  ? discoveredTables.length > 0
                    ? discoveredTables.length
                    : '∞'
                  : scopeEntries.length
              const scopeLabel =
                source.tables === null
                  ? isDiscovering
                    ? t('pipelines.workspace.nodeSelector.discoveringSourceTables')
                    : discoveredTables.length > 0
                      ? t('pipelines.workspace.nodeSelector.discoveredSourceScope', {
                          count: discoveredTables.length,
                        })
                      : t('pipelines.workspace.nodeSelector.openSourceScope')
                  : t('pipelines.workspace.nodeSelector.configuredSourceScope', {
                      count: scopeCount,
                    })
              return (
                <div key={source.id} className="pipeline-node-selector__source">
                  <button
                    type="button"
                    data-node-selector-source={source.id}
                    className="pipeline-node-selector__source-trigger"
                    aria-expanded={expanded}
                    onClick={() =>
                      setExpandedSourceId((current) => (current === source.id ? null : source.id))
                    }
                  >
                    {expanded ? (
                      <ChevronDown className="size-3.5" aria-hidden="true" />
                    ) : (
                      <ChevronRight className="size-3.5" aria-hidden="true" />
                    )}
                    <ConnectorIcon
                      connectorId={connector?.id ?? source.connector}
                      name={connector?.name ?? source.connector}
                      iconPath={connector?.icon}
                      size={24}
                      className="pipeline-node-selector__connector-icon"
                      withBackdropLayer
                    />
                    <span className="min-w-0 flex-1 truncate text-left">{source.id}</span>
                    <span className="pipeline-node-selector__count">{scopeCount}</span>
                  </button>
                  {expanded && (
                    <div
                      className="pipeline-node-selector__tables"
                      aria-label={t('pipelines.workspace.nodeSelector.sourceTables')}
                    >
                      <div className="flex items-center justify-between gap-3 border-b border-[var(--pipeline-selector-border)] px-2 py-1.5 text-[11px] leading-4 text-[var(--pipeline-selector-muted)]">
                        <span className="min-w-0 truncate">{scopeLabel}</span>
                        {onChooseMany && literalTables.length > 1 && (
                          <button
                            type="button"
                            data-node-selector-add-all={source.id}
                            className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 font-semibold text-[var(--pipeline-selection)] transition-colors hover:bg-[var(--pipeline-actionbar-bg-accent)] focus-visible:ring-1 focus-visible:ring-[var(--pipeline-selection)] focus-visible:outline-none"
                            onClick={() => selectAllSourceTables(source, literalTables)}
                          >
                            <ListPlus className="size-3.5" aria-hidden="true" />
                            {t('pipelines.workspace.nodeSelector.addAllTables', {
                              count: literalTables.length,
                            })}
                          </button>
                        )}
                      </div>
                      {isDiscovering && (
                        <p className="pipeline-node-selector__status">
                          {t('pipelines.workspace.nodeSelector.loadingSourceTables')}
                        </p>
                      )}
                      {hasDiscoveryError && (
                        <p className="pipeline-node-selector__status pipeline-node-selector__status--error">
                          {t('pipelines.workspace.nodeSelector.sourceTablesError')}
                        </p>
                      )}
                      {scopedEntries.map((entry) =>
                        entry.selectable ? (
                          <button
                            key={entry.value}
                            type="button"
                            data-node-selector-table={`${source.id}:${entry.value}`}
                            className="pipeline-node-selector__table"
                            onClick={() => selectSourceTable(source, entry.value, entry.kind)}
                          >
                            <Plus
                              className="mr-1.5 size-3 text-[var(--pipeline-text-subtle)]"
                              aria-hidden="true"
                            />
                            {entry.value}
                          </button>
                        ) : (
                          <button
                            type="button"
                            key={entry.value}
                            className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-xs text-[var(--pipeline-selector-muted)] transition-colors hover:bg-[var(--pipeline-actionbar-bg-accent)] hover:text-[var(--pipeline-text)] focus-visible:ring-1 focus-visible:ring-[var(--pipeline-selection)] focus-visible:outline-none"
                            data-node-selector-scope-rule={entry.value}
                            onClick={() => selectSourceTable(source, entry.value, entry.kind)}
                          >
                            <Regex className="size-3 shrink-0" aria-hidden="true" />
                            <span className="min-w-0 truncate">{entry.value}</span>
                            <span className="ml-auto shrink-0 text-[10px] tracking-wide uppercase opacity-70">
                              {t('pipelines.workspace.nodeSelector.scopeRule')}
                            </span>
                          </button>
                        ),
                      )}
                      {tables.length === 0 &&
                        !isDiscovering &&
                        !hasDiscoveryError &&
                        scopedEntries.length === 0 && (
                          <p className="pipeline-node-selector__status">
                            {source.tables === null
                              ? t('pipelines.workspace.nodeSelector.openSourceScope')
                              : t('pipelines.workspace.nodeSelector.emptySources')}
                          </p>
                        )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {(['processing', 'output'] as const).map((section) => {
          const items = matchingChoices.filter((choice) => choice.section === section)
          if (items.length === 0) return null
          return (
            <section key={section} aria-labelledby={`pipeline-node-selector-${section}`}>
              <h2
                id={`pipeline-node-selector-${section}`}
                className="pipeline-node-selector__section-title"
              >
                {t(`pipelines.workspace.nodeSelector.${section}`)}
              </h2>
              <div
                className={cn(
                  'pipeline-node-selector__choices',
                  section === 'processing' && 'pipeline-node-selector__choices--grid',
                )}
              >
                {items.map((choice) => {
                  const Icon = choice.icon
                  const dataChoice =
                    choice.kind === 'transform' ? `transform:${choice.transformType}` : choice.kind
                  return (
                    <button
                      key={choice.id}
                      type="button"
                      data-node-choice={dataChoice}
                      className="pipeline-node-selector__choice"
                      onClick={() => onChoose(choiceForDirectItem(choice))}
                    >
                      <span className="pipeline-node-selector__choice-icon">
                        <Icon className="size-3.5" aria-hidden="true" />
                      </span>
                      <span>{t(`pipelines.workspace.nodeSelector.${choice.id}`)}</span>
                    </button>
                  )
                })}
              </div>
            </section>
          )
        })}
        {!hasResults && sourceState !== 'loading' && (
          <p className="pipeline-node-selector__status">
            {t('pipelines.workspace.nodeSelector.noResults')}
          </p>
        )}
      </div>
    </div>
  )
}
