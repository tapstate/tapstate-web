import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@langgenius/dify-ui/dropdown-menu'
import { IconButton } from '@langgenius/dify-ui/icon-button'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ReactFlowProvider } from '@xyflow/react'
import {
  Activity,
  ChevronLeft,
  Gauge,
  LoaderCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  ScrollText,
  Terminal,
  Workflow,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  createPipelineDraft,
  getPipelineDraft,
  getPipeline,
  getPipelineLayout,
  getPipelineStatus,
  listPipelines,
  previewPipelineDraft,
  publishPipelineDraft,
  updatePipelineDraft,
  type PipelineLayout,
  PipelineClientError,
  type PipelineDraft,
  type PipelineDraftMutation,
  type PipelineRuntimeState,
  type PipelineCatalogState,
} from '@/service/pipelines/pipeline-client'
import { getSourceSchema, listConnectors, listSources } from '@/service/source-client'
import { useAuthStore } from '@/stores/auth-store'

import type {
  CanvasNoteRecord,
  PipelineCanvasSelection,
  PipelineCanvasNotesChangeOptions,
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
  PipelineSourceTableSelection,
} from '../model/pipeline-node-model'

import { readCanvasNotes } from '../components/canvas/pipeline-canvas-notes'
import { PipelineLifecycleMenu } from '../components/pipeline-lifecycle-menu'
import { PipelineStatusBadge } from '../components/pipeline-status-badge'
import {
  usePipelineDraftAutosave,
  type PipelineDraftSaveResult,
} from '../hooks/use-pipeline-draft-autosave'
import { PipelineLogsPage } from '../logs/pipeline-logs-page'
import { isGuidedCustomer360Pipeline } from '../model/customer-360-guide'
import { getDeploymentProfile } from '../model/deployment-profile'
import {
  buildPipelineDraftMutation,
  pipelineDraftDocument,
  type PipelineDraftBasicInfo,
  type SavePipelineDraftBasicInfo,
} from '../model/pipeline-draft-document'
import {
  addPipelineNodes,
  createPipelineGraphDraft,
  removePipelineNode,
  updatePipelineNodeConfiguration,
  validatePipelineGraph,
  type PipelineGraphDiagnostic,
  type PipelineGraphDraft,
} from '../model/pipeline-graph-edit'
import { pipelineNodeConnectors } from '../model/pipeline-node-connectors'
import { sourceTableSelections } from '../model/pipeline-node-model'
import { canPipelineNodeEmitOutput } from '../model/pipeline-node-rules'
import { targetSources } from '../model/pipeline-target-connectors'
import { PipelineMonitoringPage } from '../monitoring/pipeline-monitoring-page'
import { PipelineStartNotices } from '../start-checks/pipeline-start-notice'
import { StartChecksDialog } from '../start-checks/start-checks-dialog'
import { useStartPipeline } from '../start-checks/use-start-pipeline'
import { PipelineWorkflowWithInnerContext } from '../workflow-app'
import { PipelineWorkflow } from '../workflow-app/components/pipeline-workflow'
import { WizardBuilder } from './wizard-builder'

export type PipelineWorkspaceSection = 'orchestrate' | 'logs' | 'monitoring'

function isPipelineReadOnly(status?: PipelineRuntimeState) {
  return status === 'RUNNING' || status === 'PAUSED' || status === 'FAILED'
}

function runtimeStateFromCatalog(state?: PipelineCatalogState): PipelineRuntimeState | undefined {
  switch (state) {
    case 'NEW':
    case 'RUNNING':
    case 'PAUSED':
    case 'STOPPED':
    case 'COMPLETED':
    case 'FAILED':
      return state
    default:
      return undefined
  }
}

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
  previousConfiguration?: PipelineNodeConfiguration,
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
              label: (() => {
                const previousLabel =
                  previousConfiguration?.kind === 'source'
                    ? sourceNodeLabel(previousConfiguration)
                    : previousConfiguration?.kind === 'target'
                      ? previousConfiguration.table || node.label
                      : node.label
                if (node.label !== previousLabel) return node.label
                return configuration.kind === 'source'
                  ? sourceNodeLabel(configuration)
                  : configuration.table || node.label
              })(),
              detail: configuration.sourceId || null,
            }
          : node,
      ),
    },
  }
}

function sourceNodeLabel(configuration: Extract<PipelineNodeConfiguration, { kind: 'source' }>) {
  const tables = sourceTableSelections(configuration)
  const first = tables[0]
  if (!first) return 'Source'
  const label =
    first.tableKind === 'regex'
      ? first.table.startsWith('/') && first.table.endsWith('/')
        ? first.table
        : `/${first.table}/`
      : first.table
  return tables.length > 1 ? `${label} +${tables.length - 1}` : label
}

function upstreamSourceTables(
  draft: PipelineGraphDraft | null,
  nodeId: string | undefined,
): ReturnType<typeof sourceTableSelections> {
  if (!draft || !nodeId) return []
  const visited = new Set<string>()
  const walk = (currentId: string): ReturnType<typeof sourceTableSelections> => {
    if (visited.has(currentId)) return []
    visited.add(currentId)
    const configuration = draft.configurations.get(currentId)
    if (configuration?.kind === 'source') return sourceTableSelections(configuration)
    return draft.dag.edges
      .filter((edge) => edge.target === currentId)
      .flatMap((edge) => walk(edge.source))
  }
  return walk(nodeId)
}

interface UpstreamSourceTableRef extends PipelineSourceTableSelection {
  sourceId: string
}

function upstreamSourceTableRefs(
  draft: PipelineGraphDraft | null,
  nodeId: string | undefined,
): UpstreamSourceTableRef[] {
  if (!draft || !nodeId) return []
  const visited = new Set<string>()
  const walk = (currentId: string): UpstreamSourceTableRef[] => {
    if (visited.has(currentId)) return []
    visited.add(currentId)
    const configuration = draft.configurations.get(currentId)
    if (configuration?.kind === 'source') {
      return sourceTableSelections(configuration).map((selection) => ({
        ...selection,
        sourceId: configuration.sourceId,
      }))
    }
    return draft.dag.edges
      .filter((edge) => edge.target === currentId)
      .flatMap((edge) => walk(edge.source))
  }
  return walk(nodeId)
}

