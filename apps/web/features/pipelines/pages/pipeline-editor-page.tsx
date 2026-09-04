import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  Activity,
  AlertCircle,
  Braces,
  ChevronLeft,
  Gauge,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  ScrollText,
  Workflow,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'
import {
  createPipeline,
  getPipeline,
  getPipelineLayout,
  getPipelineStatus,
  runPipeline,
  savePipelineLayout,
  updatePipeline,
  type PipelineLayout,
  type PipelineRuntimeState,
  type PipelineView,
} from '@/service/pipelines/pipeline-client'
import { getSourceSchema, listConnectors, listSources } from '@/service/source-client'
import { useAuthStore } from '@/stores/auth-store'

import type {
  PipelineCanvasSelection,
  PipelineNodeConnector,
} from '../components/canvas/pipeline-canvas-types'
import type {
  PipelineSchemaOption,
  PipelineTableLoader,
} from '../components/node-config/pipeline-data-node-schema'
import type {
  PipelineNodeChoice,
  PipelineNodeInsertionContext,
} from '../components/node-library/pipeline-node-library-types'
import type {
  PipelineNodeConfiguration,
  PipelineNodeConfigurationChange,
} from '../model/pipeline-node-model'

import { PipelineStatusBadge } from '../components/pipeline-status-badge'
import { PipelineLogsPage } from '../logs/pipeline-logs-page'
import { clearStagedPipelineDraft, type StagedPipelineDraft } from '../model/pipeline-draft-session'
import {
  addPipelineNode,
  buildPipelineMutation,
  createPipelineGraphDraft,
  updatePipelineNodeConfiguration,
  validatePipelineGraph,
  type PipelineGraphDiagnostic,
  type PipelineGraphDraft,
} from '../model/pipeline-graph-edit'
import { pipelineNodeConnectors } from '../model/pipeline-node-connectors'
import { PipelineMonitoringPage } from '../monitoring/pipeline-monitoring-page'
import { PipelineWorkflowWithInnerContext } from '../workflow-app'

export type PipelineWorkspaceSection = 'orchestrate' | 'api' | 'logs' | 'monitoring'

const NODE_PANEL_DEFAULT_WIDTH = 400

function connectorForConfiguration(
  configuration: PipelineNodeConfiguration | null,
  connectorsBySourceId: ReadonlyMap<string, PipelineNodeConnector>,
) {
  if (configuration?.kind !== 'source' && configuration?.kind !== 'target') return null
  return connectorsBySourceId.get(configuration.sourceId) ?? null
}

function synchronizeSelection(
  selection: PipelineCanvasSelection,
  draft: PipelineGraphDraft | null,
  connectorsBySourceId: ReadonlyMap<string, PipelineNodeConnector>,
): PipelineCanvasSelection | null {
  if (!draft) return null
  const node = draft.dag.nodes.find((candidate) => candidate.id === selection.id)
  if (!node) return null

  const configuration = draft.configurations.get(node.id) ?? null
  return {
    ...selection,
    label: node.label,
    detail: node.detail,
    description: draft.descriptions.get(node.id) ?? node.description ?? '',
    nodeType: node.type,
    connector: connectorForConfiguration(configuration, connectorsBySourceId),
    configuration,
  }
}

function selectionsEqual(left: PipelineCanvasSelection, right: PipelineCanvasSelection) {
  return (
    left.id === right.id &&
    left.label === right.label &&
    left.detail === right.detail &&
    left.description === right.description &&
    left.nodeType === right.nodeType &&
    left.connector === right.connector &&
    left.configuration === right.configuration
  )
}

function synchronizeCurrentSelection(
  selection: PipelineCanvasSelection | null,
  draft: PipelineGraphDraft,
  connectorsBySourceId: ReadonlyMap<string, PipelineNodeConnector>,
) {
  if (!selection) return selection
  const synchronized = synchronizeSelection(selection, draft, connectorsBySourceId)
  return synchronized && selectionsEqual(selection, synchronized) ? selection : synchronized
}

