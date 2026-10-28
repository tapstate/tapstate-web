import type { ReactNode } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { DataSourceMeta } from '@/features/pipelines/components/reference-wizard/ReferenceWizardBuilder'

import { Button } from '@/components/ui/button'
import { HealthSummary } from '@/features/alerts/alert-shared'
import { PipelineCreationDialog } from '@/features/pipelines/components/create/pipeline-creation-dialog'
import {
  createCustomer360Wizard,
  findCustomer360Preset,
} from '@/features/pipelines/model/customer-360-guide'
import { sourceScopedTableNames } from '@/features/pipelines/model/source-table-scope'
import { SampleSourcesDialog } from '@/features/sources/sample-sources-dialog'
import { cn } from '@/lib/utils'
import {
  createPipelineDraft,
  listPipelines,
  type PipelineJsonObject,
} from '@/service/pipelines/pipeline-client'
import { isSampleSource, loadSampleSources } from '@/service/sample-source-client'
import {
  discoverSourceSchema,
  getSourceSchema,
  listConnectors,
  listSources,
  type ConnectorSummary,
  type SourceView,
} from '@/service/source-client'
import { listViews } from '@/service/view-client'
import { useAuthStore } from '@/stores/auth-store'
import { getDeploymentProfile } from '@/utils/deployment-profile'

import { AddSourcesDialog } from './components/add-sources-dialog'
import { OverviewTopology } from './components/overview-topology'
import { buildOverview, type OverviewModel } from './overview-model'

/** The new-source form, supplied by the route so this feature does not reach into Data Sources. */
export type SourceFormSlot = (props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (source: SourceView) => void
  initialConnectorId?: string | null
}) => ReactNode

interface OverviewPageProps {
  sourceForm?: SourceFormSlot
}

