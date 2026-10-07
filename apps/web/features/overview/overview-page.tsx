import type { ReactNode } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { PipelineCreationDialog } from '@/features/pipelines/components/create/pipeline-creation-dialog'
import { listPipelines } from '@/service/pipelines/pipeline-client'
import { addSampleSources, loadSampleSources } from '@/service/sample-source-client'
import {
  listConnectors,
  listSources,
  type ConnectorSummary,
  type SourceView,
} from '@/service/source-client'
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
  const connectorsQuery = useQuery({
    queryKey: ['connectors'],
    queryFn: () => listConnectors(apiFetch),
    staleTime: Infinity,
  })
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
      <header className="overview-page__header">
        <div className="flex min-w-0 flex-col">
          <h1 className="text-foreground text-[15px] font-semibold">{t('overview.title')}</h1>
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
            connectors={connectorsQuery.data ?? []}
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
  connectors: ConnectorSummary[]
  onAddSources: () => void
  onBuildPipeline: () => void
}

function OverviewContent({
  overview,
  connectors,
  onAddSources,
  onBuildPipeline,
}: OverviewContentProps) {
  return (
    <>
      <OverviewTopology
        overview={overview}
        connectors={connectors}
        onAddSources={onAddSources}
        onBuildPipeline={onBuildPipeline}
      />
      <OverviewMilestoneDock
        overview={overview}
        onAddSources={onAddSources}
        onBuildPipeline={onBuildPipeline}
      />
      <OverviewAttention items={overview.attention} />
    </>
  )
}

function OverviewMilestoneDock({
  overview,
  onAddSources,
  onBuildPipeline,
}: {
  overview: OverviewModel
  onAddSources: () => void
  onBuildPipeline: () => void
}) {
  const { t } = useTranslation()
  const current = overview.setup.next ?? 'pipeline'
  const milestones = [
    {
      id: 'stateStore',
      done: overview.setup.done.stateStore,
      title: t('overview.milestones.stateStore'),
    },
    {
      id: 'sources',
      done: overview.setup.done.sources,
      title: t('overview.milestones.sources'),
    },
    {
      id: 'pipeline',
      done: overview.setup.done.pipeline,
      title: t('overview.milestones.pipeline'),
    },
  ]
  const actionLabel =
    overview.setup.next === 'stateStore'
      ? t('overview.milestones.configure')
      : overview.setup.next === 'sources'
        ? t('overview.milestones.addSources')
        : overview.setup.next === 'pipeline'
          ? t('overview.milestones.build')
          : t('overview.milestones.newPipeline')
  const runCurrentAction = () => {
    if (current === 'sources') onAddSources()
    else if (current === 'pipeline') onBuildPipeline()
  }

  return (
    <section className="overview-milestones" aria-label={t('overview.milestones.title')}>
      <div className="overview-milestones__surface">
        <ol className="overview-milestones__list">
          {milestones.map((milestone, index) => (
            <li
              key={milestone.id}
              className="overview-milestones__item"
              data-complete={milestone.done}
              data-current={!milestone.done && overview.setup.next === milestone.id}
            >
              {milestone.id === 'stateStore' ? (
                <Link
                  to="/settings"
                  className="overview-milestones__step-link"
                  aria-current={current === milestone.id ? 'step' : undefined}
                >
                  <span className="overview-milestones__step" aria-hidden="true">
                    {milestone.done ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                  </span>
                  <span>{milestone.title}</span>
                </Link>
              ) : (
                <button
                  type="button"
                  className="overview-milestones__step-link"
                  aria-current={current === milestone.id ? 'step' : undefined}
                  onClick={milestone.id === 'sources' ? onAddSources : onBuildPipeline}
                >
                  <span className="overview-milestones__step" aria-hidden="true">
                    {milestone.done ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                  </span>
                  <span>{milestone.title}</span>
                </button>
              )}
            </li>
          ))}
        </ol>
        <div className="overview-milestones__action">
          {current === 'stateStore' ? (
            <Button asChild nativeButton={false} size="sm">
              <Link to="/settings">
                {actionLabel}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={runCurrentAction}>
              {actionLabel}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
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
