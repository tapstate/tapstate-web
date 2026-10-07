import type { ReactNode } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { PipelineCreationDialog } from '@/features/pipelines/components/create/pipeline-creation-dialog'
import { cn } from '@/lib/utils'
import { listPipelines } from '@/service/pipelines/pipeline-client'
import { addSampleSources, loadSampleSources } from '@/service/sample-source-client'
import { listSources, type SourceView } from '@/service/source-client'
import { listViews } from '@/service/view-client'
import { useAuthStore } from '@/stores/auth-store'

import { AddSourcesDialog } from './components/add-sources-dialog'
import { OverviewTopology } from './components/overview-topology'
import { buildOverview, type OverviewModel } from './overview-model'

/** The new-source form, supplied by the route so this feature does not reach into Data Sources. */
export type SourceFormSlot = (props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (source: SourceView) => void
}) => ReactNode

interface OverviewPageProps {
  sourceForm?: SourceFormSlot
}

export function OverviewPage({ sourceForm }: OverviewPageProps = {}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const apiFetch = useAuthStore((state) => state.apiFetch)
  // Same keys as the Data Sources, Pipelines and Views pages, so they share one cache.
  const sourcesQuery = useQuery({ queryKey: ['sources'], queryFn: () => listSources(apiFetch) })
  const pipelinesQuery = useQuery({
    queryKey: ['pipelines'],
    queryFn: () => listPipelines(apiFetch),
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  })
  const viewsQuery = useQuery({
    queryKey: ['views'],
    queryFn: () => listViews(apiFetch),
    refetchInterval: (query) => (query.state.data?.available === false ? false : 5000),
    refetchIntervalInBackground: false,
  })
  // A deployment without sample settings serves no file; the offer then stays hidden.
  const samplesQuery = useQuery({
    queryKey: ['sample-sources'],
    queryFn: () => loadSampleSources(apiFetch),
    staleTime: Infinity,
  })
  const addSamples = useMutation({
    mutationFn: () => addSampleSources(samplesQuery.data ?? [], sourcesQuery.data ?? [], apiFetch),
    onSuccess: ({ added }) => {
      queryClient.setQueryData<SourceView[]>(['sources'], (current) =>
        [
          ...(current ?? []).filter((item) => !added.some((source) => source.id === item.id)),
          ...added,
        ].sort((left, right) => left.id.localeCompare(right.id)),
      )
    },
  })
  const [addSourcesOpen, setAddSourcesOpen] = useState(false)
  const [sourceFormOpen, setSourceFormOpen] = useState(false)
  const [pipelineCreationOpen, setPipelineCreationOpen] = useState(false)

  // The view list only adds detail; when it fails or is missing, the overview still shows.
  const views = viewsQuery.data ?? null
  const overview = useMemo(
    () =>
      sourcesQuery.data && pipelinesQuery.data
        ? buildOverview(sourcesQuery.data, pipelinesQuery.data, views)
        : null,
    [sourcesQuery.data, pipelinesQuery.data, views],
  )
  const failed = sourcesQuery.isError || pipelinesQuery.isError
  return (
    <section className="overview-page">
      <header className="overview-page__header z-30 flex shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/80 px-8 py-3.5 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <h1 className="text-[17px] font-bold tracking-tight text-slate-900">
            {t('overview.title')}
          </h1>
        </div>
      </header>

      <div className="overview-page__body">
        {failed ? (
          <div className="overview-page__state" role="alert">
            <p>{t('overview.states.error')}</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void sourcesQuery.refetch()
                void pipelinesQuery.refetch()
              }}
            >
              {t('state.error.retry')}
            </Button>
          </div>
        ) : overview === null ? (
          <div className="overview-page__state" aria-busy="true">
            <p>{t('overview.states.loading')}</p>
          </div>
        ) : (
          <OverviewContent
            overview={overview}
            sampleAvailable={Boolean(samplesQuery.data?.length)}
            onAddSources={() => setAddSourcesOpen(true)}
            onBuildPipeline={() => setPipelineCreationOpen(true)}
          />
        )}
      </div>

      <AddSourcesDialog
        open={addSourcesOpen}
        onOpenChange={setAddSourcesOpen}
        sources={overview?.sources.all ?? []}
        sample={
          samplesQuery.data
            ? {
                names: samplesQuery.data.map((sample) => sample.name),
                added: samplesQuery.data.every((sample) =>
                  (sourcesQuery.data ?? []).some((source) => source.id === sample.id),
                ),
                adding: addSamples.isPending,
                error: addSamples.isError ? t('overview.addSources.sample.error') : null,
                onAdd: () => addSamples.mutate(),
              }
            : null
        }
        onConnect={() => {
          setAddSourcesOpen(false)
          setSourceFormOpen(true)
        }}
      />
      {pipelineCreationOpen && (
        <PipelineCreationDialog
          open
          defaultMode="wizard"
          onClose={() => setPipelineCreationOpen(false)}
        />
      )}
      {sourceForm?.({
        open: sourceFormOpen,
        onOpenChange: (open) => {
          setSourceFormOpen(open)
          // Back to the step dialog, which now lists the new source.
          if (!open) setAddSourcesOpen(true)
        },
        onCreated: (created) => {
          queryClient.setQueryData<SourceView[]>(['sources'], (current) =>
            [...(current ?? []).filter((item) => item.id !== created.id), created].sort(
              (left, right) => left.id.localeCompare(right.id),
            ),
          )
        },
      })}
    </section>
  )
}

