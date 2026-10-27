import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { GitMerge, Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { ApiFetcher } from '@/service/source-client'

import { ResourceListHeader } from '@/components/resource-list-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { listPipelines, type PipelineCatalogItem } from '@/service/pipelines/pipeline-client'
import { useAuthStore } from '@/stores/auth-store'

import { PipelineCreationDialog } from '../components/create/pipeline-creation-dialog'
import {
  PipelineLifecycleMenu,
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
  const pipelines = pipelinesQuery.data ?? []
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
        <Button type="button" onClick={() => setIsCreationDialogOpen(true)}>
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          {t('pipelines.create')}
        </Button>
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
                  {pipelinesQuery.dataUpdatedAt > 0
                    ? t('pipelines.list.lastRefreshed', {
                        time: new Intl.DateTimeFormat(i18n.language, {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        }).format(pipelinesQuery.dataUpdatedAt),
                      })
                    : autoRefresh
                      ? t('pipelines.list.refreshActive')
                      : t('pipelines.list.refreshPaused')}
                </p>
                <PipelineRefreshControls
                  autoRefresh={autoRefresh}
                  isFetching={pipelinesQuery.isFetching}
                  onRefresh={() => void pipelinesQuery.refetch()}
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
              <PipelineListState message={t('pipelines.states.empty')} />
            ) : filteredPipelines.length === 0 ? (
              <PipelineListState message={t('pipelines.list.noResults')} />
            ) : (
              <PipelineTable
                pipelines={filteredPipelines}
                apiFetch={apiFetch}
                startPipeline={starter.startPipeline}
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
  apiFetch,
  startPipeline,
  onMutationError,
  onMutationStart,
}: {
  pipelines: PipelineCatalogItem[]
  apiFetch: ApiFetcher
  startPipeline: PipelineStarter
  onMutationError: (pipelineId: string, action: PipelineLifecycleAction, error?: unknown) => void
  onMutationStart: () => void
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
            <th className="px-4 py-3 font-semibold">{t('pipelines.table.status')}</th>
            <th className="w-20 px-4 py-3" aria-hidden="true" />
          </tr>
        </thead>
        <tbody>
          {pipelines.map((pipeline) => (
            <tr
              key={pipeline.id}
              className="group relative border-b border-gray-100/60 transition-colors focus-within:bg-gray-50/50 hover:bg-gray-50/50"
            >
              <td className="px-4 py-3">
                <a
                  className="inline-flex min-h-9 max-w-full items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                  href={`/pipelines/${encodeURIComponent(pipeline.id)}/edit`}
                  aria-label={t('pipelines.actions.editPipeline', { id: pipeline.id })}
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
              <td className="hidden px-4 py-3 text-[13px] text-gray-500 sm:table-cell">
                {t('pipelines.type.pipeline')}
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
              <td className="relative w-20 px-4 py-3">
                <PipelineLifecycleMenu
                  pipelineId={pipeline.id}
                  status={pipeline.status.state}
                  contentHash={pipeline.contentHash ?? null}
                  apiFetch={apiFetch}
                  startPipeline={startPipeline}
                  onMutationStart={onMutationStart}
                  onMutationError={(action, error) => onMutationError(pipeline.id, action, error)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
