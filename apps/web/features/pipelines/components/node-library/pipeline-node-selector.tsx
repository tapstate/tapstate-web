import {
  ArrowDownToLine,
  Boxes,
  Braces,
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

import type { PipelineTableLoader } from '../node-config/pipeline-data-node-schema'
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
  const selectorHeight = 600
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
  onChooseMany: _onChooseMany,
  loadTables: _loadTables,
  onOpenChange,
}: PipelineNodeSelectorProps) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const dialogRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setQuery('')
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
      if (insertion?.connectFrom || insertion?.insertEdge) return false
      if (!match) return true
      if (normalized(source.id).includes(match)) return true
      return false
    })
  }, [insertion?.connectFrom, query, sources])
  const matchingChoices = useMemo(() => {
    const match = normalized(query)
    return directChoices.filter(
      (choice) =>
        !match || normalized(t(`pipelines.workspace.nodeSelector.${choice.id}`)).includes(match),
    )
  }, [query, t])

  if (!open || !insertion) return null

  const canAddSource = !insertion.connectFrom && !insertion.insertEdge
  const hasResults = matchingSources.length > 0 || matchingChoices.length > 0

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onOpenChange(false)
    }
  }

  function selectSource(source: SourceView) {
    onChoose({
      kind: 'source',
      sourceId: source.id,
      table: '',
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
      <div className="flex min-h-11 items-center justify-between gap-3 border-b border-[var(--pipeline-selector-border)] px-3">
        <span className="flex min-w-0 items-center gap-2 text-[13px] font-semibold text-[var(--pipeline-text)]">
          <SlidersHorizontal className="size-3.5" aria-hidden="true" />
          {t('pipelines.workspace.nodeSelector.title')}
        </span>
        <button
          type="button"
          className="flex size-7 cursor-pointer items-center justify-center rounded-lg text-[var(--pipeline-selector-muted)] transition-colors hover:bg-[var(--pipeline-selector-hover)] hover:text-[var(--pipeline-text)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--pipeline-selection)]"
          aria-label={t('pipelines.workspace.nodeSelector.close')}
          onClick={() => onOpenChange(false)}
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      </div>
      <label className="flex h-10 shrink-0 items-center gap-2 border-b border-[var(--pipeline-selector-border)] px-3 text-[var(--pipeline-selector-muted)]">
        <Search className="size-3.5" aria-hidden="true" />
        <input
          ref={searchRef}
          data-node-selector-search
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('pipelines.workspace.nodeSelector.searchPlaceholder')}
          className="h-full min-w-0 flex-1 bg-transparent text-[13px] text-[var(--pipeline-text)] outline-none placeholder:text-[var(--pipeline-text-subtle)]"
        />
      </label>
      <div className="flex flex-col gap-3 py-3">
        {canAddSource && (
          <section
            className="pipeline-node-selector__sources shrink-0"
            aria-labelledby="pipeline-node-selector-sources"
          >
            <h2
              id="pipeline-node-selector-sources"
              className="mb-1.5 px-3 text-[10px] leading-4 font-semibold tracking-[0.08em] text-[var(--pipeline-text-subtle)] uppercase"
            >
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
            {sourceState === 'success' && matchingSources.length > 0 && (
              <ScrollArea
                className="pipeline-node-selector__source-list shrink-0"
                aria-label={t('pipelines.workspace.nodeSelector.sources')}
              >
                <div className="space-y-1 px-2 py-0.5">
                  {matchingSources.map((source) => {
                    const connector = connectorsById.get(source.connector)
                    const scopeCount = source.tables === null ? '∞' : (source.tables ?? []).length
                    return (
                      <div key={source.id}>
                        <button
                          type="button"
                          data-node-selector-source={source.id}
                          className="flex min-h-10 w-full min-w-0 cursor-pointer items-center gap-2 rounded-lg px-2 text-left text-xs font-medium text-[var(--pipeline-text)] transition-colors hover:bg-[var(--pipeline-selector-hover)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--pipeline-selection)]"
                          onClick={() => selectSource(source)}
                        >
                          <ConnectorIcon
                            connectorId={connector?.id ?? source.connector}
                            name={connector?.name ?? source.connector}
                            iconPath={connector?.icon}
                            size={24}
                            className="pipeline-node-selector__connector-icon"
                            withBackdropLayer
                          />
                          <span className="min-w-0 flex-1 truncate text-left">{source.id}</span>
                          <span className="min-w-5 rounded-full bg-[var(--pipeline-surface)] px-1.5 text-center text-[10px] leading-5 text-[var(--pipeline-selector-muted)]">
                            {scopeCount}
                          </span>
                        </button>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            )}
          </section>
        )}

        {(['processing', 'output'] as const).map((section) => {
          const items = matchingChoices.filter((choice) => choice.section === section)
          if (items.length === 0) return null
          return (
            <section
              key={section}
              className="shrink-0"
              aria-labelledby={`pipeline-node-selector-${section}`}
            >
              <h2
                id={`pipeline-node-selector-${section}`}
                className="mb-1.5 px-3 text-[10px] leading-4 font-semibold tracking-[0.08em] text-[var(--pipeline-text-subtle)] uppercase"
              >
                {t(`pipelines.workspace.nodeSelector.${section}`)}
              </h2>
              <div className={cn('grid gap-1 px-3', section === 'processing' && 'grid-cols-2')}>
                {items.map((choice) => {
                  const Icon = choice.icon
                  const dataChoice =
                    choice.kind === 'transform' ? `transform:${choice.transformType}` : choice.kind
                  return (
                    <button
                      key={choice.id}
                      type="button"
                      data-node-choice={dataChoice}
                      className="flex min-h-9 min-w-0 cursor-pointer items-center gap-2 rounded-lg border border-[var(--pipeline-selector-border)] px-2 text-left text-xs font-medium text-[var(--pipeline-text)] transition-colors hover:bg-[var(--pipeline-selector-hover)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--pipeline-selection)]"
                      onClick={() => onChoose(choiceForDirectItem(choice))}
                    >
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-[var(--pipeline-kind-transform-surface)] text-[var(--pipeline-kind-transform-text)]">
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
          <p className="m-0 px-3 py-2 text-xs leading-5 text-[var(--pipeline-selector-muted)]">
            {t('pipelines.workspace.nodeSelector.noResults')}
          </p>
        )}
      </div>
    </div>
  )
}
