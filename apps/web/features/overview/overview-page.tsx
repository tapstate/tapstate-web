import type { ReactNode } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowDown, ArrowRight, CheckCircle2, Database, GitMerge, HardDrive } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { listPipelines } from '@/service/pipelines/pipeline-client'
import { addSampleSources, loadSampleSources } from '@/service/sample-source-client'
import { listSources, type SourceView } from '@/service/source-client'
import { listViews } from '@/service/view-client'
import { useAuthStore } from '@/stores/auth-store'

import { AddSourcesDialog } from './components/add-sources-dialog'
import { OverviewBlock } from './components/overview-block'
import { SetupCallout } from './components/setup-callout'
import {
  buildOverview,
  SETUP_STEP_ORDER,
  type OverviewAttentionItem,
  type OverviewModel,
  type SetupStepId,
} from './overview-model'

/** The new-source form, supplied by the route so this feature does not reach into Data Sources. */
export type SourceFormSlot = (props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (source: SourceView) => void
}) => ReactNode

interface OverviewPageProps {
  sourceForm?: SourceFormSlot
}

/** Remembers, per browser, that the one-time "Setup complete" note has been shown. */
const SETUP_COMPLETE_SEEN_KEY = 'tapstate.overview.setupCompleteSeen'

function readSeen(): boolean {
  try {
    return window.localStorage.getItem(SETUP_COMPLETE_SEEN_KEY) === '1'
  } catch {
    return false
  }
}

function writeSeen() {
  try {
    window.localStorage.setItem(SETUP_COMPLETE_SEEN_KEY, '1')
  } catch {
    // Storage can be unavailable (private windows); the note then shows again next visit.
  }
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
  const [hintsHidden, setHintsHidden] = useState(false)
  const [deferred, setDeferred] = useState<SetupStepId[]>([])
  const [addSourcesOpen, setAddSourcesOpen] = useState(false)
  const [sourceFormOpen, setSourceFormOpen] = useState(false)
  const [completeNote, setCompleteNote] = useState<'unknown' | 'show' | 'hidden'>('unknown')

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
  const setupDone = overview !== null && overview.setup.next === null

  useEffect(() => {
    if (!setupDone || completeNote !== 'unknown') return
    if (readSeen()) {
      setCompleteNote('hidden')
    } else {
      writeSeen()
      setCompleteNote('show')
    }
  }, [setupDone, completeNote])

  return (
    <section className="overview-page">
      <header className="overview-page__header">
        <div className="flex min-w-0 flex-col">
          <h1 className="text-foreground text-[15px] font-semibold">{t('overview.title')}</h1>
          <p className="text-muted-foreground truncate text-[12px]">{t('overview.subtitle')}</p>
        </div>
        {overview && overview.setup.next !== null && (
          <div className="flex items-center gap-2">
            <span className="overview-page__chip">
              {t('overview.setup.progress', { completed: overview.setup.completed, total: 3 })}
              <span className="overview-page__chip-bar" aria-hidden="true">
                <span style={{ width: `${(overview.setup.completed / 3) * 100}%` }} />
              </span>
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setHintsHidden((hidden) => !hidden)}
            >
              {hintsHidden ? t('overview.setup.showHints') : t('overview.setup.hideHints')}
            </Button>
          </div>
        )}
      </header>

      <div className="overview-page__body">
        {completeNote === 'show' && (
          <div className="overview-complete" role="status">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <p className="min-w-0 flex-1">
              <span className="font-semibold">{t('overview.setup.complete.title')}</span>{' '}
              {t('overview.setup.complete.body')}
            </p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setCompleteNote('hidden')}
            >
              {t('overview.setup.complete.close')}
            </Button>
          </div>
        )}
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
            guidance={!hintsHidden && overview.setup.next !== null}
            current={nextStep(overview, deferred)}
            onDefer={(step) => setDeferred((steps) => [...steps, step])}
            onAddSources={() => setAddSourcesOpen(true)}
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

/** The step to point at: the first undone step the user has not put off for now. */
function nextStep(overview: OverviewModel, deferred: SetupStepId[]): SetupStepId | null {
  return (
    SETUP_STEP_ORDER.find((step) => !overview.setup.done[step] && !deferred.includes(step)) ?? null
  )
}

interface OverviewContentProps {
  overview: OverviewModel
  guidance: boolean
  current: SetupStepId | null
  onDefer: (step: SetupStepId) => void
  onAddSources: () => void
}