export function OverviewPage({ sourceForm }: OverviewPageProps = {}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const apiFetch = useAuthStore((state) => state.apiFetch)
  function discoverCreatedSource(source: SourceView) {
    void discoverSourceSchema(
      { id: source.id, connectorId: source.connector, settings: source.config },
      apiFetch,
    ).then(
      (report) => queryClient.setQueryData(['source-schema', source.id], report),
      () => {
        /* Data Sources offers a retry if discovery fails. */
      },
    )
  }
  // Same keys as the Data Sources, Pipelines and Views pages, so they share one cache.
  const sourcesQuery = useQuery({ queryKey: ['sources'], queryFn: () => listSources(apiFetch) })
  const connectorsQuery = useQuery({
    queryKey: ['connectors'],
    queryFn: () => listConnectors(apiFetch),
  })
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
  // The server exposes only non-secret sample metadata when sample credentials are configured.
  const samplesQuery = useQuery({
    queryKey: ['sample-sources'],
    queryFn: () => loadSampleSources(apiFetch),
    staleTime: Infinity,
  })
  const [addSourcesOpen, setAddSourcesOpen] = useState(false)
  const [sampleDialogOpen, setSampleDialogOpen] = useState(false)
  const [sourceFormOpen, setSourceFormOpen] = useState(false)
  const [sourceConnectorId, setSourceConnectorId] = useState<string | null>(null)
  const returnToAddSources = useRef(false)
  const [pipelineCreationOpen, setPipelineCreationOpen] = useState(false)
  const [pipelineCreationError, setPipelineCreationError] = useState<string | null>(null)
  const [pipelineCreating, setPipelineCreating] = useState(false)

  async function openGuidedBuilder(preferredSourceId?: string) {
    if (pipelineCreating) return
    setPipelineCreating(true)
    setPipelineCreationError(null)
    try {
      const freshSources = preferredSourceId
        ? await listSources(apiFetch)
        : (sourcesQuery.data ?? [])
      const samples = freshSources.filter(
        (source) =>
          isSampleSource(source) && (!preferredSourceId || source.id === preferredSourceId),
      )
      const storeId = overview?.stateStore.managedSourceId
      if (samples.length === 0) return
      if (!storeId) throw new Error('Connect MongoDB Atlas before building the sample view.')
      const catalogs = await Promise.all(
        samples.map(async (source): Promise<DataSourceMeta> => {
          const schema = await getSourceSchema(source.id, apiFetch)
          const names = sourceScopedTableNames(
            source,
            schema.tables.map((table) => table.name),
          )
          return {
            id: source.id,
            name: source.id,
            badge: source.connector,
            connector: source.connector,
            tables: names.map((name) => {
              const table = schema.tables.find((item) => item.name === name)
              return {
                name,
                primaryKey: table?.primaryKey[0] ?? '',
                keys: table?.primaryKey ?? [],
                discovered: Boolean(table),
                rowCount: '—',
                columns: table?.fields.map((field) => field.name) ?? [],
              }
            }),
          }
        }),
      )
      const preset = findCustomer360Preset(catalogs)
      if (!preset) throw new Error('The sample order, customer, or line item schema is missing.')
      const wizard: PipelineJsonObject = createCustomer360Wizard(preset, storeId, 'upsert', 'cloud')
      const pipelineId = `order_360_${crypto.randomUUID().slice(0, 8)}`
      await createPipelineDraft(
        pipelineId,
        {
          pipelineId,
          mode: 'wizard',
          name: 'Order 360 demo',
          description: null,
          graph: null,
          wizard,
          baseArtifactHash: null,
        },
        apiFetch,
      )
      await queryClient.invalidateQueries({ queryKey: ['pipelines'] })
      await navigate({ to: '/pipelines/$pipelineId/edit', params: { pipelineId } })
    } catch (error) {
      setPipelineCreationError(
        error instanceof Error ? error.message : t('pipelines.workspace.actions.saveFailed'),
      )
    } finally {
      setPipelineCreating(false)
    }
  }

  // The view list only adds detail; when it fails or is missing, the overview still shows.
  const views = viewsQuery.data ?? null
  const overview = useMemo(
    () =>
      sourcesQuery.data && pipelinesQuery.data
        ? buildOverview(sourcesQuery.data, pipelinesQuery.data, views, getDeploymentProfile())
        : null,
    [sourcesQuery.data, pipelinesQuery.data, views],
  )
  const cloud = getDeploymentProfile() === 'cloud'
  const hasInstalledSample = (sourcesQuery.data ?? []).some(isSampleSource)
  const guidedPipeline = pipelinesQuery.data?.find((pipeline) =>
    /^(?:customer|order)_360_[0-9a-f]{8}$/i.test(pipeline.id),
  )
  const guideAvailable = cloud && hasInstalledSample
  const failed = sourcesQuery.isError || pipelinesQuery.isError
  useEffect(() => {
    if (!overview || pipelineCreating) return
    const demo = window.sessionStorage.getItem('tapstate.sample.next-demo')
    if (demo && (sourcesQuery.data ?? []).some((source) => source.id === demo)) {
      window.sessionStorage.removeItem('tapstate.sample.next-demo')
      void openGuidedBuilder(demo)
    }
    if (window.sessionStorage.getItem('tapstate.sample.next-build')) {
      window.sessionStorage.removeItem('tapstate.sample.next-build')
      setPipelineCreationOpen(true)
    }
  }, [overview, pipelineCreating, sourcesQuery.data])
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
            connectors={connectorsQuery.data ?? []}
            sampleAvailable={Boolean(
              samplesQuery.data?.some(
                (sample) => !(sourcesQuery.data ?? []).some((source) => source.id === sample.id),
              ),
            )}
            sampleAdding={false}
            guideAvailable={guideAvailable}
            onConnectAtlas={() => {
              if (getDeploymentProfile() === 'cloud' && !overview.stateStore.ready)
                void navigate({ to: '/settings' })
              else window.location.assign('/settings')
            }}
            onAddSources={() => {
              if (getDeploymentProfile() === 'cloud' && !overview.stateStore.ready)
                void navigate({ to: '/settings' })
              else setAddSourcesOpen(true)
            }}
            onConnectSource={(connectorId) => {
              if (getDeploymentProfile() === 'cloud' && !overview.stateStore.ready) {
                void navigate({ to: '/settings' })
              } else if (sourceForm) {
                setSourceConnectorId(connectorId)
                returnToAddSources.current = false
                setSourceFormOpen(true)
              } else {
                setAddSourcesOpen(true)
              }
            }}
            onTrySample={() => {
              if (getDeploymentProfile() === 'cloud' && !overview.stateStore.ready)
                void navigate({ to: '/settings' })
              else setSampleDialogOpen(true)
            }}
            onBuildPipeline={() => {
              if (getDeploymentProfile() === 'cloud' && !overview.stateStore.ready)
                void navigate({ to: '/settings' })
              else if (!overview.setup.done.sources) setAddSourcesOpen(true)
              else if (guideAvailable && guidedPipeline)
                void navigate({
                  to: '/pipelines/$pipelineId/edit',
                  params: { pipelineId: guidedPipeline.id },
                })
              else if (guideAvailable) setSampleDialogOpen(true)
              else setPipelineCreationOpen(true)
            }}
            onCreatePipeline={() => setPipelineCreationOpen(true)}
          />
        )}
        {pipelineCreationError && (
          <p className="overview-page__create-error" role="alert">
            {pipelineCreationError}
          </p>
        )}
      </div>

      <AddSourcesDialog
        open={addSourcesOpen}
        onOpenChange={setAddSourcesOpen}
        sources={overview?.sources.all ?? []}
        connectors={connectorsQuery.data ?? []}
        sample={
          samplesQuery.data
            ? {
                names: samplesQuery.data
                  .filter((sample) => sample.available !== false)
                  .map((sample) => sample.name),
                added: samplesQuery.data
                  .filter((sample) => sample.available !== false)
                  .every((sample) =>
                    (sourcesQuery.data ?? []).some((source) => source.id === sample.id),
                  ),
                adding: false,
                error: null,
                onAdd: () => {
                  setAddSourcesOpen(false)
                  setSampleDialogOpen(true)
                },
              }
            : null
        }
        onConnect={(connectorId) => {
          setSourceConnectorId(connectorId)
          returnToAddSources.current = true
          setAddSourcesOpen(false)
          setSourceFormOpen(true)
        }}
      />
      <SampleSourcesDialog
        open={sampleDialogOpen}
        onOpenChange={setSampleDialogOpen}
        samples={samplesQuery.data ?? []}
        installedIds={(sourcesQuery.data ?? []).filter(isSampleSource).map((source) => source.id)}
        onDemo={(sourceId) => {
          setSampleDialogOpen(false)
          void openGuidedBuilder(sourceId)
        }}
        onBuild={() => {
          setSampleDialogOpen(false)
          setPipelineCreationOpen(true)
        }}
        onConnectOwn={() => {
          setSampleDialogOpen(false)
          setAddSourcesOpen(true)
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
        initialConnectorId: sourceConnectorId,
        onOpenChange: (open) => {
          setSourceFormOpen(open)
          // Reopen the source picker when the user cancels source creation.
          if (!open) {
            if (returnToAddSources.current) setAddSourcesOpen(true)
            returnToAddSources.current = false
          }
        },
        onCreated: (created) => {
          // A successful connection advances Overview to the next setup step.
          returnToAddSources.current = false
          queryClient.setQueryData<SourceView[]>(['sources'], (current) =>
            [...(current ?? []).filter((item) => item.id !== created.id), created].sort(
              (left, right) => left.id.localeCompare(right.id),
            ),
          )
          discoverCreatedSource(created)
        },
      })}
    </section>
  )
}

