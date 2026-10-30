import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import FilterEmptyState from '@tapstate-web/ui/filter-empty-state'
import { FirstEmptyActionCard } from '@tapstate-web/ui/first-empty-action-card'
import { GitMerge, Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { ApiFetcher } from '@/service/source-client'

import { ResourceListHeader } from '@/components/resource-list-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  listPipelineArtifacts,
  listPipelines,
  type PipelineCatalogItem,
  type PipelineClientError,
  type PipelineView,
} from '@/service/pipelines/pipeline-client'
import { listViews } from '@/service/view-client'
import { useAuthStore } from '@/stores/auth-store'

import { PipelineCreationDialog } from '../components/create/pipeline-creation-dialog'
import {
  PipelineLifecycleMenu,
  PipelineDeletionCleanupNotice,
  type PipelineLifecycleAction,
} from '../components/pipeline-lifecycle-menu'
import { PipelineMutationFeedback } from '../components/pipeline-mutation-feedback'
import {
  PipelineRefreshControls,
  PIPELINE_AUTO_REFRESH_INTERVAL_MS,
} from '../components/pipeline-refresh-controls'
import { PipelineStatusBadge } from '../components/pipeline-status-badge'
import { PipelineStartNotices } from '../start-checks/pipeline-start-notice'
import { StartChecksDialog } from '../start-checks/start-checks-dialog'
import { useStartPipeline, type PipelineStarter } from '../start-checks/use-start-pipeline'