function synchronizeConfiguredNodeIdentity(
  draft: PipelineGraphDraft,
  nodeId: string,
): PipelineGraphDraft {
  const configuration = draft.configurations.get(nodeId)
  if (configuration?.kind !== 'source' && configuration?.kind !== 'target') return draft

  return {
    ...draft,
    dag: {
      ...draft.dag,
      nodes: draft.dag.nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              label: configuration.table || node.label,
              detail: configuration.sourceId || null,
            }
          : node,
      ),
    },
  }
}

function asQuotedEtag(hash: string) {
  return hash.startsWith('"') && hash.endsWith('"') ? hash : `"${hash}"`
}

const workspaceNavigation = [
  {
    section: 'orchestrate',
    labelKey: 'pipelines.workspace.navigation.orchestrate',
    icon: Workflow,
  },
  { section: 'api', labelKey: 'pipelines.workspace.navigation.api', icon: Braces },
  { section: 'logs', labelKey: 'pipelines.workspace.navigation.logs', icon: ScrollText },
  { section: 'monitoring', labelKey: 'pipelines.workspace.navigation.monitoring', icon: Gauge },
] as const

function QueryIssue({ unavailable, onRetry }: { unavailable: boolean; onRetry: () => void }) {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-36 flex-col items-start justify-center gap-2 px-5 py-6">
      <p className="text-[13px] font-semibold text-slate-800">
        {t(
          unavailable
            ? 'pipelines.workspace.runtime.unavailableTitle'
            : 'pipelines.workspace.runtime.errorTitle',
        )}
      </p>
      <p className="max-w-[34ch] text-[12px] leading-5 text-slate-500">
        {t(
          unavailable
            ? 'pipelines.workspace.runtime.unavailableBody'
            : 'pipelines.workspace.runtime.errorBody',
        )}
      </p>
      <button
        type="button"
        className="mt-1 h-8 rounded-lg bg-slate-900 px-3 text-[12px] font-semibold text-white transition-[background-color,transform] hover:bg-slate-700 focus-visible:ring-3 focus-visible:ring-blue-500/30 focus-visible:outline-none active:scale-95"
        onClick={onRetry}
      >
        {t('pipelines.workspace.actions.retry')}
      </button>
    </div>
  )
}

function LoadingPanel() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-36 items-center px-5 py-6 text-[12px] text-slate-500">
      {t('pipelines.workspace.runtime.loading')}
    </div>
  )
}

function WorkspaceNavLink({
  pipelineId,
  section,
  activeSection,
  children,
}: {
  pipelineId: string
  section: PipelineWorkspaceSection
  activeSection: PipelineWorkspaceSection
  children: ReactNode
}) {
  const isActive = section === activeSection
  const className = cn(
    'pipeline-workspace__nav-link flex h-full min-w-0 flex-1 items-center gap-2.5 rounded-lg px-3 text-[13px] font-semibold transition-[background-color,border-color,box-shadow,color,transform] focus-visible:ring-3 focus-visible:ring-[var(--pipeline-selection-ring)] focus-visible:outline-none active:scale-95 max-sm:justify-center max-sm:px-0',
    isActive && 'pipeline-workspace__nav-link--active',
  )
  const commonProps = {
    className,
    'aria-current': isActive ? ('page' as const) : undefined,
  }

  if (section === 'api') {
    return (
      <Link to="/pipelines/$pipelineId/edit/api" params={{ pipelineId }} {...commonProps}>
        {children}
      </Link>
    )
  }
  if (section === 'logs') {
    return (
      <Link to="/pipelines/$pipelineId/edit/logs" params={{ pipelineId }} {...commonProps}>
        {children}
      </Link>
    )
  }
  if (section === 'monitoring') {
    return (
      <Link to="/pipelines/$pipelineId/edit/monitoring" params={{ pipelineId }} {...commonProps}>
        {children}
      </Link>
    )
  }
  return (
    <Link to="/pipelines/$pipelineId/edit" params={{ pipelineId }} {...commonProps}>
      {children}
    </Link>
  )
}

