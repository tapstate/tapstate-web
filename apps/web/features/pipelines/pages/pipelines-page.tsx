import { useQuery } from '@tanstack/react-query'
import { GitMerge, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { ApiFetcher } from '@/service/source-client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { listPipelines, type PipelineView } from '@/service/pipelines/pipeline-client'
import { useAuthStore } from '@/stores/auth-store'

import { PipelineCreationDialog } from '../components/create/pipeline-creation-dialog'
import { TreeItem } from '../components/navigation/tree-item'
import {
  PipelineLifecycleMenu,
  type PipelineLifecycleAction,
} from '../components/pipeline-lifecycle-menu'
import { PipelineMutationFeedback } from '../components/pipeline-mutation-feedback'
import { PipelineStatusBadge } from '../components/pipeline-status-badge'

export function PipelinesPage() {
  const { t } = useTranslation()
  const apiFetch = useAuthStore((state) => state.apiFetch)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isCreationDialogOpen, setIsCreationDialogOpen] = useState(false)
  const [lifecycleFeedback, setLifecycleFeedback] = useState<{
    pipelineId: string
    action: PipelineLifecycleAction
    message?: string
  } | null>(null)
  const pipelinesQuery = useQuery({
    queryKey: ['pipelines'],
    queryFn: () => listPipelines(apiFetch),
    // Runtime state is mutable outside this screen. Keep lifecycle actions
    // aligned with the control plane instead of allowing a stale Start action
    // to remain visible after another worker has already started the Pipeline.
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  })
  const pipelines = pipelinesQuery.data ?? []
  const selectedPipeline = useMemo(
    () => pipelines.find((pipeline) => pipeline.id === selectedId) ?? null,
    [pipelines, selectedId],
  )

  return (
    <section className="flex h-full w-full flex-col overflow-hidden bg-white">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-gray-100/70 px-4 md:px-6">
        <h1 className="min-w-0 truncate text-[15px] font-semibold text-gray-900">
          {t('pipelines.title')}
        </h1>
        <Button
          type="button"
          className="shrink-0 px-3 text-[13px] font-medium shadow-sm"
          onClick={() => setIsCreationDialogOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          {t('common.create')}
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col bg-white md:flex-row">
        <aside className="flex w-full shrink-0 flex-col border-b border-gray-100/70 bg-[#fcfcfd]/80 md:w-64 md:border-r md:border-b-0">
          <div className="flex items-center justify-between border-b border-gray-100/70 p-3">
            <h2 className="ml-1 text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
              {t('pipelines.explorer')}
            </h2>
          </div>
          <div className="flex min-h-[160px] flex-1 gap-1 overflow-auto p-2 md:flex-col">
            <Button
              type="button"
              variant="ghost"
              className={cn(
                'h-auto min-w-[160px] justify-start px-2 py-1.5 text-[13px] md:min-w-0',
                selectedId === null
                  ? 'bg-gray-100 font-medium text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50',
              )}
              onClick={() => setSelectedId(null)}
            >
              <GitMerge className="h-4 w-4 text-gray-400" aria-hidden="true" />
              <span>{t('pipelines.allPipelines')}</span>
            </Button>
            {pipelinesQuery.isLoading ? (
              <div className="space-y-2 px-2 py-1.5" aria-label={t('pipelines.states.loading')}>
                <div className="h-3 w-36 animate-pulse rounded bg-gray-100" />
                <div className="h-3 w-24 animate-pulse rounded bg-gray-100" />
              </div>
            ) : (
              pipelines.map((pipeline) => (
                <TreeItem
                  key={pipeline.id}
                  node={{ id: pipeline.id, name: pipeline.id, type: 'pipeline' }}
                  expandedIds={new Set()}
                  selectedId={selectedId}
                  onToggle={() => undefined}
                  onSelect={setSelectedId}
                />
              ))
            )}
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col bg-white">
          {selectedPipeline && <PipelineHeader pipeline={selectedPipeline} />}
          <div className="min-h-0 flex-1 overflow-auto bg-white p-4 md:p-6">
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
            ) : (
              <PipelineTable
                pipelines={pipelines}
                apiFetch={apiFetch}
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
      {isCreationDialogOpen && (
        <PipelineCreationDialog open onClose={() => setIsCreationDialogOpen(false)} />
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

function PipelineHeader({ pipeline }: { pipeline: PipelineView }) {
  return (
    <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-gray-100/70 px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <GitMerge className="h-4 w-4 shrink-0 text-blue-500" aria-hidden="true" />
        <h2 className="truncate text-[14px] font-semibold text-gray-900">{pipeline.id}</h2>
        <code
          className="hidden shrink-0 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-500 sm:inline"
          title={pipeline.contentHash}
        >
          {pipeline.contentHash.slice(0, 12)}
        </code>
      </div>
    </div>
  )
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
  onMutationError,
  onMutationStart,
}: {
  pipelines: PipelineView[]
  apiFetch: ApiFetcher
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
            <th className="hidden px-4 py-3 font-semibold md:table-cell">
              {t('pipelines.table.version')}
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
                    <GitMerge className="h-3.5 w-3.5 text-blue-500" aria-hidden="true" />
                  </span>
                  <span
                    className="min-w-0 text-[13px] font-medium break-words text-gray-900"
                    title={pipeline.id}
                  >
                    {pipeline.id}
                  </span>
                </a>
              </td>
              <td className="hidden px-4 py-3 text-[13px] text-gray-500 sm:table-cell">
                {t('pipelines.type.pipeline')}
              </td>
              <td className="hidden px-4 py-3 md:table-cell">
                <code className="font-mono text-[12px] text-gray-400" title={pipeline.contentHash}>
                  {pipeline.contentHash.slice(0, 12)}
                </code>
              </td>
              <td className="px-4 py-3">
                <PipelineStatusBadge status={pipeline.status?.state} />
              </td>
              <td className="relative w-20 px-4 py-3">
                <PipelineLifecycleMenu
                  pipelineId={pipeline.id}
                  status={pipeline.status?.state}
                  contentHash={pipeline.contentHash}
                  apiFetch={apiFetch}
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