export function PipelinesPage() {
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()
  const { create } = useSearch({ from: '/_authenticated/pipelines' })
  const apiFetch = useAuthStore((state) => state.apiFetch)
  const [search, setSearch] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [isCreationDialogOpen, setIsCreationDialogOpen] = useState(false)
  useEffect(() => {
    if (create) setIsCreationDialogOpen(true)
  }, [create])
  const [lifecycleFeedback, setLifecycleFeedback] = useState<{
    pipelineId: string
    action: PipelineLifecycleAction
    message?: string
  } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PipelineCatalogItem | null>(null)
  const [deleteCleanup, setDeleteCleanup] = useState<{
    pipelineId: string
    error: PipelineClientError
  } | null>(null)
  const starter = useStartPipeline({ apiFetch })
  const pipelinesQuery = useQuery({
    queryKey: ['pipelines'],
    queryFn: () => listPipelines(apiFetch),
    // The catalog is one server projection for documents, artifacts, and runtime state.
    refetchInterval: autoRefresh ? PIPELINE_AUTO_REFRESH_INTERVAL_MS : false,
    refetchIntervalInBackground: false,
    refetchOnReconnect: autoRefresh,
    refetchOnWindowFocus: autoRefresh,
  })
  const pipelineArtifactsQuery = useQuery({
    queryKey: ['pipeline-artifacts'],
    queryFn: () => listPipelineArtifacts(apiFetch),
    retry: false,
    refetchInterval: autoRefresh ? PIPELINE_AUTO_REFRESH_INTERVAL_MS : false,
    refetchIntervalInBackground: false,
    refetchOnReconnect: autoRefresh,
    refetchOnWindowFocus: autoRefresh,
  })
  const viewsQuery = useQuery({
    queryKey: ['views'],
    queryFn: () => listViews(apiFetch),
    retry: false,
    refetchInterval: autoRefresh ? PIPELINE_AUTO_REFRESH_INTERVAL_MS : false,
    refetchIntervalInBackground: false,
    refetchOnReconnect: autoRefresh,
    refetchOnWindowFocus: autoRefresh,
  })
  const lastUpdatedAt = Math.max(
    pipelinesQuery.dataUpdatedAt,
    pipelineArtifactsQuery.dataUpdatedAt,
    viewsQuery.dataUpdatedAt,
  )
  const isFetching =
    pipelinesQuery.isFetching || pipelineArtifactsQuery.isFetching || viewsQuery.isFetching
  const pipelines = pipelinesQuery.data ?? []
  const artifactsById = useMemo(
    () => new Map((pipelineArtifactsQuery.data ?? []).map((pipeline) => [pipeline.id, pipeline])),
    [pipelineArtifactsQuery.data],
  )
  const lagByPipeline = useMemo(() => {
    const lag = new Map<string, number>()
    if (!viewsQuery.data?.available) return lag
    for (const view of viewsQuery.data.views) {
      if (view.status.state !== 'fresh') continue
      lag.set(view.pipelineId, Math.max(lag.get(view.pipelineId) ?? 0, view.status.behindSeconds))
    }
    return lag
  }, [viewsQuery.data])
  const filteredPipelines = useMemo(() => {
    const query = search.trim().toLocaleLowerCase(i18n.language)
    if (!query) return pipelines

    return pipelines.filter((pipeline) =>
      [pipeline.id, pipeline.name, pipeline.description, pipeline.mode, pipeline.status.state]
        .filter((value): value is string => typeof value === 'string')
        .some((value) => value.toLocaleLowerCase(i18n.language).includes(query)),
    )
  }, [i18n.language, pipelines, search])
  return (
    <section className="flex h-full w-full flex-col overflow-hidden bg-white">
      <ResourceListHeader title={t('pipelines.title')}>
        {(pipelinesQuery.data === undefined || pipelines.length > 0) && (
          <Button type="button" onClick={() => setIsCreationDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            {t('pipelines.create')}
          </Button>
        )}
      </ResourceListHeader>

      <div className="flex min-h-0 flex-1 bg-white">
        <main className="flex min-w-0 flex-1 flex-col bg-white">
          <div className="min-h-0 flex-1 overflow-auto bg-white p-4 md:p-6">
            <PipelineStartNotices
              notices={starter.notices}
              onDismiss={starter.dismissNotice}
              className="mb-4"
            />
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <label className="relative min-w-52 flex-1 sm:max-w-sm">
                <Search
                  className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2"
                  aria-hidden="true"
                />
                <span className="sr-only">{t('pipelines.list.searchAria')}</span>
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t('pipelines.list.searchPlaceholder')}
                  className="pl-9"
                />
              </label>
              <div className="flex items-center gap-3">
                <p className="text-muted-foreground hidden text-xs sm:block" aria-live="polite">
                  {lastUpdatedAt > 0
                    ? t('pipelines.list.lastRefreshed', {
                        time: new Intl.DateTimeFormat(i18n.language, {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          timeZoneName: 'short',
                        }).format(lastUpdatedAt),
                      })
                    : autoRefresh
                      ? t('pipelines.list.refreshActive')
                      : t('pipelines.list.refreshPaused')}
                </p>
                <PipelineRefreshControls
                  autoRefresh={autoRefresh}
                  isFetching={isFetching}
                  onRefresh={() => {
                    void Promise.all([
                      pipelinesQuery.refetch(),
                      pipelineArtifactsQuery.refetch(),
                      viewsQuery.refetch(),
                    ])
                  }}
                  onToggle={() => setAutoRefresh((current) => !current)}
                  labels={{
                    refresh: t('pipelines.list.refresh'),
                    refreshAria: t('pipelines.list.refreshAria'),
                    active: t('pipelines.list.refreshActive'),
                    paused: t('pipelines.list.refreshPaused'),
                    pause: t('pipelines.list.pauseRefresh'),
                    pauseAria: t('pipelines.list.pauseRefreshAria'),
                    resume: t('pipelines.list.resumeRefresh'),
                    resumeAria: t('pipelines.list.resumeRefreshAria'),
                  }}
                />
              </div>
            </div>
            {pipelinesQuery.isLoading ? (
              <PipelineListState message={t('pipelines.states.loading')} />
            ) : pipelinesQuery.isError ? (
              <PipelineListState
                message={t('pipelines.states.error')}
                action={
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void pipelinesQuery.refetch()}
                  >
                    {t('state.error.retry')}
                  </Button>
                }
              />
            ) : pipelines.length === 0 ? (
              <PipelineFirstEmptyState
                message={t('pipelines.states.empty')}
                createLabel={t('pipelines.create')}
                createDescription={t('pipelines.states.createDescription')}
                onCreate={() => setIsCreationDialogOpen(true)}
              />
            ) : filteredPipelines.length === 0 ? (
              <div className="relative min-h-107.5" role="status">
                <FilterEmptyState
                  title={t('pipelines.list.noResults')}
                  icon={<Search className="text-text-tertiary size-6" aria-hidden="true" />}
                />
              </div>
            ) : (
              <PipelineTable
                pipelines={filteredPipelines}
                artifactsById={artifactsById}
                lagByPipeline={lagByPipeline}
                apiFetch={apiFetch}
                startPipeline={starter.startPipeline}
                onRequestDelete={setDeleteTarget}
                onDeleteIncomplete={(pipelineId, error) => setDeleteCleanup({ pipelineId, error })}
                onMutationError={(pipelineId, action, error) => {
                  const message = serverErrorMessage(error)
                  setLifecycleFeedback({ pipelineId, action, message })
                }}
                onMutationStart={() => setLifecycleFeedback(null)}
              />
            )}
          </div>
        </main>
      </div>
      {lifecycleFeedback && (
        <PipelineMutationFeedback
          pipelineId={lifecycleFeedback.pipelineId}
          action={lifecycleFeedback.action}
          message={lifecycleFeedback.message}
          onDismiss={() => setLifecycleFeedback(null)}
        />
      )}
      {deleteTarget && (
        <PipelineLifecycleMenu
          presentation="dialog-only"
          pipelineId={deleteTarget.id}
          status={
            (pipelines.find((item) => item.id === deleteTarget.id) ?? deleteTarget).status.state
          }
          contentHash={deleteTarget.contentHash ?? null}
          draftRevision={deleteTarget.revision ?? null}
          apiFetch={apiFetch}
          onDeleteDialogClose={() => setDeleteTarget(null)}
          onDeleteIncomplete={(error) => setDeleteCleanup({ pipelineId: deleteTarget.id, error })}
        />
      )}
      {deleteCleanup && (
        <PipelineDeletionCleanupNotice
          {...deleteCleanup}
          onDismiss={() => setDeleteCleanup(null)}
        />
      )}
      <StartChecksDialog {...starter.dialog} />
      {isCreationDialogOpen && (
        <PipelineCreationDialog
          open
          onClose={() => {
            setIsCreationDialogOpen(false)
            if (create) void navigate({ to: '/pipelines', search: {}, replace: true })
          }}
        />
      )}
    </section>
  )
}

