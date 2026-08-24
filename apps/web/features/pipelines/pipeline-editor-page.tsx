import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  Activity,
  Braces,
  ChevronLeft,
  CirclePlus,
  Database,
  Gauge,
  LibraryBig,
  PanelsTopLeft,
  Radio,
  ScrollText,
  Sparkles,
  Workflow,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'
import {
  getPipeline,
  getPipelineLayout,
  getPipelineLogs,
  getPipelineMetrics,
  getPipelineStatus,
  savePipelineLayout,
  PipelineClientError,
  type PipelineDag,
  type PipelineLayout,
} from '@/service/pipeline-client'
import { useAuthStore } from '@/stores/auth-store'

import { PipelineCanvas, type PipelineCanvasSelection } from './pipeline-canvas'

type WorkspacePanel = 'node' | 'runtime' | 'metrics' | 'logs' | 'api'

const paletteItems = [
  {
    id: 'source',
    labelKey: 'pipelines.workspace.nodeLibrary.source',
    descriptionKey: 'pipelines.workspace.nodeLibrary.sourceDescription',
    icon: Database,
    tone: 'text-sky-700 bg-sky-50',
  },
  {
    id: 'transform',
    labelKey: 'pipelines.workspace.nodeLibrary.transform',
    descriptionKey: 'pipelines.workspace.nodeLibrary.transformDescription',
    icon: Workflow,
    tone: 'text-slate-700 bg-slate-100',
  },
  {
    id: 'view',
    labelKey: 'pipelines.workspace.nodeLibrary.view',
    descriptionKey: 'pipelines.workspace.nodeLibrary.viewDescription',
    icon: PanelsTopLeft,
    tone: 'text-violet-700 bg-violet-50',
  },
  {
    id: 'serve',
    labelKey: 'pipelines.workspace.nodeLibrary.serve',
    descriptionKey: 'pipelines.workspace.nodeLibrary.serveDescription',
    icon: Sparkles,
    tone: 'text-emerald-700 bg-emerald-50',
  },
]

const workspaceTabs = [
  { id: 'runtime', labelKey: 'pipelines.workspace.tabs.runtime', icon: Activity },
  { id: 'metrics', labelKey: 'pipelines.workspace.tabs.metrics', icon: Gauge },
  { id: 'logs', labelKey: 'pipelines.workspace.tabs.logs', icon: ScrollText },
  { id: 'api', labelKey: 'pipelines.workspace.tabs.api', icon: Braces },
] as const

function isObservationPanel(panel: WorkspacePanel) {
  return panel === 'runtime' || panel === 'metrics' || panel === 'logs'
}

function panelTitle(panel: WorkspacePanel, selection: PipelineCanvasSelection | null) {
  if (panel === 'node') return selection?.label ?? 'pipelines.workspace.inspector.emptyTitle'
  return `pipelines.workspace.tabs.${panel}`
}

function QueryIssue({ unavailable, onRetry }: { unavailable: boolean; onRetry: () => void }) {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-36 flex-col items-start justify-center gap-2 px-4 py-5">
      <p className="text-[13px] font-semibold text-slate-800">
        {t(
          unavailable
            ? 'pipelines.workspace.runtime.unavailableTitle'
            : 'pipelines.workspace.runtime.errorTitle',
        )}
      </p>
      <p className="max-w-[30ch] text-[12px] leading-5 text-slate-500">
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
    <div className="flex min-h-36 items-center px-4 py-5 text-[12px] text-slate-500">
      {t('pipelines.workspace.runtime.loading')}
    </div>
  )
}