function PipelineWorkspaceNav({
  pipelineId,
  activeSection,
  collapsed,
  onCollapsedChange,
  status,
}: {
  pipelineId: string
  activeSection: PipelineWorkspaceSection
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
  status?: PipelineRuntimeState
}) {
  const { t } = useTranslation()

  return (
    <aside
      className={cn(
        'pipeline-workspace__navigation relative flex h-full shrink-0 overflow-hidden transition-[width] duration-150 motion-reduce:transition-none',
        collapsed ? 'w-14' : 'w-62 max-md:w-52',
      )}
      data-testid="workspace-navigation"
      data-collapsed={collapsed}
    >
      <div className="pipeline-workspace__navigation-panel flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg px-3 py-3">
        <div
          className={cn('flex h-10 items-center', collapsed ? 'justify-center' : 'justify-between')}
        >
          <Link
            to="/pipelines"
            className={cn(
              'inline-flex h-8 shrink-0 items-center rounded-lg text-slate-700 transition-[background-color,transform] hover:bg-slate-100 focus-visible:ring-3 focus-visible:ring-blue-500/30 focus-visible:outline-none active:scale-95',
              collapsed ? 'size-8 justify-center' : 'max-w-full gap-1 px-1.5',
            )}
            aria-label={t('pipelines.workspace.back')}
          >
            <ChevronLeft className="size-4 shrink-0" aria-hidden="true" />
            {!collapsed && (
              <span
                className="min-w-0 truncate text-[13px] font-semibold text-slate-800"
                data-testid="workspace-navigation-title"
              >
                {t('nav.pipelines')}
              </span>
            )}
          </Link>
          {!collapsed && (
            <button
              type="button"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-[background-color,color,transform] hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-3 focus-visible:ring-blue-500/30 focus-visible:outline-none active:scale-95"
              aria-label={t('pipelines.workspace.navigation.collapse')}
              onClick={() => onCollapsedChange(true)}
            >
              <PanelLeftClose className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {collapsed && (
          <button
            type="button"
            className="mt-1 inline-flex size-10 shrink-0 items-center justify-center self-center rounded-lg text-slate-400 transition-[background-color,color,transform] hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-3 focus-visible:ring-blue-500/30 focus-visible:outline-none active:scale-95"
            aria-label={t('pipelines.workspace.navigation.expand')}
            onClick={() => onCollapsedChange(false)}
          >
            <PanelLeftOpen className="size-4" aria-hidden="true" />
          </button>
        )}

        <div
          className={cn('mt-5 flex items-center gap-3 px-2', collapsed && 'justify-center px-0')}
        >
          <span className="pipeline-workspace__identity-mark flex size-8 shrink-0 items-center justify-center rounded-lg">
            <Workflow className="size-4" aria-hidden="true" />
          </span>
          {!collapsed && (
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span className="min-w-0 truncate text-[13px] leading-5 font-semibold text-slate-800">
                {pipelineId}
              </span>
              <PipelineStatusBadge status={status} />
            </div>
          )}
        </div>

        <nav className="mt-7 space-y-1" aria-label={t('pipelines.workspace.navigation.label')}>
          {workspaceNavigation.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.section}
                className={cn(
                  'pipeline-workspace__nav-row flex h-10 items-center gap-1 rounded-lg',
                  item.section === activeSection && 'pipeline-workspace__nav-row--active',
                )}
              >
                <WorkspaceNavLink
                  pipelineId={pipelineId}
                  section={item.section}
                  activeSection={activeSection}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span className={cn(collapsed && 'sr-only')}>{t(item.labelKey)}</span>
                </WorkspaceNavLink>
              </div>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}

function PipelineOrchestrationPage({
  pipelineId,
  stagedDraft,
}: {
  pipelineId: string
  stagedDraft: StagedPipelineDraft | null
}) {
  const { t } = useTranslation()
  const apiFetch = useAuthStore((state) => state.apiFetch)
  const [selection, setSelection] = useState<PipelineCanvasSelection | null>(null)
  const [draft, setDraft] = useState<PipelineGraphDraft | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [diagnostics, setDiagnostics] = useState<PipelineGraphDiagnostic[]>([])
  const [actionError, setActionError] = useState<string | null>(null)
  const [layoutDraft, setLayoutDraft] = useState<Pick<PipelineLayout, 'nodes' | 'viewport'> | null>(
    null,
  )
  const [nodePanelWidth, setNodePanelWidth] = useState(NODE_PANEL_DEFAULT_WIDTH)
  const [surfaceWidth, setSurfaceWidth] = useState(0)
  const surfaceRef = useRef<HTMLElement>(null)
  const latestLayout = useRef<Pick<PipelineLayout, 'nodes' | 'viewport'> | null>(null)
  const draftRef = useRef<PipelineGraphDraft | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isNewPipeline, setIsNewPipeline] = useState(stagedDraft !== null)
  const stagedPipeline = useMemo<PipelineView | null>(() => {
    if (!stagedDraft) return null
    return {
      id: stagedDraft.id,
      metadata: { labels: {}, description: stagedDraft.description || null },
      sources: [],
      transforms: [],
      view: null,
      serve: null,
      settings: null,
      experimental: null,
      dag: { nodes: [], edges: [] },
      contentHash: 'draft',
      status: null,
    }
  }, [stagedDraft])

  const pipeline = useQuery({
    queryKey: ['pipelines', pipelineId],
    queryFn: () => getPipeline(pipelineId, apiFetch),
    enabled: !isNewPipeline,
  })
  const layout = useQuery({
    queryKey: ['pipelines', pipelineId, 'layout'],
    queryFn: () => getPipelineLayout(pipelineId, apiFetch),
    enabled: !isNewPipeline,
  })
  const sources = useQuery({
    queryKey: ['sources'],
    queryFn: () => listSources(apiFetch),
  })
  const connectors = useQuery({
    queryKey: ['connectors'],
    queryFn: () => listConnectors(apiFetch),
  })
  const saveLayout = useMutation({
    mutationFn: (next: Pick<PipelineLayout, 'nodes' | 'viewport'>) =>
      savePipelineLayout(pipelineId, next, apiFetch),
  })
  const savePipeline = useMutation({
    mutationFn: async (currentDraft: PipelineGraphDraft) => {
      const mutation = buildPipelineMutation(currentDraft)
      const result = isNewPipeline
        ? await createPipeline(mutation, apiFetch)
        : await updatePipeline(
            pipelineId,
            mutation,
            asQuotedEtag(currentDraft.pipeline.contentHash),
            apiFetch,
          )
      const layoutSave = latestLayout.current
        ? await saveLayout.mutateAsync(latestLayout.current)
        : null
      return { ...result, layout: layoutSave }
    },
  })
  const run = useMutation({
    mutationFn: () => {
      return runPipeline(pipelineId, apiFetch)
    },
  })
  const pipelineData = isNewPipeline ? stagedPipeline : pipeline.data
  const layoutData = isNewPipeline ? { pipelineId, nodes: {}, viewport: null } : layout.data

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    },
    [],
  )

  useEffect(() => {
    const surface = surfaceRef.current
    if (!surface) return

    const updateSurfaceWidth = (width: number) => {
      if (width > 0) setSurfaceWidth((current) => (current === width ? current : width))
    }

    updateSurfaceWidth(surface.getBoundingClientRect().width)
    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      updateSurfaceWidth(entry.contentRect.width)
    })
    observer.observe(surface)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!pipelineData) return
    const nextDraft = createPipelineGraphDraft(pipelineData)
    draftRef.current = nextDraft
    setDraft(nextDraft)
    setIsDirty(false)
    setDiagnostics([])
    setActionError(null)
    setSelection(null)
  }, [pipelineData?.contentHash])

  useEffect(() => {
    if (!layoutData) return
    setLayoutDraft(
      (current) => current ?? { nodes: layoutData.nodes, viewport: layoutData.viewport },
    )
  }, [layoutData])

  function scheduleLayoutSave(next: Pick<PipelineLayout, 'nodes' | 'viewport'>) {
    latestLayout.current = next
    setLayoutDraft(next)
    if (isNewPipeline) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      if (latestLayout.current) saveLayout.mutate(latestLayout.current)
    }, 420)
  }

  const isLoading = isNewPipeline ? false : pipeline.isLoading || layout.isLoading
  const error = isNewPipeline ? false : pipeline.isError || layout.isError
  const connectorsBySourceId = useMemo(
    () => pipelineNodeConnectors(sources.data ?? [], connectors.data ?? []),
    [connectors.data, sources.data],
  )
  const configurations = draft?.configurations ?? new Map<string, PipelineNodeConfiguration>()
  const descriptions = draft?.descriptions ?? new Map<string, string>()
  const canvasLayout = useMemo<PipelineLayout | null>(() => {
    if (!layoutData) return null
    return {
      ...layoutData,
      ...layoutDraft,
      nodes: { ...layoutData.nodes, ...layoutDraft?.nodes },
    }
  }, [layoutData, layoutDraft])
  const sourceOptions = useMemo<PipelineSchemaOption[]>(
    () =>
      (sources.data ?? []).map((source) => ({
        label: source.id,
        value: source.id,
      })),
    [sources.data],
  )
  const tableOptionsBySourceId = useMemo(() => {
    const options = new Map<string, PipelineSchemaOption[]>()
    for (const source of sources.data ?? []) {
      const tables = (source.tables ?? [])
        .map((table) => table.name ?? table.pattern)
        .filter((name): name is string => Boolean(name))
        .map((name) => ({ label: name, value: name }))
      if (tables.length > 0) options.set(source.id, tables)
    }
    return options
  }, [sources.data])
  const selectedTableOptions = useMemo(() => {
    const configuration = selection?.configuration
    if (configuration?.kind !== 'source' && configuration?.kind !== 'target') return undefined
    return tableOptionsBySourceId.get(configuration.sourceId)
  }, [selection?.configuration, tableOptionsBySourceId])
  const loadPipelineTables = useCallback<PipelineTableLoader>(
    async (sourceId) => {
      const cached = tableOptionsBySourceId.get(sourceId)
      if (cached?.length) return cached

      const report = await getSourceSchema(sourceId, apiFetch)
      return report.tables.map((table) => ({ label: table.name, value: table.name }))
    },
    [apiFetch, tableOptionsBySourceId],
  )
  const availableCanvasWidth = useMemo(() => {
    if (!surfaceWidth) return undefined
    return Math.max(surfaceWidth - (selection ? nodePanelWidth : 0), 400)
  }, [nodePanelWidth, selection, surfaceWidth])

  useEffect(() => {
    setSelection((current) => {
      if (!current) return current
      const synchronized = synchronizeSelection(current, draft, connectorsBySourceId)
      if (!synchronized) return null
      return selectionsEqual(current, synchronized) ? current : synchronized
    })
  }, [connectorsBySourceId, draft])

  function handleSelectionChange(nextSelection: PipelineCanvasSelection | null) {
    if (!nextSelection) {
      setSelection(null)
      return
    }
    setSelection(
      synchronizeSelection(nextSelection, draftRef.current, connectorsBySourceId) ?? nextSelection,
    )
  }

  function handleConfigurationChange(change: PipelineNodeConfigurationChange) {
    const current = draftRef.current
    if (!current) return
    const next = synchronizeConfiguredNodeIdentity(
      updatePipelineNodeConfiguration(current, change),
      change.nodeId,
    )
    draftRef.current = next
    setDraft(next)
    setSelection((previous) => synchronizeCurrentSelection(previous, next, connectorsBySourceId))
    setIsDirty(true)
  }

  function handleDescriptionChange(description: string) {
    if (!selection) return
    const current = draftRef.current
    if (!current) return
    const descriptions = new Map(current.descriptions).set(selection.id, description)
    const next = {
      ...current,
      descriptions,
      dag: {
        ...current.dag,
        nodes: current.dag.nodes.map((node) =>
          node.id === selection.id ? { ...node, description } : node,
        ),
      },
    }
    draftRef.current = next
    setDraft(next)
    setSelection((previous) => (previous ? { ...previous, description } : previous))
    setIsDirty(true)
  }

  function handleChooseNode(choice: PipelineNodeChoice, insertion: PipelineNodeInsertionContext) {
    const current = draftRef.current
    if (!current) return
    const currentLayout = latestLayout.current ?? layoutData
    const result = addPipelineNode(
      current,
      choice,
      insertion.position,
      insertion.connectFrom ?? undefined,
      insertion.connectTo ?? undefined,
      insertion.insertEdge,
    )
    draftRef.current = result.draft
    setDraft(result.draft)
    const node = result.draft.dag.nodes.find((candidate) => candidate.id === result.nodeId)
    if (node) {
      const configuration = result.draft.configurations.get(node.id) ?? null
      setSelection({
        id: node.id,
        label: node.label,
        detail: node.detail,
        description: node.description ?? '',
        nodeType: node.type,
        connector: connectorForConfiguration(configuration, connectorsBySourceId),
        configuration,
      })
    }
    if (result.position) {
      scheduleLayoutSave({
        nodes: { ...currentLayout?.nodes, [result.nodeId]: result.position },
        viewport: currentLayout?.viewport ?? null,
      })
    }
    setIsDirty(true)
  }

  async function handleSave(): Promise<boolean> {
    if (!draft || savePipeline.isPending) return false
    const nextDiagnostics = validatePipelineGraph(
      draft,
      sources.data?.map((source) => source.id),
    )
    setDiagnostics(nextDiagnostics)
    setActionError(null)
    if (nextDiagnostics.length > 0) return false
    try {
      const result = await savePipeline.mutateAsync(draft)
      const nextDraft = createPipelineGraphDraft(result.pipeline)
      draftRef.current = nextDraft
      setDraft(nextDraft)
      setIsDirty(false)
      setDiagnostics([])
      if (isNewPipeline) {
        clearStagedPipelineDraft(pipelineId)
        setIsNewPipeline(false)
      }
      latestLayout.current = null
      if (saveTimer.current) clearTimeout(saveTimer.current)
      await pipeline.refetch()
      return true
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : t('pipelines.workspace.actions.saveFailed'),
      )
      return false
    }
  }

  async function handleRun() {
    if (isDirty && !(await handleSave())) return
    try {
      setActionError(null)
      await run.mutateAsync()
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : t('pipelines.workspace.actions.runFailed'),
      )
    }
  }

  return (
    <section
      ref={surfaceRef}
      className="pipeline-canvas-surface relative h-full min-w-0 flex-1 overflow-hidden"
    >
      <a
        href="#pipeline-canvas"
        className="sr-only absolute top-3 left-3 z-50 rounded-lg bg-slate-950 px-3 py-2 text-sm text-white focus:not-sr-only"
      >
        {t('pipelines.workspace.skipToCanvas')}
      </a>

      <section id="pipeline-canvas" className="absolute inset-0 min-h-0">
        {isLoading && (
          <div className="pipeline-canvas-state flex h-full items-center justify-center text-sm font-medium text-slate-500">
            {t('pipelines.workspace.loading')}
          </div>
        )}
        {error && (
          <div className="pipeline-canvas-state flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-sm font-semibold text-slate-800">
              {t('pipelines.workspace.error.title')}
            </p>
            <button
              type="button"
              className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition-[background-color,transform] hover:bg-slate-700 focus-visible:ring-3 focus-visible:ring-blue-500/30 focus-visible:outline-none active:scale-95"
              onClick={() => {
                if (!isNewPipeline) {
                  void pipeline.refetch()
                  void layout.refetch()
                }
              }}
            >
              {t('pipelines.workspace.actions.retry')}
            </button>
          </div>
        )}
        {draft && canvasLayout && (
          <PipelineWorkflowWithInnerContext
            canvas={{
              dag: draft.dag,
              layout: canvasLayout,
              connectorsBySourceId,
              configurations,
              descriptions,
              onLayoutChange: scheduleLayoutSave,
              onGraphChange: (nextDag) => {
                const current = draftRef.current
                if (!current) return
                const nodeIds = new Set(nextDag.nodes.map((node) => node.id))
                const configurations = new Map(
                  Array.from(current.configurations).filter(([nodeId]) => nodeIds.has(nodeId)),
                )
                const descriptions = new Map(
                  Array.from(current.descriptions).filter(([nodeId]) => nodeIds.has(nodeId)),
                )
                const next = { ...current, dag: nextDag, configurations, descriptions }
                draftRef.current = next
                setDraft(next)
                setSelection((previous) =>
                  synchronizeCurrentSelection(previous, next, connectorsBySourceId),
                )
                setIsDirty(true)
              },
              sources: sources.data,
              connectors: connectors.data,
              sourceState: sources.isPending ? 'loading' : sources.isError ? 'error' : 'success',
              onAddNode: handleChooseNode,
              onSelectionChange: handleSelectionChange,
              availableWidth: availableCanvasWidth,
            }}
            header={{
              isDirty,
              isSaving: savePipeline.isPending,
              isRunning: run.isPending,
              onSave: () => void handleSave(),
              onRun: () => void handleRun(),
            }}
            panel={{
              selection,
              width: nodePanelWidth,
              onWidthChange: setNodePanelWidth,
              onClose: () => setSelection(null),
              onConfigurationChange: handleConfigurationChange,
              onDescriptionChange: handleDescriptionChange,
              sourceOptions,
              tableOptions: selectedTableOptions,
              loadTables: loadPipelineTables,
            }}
          />
        )}
      </section>

      {(diagnostics.length > 0 || actionError) && (
        <div
          className="pipeline-canvas__alerts absolute top-20 right-5 z-30 flex max-w-[min(26rem,calc(100vw-2rem))] flex-col gap-2"
          role="alert"
        >
          {actionError && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-medium text-rose-700 shadow-sm">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <span>{actionError}</span>
            </div>
          )}
          {diagnostics.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-medium text-amber-800 shadow-sm">
              <div className="mb-1 flex items-center gap-2">
                <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                <span>{t('pipelines.workspace.diagnostics.title')}</span>
              </div>
              <ul className="space-y-0.5 pl-5">
                {diagnostics.slice(0, 4).map((diagnostic, index) => (
                  <li key={`${diagnostic.code}-${diagnostic.nodeIds.join('-')}-${index}`}>
                    {t(diagnostic.messageKey)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function WorkspacePageFrame({
  section,
  pipelineId,
  children,
  showHeading = true,
}: {
  section: Exclude<PipelineWorkspaceSection, 'orchestrate'>
  pipelineId: string
  children: ReactNode
  showHeading?: boolean
}) {
  const { t } = useTranslation()
  const item = workspaceNavigation.find((navigation) => navigation.section === section)
  const Icon = item?.icon ?? Activity

  return (
    <section
      className={cn(
        'pipeline-workspace__main pipeline-canvas-surface relative min-w-0 flex-1 overflow-y-auto',
        `pipeline-workspace__main--${section}`,
      )}
      data-testid="workspace-main"
    >
      <div className="pipeline-workspace__main-content w-full">
        {showHeading && (
          <div className="flex items-start gap-3 border-b border-slate-200 pb-6">
            <span className="pipeline-workspace__section-mark flex size-9 shrink-0 items-center justify-center rounded-lg">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-400 uppercase">
                {pipelineId}
              </p>
              <h1 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
                {t(item?.labelKey ?? 'pipelines.workspace.navigation.orchestrate')}
              </h1>
            </div>
          </div>
        )}
        {children}
      </div>
    </section>
  )
}

function ApiAccessPage({ pipelineId }: { pipelineId: string }) {
  const { t } = useTranslation()
  const apiFetch = useAuthStore((state) => state.apiFetch)
  const pipeline = useQuery({
    queryKey: ['pipelines', pipelineId],
    queryFn: () => getPipeline(pipelineId, apiFetch),
  })

  if (pipeline.isLoading) return <LoadingPanel />
  if (pipeline.isError) {
    return <QueryIssue unavailable={false} onRetry={() => void pipeline.refetch()} />
  }

  const serveNodes = pipeline.data?.serve
    ? [
        {
          id: pipeline.data.serve.id ?? 'serve',
          label: pipeline.data.serve.id ?? pipelineId,
          detail: typeof pipeline.data.serve.from === 'string' ? pipeline.data.serve.from : null,
        },
      ]
    : (pipeline.data?.dag.nodes
        .filter((node) => node.type === 'serve')
        .map((node) => ({ id: node.id, label: node.label, detail: node.detail })) ?? [])
  if (serveNodes.length === 0) {
    return (
      <div className="mt-6">
        <p className="text-[13px] font-semibold text-slate-800">
          {t('pipelines.workspace.apiAccess.emptyTitle')}
        </p>
        <p className="mt-1.5 max-w-[48ch] text-[12px] leading-5 text-slate-500">
          {t('pipelines.workspace.apiAccess.emptyBody')}
        </p>
      </div>
    )
  }

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.1)]">
      <div className="px-5 py-4">
        <p className="text-[13px] font-semibold text-slate-800">
          {t('pipelines.workspace.apiAccess.pendingTitle')}
        </p>
        <p className="mt-1.5 max-w-[48ch] text-[12px] leading-5 text-slate-500">
          {t('pipelines.workspace.apiAccess.pendingBody')}
        </p>
      </div>
      <ul className="divide-y divide-slate-100 border-t border-slate-100">
        {serveNodes.map((node) => (
          <li key={node.id} className="flex items-center gap-2.5 px-5 py-3.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
              <Radio className="size-3.5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[12px] font-semibold text-slate-700">
                {node.label}
              </span>
              <span className="mt-0.5 block truncate text-[11px] text-slate-500">
                {node.detail ?? t('pipelines.workspace.apiAccess.serveDetail')}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function PipelineWorkspacePage({
  pipelineId,
  section,
  stagedDraft = null,
}: {
  pipelineId: string
  section: PipelineWorkspaceSection
  stagedDraft?: StagedPipelineDraft | null
}) {
  const [navigationCollapsed, setNavigationCollapsed] = useState(false)
  const apiFetch = useAuthStore((state) => state.apiFetch)
  const status = useQuery({
    queryKey: ['pipelines', pipelineId, 'status'],
    queryFn: () => getPipelineStatus(pipelineId, apiFetch),
    enabled: stagedDraft === null,
    retry: false,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  })

  return (
    <main
      className="pipeline-workspace flex h-dvh min-h-0 gap-1 overflow-hidden p-1"
      data-testid="pipeline-workspace"
    >
      <PipelineWorkspaceNav
        pipelineId={pipelineId}
        activeSection={section}
        collapsed={navigationCollapsed}
        onCollapsedChange={setNavigationCollapsed}
        status={status.data?.state}
      />
      {section === 'orchestrate' ? (
        <PipelineOrchestrationPage pipelineId={pipelineId} stagedDraft={stagedDraft} />
      ) : (
        <WorkspacePageFrame
          pipelineId={pipelineId}
          section={section}
          showHeading={section !== 'logs'}
        >
          {section === 'monitoring' && <PipelineMonitoringPage pipelineId={pipelineId} />}
          {section === 'logs' && <PipelineLogsPage pipelineId={pipelineId} />}
          {section === 'api' && <ApiAccessPage pipelineId={pipelineId} />}
        </WorkspacePageFrame>
      )}
    </main>
  )
}

export function PipelineEditorPage({
  pipelineId,
  stagedDraft = null,
}: {
  pipelineId: string
  stagedDraft?: StagedPipelineDraft | null
}) {
  return (
    <PipelineWorkspacePage
      pipelineId={pipelineId}
      section="orchestrate"
      stagedDraft={stagedDraft}
    />
  )
}