const workspaceNavigation = [
  {
    section: 'orchestrate',
    labelKey: 'pipelines.workspace.navigation.orchestrate',
    icon: Workflow,
  },
  { section: 'logs', labelKey: 'pipelines.workspace.navigation.logs', icon: ScrollText },
  { section: 'monitoring', labelKey: 'pipelines.workspace.navigation.monitoring', icon: Gauge },
] as const

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
  basicInfo,
  activeSection,
  collapsed,
  onCollapsedChange,
  status,
  hasArtifact,
  canEditBasicInfo,
  onSaveBasicInfo,
}: {
  pipelineId: string
  basicInfo: PipelineDraftBasicInfo
  activeSection: PipelineWorkspaceSection
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
  status?: PipelineCatalogState
  hasArtifact: boolean
  canEditBasicInfo: boolean
  onSaveBasicInfo: SavePipelineDraftBasicInfo
}) {
  const { t } = useTranslation()
  const [editOpen, setEditOpen] = useState(false)
  const [name, setName] = useState(basicInfo.name)
  const [description, setDescription] = useState(basicInfo.description ?? '')
  const [savePending, setSavePending] = useState(false)
  const [saveError, setSaveError] = useState('')

  function openBasicInfoEditor() {
    setName(basicInfo.name)
    setDescription(basicInfo.description ?? '')
    setSaveError('')
    setEditOpen(true)
  }

  async function saveBasicInfo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedName = name.trim()
    if (!normalizedName) {
      setSaveError(t('pipelines.workspace.navigation.nameRequired'))
      return
    }

    const nextBasicInfo = {
      name: normalizedName,
      description: description.trim() || null,
    }
    if (
      nextBasicInfo.name === basicInfo.name &&
      nextBasicInfo.description === basicInfo.description
    ) {
      setEditOpen(false)
      return
    }

    setSavePending(true)
    setSaveError('')
    try {
      await onSaveBasicInfo(nextBasicInfo)
      setEditOpen(false)
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : t('pipelines.workspace.navigation.saveFailed'),
      )
    } finally {
      setSavePending(false)
    }
  }

  return (
    <>
      <aside
        className={cn(
          'pipeline-workspace__navigation relative flex h-full shrink-0 overflow-hidden transition-[width] duration-150 motion-reduce:transition-none',
          collapsed ? 'w-14' : 'w-60 max-md:w-52 max-sm:w-14',
        )}
        data-testid="workspace-navigation"
        data-collapsed={collapsed}
      >
        <div className="pipeline-workspace__navigation-panel flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg px-3 py-2">
          <div
            className={cn(
              'flex h-10 items-center',
              collapsed ? 'justify-center' : 'justify-between',
            )}
          >
            <Link
              to="/pipelines"
              className={cn(
                'inline-flex h-8 shrink-0 items-center rounded-lg text-slate-700 transition-[background-color,transform] hover:bg-slate-100 focus-visible:ring-3 focus-visible:ring-blue-500/30 focus-visible:outline-none active:scale-95',
                collapsed
                  ? 'size-8 justify-center'
                  : 'max-w-full gap-1 px-1.5 max-sm:size-8 max-sm:justify-center max-sm:gap-0 max-sm:px-0',
              )}
              aria-label={t('pipelines.workspace.back')}
            >
              <ChevronLeft className="size-4 shrink-0" aria-hidden="true" />
              {!collapsed && (
                <span
                  className="min-w-0 truncate text-[13px] font-semibold text-slate-800 max-sm:sr-only"
                  data-testid="workspace-navigation-title"
                >
                  {t('nav.pipelines')}
                </span>
              )}
            </Link>
            {!collapsed && (
              <button
                type="button"
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-[background-color,color,transform] hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-3 focus-visible:ring-blue-500/30 focus-visible:outline-none active:scale-95 max-sm:hidden"
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
              className="mt-1 inline-flex size-10 shrink-0 items-center justify-center self-center rounded-lg text-slate-400 transition-[background-color,color,transform] hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-3 focus-visible:ring-blue-500/30 focus-visible:outline-none active:scale-95 max-sm:hidden"
              aria-label={t('pipelines.workspace.navigation.expand')}
              onClick={() => onCollapsedChange(false)}
            >
              <PanelLeftOpen className="size-4" aria-hidden="true" />
            </button>
          )}

          <div
            className={cn(
              'mt-5 flex items-start gap-2 rounded-xl p-2 max-sm:justify-center max-sm:px-0',
              collapsed && 'justify-center px-0',
            )}
          >
            <span className="pipeline-workspace__identity-mark flex size-8 shrink-0 items-center justify-center rounded-lg max-sm:hidden">
              <Workflow className="size-4" aria-hidden="true" />
            </span>
            {!collapsed && (
              <div className="flex min-w-0 flex-1 flex-col items-start justify-center gap-0.5 self-stretch max-sm:sr-only">
                <div className="flex w-full min-w-0 items-center gap-2 pr-1">
                  <span
                    className="text-text-secondary min-w-0 flex-1 truncate text-sm leading-5 font-semibold"
                    title={basicInfo.name}
                  >
                    {basicInfo.name}
                  </span>
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger
                      render={
                        <IconButton
                          size="md"
                          className="data-popup-open:bg-state-base-hover data-popup-open:text-text-secondary -mx-1 -my-0.5 shrink-0"
                          aria-label={t('pipelines.workspace.navigation.editBasicInfo')}
                        >
                          <span className="i-ri-more-fill size-4" aria-hidden="true" />
                        </IconButton>
                      }
                    />
                    <DropdownMenuContent placement="bottom-end" sideOffset={4} className="min-w-40">
                      <DropdownMenuItem
                        className="gap-2 px-3"
                        disabled={!canEditBasicInfo}
                        onClick={openBasicInfoEditor}
                      >
                        <span
                          className="i-ri-edit-line text-text-tertiary size-4"
                          aria-hidden="true"
                        />
                        <span>{t('pipelines.workspace.navigation.editBasicInfo')}</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {hasArtifact ? (
                  <PipelineStatusBadge status={status} />
                ) : (
                  <span
                    className="text-text-tertiary inline-flex items-center text-[10px] leading-3 font-medium uppercase"
                    data-testid="pipeline-status"
                    data-state="draft"
                  >
                    {t('wizard.draft')}
                  </span>
                )}
              </div>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="hidden shrink-0 max-sm:inline-flex"
              aria-label={t('pipelines.workspace.navigation.editBasicInfo')}
              disabled={!canEditBasicInfo}
              onClick={openBasicInfoEditor}
            >
              <Pencil aria-hidden="true" />
            </Button>
          </div>

          <nav
            className="mt-2 mr-2 space-y-0.5"
            aria-label={t('pipelines.workspace.navigation.label')}
          >
            {workspaceNavigation.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.section}
                  className={cn(
                    'pipeline-workspace__nav-row flex h-8 items-center gap-1 rounded-lg',
                    item.section === activeSection && 'pipeline-workspace__nav-row--active',
                  )}
                >
                  <WorkspaceNavLink
                    pipelineId={pipelineId}
                    section={item.section}
                    activeSection={activeSection}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    <span className={cn('max-sm:sr-only', collapsed && 'sr-only')}>
                      {t(item.labelKey)}
                    </span>
                  </WorkspaceNavLink>
                </div>
              )
            })}
          </nav>
          <Link
            to="/overview"
            className={cn(
              'mt-auto flex h-10 items-center gap-2 rounded-lg px-2 text-[13px] font-semibold text-[var(--pipeline-text-muted)] hover:bg-[var(--pipeline-surface-subtle)]',
              collapsed && 'justify-center px-0',
            )}
            aria-label={t('app.brand')}
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--pipeline-selection)] text-white">
              <Terminal className="size-3" aria-hidden="true" />
            </span>
            {!collapsed && <span className="max-sm:sr-only">{t('app.brand')}</span>}
          </Link>
        </div>
      </aside>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          if (!savePending) setEditOpen(open)
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          closeDisabled={savePending}
          closeLabel={t('pipelines.workspace.navigation.closeEditor')}
        >
          <form className="contents" onSubmit={(event) => void saveBasicInfo(event)}>
            <DialogHeader>
              <DialogTitle>{t('pipelines.workspace.navigation.editTitle')}</DialogTitle>
              <DialogDescription>
                {t('pipelines.workspace.navigation.editDescription')}
              </DialogDescription>
            </DialogHeader>
            <DialogBody className="grid gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="pipeline-basic-info-name">
                  {t('pipelines.workspace.navigation.nameLabel')}
                </label>
                <Input
                  id="pipeline-basic-info-name"
                  autoFocus
                  autoComplete="off"
                  required
                  maxLength={120}
                  value={name}
                  aria-invalid={Boolean(saveError) && !name.trim()}
                  disabled={savePending}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="pipeline-basic-info-description">
                  {t('pipelines.workspace.navigation.descriptionLabel')}
                </label>
                <Textarea
                  id="pipeline-basic-info-description"
                  rows={4}
                  value={description}
                  disabled={savePending}
                  onValueChange={setDescription}
                />
              </div>
              {saveError && (
                <p className="text-destructive text-sm" role="alert">
                  {saveError}
                </p>
              )}
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={savePending}
                onClick={() => setEditOpen(false)}
              >
                {t('pipelines.workspace.navigation.cancel')}
              </Button>
              <Button type="submit" disabled={savePending || !name.trim()}>
                {savePending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
                {savePending
                  ? t('pipelines.workspace.navigation.saving')
                  : t('pipelines.workspace.navigation.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

function PipelineOrchestrationPage({
  pipelineId,
  runtimeStatus,
  lifecycleStatus,
  runtimeObservationPending,
  runtimeObservationError,
  onRetryRuntimeObservation,
  onRegisterBasicInfoSaver,
}: {
  pipelineId: string
  runtimeStatus?: PipelineRuntimeState
  lifecycleStatus?: PipelineCatalogState
  runtimeObservationPending: boolean
  runtimeObservationError: boolean
  onRetryRuntimeObservation: () => void
  onRegisterBasicInfoSaver: (save: SavePipelineDraftBasicInfo | null) => void
}) {
  const { t } = useTranslation()
  const apiFetch = useAuthStore((state) => state.apiFetch)
  const queryClient = useQueryClient()
  const [selection, setSelection] = useState<PipelineCanvasSelection | null>(null)
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null)
  const [requestedInsertion, setRequestedInsertion] = useState<PipelineNodeInsertionContext | null>(
    null,
  )
  const [draft, setDraft] = useState<PipelineGraphDraft | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [diagnostics, setDiagnostics] = useState<PipelineGraphDiagnostic[]>([])
  const [actionErrors, setActionErrors] = useState<readonly { id: number; message: string }[]>([])
  const [layoutDraft, setLayoutDraft] = useState<Pick<PipelineLayout, 'nodes' | 'viewport'> | null>(
    null,
  )
  const [canvasNotes, setCanvasNotes] = useState<CanvasNoteRecord[]>(() =>
    readCanvasNotes(pipelineId),
  )
  const [basicInfoRevision, setBasicInfoRevision] = useState(0)
  const [, setHistoryRevision] = useState(0)
  const surfaceRef = useRef<HTMLElement>(null)
  const draftRef = useRef<PipelineGraphDraft | null>(null)
  const layoutDraftRef = useRef<Pick<PipelineLayout, 'nodes' | 'viewport'> | null>(null)
  const canvasNotesRef = useRef(canvasNotes)
  const canvasNotesPipelineIdRef = useRef(pipelineId)
  const suppressNextLayoutHistoryRef = useRef(false)
  const historyRef = useRef<{
    past: {
      draft: PipelineGraphDraft
      layout: Pick<PipelineLayout, 'nodes' | 'viewport'> | null
      notes: CanvasNoteRecord[]
    }[]
    future: {
      draft: PipelineGraphDraft
      layout: Pick<PipelineLayout, 'nodes' | 'viewport'> | null
      notes: CanvasNoteRecord[]
    }[]
  }>({ past: [], future: [] })
  const basicInfoRef = useRef<PipelineDraftBasicInfo | null>(null)
  const actionErrorSequence = useRef(0)
  const pipelineDraft = useQuery({
    queryKey: ['pipelines', pipelineId, 'draft'],
    queryFn: async () => {
      try {
        const response = await getPipelineDraft(pipelineId, apiFetch)
        const basicInfo = {
          name: response.draft.name?.trim() || pipelineId,
          description: response.draft.description,
        }
        if (response.draft.mode === 'wizard') {
          return {
            mode: 'wizard' as const,
            draft: response.draft,
            etag: response.etag,
            basicInfo,
          }
        }
        return {
          mode: 'dag' as const,
          document: pipelineDraftDocument(response.draft),
          draft: response.draft,
          etag: response.etag,
          basicInfo,
        }
      } catch (error) {
        if (!(error instanceof PipelineClientError) || error.status !== 404) throw error
        const [pipeline, layout] = await Promise.all([
          queryClient.ensureQueryData({
            queryKey: ['pipelines', pipelineId],
            queryFn: () => getPipeline(pipelineId, apiFetch),
          }),
          getPipelineLayout(pipelineId, apiFetch),
        ])
        return {
          mode: 'dag' as const,
          document: {
            editor: createPipelineGraphDraft(pipeline),
            layout,
            hasPublishedRevision: true,
          },
          draft: null,
          etag: null,
          basicInfo: {
            name: pipelineId,
            description: pipeline.metadata?.description ?? null,
          },
        }
      }
    },
    retry: false,
  })
  if (basicInfoRef.current === null && pipelineDraft.data) {
    basicInfoRef.current = pipelineDraft.data.basicInfo
  }
  const serverDocument = pipelineDraft.data?.mode === 'dag' ? pipelineDraft.data.document : null
  const isReadOnly =
    isPipelineReadOnly(runtimeStatus) ||
    Boolean(
      serverDocument?.hasPublishedRevision &&
      (runtimeObservationPending || runtimeObservationError),
    )

  const sources = useQuery({
    queryKey: ['sources'],
    queryFn: () => listSources(apiFetch),
  })
  const connectors = useQuery({
    queryKey: ['connectors'],
    queryFn: () => listConnectors(apiFetch),
  })
  const pipelineData = serverDocument?.editor.pipeline
  const layoutData = serverDocument?.layout

  useEffect(() => {
    if (actionErrors.length === 0) return
    const dismissTimer = window.setTimeout(() => {
      setActionErrors((current) => current.slice(1))
    }, 7000)
    return () => window.clearTimeout(dismissTimer)
  }, [actionErrors])

  function pushActionError(message: string) {
    const id = actionErrorSequence.current++
    setActionErrors((current) => [...current, { id, message }])
  }

  useEffect(() => {
    if (canvasNotesPipelineIdRef.current === pipelineId) return
    canvasNotesPipelineIdRef.current = pipelineId
    const nextNotes = readCanvasNotes(pipelineId)
    canvasNotesRef.current = nextNotes
    setCanvasNotes(nextNotes)
    historyRef.current = { past: [], future: [] }
    setHistoryRevision((value) => value + 1)
  }, [pipelineId])

  useEffect(() => {
    if (!pipelineData || !layoutData) return
    const nextDraft = serverDocument?.editor ?? null
    if (!nextDraft) return
    draftRef.current = nextDraft
    setDraft(nextDraft)
    const nextLayoutDraft = { nodes: layoutData.nodes, viewport: layoutData.viewport }
    layoutDraftRef.current = nextLayoutDraft
    setLayoutDraft(nextLayoutDraft)
    setIsDirty(false)
    setDiagnostics([])
    setActionErrors([])
    setSelection(null)
    setRequestedInsertion(null)
    historyRef.current = { past: [], future: [] }
    setHistoryRevision((value) => value + 1)
  }, [layoutData, pipelineData?.contentHash, serverDocument?.editor])

  function recordHistory() {
    const current = draftRef.current
    if (!current) return
    const history = historyRef.current
    historyRef.current = {
      past: [
        ...history.past.slice(-49),
        { draft: current, layout: layoutDraftRef.current, notes: canvasNotesRef.current },
      ],
      future: [],
    }
    setHistoryRevision((value) => value + 1)
  }

  function handleCanvasNotesChange(
    nextNotes: CanvasNoteRecord[],
    options?: PipelineCanvasNotesChangeOptions,
  ) {
    if (JSON.stringify(canvasNotesRef.current) === JSON.stringify(nextNotes)) return
    if (options?.recordHistory !== false) recordHistory()
    canvasNotesRef.current = nextNotes
    setCanvasNotes(nextNotes)
  }

  function restoreHistory(direction: 'undo' | 'redo', steps = 1) {
    if (isReadOnly) return
    const current = draftRef.current
    if (!current) return
    let { past, future } = historyRef.current
    let target = {
      draft: current,
      layout: layoutDraftRef.current,
      notes: canvasNotesRef.current,
    }
    for (let step = 0; step < steps; step++) {
      if (direction === 'undo') {
        const previous = past.at(-1)
        if (!previous) break
        past = past.slice(0, -1)
        future = [...future, target]
        target = previous
      } else {
        const next = future.at(-1)
        if (!next) break
        future = future.slice(0, -1)
        past = [...past, target]
        target = next
      }
    }
    const pipelineStateChanged =
      target.draft !== current || target.layout !== layoutDraftRef.current
    if (
      target.draft === current &&
      target.layout === layoutDraftRef.current &&
      target.notes === canvasNotesRef.current
    )
      return
    historyRef.current = { past, future }
    draftRef.current = target.draft
    layoutDraftRef.current = target.layout
    canvasNotesRef.current = target.notes
    setDraft(target.draft)
    setLayoutDraft(target.layout)
    setCanvasNotes(target.notes)
    setSelection((previous) =>
      synchronizeCurrentSelection(previous, target.draft, connectorsBySourceId),
    )
    if (pipelineStateChanged) setIsDirty(true)
    setHistoryRevision((value) => value + 1)
  }

  function scheduleLayoutSave(next: Pick<PipelineLayout, 'nodes' | 'viewport'>) {
    if (isReadOnly) return
    const shouldRecord = !suppressNextLayoutHistoryRef.current
    suppressNextLayoutHistoryRef.current = false
    const previousNodes = layoutDraftRef.current?.nodes
    if (
      shouldRecord &&
      previousNodes &&
      Object.keys(next.nodes).some(
        (id) =>
          previousNodes[id]?.x !== next.nodes[id]?.x || previousNodes[id]?.y !== next.nodes[id]?.y,
      )
    )
      recordHistory()
    layoutDraftRef.current = next
    setLayoutDraft(next)
    setIsDirty(true)
  }

  const isLoading = pipelineDraft.isLoading
  const error = pipelineDraft.isError
  const connectorsBySourceId = useMemo(
    () => pipelineNodeConnectors(sources.data ?? [], connectors.data ?? []),
    [connectors.data, sources.data],
  )
  const configurations = draft?.configurations ?? new Map<string, PipelineNodeConfiguration>()
  const descriptions = draft?.descriptions ?? new Map<string, string>()
  const selectedDagNode = draft?.dag.nodes.find((node) => node.id === selection?.id)
  const selectedNextNodes = selection
    ? (draft?.dag.edges ?? [])
        .filter((edge) => edge.source === selection.id)
        .flatMap((edge) => draft?.dag.nodes.find((node) => node.id === edge.target) ?? [])
    : []
  const canAddSelectedNextStep = Boolean(
    selectedDagNode && draft && canPipelineNodeEmitOutput(selectedDagNode, draft.dag.edges),
  )

  function requestNextStep(screenPosition: { x: number; y: number }) {
    if (isReadOnly || !selection || !canAddSelectedNextStep) return
    const position = layoutDraftRef.current?.nodes[selection.id] ??
      layoutData?.nodes[selection.id] ?? { x: 0, y: 0 }
    setRequestedInsertion({
      position: { x: position.x + 330, y: position.y },
      screenPosition,
      selectorOrigin: 'next-step',
      connectFrom: selection.id,
      connectTo: null,
    })
  }
  const canvasLayout = useMemo<PipelineLayout | null>(() => {
    if (!layoutData) return null
    return {
      ...layoutData,
      ...layoutDraft,
      nodes: { ...layoutData.nodes, ...layoutDraft?.nodes },
    }
  }, [layoutData, layoutDraft])
  const autosaveMutation = useMemo(
    () =>
      draft && canvasLayout
        ? buildPipelineDraftMutation(
            draft,
            canvasLayout,
            basicInfoRef.current ?? {
              name: draft.pipeline.id,
              description: draft.pipeline.metadata?.description ?? null,
            },
          )
        : null,
    [basicInfoRevision, canvasLayout, draft],
  )
  const autosave = usePipelineDraftAutosave({
    enabled: pipelineDraft.isFetched && Boolean(draft && canvasLayout) && !isReadOnly,
    mutation: autosaveMutation,
    initialEtag: pipelineDraft.data?.etag ?? null,
    fetcher: apiFetch,
    onError: (error) => {
      pushActionError(
        error instanceof Error ? error.message : t('pipelines.workspace.actions.saveFailed'),
      )
    },
  })
  const autosaveRef = useRef(autosave)
  const pipelineDraftRef = useRef(pipelineDraft)
  const visibleRefreshTimer = useRef<number | null>(null)
  autosaveRef.current = autosave
  pipelineDraftRef.current = pipelineDraft

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        autosaveRef.current.flushOnPageClose()
        return
      }
      if (document.visibilityState !== 'visible') return

      if (visibleRefreshTimer.current !== null) {
        window.clearTimeout(visibleRefreshTimer.current)
      }
      visibleRefreshTimer.current = window.setTimeout(() => {
        visibleRefreshTimer.current = null
        const currentAutosave = autosaveRef.current
        if (!currentAutosave.hasPendingChanges && !currentAutosave.isSaving) {
          void pipelineDraftRef.current.refetch()
        }
      }, 500)
    }
    const handleBeforeUnload = () => autosaveRef.current.flushOnPageClose()

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      if (visibleRefreshTimer.current !== null) {
        window.clearTimeout(visibleRefreshTimer.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!autosave.hasPendingChanges) setIsDirty(false)
  }, [autosave.hasPendingChanges])
  const starter = useStartPipeline({
    apiFetch,
    // An answer that rewrote the definition also moved the stored draft; editing on without
    // reloading it would conflict on the next save or write the old setting back.
    onDefinitionChanged: () =>
      queryClient.invalidateQueries({ queryKey: ['pipelines', pipelineId] }),
  })
  const run = useMutation({
    mutationFn: () => starter.startPipeline(pipelineId),
  })
  const wizardDocument =
    pipelineDraft.data?.mode === 'wizard' && pipelineDraft.data.draft && pipelineDraft.data.etag
      ? { draft: pipelineDraft.data.draft, etag: pipelineDraft.data.etag }
      : null
  const isWizard = wizardDocument !== null
  const wizardReadOnly =
    isReadOnly || (isWizard && (runtimeObservationPending || runtimeObservationError))
  const stopAction = isReadOnly ? (
    <PipelineLifecycleMenu
      pipelineId={pipelineId}
      status={runtimeStatus}
      apiFetch={apiFetch}
      contentHash="published"
      presentation="stop-button"
      onMutationError={(_action, cause) =>
        pushActionError(
          cause instanceof Error ? cause.message : t('pipelines.lifecycle.stopFailed'),
        )
      }
    />
  ) : undefined
  const saveBasicInfo = useCallback(
    async (basicInfo: PipelineDraftBasicInfo) => {
      if (isReadOnly) throw new Error(t('pipelines.workspace.readOnly.editorStatus'))
      const editor = draftRef.current
      const baseLayout = layoutData
      if (!editor || !baseLayout) throw new Error(t('pipelines.workspace.actions.saveFailed'))

      const currentLayoutDraft = layoutDraftRef.current
      const layout = {
        ...baseLayout,
        ...currentLayoutDraft,
        nodes: { ...baseLayout.nodes, ...currentLayoutDraft?.nodes },
      }
      const mutation = buildPipelineDraftMutation(editor, layout, basicInfo)
      const previousBasicInfo = basicInfoRef.current
      basicInfoRef.current = basicInfo
      let result: Awaited<ReturnType<typeof autosaveRef.current.saveMutation>>
      try {
        result = await autosaveRef.current.saveMutation(mutation)
        if (!result) throw new Error(t('pipelines.workspace.actions.saveFailed'))
      } catch (error) {
        basicInfoRef.current = previousBasicInfo
        setBasicInfoRevision((revision) => revision + 1)
        throw error
      }

      queryClient.setQueryData(['pipelines', pipelineId, 'draft'], {
        mode: 'dag' as const,
        draft: result.draft,
        document: pipelineDraftDocument(result.draft),
        etag: result.etag,
        basicInfo,
      })
      queryClient.setQueryData(['pipelines', pipelineId, 'draft-status'], result)
      return result
    },
    [isReadOnly, layoutData, pipelineId, queryClient, t],
  )

  useEffect(() => {
    if (pipelineDraft.data?.mode === 'wizard') return
    if (pipelineDraft.data?.mode !== 'dag' || !layoutData || !draftRef.current || isReadOnly) {
      onRegisterBasicInfoSaver(null)
      return
    }
    onRegisterBasicInfoSaver(saveBasicInfo)
    return () => onRegisterBasicInfoSaver(null)
  }, [isReadOnly, layoutData, onRegisterBasicInfoSaver, pipelineDraft.data?.mode, saveBasicInfo])
  const sourceOptions = useMemo<PipelineSchemaOption[]>(
    () =>
      (sources.data ?? []).map((source) => ({
        label: source.id,
        value: source.id,
      })),
    [sources.data],
  )
  // A target writes through one connector only, so its picker offers a narrower catalog than a
  // source node's. Two lists rather than one filtered at the form: the panel takes whichever the
  // current selection is entitled to, and neither kind can read the other's.
  const deploymentProfile = getDeploymentProfile()
  const localDevelopment = import.meta.env.VITE_LOCAL_DEVELOPMENT === 'true'
  const targetSourceOptions = useMemo<PipelineSchemaOption[]>(
    () =>
      targetSources(sources.data ?? [], connectors.data ?? [], {
        profile: deploymentProfile,
        localDevelopment,
      }).map((source) => ({
        label: source.id,
        value: source.id,
      })),
    [connectors.data, sources.data, deploymentProfile, localDevelopment],
  )
  const configuredTableOptionsBySourceId = useMemo(() => {
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
  const selectedTargetTableOptions = useMemo(() => {
    const configuration = selection?.configuration
    if (configuration?.kind !== 'target') return undefined
    return configuredTableOptionsBySourceId.get(configuration.sourceId)
  }, [configuredTableOptionsBySourceId, selection?.configuration])
  const selectedTargetSourceTables = useMemo(
    () =>
      selection?.configuration?.kind === 'target' ? upstreamSourceTables(draft, selection.id) : [],
    [draft, selection?.configuration?.kind, selection?.id],
  )
  const selectedFilterSourceRefs = useMemo(() => {
    const configuration = selection?.configuration
    return configuration?.kind === 'transform' && configuration.transformType === 'filter'
      ? upstreamSourceTableRefs(draft, selection?.id)
      : []
  }, [draft, selection?.configuration, selection?.id])
  const selectedFilterSourceIds = useMemo(
    () => [...new Set(selectedFilterSourceRefs.map((reference) => reference.sourceId))],
    [selectedFilterSourceRefs],
  )
  const filterSourceSchemas = useQueries({
    queries: selectedFilterSourceIds.map((sourceId) => ({
      queryKey: ['source-schema', sourceId],
      queryFn: () => getSourceSchema(sourceId, apiFetch),
      staleTime: 5 * 60 * 1000,
    })),
  })
  const selectedFilterFieldTypes = useMemo(() => {
    const fieldTypes: Record<string, string> = {}
    const ambiguousFields = new Set<string>()
    const schemasBySourceId = new Map(
      selectedFilterSourceIds.map((sourceId, index) => [
        sourceId,
        filterSourceSchemas[index]?.data,
      ]),
    )

    for (const reference of selectedFilterSourceRefs) {
      if (reference.tableKind === 'regex') continue
      const table = schemasBySourceId
        .get(reference.sourceId)
        ?.tables.find((candidate) => candidate.name === reference.table)
      for (const field of table?.fields ?? []) {
        if (!field.type || ambiguousFields.has(field.name)) continue
        const existingType = fieldTypes[field.name]
        if (existingType && existingType.toLowerCase() !== field.type.toLowerCase()) {
          delete fieldTypes[field.name]
          ambiguousFields.add(field.name)
          continue
        }
        fieldTypes[field.name] = field.type
      }
    }
    return fieldTypes
  }, [filterSourceSchemas, selectedFilterSourceIds, selectedFilterSourceRefs])
  const loadPipelineTables = useCallback<PipelineTableLoader>(
    async (sourceId) => {
      const report = await getSourceSchema(sourceId, apiFetch)
      return report.tables.map((table) => ({ label: table.name, value: table.name }))
    },
    [apiFetch],
  )
  useEffect(() => {
    setSelection((current) => {
      if (!current) return current
      const synchronized = synchronizeSelection(current, draft, connectorsBySourceId)
      if (!synchronized) return null
      return selectionsEqual(current, synchronized) ? current : synchronized
    })
  }, [connectorsBySourceId, draft])

  function handleSelectionChange(nextSelection: PipelineCanvasSelection | null) {
    setFocusNodeId(null)
    if (!nextSelection) {
      setSelection(null)
      return
    }
    setSelection(
      synchronizeSelection(nextSelection, draftRef.current, connectorsBySourceId) ?? nextSelection,
    )
  }

  function handleConfigurationChange(change: PipelineNodeConfigurationChange) {
    if (isReadOnly) return
    const current = draftRef.current
    if (!current) return
    const next = synchronizeConfiguredNodeIdentity(
      updatePipelineNodeConfiguration(current, change),
      change.nodeId,
      current.configurations.get(change.nodeId),
    )
    if (
      JSON.stringify(current.configurations.get(change.nodeId)) ===
      JSON.stringify(next.configurations.get(change.nodeId))
    )
      return
    recordHistory()
    draftRef.current = next
    setDraft(next)
    setSelection((previous) => synchronizeCurrentSelection(previous, next, connectorsBySourceId))
    setIsDirty(true)
  }

  function handleDescriptionChange(description: string) {
    if (isReadOnly) return
    if (!selection) return
    const current = draftRef.current
    if (!current) return
    recordHistory()
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

  function handleNodeTitleChange(title: string) {
    if (isReadOnly || !selection) return
    const current = draftRef.current
    const nextTitle = title.trim()
    if (!current || !nextTitle || selection.label === nextTitle) return
    recordHistory()
    const next = {
      ...current,
      dag: {
        ...current.dag,
        nodes: current.dag.nodes.map((node) =>
          node.id === selection.id ? { ...node, label: nextTitle } : node,
        ),
      },
    }
    draftRef.current = next
    setDraft(next)
    setSelection((previous) => (previous ? { ...previous, label: nextTitle } : previous))
    setIsDirty(true)
  }

  function handleDeleteSelectedNode() {
    if (isReadOnly || !selection) return
    const current = draftRef.current
    if (!current) return
    recordHistory()
    const next = removePipelineNode(current, selection.id)
    draftRef.current = next
    setDraft(next)
    setSelection(null)
    const previousLayout = layoutDraftRef.current
    if (previousLayout) {
      const positions = { ...previousLayout.nodes }
      delete positions[selection.id]
      suppressNextLayoutHistoryRef.current = true
      scheduleLayoutSave({ ...previousLayout, nodes: positions })
    }
    setIsDirty(true)
  }

  function handleChooseNode(choice: PipelineNodeChoice, insertion: PipelineNodeInsertionContext) {
    handleChooseNodes([choice], insertion)
  }

  function handleChooseNodes(
    choices: readonly PipelineNodeChoice[],
    insertion: PipelineNodeInsertionContext,
  ) {
    if (isReadOnly) return
    const current = draftRef.current
    if (!current || choices.length === 0) return
    recordHistory()
    const currentLayout = layoutDraft ?? layoutData
    const result = addPipelineNodes(
      current,
      choices,
      insertion.position,
      insertion.connectFrom ?? undefined,
      insertion.connectTo ?? undefined,
      insertion.insertEdge,
      insertion.selectorOrigin === 'next-step' ? 'append' : 'insert',
    )
    draftRef.current = result.draft
    setDraft(result.draft)
    const selectedNodeId = result.nodeIds.at(-1)
    const node = selectedNodeId
      ? result.draft.dag.nodes.find((candidate) => candidate.id === selectedNodeId)
      : undefined
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
    if (Object.keys(result.positions).length > 0) {
      suppressNextLayoutHistoryRef.current = true
      scheduleLayoutSave({
        nodes: { ...currentLayout?.nodes, ...result.positions },
        viewport: currentLayout?.viewport ?? null,
      })
    }
    setIsDirty(true)
  }

  async function handleSave(): Promise<PipelineDraftSaveResult | null> {
    if (isReadOnly) return null
    if (!draft || autosave.isSaving) return null
    const nextDiagnostics = validatePipelineGraph(draft, sources.data, connectors.data, {
      profile: deploymentProfile,
      localDevelopment,
    })
    if (!sources.isSuccess) {
      setDiagnostics([])
      pushActionError(t('pipelines.workspace.nodeSelector.sourcesError'))
      return null
    }
    setDiagnostics(nextDiagnostics)
    if (nextDiagnostics.length > 0) return null
    try {
      const result = await autosave.saveLatest()
      if (!result) throw new Error('The Pipeline draft is not ready to save.')
      await previewPipelineDraft(pipelineId, result.draft.revision, apiFetch)
      setIsDirty(false)
      setDiagnostics([])
      return result
    } catch (error) {
      pushActionError(
        error instanceof Error ? error.message : t('pipelines.workspace.actions.saveFailed'),
      )
      return null
    }
  }

  async function handleRun() {
    if (isReadOnly) return
    try {
      const saved = isDirty ? await handleSave() : await autosave.saveLatest()
      if (isDirty && !saved) return
      const result = saved ?? (await getPipelineDraft(pipelineId, apiFetch))
      if (!result) throw new Error('The Pipeline draft is not ready to start.')
      await previewPipelineDraft(pipelineId, result.draft.revision, apiFetch)
      await publishPipelineDraft(
        pipelineId,
        result.draft.revision,
        result.draft.publishedArtifactHash,
        apiFetch,
      )
      await run.mutateAsync()
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pipelines', pipelineId, 'status'] }),
        queryClient.invalidateQueries({ queryKey: ['pipelines', pipelineId] }),
        queryClient.invalidateQueries({ queryKey: ['pipelines'] }),
      ])
    } catch (error) {
      pushActionError(
        error instanceof Error ? error.message : t('pipelines.workspace.actions.runFailed'),
      )
    }
  }

  return (
    <section
      ref={surfaceRef}
      className="pipeline-canvas-surface relative h-full min-w-0 flex-1 overflow-hidden"
      style={
        {
          '--pipeline-node-panel-width': selection ? '509px' : '0px',
        } as CSSProperties
      }
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
                void pipelineDraft.refetch()
              }}
            >
              {t('pipelines.workspace.actions.retry')}
            </button>
          </div>
        )}
        {wizardDocument ? (
          <ReactFlowProvider>
            <PipelineWorkflow>
              <WizardBuilder
                pipelineId={pipelineId}
                draft={wizardDocument.draft}
                etag={wizardDocument.etag}
                readOnly={wizardReadOnly}
                runtimeStatus={runtimeStatus}
                lifecycleStatus={lifecycleStatus}
                runtimeObservationPending={runtimeObservationPending}
                runtimeObservationError={runtimeObservationError}
                onRetryRuntimeObservation={onRetryRuntimeObservation}
                onRegisterBasicInfoSaver={onRegisterBasicInfoSaver}
                stopAction={stopAction}
              />
            </PipelineWorkflow>
          </ReactFlowProvider>
        ) : draft && canvasLayout ? (
          <PipelineWorkflowWithInnerContext
            key={pipelineId}
            canvas={{
              pipelineId,
              dag: draft.dag,
              layout: canvasLayout,
              connectorsBySourceId,
              configurations,
              descriptions,
              notes: canvasNotes,
              onNotesChange: handleCanvasNotesChange,
              onLayoutChange: scheduleLayoutSave,
              canUndo: historyRef.current.past.length > 0,
              canRedo: historyRef.current.future.length > 0,
              historyPastCount: historyRef.current.past.length,
              historyFutureCount: historyRef.current.future.length,
              onUndo: () => restoreHistory('undo'),
              onRedo: () => restoreHistory('redo'),
              onJumpHistory: (direction, steps) => restoreHistory(direction, steps),
              onGraphChange: (nextDag) => {
                if (isReadOnly) return
                const current = draftRef.current
                if (!current) return
                if (JSON.stringify(current.dag) === JSON.stringify(nextDag)) return
                recordHistory()
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
              requestedInsertion,
              onAddNodes: handleChooseNodes,
              loadTables: loadPipelineTables,
              onSelectionChange: handleSelectionChange,
              focusNodeId,
              readOnly: isReadOnly,
            }}
            header={{
              isDirty,
              pipelineId,
              draftUpdatedAt:
                autosave.lastResult?.draft.updatedAt ?? pipelineDraft.data?.draft?.updatedAt,
              hasPublishedArtifact: Boolean(pipelineDraft.data?.draft?.publishedArtifactHash),
              selectedNodeId: selection?.id,
              isSaving: autosave.isSaving,
              isReadOnly,
              isRunning:
                run.isPending ||
                runtimeStatus === 'RUNNING' ||
                runtimeStatus === 'PAUSED' ||
                runtimeStatus === 'FAILED',
              stopAction,
              onSave: () => void handleSave(),
              onRun: () => void handleRun(),
            }}
            panel={{
              selection,
              isReadOnly,
              onClose: () => setSelection(null),
              onConfigurationChange: handleConfigurationChange,
              onDescriptionChange: handleDescriptionChange,
              onTitleChange: handleNodeTitleChange,
              onDelete: handleDeleteSelectedNode,
              nextNodes: selectedNextNodes,
              onSelectNextNode: (nodeId) => {
                const node = draftRef.current?.dag.nodes.find(
                  (candidate) => candidate.id === nodeId,
                )
                if (!node) return
                handleSelectionChange({
                  id: node.id,
                  label: node.label,
                  detail: node.detail,
                  description: node.description ?? '',
                  nodeType: node.type,
                  connector: null,
                  configuration: null,
                })
                setFocusNodeId(nodeId)
              },
              canAddNextStep: canAddSelectedNextStep,
              onRequestNextStep: requestNextStep,
              onWidthChange: (width) => {
                surfaceRef.current?.style.setProperty('--pipeline-node-panel-width', `${width}px`)
              },
              sourceOptions:
                selection?.configuration?.kind === 'target' ? targetSourceOptions : sourceOptions,
              tableOptions: selectedTargetTableOptions,
              upstreamSourceTables: selectedTargetSourceTables,
              fieldTypes: selectedFilterFieldTypes,
              loadTables: loadPipelineTables,
            }}
          />
        ) : null}
      </section>

      <StartChecksDialog {...starter.dialog} />
      {(diagnostics.length > 0 ||
        actionErrors.length > 0 ||
        starter.notices.length > 0 ||
        (!isWizard && (runtimeObservationPending || runtimeObservationError))) && (
        <div className="pipeline-canvas__alerts" aria-live="assertive">
          <PipelineStartNotices
            notices={starter.notices}
            onDismiss={starter.dismissNotice}
            placement="floating"
          />
          {!isWizard && runtimeObservationPending && (
            <PipelineWorkflowFeedback tone="loading" title={t('wizard.checkingRuntime')} />
          )}
          {!isWizard && runtimeObservationError && (
            <PipelineWorkflowFeedback
              tone="error"
              title={t('wizard.runtimeStatusError')}
              actionLabel={t('pipelines.workspace.actions.retry')}
              onAction={onRetryRuntimeObservation}
            />
          )}
          {actionErrors.map((actionError) => (
            <PipelineWorkflowFeedback
              key={actionError.id}
              tone="error"
              title={t('pipelines.workspace.actions.saveErrorTitle')}
              message={actionError.message}
              dismissLabel={t('pipelines.workspace.actions.dismissSaveError')}
              onDismiss={() =>
                setActionErrors((current) =>
                  current.filter((candidate) => candidate.id !== actionError.id),
                )
              }
            />
          ))}
          {diagnostics.slice(0, 4).map((diagnostic) => {
            const diagnosticId = `${diagnostic.code}:${diagnostic.nodeIds.join(',')}:${diagnostic.messageKey}`
            return (
              <PipelineWorkflowFeedback
                key={diagnosticId}
                tone="warning"
                title={t('pipelines.workspace.diagnostics.title')}
                message={t(diagnostic.messageKey)}
                dismissLabel={t('pipelines.workspace.diagnostics.dismiss')}
                onDismiss={() =>
                  setDiagnostics((current) =>
                    current.filter(
                      (candidate) =>
                        `${candidate.code}:${candidate.nodeIds.join(',')}:${candidate.messageKey}` !==
                        diagnosticId,
                    ),
                  )
                }
              />
            )
          })}
        </div>
      )}
    </section>
  )
}