function NodeInspector({ selection }: { selection: PipelineCanvasSelection | null }) {
  const { t } = useTranslation()

  if (!selection) {
    return (
      <div className="flex min-h-36 items-center px-4 py-5 text-[12px] leading-5 text-slate-500">
        {t('pipelines.workspace.inspector.emptyBody')}
      </div>
    )
  }

  return (
    <dl className="divide-y divide-slate-100">
      <div className="grid grid-cols-[6.5rem_1fr] gap-3 px-4 py-3">
        <dt className="text-[11px] font-medium text-slate-400">
          {t('pipelines.workspace.inspector.type')}
        </dt>
        <dd className="min-w-0 truncate text-[12px] font-medium text-slate-700">
          {selection.nodeType}
        </dd>
      </div>
      <div className="grid grid-cols-[6.5rem_1fr] gap-3 px-4 py-3">
        <dt className="text-[11px] font-medium text-slate-400">
          {t('pipelines.workspace.inspector.identifier')}
        </dt>
        <dd className="min-w-0 truncate font-mono text-[11px] text-slate-600">{selection.id}</dd>
      </div>
      <div className="grid grid-cols-[6.5rem_1fr] gap-3 px-4 py-3">
        <dt className="text-[11px] font-medium text-slate-400">
          {t('pipelines.workspace.inspector.detail')}
        </dt>
        <dd className="min-w-0 text-[12px] leading-5 break-words text-slate-600">
          {selection.detail ?? t('pipelines.workspace.inspector.noDetail')}
        </dd>
      </div>
    </dl>
  )
}