function PipelineFirstEmptyState({
  message,
  createLabel,
  createDescription,
  onCreate,
}: {
  message: string
  createLabel: string
  createDescription: string
  onCreate: () => void
}) {
  return (
    <div className="relative min-h-107.5 overflow-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 inset-y-2 grid grid-cols-[repeat(auto-fill,minmax(min(100%,288px),1fr))] grid-rows-4 gap-3"
        aria-hidden="true"
      >
        {Array.from({ length: 16 }, (_, index) => (
          <div key={index} className="bg-background-default-lighter rounded-xl opacity-75" />
        ))}
      </div>
      <div className="from-background-body/0 to-background-body pointer-events-none absolute inset-0 bg-linear-to-b" />
      <section
        className="absolute inset-0 flex items-center justify-center overflow-hidden p-2"
        aria-labelledby="pipelines-first-empty-title"
      >
        <div className="flex w-full max-w-130 flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-3">
            <div className="border-divider-regular bg-components-card-bg flex size-14 items-center justify-center overflow-hidden rounded-xl border border-dashed p-1 backdrop-blur-md">
              <GitMerge className="text-text-tertiary size-6" aria-hidden="true" />
            </div>
            <h2
              id="pipelines-first-empty-title"
              className="system-sm-regular text-text-tertiary text-center"
            >
              {message}
            </h2>
          </div>
          <FirstEmptyActionCard
            title={createLabel}
            description={createDescription}
            icon={<Plus className="size-4" aria-hidden="true" />}
            onClick={onCreate}
          />
        </div>
      </section>
    </div>
  )
}