function OverviewContent({
  overview,
  guidance,
  current,
  onDefer,
  onAddSources,
}: OverviewContentProps) {
  const { t } = useTranslation()
  const stepNumber = (step: SetupStepId) => (guidance ? SETUP_STEP_ORDER.indexOf(step) + 1 : null)
  const isCurrent = (step: SetupStepId) => guidance && current === step
  const flowing = overview.pipelines.running > 0
  const arrow = (
    <div className={cn('overview-arrow', !flowing && 'overview-arrow--idle')} aria-hidden="true">
      <ArrowRight className="overview-arrow__wide h-4 w-4" />
      <ArrowDown className="overview-arrow__narrow h-4 w-4" />
    </div>
  )
  const storeViews = overview.stateStore.views

  return (
    <>
      <div className="overview-flow">
        <OverviewBlock
          title={t('overview.sources.title')}
          icon={Database}
          metric={
            overview.sources.count === 0
              ? t('overview.sources.none')
              : t('overview.sources.metric', { count: overview.sources.count })
          }
          details={[
            ...overview.sources.preview.map((source) => ({
              label: source.connector,
              value: source.id,
            })),
            ...(overview.sources.count > overview.sources.preview.length
              ? [
                  {
                    label: t('overview.sources.more', {
                      count: overview.sources.count - overview.sources.preview.length,
                    }),
                    value: '',
                  },
                ]
              : []),
          ]}
          emptyAction={
            overview.sources.count === 0 && (
              <Button type="button" size="sm" variant="outline" onClick={onAddSources}>
                {t('overview.sources.add')}
              </Button>
            )
          }
          footer={
            <Link to="/sources" className="overview-link">
              {t('overview.sources.open')}
            </Link>
          }
          step={stepNumber('sources')}
          stepDone={overview.setup.done.sources}
          current={isCurrent('sources')}
          problems={0}
          problemTone="warning"
          callout={
            isCurrent('sources') && (
              <SetupCallout
                step={2}
                title={t('overview.setup.sources.title')}
                actions={
                  <Button type="button" size="sm" variant="secondary" onClick={onAddSources}>
                    {t('overview.setup.sources.action')}
                  </Button>
                }
              />
            )
          }
        />
        {arrow}
        <OverviewBlock
          title={t('overview.pipelines.title')}
          icon={GitMerge}
          metric={
            overview.pipelines.total === 0
              ? t('overview.pipelines.none')
              : t('overview.pipelines.metric', { count: overview.pipelines.total })
          }
          details={[
            { label: t('overview.pipelines.running'), value: overview.pipelines.running },
            {
              label: t('overview.pipelines.idle'),
              value: t('overview.pipelines.idleValue', { count: overview.pipelines.idle }),
            },
            { label: t('overview.pipelines.error'), value: overview.pipelines.error },
          ]}
          emptyAction={
            overview.pipelines.total === 0 && (
              <Button asChild nativeButton={false} size="sm" variant="outline">
                <Link to="/pipelines">{t('overview.pipelines.build')}</Link>
              </Button>
            )
          }
          footer={
            <Link to="/pipelines" className="overview-link">
              {t('overview.pipelines.open')}
            </Link>
          }
          step={stepNumber('pipeline')}
          stepDone={overview.setup.done.pipeline}
          current={isCurrent('pipeline')}
          problems={overview.pipelines.error}
          problemTone="destructive"
          callout={
            isCurrent('pipeline') && (
              <SetupCallout
                step={3}
                title={t('overview.setup.pipeline.title')}
                actions={
                  <>
                    <Button asChild nativeButton={false} size="sm" variant="secondary">
                      <Link to="/pipelines">{t('overview.setup.pipeline.action')}</Link>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="overview-callout__skip"
                      onClick={() => onDefer('pipeline')}
                    >
                      {t('overview.setup.later')}
                    </Button>
                  </>
                }
              />
            )
          }
        />
        {arrow}
        <OverviewBlock
          title={t('overview.stateStore.title')}
          icon={HardDrive}
          metric={
            !overview.stateStore.ready
              ? t('overview.stateStore.missing')
              : storeViews
                ? t('overview.stateStore.metric', { count: storeViews.total })
                : t('overview.stateStore.ready')
          }
          details={[
            {
              label: t('overview.stateStore.location'),
              value: (
                <Link to="/settings" className="overview-link">
                  {t('overview.stateStore.managed')}
                </Link>
              ),
            },
            ...(storeViews
              ? [
                  { label: t('overview.stateStore.fresh'), value: storeViews.fresh },
                  { label: t('overview.stateStore.stale'), value: storeViews.stale },
                ]
              : [{ label: t('overview.stateStore.views'), value: t('overview.notReported') }]),
          ]}
          emptyAction={
            !overview.stateStore.ready && (
              <p className="text-muted-foreground text-[12px]">
                {t('overview.stateStore.missingDetail')}
              </p>
            )
          }
          footer={
            <span className="flex flex-wrap gap-x-3">
              <Link to="/views" className="overview-link">
                {t('overview.stateStore.openViews')}
              </Link>
              <Link to="/settings" className="overview-link">
                {t('overview.stateStore.open')}
              </Link>
            </span>
          }
          step={stepNumber('stateStore')}
          stepDone={overview.setup.done.stateStore}
          current={isCurrent('stateStore')}
          problems={storeViews?.stale ?? 0}
          problemTone="warning"
          callout={
            isCurrent('stateStore') && (
              <SetupCallout
                step={1}
                title={t('overview.setup.stateStore.title')}
                description={t('overview.setup.stateStore.description')}
                actions={null}
              />
            )
          }
        />
      </div>

      <section className="overview-attention" aria-labelledby="overview-attention-title">
        <h2 id="overview-attention-title" className="text-foreground text-[13px] font-semibold">
          {t('overview.attention.title')}
        </h2>
        {overview.attention.length === 0 ? (
          <p className="text-muted-foreground text-[13px]">{t('overview.attention.clear')}</p>
        ) : (
          <ul className="overview-attention__list">
            {overview.attention.map((item) => (
              <AttentionRow key={attentionKey(item)} item={item} />
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

function attentionKey(item: OverviewAttentionItem) {
  return item.kind === 'pipelineFailed' ? `pipeline-${item.pipelineId}` : `view-${item.viewId}`
}

function AttentionRow({ item }: { item: OverviewAttentionItem }) {
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