interface OverviewContentProps {
  overview: OverviewModel
  sampleAvailable: boolean
  onAddSources: () => void
  onBuildPipeline: () => void
}

function OverviewContent({
  overview,
  sampleAvailable,
  onAddSources,
  onBuildPipeline,
}: OverviewContentProps) {
  return (
    <>
      <OverviewTopology
        overview={overview}
        onAddSources={onAddSources}
        onBuildPipeline={onBuildPipeline}
      >
        <OverviewMilestoneDock
          overview={overview}
          sampleAvailable={sampleAvailable}
          onAddSources={onAddSources}
          onBuildPipeline={onBuildPipeline}
        />
      </OverviewTopology>
      <OverviewRuntimeMetrics overview={overview} />
      <OverviewAttention items={overview.attention} />
    </>
  )
}

function OverviewRuntimeMetrics({ overview }: { overview: OverviewModel }) {
  const { t } = useTranslation()
  return (
    <div className="overview-runtime-metrics" aria-label={t('overview.streamStatus.label')}>
      <span>{t('overview.streamStatus.sources', { count: overview.sources.count })}</span>
      <span aria-hidden="true">·</span>
      <span>
        {overview.pipelines.total === 0
          ? t('overview.pipelines.none')
          : t('overview.pipelines.metric', { count: overview.pipelines.total })}
      </span>
      <span aria-hidden="true">·</span>
      <span>
        {overview.stateStore.ready
          ? t('overview.stateStore.managed')
          : t('overview.stateStore.missing')}
      </span>
      {overview.stateStore.views && (
        <>
          <span aria-hidden="true">·</span>
          <span>{t('overview.stateStore.metric', { count: overview.stateStore.views.total })}</span>
        </>
      )}
    </div>
  )
}