interface OverviewContentProps {
  overview: OverviewModel
  connectors: ConnectorSummary[]
  sampleAvailable: boolean
  sampleAdding: boolean
  guideAvailable: boolean
  onConnectAtlas: () => void
  onAddSources: () => void
  onConnectSource: (connectorId: string) => void
  onTrySample: () => void
  onBuildPipeline: () => void
  onCreatePipeline: () => void
}

function OverviewContent({
  overview,
  connectors,
  sampleAvailable,
  sampleAdding,
  guideAvailable,
  onConnectAtlas,
  onAddSources,
  onConnectSource,
  onTrySample,
  onBuildPipeline,
  onCreatePipeline,
}: OverviewContentProps) {
  return (
    <>
      <HealthSummary />
      <OverviewTopology
        overview={overview}
        connectors={connectors}
        onConnectAtlas={onConnectAtlas}
        onAddSources={onAddSources}
        onConnectSource={onConnectSource}
        onBuildPipeline={onBuildPipeline}
      >
        <OverviewMilestoneDock
          overview={overview}
          sampleAvailable={sampleAvailable}
          sampleAdding={sampleAdding}
          guideAvailable={guideAvailable}
          onConnectAtlas={onConnectAtlas}
          onAddSources={onAddSources}
          onTrySample={onTrySample}
          onBuildPipeline={onBuildPipeline}
          onCreatePipeline={onCreatePipeline}
        />
      </OverviewTopology>
      <OverviewRuntimeMetrics overview={overview} />
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
  sampleAdding,
  guideAvailable,
  onConnectAtlas,
  onAddSources,
  onTrySample,
  onBuildPipeline,
  onCreatePipeline,
}: {
  overview: OverviewModel
  sampleAvailable: boolean
  sampleAdding: boolean
  guideAvailable: boolean
  onConnectAtlas: () => void
  onAddSources: () => void
  onTrySample: () => void
  onBuildPipeline: () => void
  onCreatePipeline: () => void
}) {
  const { t } = useTranslation()
  const storeDone = overview.setup.done.stateStore
  const sourcesDone = overview.setup.done.sources
  const pipelineDone = overview.setup.done.pipeline
  const cloud = getDeploymentProfile() === 'cloud'

  return (
    <section
      className="z-20 mx-auto mt-6 w-full max-w-5xl"
      aria-label={t('overview.milestones.title')}
    >
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white/95 px-5 py-3 shadow-[0_8px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-all xl:flex-row">
        <div className="flex min-w-0 flex-wrap items-center justify-center gap-x-2 gap-y-2 text-[12px] font-medium sm:gap-x-3 sm:text-[13px] xl:justify-start">
          <button
            type="button"
            onClick={onConnectAtlas}
            aria-current={!storeDone ? 'step' : undefined}
            className={cn(
              'flex cursor-pointer items-center gap-1.5 whitespace-nowrap transition-colors',
              storeDone
                ? 'font-semibold text-emerald-700'
                : 'font-semibold text-[var(--brand-primary)]',
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
            <span>
              {cloud
                ? t('overview.milestones.connectAtlas')
                : t('overview.milestones.stateStoreShort')}
            </span>
          </button>

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
                  ? 'font-semibold text-[var(--brand-primary)]'
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
                  ? 'font-semibold text-[var(--brand-primary)]'
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

        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {storeDone && !sourcesDone && sampleAvailable && (
            <button
              type="button"
              disabled={sampleAdding}
              onClick={onTrySample}
              className="flex cursor-pointer items-center gap-1 text-[11.5px] font-medium whitespace-nowrap text-[var(--brand-primary)] transition-colors hover:text-[var(--brand-hover)] hover:underline disabled:cursor-wait disabled:opacity-60"
            >
              <Sparkles className="h-3 w-3 text-[var(--brand-primary)]" aria-hidden="true" />
              <span>{t('overview.milestones.trySample', 'Try sample')}</span>
            </button>
          )}
          {!storeDone ? (
            <button
              type="button"
              onClick={onConnectAtlas}
              className="brand-primary-button flex h-8.5 cursor-pointer items-center gap-1.5 rounded-xl px-4 text-[12.5px] font-semibold whitespace-nowrap shadow-xs transition-all hover:scale-[1.01]"
            >
              <span>
                {cloud
                  ? t('overview.milestones.connectAtlas')
                  : t('overview.milestones.connectStateStore')}
              </span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : !sourcesDone ? (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onAddSources}
                className="brand-primary-button flex h-8.5 cursor-pointer items-center gap-1.5 rounded-xl px-3.5 text-[12.5px] font-semibold whitespace-nowrap shadow-xs transition-all hover:scale-[1.01]"
              >
                <span>{t('overview.milestones.sourcesShort', 'Add Databases')}</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ) : !pipelineDone ? (
            <button
              type="button"
              onClick={onBuildPipeline}
              className="brand-primary-button flex h-8.5 cursor-pointer items-center gap-1.5 rounded-xl px-4 text-[12.5px] font-semibold whitespace-nowrap shadow-xs transition-all hover:scale-[1.01]"
            >
              <span>{t('overview.milestones.build')}</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : (
            <>
              {guideAvailable && (
                <button
                  type="button"
                  onClick={onBuildPipeline}
                  className="brand-glass-control flex h-8.5 cursor-pointer items-center gap-1.5 rounded-xl px-3.5 text-[12.5px] font-semibold whitespace-nowrap transition-colors"
                >
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Order 360 demo</span>
                </button>
              )}
              <button
                type="button"
                onClick={onCreatePipeline}
                className="flex h-8.5 cursor-pointer items-center gap-1.5 rounded-xl bg-slate-900 px-4 text-[12.5px] font-semibold whitespace-nowrap text-white shadow-xs transition-all hover:scale-[1.01] hover:bg-black"
              >
                <span>{t('overview.milestones.newPipeline', 'New Pipeline')}</span>
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
