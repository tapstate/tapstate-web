import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { AlertTriangle, ArrowDown, ArrowRight, Database, GitMerge, HardDrive } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { listPipelines } from '@/service/pipelines/pipeline-client'
import { listSources } from '@/service/source-client'
import { useAuthStore } from '@/stores/auth-store'

import { OverviewBlock } from './components/overview-block'
import { SetupCallout } from './components/setup-callout'
import {
  buildOverview,
  SETUP_STEP_ORDER,
  type OverviewModel,
  type SetupStepId,
} from './overview-model'

export function OverviewPage() {
  const { t } = useTranslation()
  const apiFetch = useAuthStore((state) => state.apiFetch)
  // Same keys as the Data Sources and Pipelines pages, so the three share one cache.
  const sourcesQuery = useQuery({ queryKey: ['sources'], queryFn: () => listSources(apiFetch) })
  const pipelinesQuery = useQuery({
    queryKey: ['pipelines'],
    queryFn: () => listPipelines(apiFetch),
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  })
  const [hintsHidden, setHintsHidden] = useState(false)
  const [deferred, setDeferred] = useState<SetupStepId[]>([])

  const overview = useMemo(
    () =>
      sourcesQuery.data && pipelinesQuery.data
        ? buildOverview(sourcesQuery.data, pipelinesQuery.data)
        : null,
    [sourcesQuery.data, pipelinesQuery.data],
  )
  const failed = sourcesQuery.isError || pipelinesQuery.isError

  return (
    <section className="overview-page">
      <header className="overview-page__header">
        <h1 className="text-foreground text-[15px] font-semibold">{t('overview.title')}</h1>
        {overview && overview.setup.next !== null && (
          <div className="flex items-center gap-2">
            <span className="overview-page__chip">
              {t('overview.setup.progress', { completed: overview.setup.completed, total: 3 })}
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
          />
        )}
      </div>
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
}

function OverviewContent({ overview, guidance, current, onDefer }: OverviewContentProps) {
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

  return (
    <>
      <div className="overview-flow">
        <OverviewBlock
          title={t('overview.sources.title')}
          icon={Database}
          metric={t('overview.sources.metric', { count: overview.sources.count })}
          details={
            overview.sources.preview.length > 0
              ? [
                  ...overview.sources.preview.map((source) => ({
                    label: source.id,
                    value: source.connector,
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
                ]
              : [{ label: t('overview.sources.none'), value: '' }]
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
                description={t('overview.setup.sources.description')}
                actions={
                  <Button asChild nativeButton={false} size="sm" variant="secondary">
                    <Link to="/sources" search={{ create: true }}>
                      {t('overview.setup.sources.action')}
                    </Link>
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
          metric={t('overview.pipelines.metric', { count: overview.pipelines.total })}
          details={[
            { label: t('overview.pipelines.running'), value: overview.pipelines.running },
            { label: t('overview.pipelines.idle'), value: overview.pipelines.idle },
            { label: t('overview.pipelines.error'), value: overview.pipelines.error },
          ]}
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
                description={t('overview.setup.pipeline.description')}
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
            overview.stateStore.ready
              ? t('overview.stateStore.ready')
              : t('overview.stateStore.missing')
          }
          details={[
            {
              label: t('overview.stateStore.location'),
              value: overview.stateStore.managedSourceId ? t('overview.stateStore.managed') : '—',
            },
            { label: t('overview.stateStore.views'), value: t('overview.notReported') },
          ]}
          footer={
            <Link to="/settings" className="overview-link">
              {t('overview.stateStore.open')}
            </Link>
          }
          step={stepNumber('stateStore')}
          stepDone={overview.setup.done.stateStore}
          current={isCurrent('stateStore')}
          problems={0}
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
              <li key={`${item.kind}-${item.pipelineId}`} className="overview-attention__item">
                <AlertTriangle className="text-destructive h-4 w-4 shrink-0" aria-hidden="true" />
                <Link
                  to="/pipelines/$pipelineId/edit/monitoring"
                  params={{ pipelineId: item.pipelineId }}
                  className="overview-link"
                >
                  {t('overview.attention.pipelineFailed', { pipeline: item.pipelineId })}
                </Link>
                {item.code && (
                  <code className="text-muted-foreground text-[12px]">{item.code}</code>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