function OverviewMilestoneDock({
  overview,
  sampleAvailable,
  onAddSources,
  onBuildPipeline,
}: {
  overview: OverviewModel
  sampleAvailable: boolean
  onAddSources: () => void
  onBuildPipeline: () => void
}) {
  const { t } = useTranslation()
  const storeDone = overview.setup.done.stateStore
  const sourcesDone = overview.setup.done.sources
  const pipelineDone = overview.setup.done.pipeline

  return (
    <section
      className="z-20 mx-auto mt-6 w-full max-w-3xl"
      aria-label={t('overview.milestones.title')}
    >
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white/95 px-5 py-3 shadow-[0_8px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-all sm:flex-row">
        <div className="flex max-w-full items-center gap-2 overflow-x-auto text-[12px] font-medium select-none sm:gap-3 sm:text-[13px]">
          <Link
            to="/settings"
            aria-current={!storeDone ? 'step' : undefined}
            className={cn(
              'flex cursor-pointer items-center gap-1.5 whitespace-nowrap transition-colors',
              storeDone ? 'font-semibold text-emerald-700' : 'font-semibold text-indigo-600',
            )}
          >
            <span
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                storeDone
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500/20',
              )}
              aria-hidden="true"
            >
              {storeDone ? '✓' : '1'}
            </span>
            <span>{t('overview.milestones.stateStoreShort', 'State Store')}</span>
          </Link>

          <span className="text-slate-300" aria-hidden="true">
            ➔
          </span>

          <button
            type="button"
            onClick={onAddSources}
            aria-current={storeDone && !sourcesDone ? 'step' : undefined}
            className={cn(
              'flex cursor-pointer items-center gap-1.5 whitespace-nowrap transition-colors',
              sourcesDone
                ? 'font-semibold text-emerald-700'
                : storeDone
                  ? 'font-semibold text-indigo-600'
                  : 'text-slate-400 hover:text-slate-600',
            )}
          >
            <span
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                sourcesDone
                  ? 'bg-emerald-100 text-emerald-700'
                  : storeDone
                    ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500/20'
                    : 'bg-slate-100 text-slate-400',
              )}
              aria-hidden="true"
            >
              {sourcesDone ? '✓' : '2'}
            </span>
            <span>{t('overview.milestones.sourcesShort', 'Add Databases')}</span>
          </button>

          <span className="text-slate-300" aria-hidden="true">
            ➔
          </span>

          <button
            type="button"
            onClick={onBuildPipeline}
            aria-current={storeDone && sourcesDone && !pipelineDone ? 'step' : undefined}
            className={cn(
              'flex cursor-pointer items-center gap-1.5 whitespace-nowrap transition-colors',
              pipelineDone
                ? 'font-semibold text-emerald-700'
                : storeDone && sourcesDone
                  ? 'font-semibold text-indigo-600'
                  : 'text-slate-400 hover:text-slate-600',
            )}
          >
            <span
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                pipelineDone
                  ? 'bg-emerald-100 text-emerald-700'
                  : storeDone && sourcesDone
                    ? 'animate-pulse bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500/20'
                    : 'bg-slate-100 text-slate-400',
              )}
              aria-hidden="true"
            >
              {pipelineDone ? '✓' : '3'}
            </span>
            <span>{t('overview.milestones.pipelineShort', 'Build Pipeline')}</span>
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          {!storeDone ? (
            <Link
              to="/settings"
              className="flex h-8.5 cursor-pointer items-center gap-1.5 rounded-xl bg-[#4F46E5] px-4 text-[12.5px] font-semibold whitespace-nowrap text-white shadow-xs transition-all hover:scale-[1.01] hover:bg-[#4338CA]"
            >
              <span>{t('overview.milestones.connectStateStore', 'Connect State Store')}</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          ) : !sourcesDone ? (
            <div className="flex items-center gap-2.5">
              {sampleAvailable && (
                <button
                  type="button"
                  onClick={onAddSources}
                  className="flex cursor-pointer items-center gap-1 text-[11.5px] font-medium whitespace-nowrap text-indigo-600 transition-colors hover:text-indigo-800 hover:underline"
                >
                  <Sparkles className="h-3 w-3 text-indigo-500" aria-hidden="true" />
                  <span>{t('overview.milestones.trySample', 'Try sample')}</span>
                </button>
              )}
              <button
                type="button"
                onClick={onAddSources}
                className="flex h-8.5 cursor-pointer items-center gap-1.5 rounded-xl bg-[#4F46E5] px-3.5 text-[12.5px] font-semibold whitespace-nowrap text-white shadow-xs transition-all hover:scale-[1.01] hover:bg-[#4338CA]"
              >
                <span>{t('overview.milestones.sourcesShort', 'Add Databases')}</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ) : !pipelineDone ? (
            <button
              type="button"
              onClick={onBuildPipeline}
              className="flex h-8.5 cursor-pointer items-center gap-1.5 rounded-xl bg-[#4F46E5] px-4 text-[12.5px] font-semibold whitespace-nowrap text-white shadow-xs transition-all hover:scale-[1.01] hover:bg-[#4338CA]"
            >
              <span>{t('overview.milestones.build')}</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onBuildPipeline}
              className="flex h-8.5 cursor-pointer items-center gap-1.5 rounded-xl bg-slate-900 px-4 text-[12.5px] font-semibold whitespace-nowrap text-white shadow-xs transition-all hover:scale-[1.01] hover:bg-black"
            >
              <span>{t('overview.milestones.newPipeline', 'New Pipeline')}</span>
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

function OverviewAttention({ items }: { items: OverviewModel['attention'] }) {
  const { t } = useTranslation()
  if (items.length === 0) return null

  return (
    <section className="overview-attention" aria-labelledby="overview-attention-title">
      <h2 id="overview-attention-title" className="text-foreground text-[13px] font-semibold">
        {t('overview.attention.title')}
      </h2>
      <ul className="overview-attention__list">
        {items.map((item) => (
          <OverviewAttentionRow key={attentionKey(item)} item={item} />
        ))}
      </ul>
    </section>
  )
}

function attentionKey(item: OverviewModel['attention'][number]) {
  return item.kind === 'pipelineFailed' ? `pipeline-${item.pipelineId}` : `view-${item.viewId}`
}

function OverviewAttentionRow({ item }: { item: OverviewModel['attention'][number] }) {
  const { t } = useTranslation()
  if (item.kind === 'pipelineFailed') {
    return (
      <li className="overview-attention__item">
        <span
          className="overview-attention__dot overview-attention__dot--error"
          aria-hidden="true"
        />
        <span className="overview-attention__kind">{t('overview.attention.pipelineFailed')}</span>
        <span className="text-foreground font-medium">{item.pipelineId}</span>
        {item.code && <code className="text-muted-foreground text-[12px]">{item.code}</code>}
        <Link
          to="/pipelines/$pipelineId/edit/monitoring"
          params={{ pipelineId: item.pipelineId }}
          className="overview-link overview-attention__open"
        >
          {t('overview.attention.openPipeline')}
        </Link>
      </li>
    )
  }

  const minutes =
    item.lastAppliedAt === null
      ? null
      : Math.max(0, Math.floor((Date.now() - item.lastAppliedAt) / 60000))
  return (
    <li className="overview-attention__item">
      <span
        className="overview-attention__dot overview-attention__dot--warning"
        aria-hidden="true"
      />
      <span className="overview-attention__kind">{t('overview.attention.viewStale')}</span>
      <span className="text-foreground font-medium">{item.collection}</span>
      <span className="text-muted-foreground">
        {[
          minutes === null
            ? t('overview.attention.neverApplied')
            : t('overview.attention.lastApplied', { count: minutes }),
          t(`overview.attention.pipelineIs.${item.pipelineHealth ?? 'unknown'}`, {
            pipeline: item.pipelineId,
          }),
        ].join('; ')}
      </span>
      <Link
        to="/views/$viewId"
        params={{ viewId: item.viewId }}
        className="overview-link overview-attention__open"
      >
        {t('overview.attention.openView')}
      </Link>
    </li>
  )
}