function serverErrorMessage(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || Array.isArray(error)) return undefined
  const candidate = error as { code?: unknown; message?: unknown }
  return typeof candidate.code === 'string' && typeof candidate.message === 'string'
    ? candidate.message
    : undefined
}

function PipelineListState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="flex min-h-48 max-w-xl flex-col items-start justify-center gap-3 rounded-lg border border-dashed border-gray-200 bg-gray-50/40 px-5 py-8 text-[13px] text-gray-600">
      <GitMerge className="h-4 w-4 text-gray-400" aria-hidden="true" />
      <p className="leading-relaxed">{message}</p>
      {action}
    </div>
  )
}

function PipelineTable({
  pipelines,
  artifactsById,
  lagByPipeline,
  apiFetch,
  startPipeline,
  onMutationError,
  onMutationStart,
  onDeleteIncomplete,
  onRequestDelete,
}: {
  pipelines: PipelineCatalogItem[]
  onRequestDelete: (pipeline: PipelineCatalogItem) => void
  artifactsById: Map<string, PipelineView>
  lagByPipeline: Map<string, number>
  apiFetch: ApiFetcher
  startPipeline: PipelineStarter
  onMutationError: (pipelineId: string, action: PipelineLifecycleAction, error?: unknown) => void
  onMutationStart: () => void
  onDeleteIncomplete: (pipelineId: string, error: PipelineClientError) => void
}) {
  const { t } = useTranslation()

  return (
    <div className="overflow-x-auto">
      <table className="pipeline-list__table w-full border-collapse text-left text-[13px]">
        <thead className="border-b border-gray-100 bg-transparent text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
          <tr>
            <th className="px-4 py-3 font-semibold">{t('pipelines.table.resourceName')}</th>
            <th className="hidden px-4 py-3 font-semibold sm:table-cell">
              {t('pipelines.table.type')}
            </th>
            <th className="hidden px-4 py-3 font-semibold lg:table-cell">
              {t('pipelines.table.sources')}
            </th>
            <th className="hidden px-4 py-3 font-semibold lg:table-cell">
              {t('pipelines.table.target')}
            </th>
            <th className="px-4 py-3 font-semibold">{t('pipelines.table.status')}</th>
            <th className="hidden px-4 py-3 font-semibold xl:table-cell">
              {t('pipelines.table.lag')}
            </th>
            <th className="hidden max-w-64 px-4 py-3 font-semibold xl:table-cell">
              {t('pipelines.table.lastError')}
            </th>
            <th className="w-20 px-4 py-3" aria-hidden="true" />
          </tr>
        </thead>
        <tbody>
          {pipelines.map((pipeline) => (
            <PipelineTableRow
              key={pipeline.id}
              pipeline={pipeline}
              artifact={artifactsById.get(pipeline.id)}
              lagSeconds={lagByPipeline.get(pipeline.id)}
              apiFetch={apiFetch}
              startPipeline={startPipeline}
              onMutationStart={onMutationStart}
              onDeleteIncomplete={onDeleteIncomplete}
              onRequestDelete={onRequestDelete}
              onMutationError={onMutationError}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PipelineTableRow({
  pipeline,
  artifact,
  lagSeconds,
  apiFetch,
  startPipeline,
  onMutationError,
  onMutationStart,
  onDeleteIncomplete,
  onRequestDelete,
}: {
  pipeline: PipelineCatalogItem
  onRequestDelete: (pipeline: PipelineCatalogItem) => void
  artifact?: PipelineView
  lagSeconds?: number
  apiFetch: ApiFetcher
  startPipeline: PipelineStarter
  onMutationError: (pipelineId: string, action: PipelineLifecycleAction, error?: unknown) => void
  onMutationStart: () => void
  onDeleteIncomplete: (pipelineId: string, error: PipelineClientError) => void
}) {
  const { i18n, t } = useTranslation()
  const sources = artifact?.sources?.map((source) => source.id).join(', ')
  const targets = artifact?.dag.nodes
    .filter((node) => node.type === 'target')
    .map((node) => {
      return node.tableRefs?.length ? node.tableRefs.join(', ') : node.label
    })
    .join(', ')
  const modeLabel = pipeline.mode
    ? t(`pipelines.createMenu.${pipeline.mode}`)
    : t('pipelines.type.pipeline')
  const lastError = pipeline.status.failure?.message || pipeline.status.failure?.code
  const lagLabel =
    lagSeconds === undefined
      ? '—'
      : t('pipelines.table.lagSeconds', {
          value: new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 }).format(
            lagSeconds,
          ),
        })

  return (
    <tr className="group relative border-b border-gray-100/60 transition-colors focus-within:bg-gray-50/50 hover:bg-gray-50/50">
      <td className="px-4 py-3">
        <a
          className="inline-flex min-h-9 max-w-full items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
          href={
            pipeline.hasArtifact
              ? `/pipelines/${encodeURIComponent(pipeline.id)}`
              : `/pipelines/${encodeURIComponent(pipeline.id)}/edit`
          }
          aria-label={t(
            pipeline.hasArtifact
              ? 'pipelines.actions.viewPipeline'
              : 'pipelines.actions.editPipeline',
            { id: pipeline.id },
          )}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <GitMerge className="text-text-accent size-4" aria-hidden="true" />
          </span>
          <span
            className="min-w-0 text-[13px] font-medium break-words text-gray-900"
            title={pipeline.id}
          >
            {pipeline.name}
          </span>
        </a>
      </td>
      <td className="hidden px-4 py-3 text-[13px] text-gray-500 sm:table-cell">{modeLabel}</td>
      <td className="hidden max-w-64 px-4 py-3 text-[13px] text-gray-500 lg:table-cell">
        <span className="block truncate" title={sources || undefined}>
          {sources || '—'}
        </span>
      </td>
      <td className="hidden max-w-64 px-4 py-3 text-[13px] text-gray-500 lg:table-cell">
        <span className="block truncate" title={targets || undefined}>
          {targets || '—'}
        </span>
      </td>
      <td className="px-4 py-3">
        {pipeline.hasArtifact ? (
          <PipelineStatusBadge status={pipeline.status.state} />
        ) : (
          <span className="inline-flex h-6 items-center rounded-md border border-amber-200 bg-amber-50 px-2 text-[11px] font-semibold text-amber-800">
            {t('wizard.draft')}
          </span>
        )}
      </td>
      <td className="hidden px-4 py-3 text-[13px] text-gray-600 xl:table-cell">{lagLabel}</td>
      <td className="hidden max-w-64 px-4 py-3 text-[13px] text-red-700 xl:table-cell">
        <span className="block truncate" title={lastError || undefined}>
          {lastError || '—'}
        </span>
      </td>
      <td className="relative w-20 px-4 py-3">
        <PipelineLifecycleMenu
          pipelineId={pipeline.id}
          onRequestDelete={() => onRequestDelete(pipeline)}
          status={pipeline.status.state}
          contentHash={pipeline.contentHash ?? null}
          draftRevision={pipeline.revision ?? null}
          apiFetch={apiFetch}
          startPipeline={startPipeline}
          onMutationStart={onMutationStart}
          onDeleteIncomplete={(error) => onDeleteIncomplete(pipeline.id, error)}
          onMutationError={(action, error) => onMutationError(pipeline.id, action, error)}
        />
      </td>
    </tr>
  )
}
