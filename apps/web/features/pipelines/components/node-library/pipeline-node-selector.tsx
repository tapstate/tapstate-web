import {
  Popover,
  PopoverClose,
  PopoverPopup,
  PopoverPortal,
  PopoverPositioner,
  PopoverTitle,
} from '@tapstate-web/ui/popover'
import { SearchInput } from '@tapstate-web/ui/search-input'
import { Tabs, TabsIndicator, TabsList, TabsPanel, TabsTab } from '@tapstate-web/ui/tabs'
import {
  ArrowDownToLine,
  Boxes,
  Braces,
  Code2,
  Combine,
  Filter,
  GitFork,
  GitMerge,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { ConnectorSummary, SourceView } from '@/service/source-client'

import { ConnectorIcon } from '@/components/connector-icon'
import { ScrollArea } from '@/components/ui/scroll-area'

import type { PipelineTableLoader } from '../node-config/pipeline-data-node-schema'
import type {
  PipelineNodeChoice,
  PipelineNodeInsertionContext,
  PipelineTransformType,
} from './pipeline-node-library-types'

interface PipelineNodeSelectorProps {
  open: boolean
  disabled?: boolean
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

type SelectorTab = 'source' | 'transform' | 'destination'
const selectorTabs: SelectorTab[] = ['source', 'transform', 'destination']

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

function choiceForDirectItem(choice: DirectChoice): PipelineNodeChoice {
  if (choice.kind === 'transform') {
    return { kind: 'transform', transformType: choice.transformType! }
  }
  return { kind: choice.kind }
}

/** A shared, compact selector for inserting a configured Source or a Pipeline operation. */
export function PipelineNodeSelector({
  open,
  disabled = false,
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
  const [queries, setQueries] = useState<Record<SelectorTab, string>>({
    source: '',
    transform: '',
    destination: '',
  })
  const [activeTab, setActiveTab] = useState<SelectorTab>('source')
  const searchRef = useRef<HTMLInputElement>(null)
  const query = queries[activeTab]
  const setQuery = (value: string) => setQueries((current) => ({ ...current, [activeTab]: value }))

  useEffect(() => {
    if (!open || disabled) return
    setQueries({ source: '', transform: '', destination: '' })
    setActiveTab(insertion?.connectFrom || insertion?.insertEdge ? 'transform' : 'source')
  }, [disabled, open, insertion])

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
  const visibleChoices = matchingChoices.filter(
    (choice) => choice.section === (activeTab === 'transform' ? 'processing' : 'output'),
  )
  const hasResults = activeTab === 'source' ? matchingSources.length > 0 : visibleChoices.length > 0

  function selectSource(source: SourceView) {
    onChoose({
      kind: 'source',
      sourceId: source.id,
      table: '',
      connectorId: source.connector || null,
    })
  }

  const anchorPosition = insertion.screenPosition ?? { x: 288, y: 96 }
  const anchor = {
    getBoundingClientRect: () => new DOMRect(anchorPosition.x, anchorPosition.y, 0, 0),
  }

  return (
    <Popover modal="trap-focus" open={open && !disabled} onOpenChange={onOpenChange}>
      <PopoverPortal>
        <PopoverPositioner
          anchor={anchor}
          placement={insertion.selectorOrigin === 'next-step' ? 'top-start' : 'right-start'}
          sideOffset={0}
          positionMethod="fixed"
        >
          <PopoverPopup
            className="border-none bg-transparent shadow-none"
            initialFocus={searchRef}
            onClick={(event) => event.stopPropagation()}
          >
            <PopoverTitle className="sr-only">
              {t('pipelines.workspace.nodeSelector.title')}
            </PopoverTitle>
            <div
              className={`pipeline-node-selector${insertion.selectorOrigin === 'next-step' ? ' pipeline-node-selector--next-step' : ''}`}
            >
              <Tabs
                value={activeTab}
                onValueChange={(tab) => {
                  setActiveTab(tab as SelectorTab)
                }}
                className="flex min-h-0 flex-1 flex-col"
              >
                <TabsList
                  className="bg-background-section-burn relative w-full min-w-0 gap-0 pt-1 pl-1"
                  aria-label={t('pipelines.workspace.nodeSelector.title')}
                >
                  {selectorTabs.map((tab) => (
                    <TabsTab
                      key={tab}
                      id={`pipeline-node-selector-tab-${tab}`}
                      value={tab}
                      disabled={tab === 'source' && !canAddSource}
                      className="system-sm-medium text-text-tertiary data-active:text-text-accent data-disabled:text-text-disabled z-10 mr-0.5 h-8 rounded-t-lg border-b-0 px-3 py-0 data-active:cursor-default data-active:border-transparent data-disabled:opacity-60"
                    >
                      {t(`pipelines.workspace.nodeSelector.${tab}Tab`)}
                    </TabsTab>
                  ))}
                  <TabsIndicator
                    className="bg-components-panel-bg pointer-events-none absolute left-0 rounded-t-lg transition-[translate,width] duration-150 ease-in-out motion-reduce:transition-none"
                    style={{
                      top: 'var(--active-tab-top)',
                      translate: 'var(--active-tab-left)',
                      width: 'var(--active-tab-width)',
                      height: 'var(--active-tab-height)',
                    }}
                  />
                  <PopoverClose
                    className="sr-only"
                    tabIndex={-1}
                    onClick={() => onOpenChange(false)}
                    aria-label={t('pipelines.workspace.nodeSelector.close')}
                  >
                    {t('pipelines.workspace.nodeSelector.close')}
                  </PopoverClose>
                </TabsList>
                <TabsPanel value={activeTab} className="flex min-h-0 flex-1 flex-col" tabIndex={-1}>
                  <div className="m-2">
                    <SearchInput
                      ref={searchRef}
                      value={query}
                      onValueChange={setQuery}
                      placeholder={t('pipelines.workspace.nodeSelector.searchPlaceholder')}
                      aria-label={t('pipelines.workspace.nodeSelector.searchPlaceholder')}
                      clearLabel={t('pipelines.workspace.nodeSelector.clearSearch')}
                    />
                  </div>
                  <div className="pipeline-node-selector__content border-divider-subtle flex min-h-0 flex-col gap-1 overflow-y-auto border-t p-1">
                    {activeTab === 'source' && canAddSource && (
                      <section
                        className="pipeline-node-selector__sources shrink-0"
                        aria-labelledby="pipeline-node-selector-sources"
                      >
                        <h2
                          id="pipeline-node-selector-sources"
                          className="flex h-[22px] items-start px-3 text-xs font-medium text-[var(--pipeline-text-subtle)]"
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
                            {query
                              ? t('pipelines.workspace.nodeSelector.noResults')
                              : t('pipelines.workspace.nodeSelector.emptySources')}
                          </p>
                        )}
                        {sourceState === 'success' && matchingSources.length > 0 && (
                          <ScrollArea
                            className="pipeline-node-selector__source-list shrink-0"
                            aria-label={t('pipelines.workspace.nodeSelector.sources')}
                          >
                            <div>
                              {matchingSources.map((source) => {
                                const connector = connectorsById.get(source.connector)
                                return (
                                  <div key={source.id}>
                                    <button
                                      type="button"
                                      data-node-selector-source={source.id}
                                      className="pipeline-node-selector__row system-sm-regular text-text-secondary hover:bg-state-base-hover focus-visible:inset-ring-state-accent-solid flex h-8 w-full min-w-0 cursor-pointer items-center gap-2 rounded-lg border-0 bg-transparent pr-2 pl-3 text-left focus-visible:inset-ring-2 focus-visible:outline-hidden"
                                      onClick={() => selectSource(source)}
                                    >
                                      <ConnectorIcon
                                        connectorId={connector?.id ?? source.connector}
                                        name={connector?.name ?? source.connector}
                                        iconPath={connector?.icon}
                                        size={20}
                                        className="pipeline-node-selector__connector-icon"
                                        withBackdropLayer
                                      />
                                      <span className="min-w-0 flex-1 truncate text-left">
                                        {source.id}
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

                    {activeTab !== 'source' && visibleChoices.length > 0 && (
                      <section
                        className="shrink-0"
                        aria-label={t(`pipelines.workspace.nodeSelector.${activeTab}Tab`)}
                      >
                        <div className="flex flex-col">
                          <h2 className="flex h-[22px] items-start px-3 text-xs font-medium text-[var(--pipeline-text-subtle)]">
                            {t(
                              `pipelines.workspace.nodeSelector.${activeTab === 'transform' ? 'processing' : 'output'}`,
                            )}
                          </h2>
                          {visibleChoices.map((choice) => {
                            const Icon = choice.icon
                            const dataChoice =
                              choice.kind === 'transform'
                                ? `transform:${choice.transformType}`
                                : choice.kind
                            return (
                              <button
                                key={choice.id}
                                type="button"
                                data-node-choice={dataChoice}
                                className="pipeline-node-selector__row system-sm-regular text-text-secondary hover:bg-state-base-hover focus-visible:inset-ring-state-accent-solid flex h-8 w-full min-w-0 cursor-pointer items-center gap-2 rounded-lg border-0 bg-transparent pr-2 pl-3 text-left focus-visible:inset-ring-2 focus-visible:outline-hidden"
                                onClick={() => onChoose(choiceForDirectItem(choice))}
                              >
                                <span
                                  data-node-selector-kind={activeTab}
                                  data-node-choice-icon={choice.id}
                                  className="pipeline-node-selector__choice-icon flex size-5 shrink-0 items-center justify-center rounded-md shadow-xs"
                                >
                                  <Icon className="size-3.5" aria-hidden="true" />
                                </span>
                                <span>{t(`pipelines.workspace.nodeSelector.${choice.id}`)}</span>
                              </button>
                            )
                          })}
                        </div>
                      </section>
                    )}
                    {!hasResults && activeTab !== 'source' && (
                      <p className="m-0 px-3 py-2 text-xs leading-5 text-[var(--pipeline-selector-muted)]">
                        {t('pipelines.workspace.nodeSelector.noResults')}
                      </p>
                    )}
                  </div>
                </TabsPanel>
              </Tabs>
            </div>
          </PopoverPopup>
        </PopoverPositioner>
      </PopoverPortal>
    </Popover>
  )
}