function PipelineWorkflowFeedback({
  tone,
  title,
  message,
  dismissLabel,
  onDismiss,
  actionLabel,
  onAction,
}: {
  tone: 'error' | 'warning' | 'loading'
  title: string
  message?: string
  dismissLabel?: string
  onDismiss?: () => void
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <div
      className="pipeline-workflow-feedback border-components-panel-border bg-components-panel-bg-blur shadow-shadow-shadow-5 pointer-events-auto relative w-full overflow-hidden rounded-xl border shadow-lg backdrop-blur-[5px]"
      role={tone === 'loading' ? 'status' : 'alert'}
      data-testid="pipeline-workflow-feedback"
    >
      <div
        aria-hidden="true"
        className={cn(
          'to-background-gradient-mask-transparent pointer-events-none absolute -inset-px bg-linear-to-r opacity-40',
          tone === 'loading' && 'from-components-badge-status-light-normal-halo',
          tone === 'warning' && 'from-components-badge-status-light-warning-halo',
          tone === 'error' && 'from-components-badge-status-light-error-halo',
        )}
      />
      <div className="relative flex items-start gap-1 overflow-hidden p-3">
        <div className="flex shrink-0 items-center justify-center p-0.5">
          <span
            aria-hidden="true"
            className={cn(
              'size-5',
              tone === 'loading' &&
                'i-ri-loader-2-line text-text-accent animate-spin motion-reduce:animate-none',
              tone === 'warning' && 'i-ri-alert-fill text-text-warning-secondary',
              tone === 'error' && 'i-ri-error-warning-fill text-text-destructive',
            )}
          />
        </div>
        <div className="min-w-0 flex-1 p-1">
          <p className="system-sm-semibold text-text-primary min-w-0 wrap-break-word">{title}</p>
          {message && (
            <p className="system-xs-regular text-text-secondary mt-1 min-w-0 wrap-break-word">
              {message}
            </p>
          )}
          {onAction && actionLabel && (
            <button
              type="button"
              className="border-components-button-secondary-border bg-components-button-secondary-bg text-components-button-secondary-text hover:bg-state-base-hover system-sm-medium mt-2 mb-1 rounded-md border-[0.5px] px-3 py-2 shadow-xs"
              onClick={onAction}
            >
              {actionLabel}
            </button>
          )}
        </div>
        {onDismiss && dismissLabel && (
          <div className="flex shrink-0 items-center justify-center rounded-md p-0.5">
            <IconButton type="button" size="sm" aria-label={dismissLabel} onClick={onDismiss}>
              <span className="i-ri-close-line text-text-tertiary size-4" aria-hidden="true" />
            </IconButton>
          </div>
        )}
      </div>
    </div>
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

export function PipelineWorkspacePage({
  pipelineId,
  section,
}: {
  pipelineId: string
  section: PipelineWorkspaceSection
}) {
  const [navigationCollapsed, setNavigationCollapsed] = useState(false)
  const [basicInfoSaverReady, setBasicInfoSaverReady] = useState(false)
  const shouldPollRuntime = section === 'orchestrate'
  const { t } = useTranslation()
  const apiFetch = useAuthStore((state) => state.apiFetch)
  const queryClient = useQueryClient()
  const basicInfoSaverRef = useRef<SavePipelineDraftBasicInfo | null>(null)
  const pipelineDraft = useQuery({
    queryKey: ['pipelines', pipelineId, 'draft-status'],
    queryFn: async () => {
      try {
        return await getPipelineDraft(pipelineId, apiFetch)
      } catch (error) {
        if (error instanceof PipelineClientError && error.status === 404) return null
        throw error
      }
    },
    retry: false,
  })
  const pipelineInfo = useQuery({
    queryKey: ['pipelines', pipelineId],
    queryFn: () => getPipeline(pipelineId, apiFetch),
    enabled: pipelineDraft.isSuccess && pipelineDraft.data === null,
    retry: false,
  })
  const registerBasicInfoSaver = useCallback((save: SavePipelineDraftBasicInfo | null) => {
    basicInfoSaverRef.current = save
    setBasicInfoSaverReady(Boolean(save))
  }, [])
  const catalog = useQuery({
    queryKey: ['pipelines'],
    queryFn: () => listPipelines(apiFetch),
    refetchInterval: shouldPollRuntime ? 5000 : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: shouldPollRuntime,
    refetchOnReconnect: shouldPollRuntime,
  })
  const catalogItem = catalog.data?.find((item) => item.id === pipelineId)
  const hasArtifact =
    Boolean(
      pipelineDraft.data?.draft?.publishedArtifactHash ||
      pipelineDraft.data?.draft?.baseArtifactHash,
    ) ||
    catalogItem?.hasArtifact === true ||
    Boolean(pipelineInfo.data)
  const mergedStatus = useQuery({
    queryKey: ['pipelines', pipelineId, 'status'],
    queryFn: () => getPipelineStatus(pipelineId, apiFetch),
    enabled: pipelineDraft.isSuccess && hasArtifact,
    retry: false,
    refetchInterval: shouldPollRuntime ? 5000 : false,
    refetchOnWindowFocus: shouldPollRuntime,
    refetchOnReconnect: shouldPollRuntime,
  })
  const lifecycleStatus =
    mergedStatus.data?.displayState ?? mergedStatus.data?.state ?? catalogItem?.status.state
  const runtimeStatus = hasArtifact
    ? lifecycleStatus === 'STARTING' || lifecycleStatus === 'RESUMING'
      ? 'RUNNING'
      : (mergedStatus.data?.observedState ??
        mergedStatus.data?.desiredState ??
        catalogItem?.status.observedState ??
        catalogItem?.status.desiredState ??
        runtimeStateFromCatalog(lifecycleStatus) ??
        'NEW')
    : undefined
  const basicInfo = useMemo<PipelineDraftBasicInfo>(() => {
    const draft = pipelineDraft.data?.draft
    if (draft) {
      return {
        name: draft.name?.trim() || pipelineId,
        description: draft.description,
      }
    }
    return {
      name: pipelineId,
      description: pipelineInfo.data?.metadata?.description ?? null,
    }
  }, [pipelineDraft.data, pipelineId, pipelineInfo.data])

  const saveBasicInfo = useCallback(
    async (nextBasicInfo: PipelineDraftBasicInfo) => {
      let result: { draft: PipelineDraft; etag: string }
      const editorSave = section === 'orchestrate' ? basicInfoSaverRef.current : null
      if (section === 'orchestrate') {
        if (!editorSave) throw new Error(t('pipelines.workspace.navigation.editorLoading'))
        result = await editorSave(nextBasicInfo)
      } else {
        let current: { draft: PipelineDraft; etag: string } | null
        try {
          current = await getPipelineDraft(pipelineId, apiFetch)
        } catch (error) {
          if (!(error instanceof PipelineClientError) || error.status !== 404) throw error
          current = null
        }

        const mutationFor = (draft: PipelineDraft): PipelineDraftMutation => ({
          pipelineId,
          mode: draft.mode,
          name: nextBasicInfo.name,
          description: nextBasicInfo.description,
          graph: draft.graph,
          wizard: draft.wizard,
          baseArtifactHash: draft.baseArtifactHash,
        })

        if (current) {
          try {
            result = await updatePipelineDraft(
              pipelineId,
              mutationFor(current.draft),
              current.etag,
              apiFetch,
            )
          } catch (error) {
            if (!(error instanceof PipelineClientError) || error.status !== 412) throw error
            current = await getPipelineDraft(pipelineId, apiFetch)
            result = await updatePipelineDraft(
              pipelineId,
              mutationFor(current.draft),
              current.etag,
              apiFetch,
            )
          }
        } else {
          const [pipeline, layout] = await Promise.all([
            getPipeline(pipelineId, apiFetch),
            getPipelineLayout(pipelineId, apiFetch),
          ])
          const mutation = buildPipelineDraftMutation(
            createPipelineGraphDraft(pipeline),
            layout,
            nextBasicInfo,
          )
          try {
            result = await createPipelineDraft(pipelineId, mutation, apiFetch)
          } catch (error) {
            if (!(error instanceof PipelineClientError) || error.status !== 409) throw error
            current = await getPipelineDraft(pipelineId, apiFetch)
            result = await updatePipelineDraft(
              pipelineId,
              mutationFor(current.draft),
              current.etag,
              apiFetch,
            )
          }
        }
      }

      queryClient.setQueryData(['pipelines', pipelineId, 'draft-status'], result)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pipelines'], exact: true }),
        queryClient.invalidateQueries({ queryKey: ['pipelines', 'drafts'], exact: true }),
      ])
      return result
    },
    [apiFetch, pipelineId, queryClient, section, t],
  )
  const canEditBasicInfo =
    !isGuidedCustomer360Pipeline(
      pipelineId,
      pipelineDraft.data?.draft.mode === 'wizard' ? pipelineDraft.data.draft.wizard : null,
    ) &&
    pipelineDraft.isSuccess &&
    (pipelineDraft.data !== null || pipelineInfo.isSuccess) &&
    !isPipelineReadOnly(runtimeStatus) &&
    (section !== 'orchestrate' || basicInfoSaverReady)

  return (
    <main
      className="pipeline-workspace flex h-dvh min-h-0 gap-1 overflow-hidden p-1"
      data-testid="pipeline-workspace"
    >
      <PipelineWorkspaceNav
        pipelineId={pipelineId}
        basicInfo={basicInfo}
        activeSection={section}
        collapsed={navigationCollapsed}
        onCollapsedChange={setNavigationCollapsed}
        status={lifecycleStatus}
        hasArtifact={hasArtifact}
        canEditBasicInfo={canEditBasicInfo}
        onSaveBasicInfo={saveBasicInfo}
      />
      {section === 'orchestrate' ? (
        <PipelineOrchestrationPage
          pipelineId={pipelineId}
          runtimeStatus={runtimeStatus}
          lifecycleStatus={lifecycleStatus}
          runtimeObservationPending={hasArtifact && mergedStatus.isPending}
          runtimeObservationError={hasArtifact && mergedStatus.isError}
          onRetryRuntimeObservation={() => {
            void catalog.refetch()
            void mergedStatus.refetch()
          }}
          onRegisterBasicInfoSaver={registerBasicInfoSaver}
        />
      ) : (
        <WorkspacePageFrame
          pipelineId={pipelineId}
          section={section}
          showHeading={section !== 'logs'}
        >
          {section === 'monitoring' && (
            <PipelineMonitoringPage pipelineId={pipelineId} hasArtifact={hasArtifact} />
          )}
          {section === 'logs' && <PipelineLogsPage pipelineId={pipelineId} />}
        </WorkspacePageFrame>
      )}
    </main>
  )
}

export function PipelineEditorPage({ pipelineId }: { pipelineId: string }) {
  return <PipelineWorkspacePage pipelineId={pipelineId} section="orchestrate" />
}