function RuntimePanel({
  pipelineId,
  panel,
  dag,
}: {
  pipelineId: string
  panel: WorkspacePanel
  dag: PipelineDag
}) {
  const { i18n, t } = useTranslation()
  const apiFetch = useAuthStore((state) => state.apiFetch)
  const runtime = useQuery({
    queryKey: ['pipelines', pipelineId, 'status'],
    queryFn: () => getPipelineStatus(pipelineId, apiFetch),
    enabled: panel === 'runtime',
    refetchInterval: panel === 'runtime' ? 5_000 : false,
    retry: false,
  })
  const metrics = useQuery({
    queryKey: ['pipelines', pipelineId, 'metrics'],
    queryFn: () => getPipelineMetrics(pipelineId, apiFetch),
    enabled: panel === 'metrics',
    refetchInterval: panel === 'metrics' ? 5_000 : false,
    retry: false,
  })
  const logs = useQuery({
    queryKey: ['pipelines', pipelineId, 'logs'],
    queryFn: () => getPipelineLogs(pipelineId, apiFetch),
    enabled: panel === 'logs',
    refetchInterval: panel === 'logs' ? 5_000 : false,
    retry: false,
  })

  if (panel === 'runtime') {
    if (runtime.isLoading) return <LoadingPanel />
    if (runtime.isError) {
      return (
        <QueryIssue
          unavailable={runtime.error instanceof PipelineClientError && runtime.error.status === 404}
          onRetry={() => void runtime.refetch()}
        />
      )
    }
    if (!runtime.data) return null

    return (
      <div className="divide-y divide-slate-100">
        <div className="flex items-center justify-between gap-3 px-4 py-3.5">
          <span className="text-[12px] text-slate-500">
            {t('pipelines.workspace.runtime.state')}
          </span>
          <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
            {t(`pipelines.workspace.runtime.states.${runtime.data.state}`)}
          </span>
        </div>
        {runtime.data.failure && (
          <div className="px-4 py-3.5">
            <p className="text-[11px] font-semibold text-rose-700">{runtime.data.failure.code}</p>
            <p className="mt-1 text-[12px] leading-5 text-slate-600">
              {runtime.data.failure.message}
            </p>
          </div>
        )}
      </div>
    )
  }

  if (panel === 'metrics') {
    if (metrics.isLoading) return <LoadingPanel />
    if (metrics.isError) {
      return (
        <QueryIssue
          unavailable={metrics.error instanceof PipelineClientError && metrics.error.status === 404}
          onRetry={() => void metrics.refetch()}
        />
      )
    }
    if (!metrics.data) return null

    const metricEntries = Object.entries(metrics.data.metrics)
    const offsetEntries = Object.entries(metrics.data.perTableOffset ?? {})
    return (
      <div className="divide-y divide-slate-100">
        {metricEntries.length === 0 && (
          <p className="px-4 py-5 text-[12px] leading-5 text-slate-500">
            {t('pipelines.workspace.runtime.emptyMetrics')}
          </p>
        )}
        {metricEntries.map(([metric, value]) => (
          <div key={metric} className="flex items-center justify-between gap-4 px-4 py-3">
            <span className="min-w-0 truncate text-[12px] text-slate-500" title={metric}>
              {metric}
            </span>
            <span className="shrink-0 font-mono text-[12px] font-semibold text-slate-700">
              {new Intl.NumberFormat(i18n.language).format(value)}
            </span>
          </div>
        ))}
        {offsetEntries.length > 0 && (
          <div>
            <p className="px-4 pt-3 text-[11px] font-semibold tracking-[0.08em] text-slate-400 uppercase">
              {t('pipelines.workspace.runtime.offsets')}
            </p>
            {offsetEntries.map(([table, offset]) => (
              <div key={table} className="grid grid-cols-[1fr_auto] gap-3 px-4 py-2.5">
                <span className="min-w-0 truncate text-[12px] text-slate-500" title={table}>
                  {table}
                </span>
                <span
                  className="max-w-36 truncate font-mono text-[11px] text-slate-600"
                  title={offset}
                >
                  {offset}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (panel === 'logs') {
    if (logs.isLoading) return <LoadingPanel />
    if (logs.isError) {
      return <QueryIssue unavailable={false} onRetry={() => void logs.refetch()} />
    }
    if (!logs.data) return null
    if (logs.data.lines.length === 0) {
      return (
        <p className="px-4 py-5 text-[12px] leading-5 text-slate-500">
          {t('pipelines.workspace.runtime.emptyLogs')}
        </p>
      )
    }

    return (
      <ol className="divide-y divide-slate-100">
        {logs.data.lines.map((line, index) => (
          <li key={`${line.timestampMillis}-${index}`} className="px-4 py-3">
            <div className="flex items-center gap-2 text-[10px] font-medium text-slate-400">
              <time dateTime={new Date(line.timestampMillis).toISOString()}>
                {new Intl.DateTimeFormat(i18n.language, {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                }).format(line.timestampMillis)}
              </time>
              <span className="rounded bg-slate-100 px-1 py-0.5 text-slate-600">{line.level}</span>
            </div>
            <p className="mt-1.5 font-mono text-[11px] leading-5 break-words text-slate-600">
              {line.message}
            </p>
          </li>
        ))}
      </ol>
    )
  }

  const serveNodes = dag.nodes.filter((node) => node.type === 'serve')
  if (serveNodes.length === 0) {
    return (
      <div className="px-4 py-5">
        <p className="text-[13px] font-semibold text-slate-800">
          {t('pipelines.workspace.apiAccess.emptyTitle')}
        </p>
        <p className="mt-1.5 text-[12px] leading-5 text-slate-500">
          {t('pipelines.workspace.apiAccess.emptyBody')}
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="px-4 py-4">
        <p className="text-[13px] font-semibold text-slate-800">
          {t('pipelines.workspace.apiAccess.pendingTitle')}
        </p>
        <p className="mt-1.5 text-[12px] leading-5 text-slate-500">
          {t('pipelines.workspace.apiAccess.pendingBody')}
        </p>
      </div>
      <ul className="divide-y divide-slate-100 border-t border-slate-100">
        {serveNodes.map((node) => (
          <li key={node.id} className="flex items-center gap-2.5 px-4 py-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
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

export function PipelineEditorPage({ pipelineId }: { pipelineId: string }) {
  const { t } = useTranslation()
  const apiFetch = useAuthStore((state) => state.apiFetch)
  const [selection, setSelection] = useState<PipelineCanvasSelection | null>(null)
  const [activePanel, setActivePanel] = useState<WorkspacePanel>('node')
  const [isNodePanelOpen, setIsNodePanelOpen] = useState(true)
  const latestLayout = useRef<Pick<PipelineLayout, 'nodes' | 'viewport'> | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pipeline = useQuery({
    queryKey: ['pipelines', pipelineId],
    queryFn: () => getPipeline(pipelineId, apiFetch),
  })
  const layout = useQuery({
    queryKey: ['pipelines', pipelineId, 'layout'],
    queryFn: () => getPipelineLayout(pipelineId, apiFetch),
  })
  const saveLayout = useMutation({
    mutationFn: (next: Pick<PipelineLayout, 'nodes' | 'viewport'>) =>
      savePipelineLayout(pipelineId, next, apiFetch),
  })

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    },
    [],
  )

  function scheduleLayoutSave(next: Pick<PipelineLayout, 'nodes' | 'viewport'>) {
    latestLayout.current = next
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      if (latestLayout.current) saveLayout.mutate(latestLayout.current)
    }, 420)
  }

  const isLoading = pipeline.isLoading || layout.isLoading
  const error = pipeline.isError || layout.isError
  const layoutStatus = saveLayout.isPending ? 'saving' : saveLayout.isError ? 'error' : 'saved'

  return (
    <main className="relative h-dvh min-h-0 overflow-hidden bg-[#f8faff] text-slate-900">
      <a
        href="#pipeline-canvas"
        className="absolute top-3 left-3 z-50 rounded-lg bg-slate-950 px-3 py-2 text-sm text-white focus:not-sr-only"
      >
        {t('pipelines.workspace.skipToCanvas')}
      </a>

      <section id="pipeline-canvas" className="absolute inset-0 min-h-0">
        {isLoading && (
          <div className="flex h-full items-center justify-center bg-[#f8faff] text-sm font-medium text-slate-500">
            {t('pipelines.workspace.loading')}
          </div>
        )}
        {error && (
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#f8faff] px-6 text-center">
            <p className="text-sm font-semibold text-slate-800">
              {t('pipelines.workspace.error.title')}
            </p>
            <button
              type="button"
              className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition-[background-color,transform] hover:bg-slate-700 focus-visible:ring-3 focus-visible:ring-blue-500/30 focus-visible:outline-none active:scale-95"
              onClick={() => {
                void pipeline.refetch()
                void layout.refetch()
              }}
            >
              {t('pipelines.workspace.actions.retry')}
            </button>
          </div>
        )}
        {pipeline.data && layout.data && (
          <PipelineCanvas
            dag={pipeline.data.dag}
            layout={layout.data}
            onLayoutChange={scheduleLayoutSave}
            onSelectionChange={(next) => {
              setSelection(next)
              if (next) setActivePanel('node')
            }}
          />
        )}
      </section>

      <div className="absolute top-5 left-5 z-20 flex h-10 max-w-[calc(100vw-2.5rem)] items-center rounded-[14px] border border-slate-200 bg-white px-1.5 shadow-[0_8px_22px_rgba(15,23,42,0.12)]">
        <Link
          to="/pipelines"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[13px] font-semibold text-slate-700 transition-[background-color,transform] hover:bg-slate-100 focus-visible:ring-3 focus-visible:ring-blue-500/30 focus-visible:outline-none active:scale-95"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          <span>{t('pipelines.workspace.back')}</span>
        </Link>
        <span className="mx-1 h-4 w-px bg-slate-200" aria-hidden="true" />
        <span className="hidden max-w-56 truncate px-1 text-[12px] font-medium text-slate-500 sm:block">
          {pipelineId}
        </span>
        <span className="mx-1 hidden h-4 w-px bg-slate-200 sm:block" aria-hidden="true" />
        <span className="inline-flex items-center gap-1.5 px-1 text-[11px] font-medium text-slate-500">
          <span
            className={cn(
              'size-1.5 rounded-full',
              layoutStatus === 'saving'
                ? 'bg-amber-400'
                : layoutStatus === 'error'
                  ? 'bg-rose-500'
                  : 'bg-emerald-500',
            )}
            aria-hidden="true"
          />
          <span className="hidden sm:inline">
            {t(`pipelines.workspace.layout.${layoutStatus}`)}
          </span>
        </span>
      </div>

      <div
        className="absolute top-5 right-5 z-20 flex h-10 max-w-[calc(100vw-2.5rem)] items-center rounded-[14px] border border-slate-200 bg-white p-1 shadow-[0_8px_22px_rgba(15,23,42,0.12)]"
        role="tablist"
        aria-label={t('pipelines.workspace.tabs.label')}
      >
        {workspaceTabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activePanel === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={t(tab.labelKey)}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[12px] font-semibold transition-[background-color,color,transform] focus-visible:ring-3 focus-visible:ring-blue-500/30 focus-visible:outline-none active:scale-95 max-sm:size-8 max-sm:justify-center max-sm:px-0',
                isActive
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800',
              )}
              onClick={() => setActivePanel(tab.id)}
            >
              <Icon className="size-3.5" aria-hidden="true" />
              <span className="max-sm:sr-only">{t(tab.labelKey)}</span>
            </button>
          )
        })}
      </div>

      <aside
        className={cn(
          'absolute top-20 left-5 z-20 w-64 overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.12)] transition-[opacity,transform] duration-200 motion-reduce:transition-none max-md:top-16 max-md:left-3 max-md:w-[min(16rem,calc(100vw-1.5rem))]',
          isNodePanelOpen
            ? 'translate-x-0 opacity-100'
            : 'pointer-events-none -translate-x-3 opacity-0',
        )}
        aria-label={t('pipelines.workspace.nodeLibrary.label')}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-3.5 py-3">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <LibraryBig className="size-3.5" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-[13px] font-semibold text-slate-800">
                {t('pipelines.workspace.nodeLibrary.title')}
              </h1>
              <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                {t('pipelines.workspace.nodeLibrary.readOnly')}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="inline-flex size-8 items-center justify-center rounded-lg text-slate-400 transition-[background-color,color,transform] hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-3 focus-visible:ring-blue-500/30 focus-visible:outline-none active:scale-95 max-md:size-10"
            aria-label={t('pipelines.workspace.nodeLibrary.hide')}
            onClick={() => setIsNodePanelOpen(false)}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="space-y-0.5 p-2">
          {paletteItems.map((item) => {
            const Icon = item.icon
            return (
              <div key={item.id} className="flex items-center gap-2.5 rounded-lg px-2 py-2">
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-lg',
                    item.tone,
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[12px] font-semibold text-slate-700">
                    {t(item.labelKey)}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-slate-500">
                    {t(item.descriptionKey)}
                  </span>
                </span>
              </div>
            )
          })}
        </div>
        <p className="border-t border-slate-100 px-3.5 py-2.5 text-[11px] leading-4 text-slate-500">
          {t('pipelines.workspace.nodeLibrary.mutationPending')}
        </p>
      </aside>

      {!isNodePanelOpen && (
        <button
          type="button"
          className="absolute top-20 left-5 z-20 flex size-10 items-center justify-center rounded-[14px] border border-slate-200 bg-white text-slate-600 shadow-[0_8px_22px_rgba(15,23,42,0.12)] transition-[background-color,transform] hover:bg-slate-100 focus-visible:ring-3 focus-visible:ring-blue-500/30 focus-visible:outline-none active:scale-95 max-md:top-16 max-md:left-3 max-md:size-11"
          aria-label={t('pipelines.workspace.nodeLibrary.show')}
          onClick={() => setIsNodePanelOpen(true)}
        >
          <CirclePlus className="size-4" aria-hidden="true" />
        </button>
      )}

      <aside
        className="absolute top-20 right-5 z-20 max-h-[calc(100dvh-7rem)] w-[min(20rem,calc(100vw-2.5rem))] overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.12)] max-md:top-auto max-md:right-3 max-md:bottom-3 max-md:left-3 max-md:max-h-[min(22rem,calc(100dvh-5rem))] max-md:w-auto"
        aria-live={isObservationPanel(activePanel) ? 'polite' : undefined}
      >
        <div className="border-b border-slate-100 px-4 py-3.5">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-400 uppercase">
            {t(
              activePanel === 'node'
                ? 'pipelines.workspace.inspector.eyebrow'
                : 'pipelines.workspace.runtime.eyebrow',
            )}
          </p>
          <h2 className="mt-1 truncate text-[14px] font-semibold text-slate-800">
            {activePanel === 'node' && selection
              ? selection.label
              : t(panelTitle(activePanel, selection))}
          </h2>
        </div>
        <div className="max-h-[calc(100dvh-12rem)] overflow-y-auto max-md:max-h-[min(16rem,calc(100dvh-9rem))]">
          {activePanel === 'node' ? (
            <NodeInspector selection={selection} />
          ) : pipeline.data ? (
            <RuntimePanel pipelineId={pipelineId} panel={activePanel} dag={pipeline.data.dag} />
          ) : null}
        </div>
      </aside>
    </main>
  )
}
