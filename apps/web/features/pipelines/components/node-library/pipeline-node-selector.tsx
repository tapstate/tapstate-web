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
  onOpenChange: (open: boolean) => void
}

interface DirectChoice {
  id: string
  kind: Exclude<PipelineNodeChoice['kind'], 'source'>
  transformType?: PipelineTransformType
  icon: typeof Filter
  section: 'processing' | 'output'
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
  onOpenChange,
}: PipelineNodeSelectorProps) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [expandedSourceId, setExpandedSourceId] = useState<string | null>(null)
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

  const connectorsById = useMemo(
    () => new Map((connectors ?? []).map((item) => [item.id, item])),
    [connectors],
  )
  const matchingSources = useMemo(() => {
    const match = normalized(query)
    return (sources ?? []).filter((source) => {
      if (!match) return true
      if (normalized(source.id).includes(match)) return true
      return (source.tables ?? []).some((table) =>
        normalized(table.name ?? table.pattern ?? '').includes(match),
      )
    })
  }, [query, sources])
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

  function selectSourceTable(source: SourceView, table: string) {
    onChoose({
      kind: 'source',
      sourceId: source.id,
      table,
      connectorId: source.connector || null,
    })
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
              const tables = (source.tables ?? [])
                .map((table) => table.name ?? table.pattern)
                .filter((table): table is string => Boolean(table))
                .filter(
                  (table) =>
                    !query ||
                    normalized(table).includes(normalized(query)) ||
                    normalized(source.id).includes(normalized(query)),
                )
              const connector = connectorsById.get(source.connector)
              const expanded = expandedSourceId === source.id
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
                    <span className="pipeline-node-selector__count">{tables.length}</span>
                  </button>
                  {expanded && (
                    <div
                      className="pipeline-node-selector__tables"
                      aria-label={t('pipelines.workspace.nodeSelector.sourceTables')}
                    >
                      {tables.map((table) => (
                        <button
                          key={table}
                          type="button"
                          data-node-selector-table={`${source.id}:${table}`}
                          className="pipeline-node-selector__table"
                          onClick={() => selectSourceTable(source, table)}
                        >
                          {table}
                        </button>
                      ))}
                      {tables.length === 0 && (
                        <p className="pipeline-node-selector__status">
                          {t('pipelines.workspace.nodeSelector.emptySources')}
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
