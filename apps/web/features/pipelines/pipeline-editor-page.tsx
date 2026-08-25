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
  PanelLeftClose,
  PanelLeftOpen,
  PanelsTopLeft,
  Radio,
  ScrollText,
  Sparkles,
  Workflow,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
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
  type PipelineLayout,
} from '@/service/pipeline-client'
import { listConnectors, listSources } from '@/service/source-client'
import { useAuthStore } from '@/stores/auth-store'

import type { PipelineCanvasSelection } from './pipeline-canvas-types'

import { PipelineCanvas } from './pipeline-canvas'
import { pipelineNodeConnectors } from './pipeline-node-connectors'

export type PipelineWorkspaceSection = 'orchestrate' | 'api' | 'logs' | 'monitoring'

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

const workspaceNavigation = [
  {
    section: 'orchestrate',
    labelKey: 'pipelines.workspace.navigation.orchestrate',
    icon: Workflow,
  },
  { section: 'api', labelKey: 'pipelines.workspace.navigation.api', icon: Braces },
  { section: 'logs', labelKey: 'pipelines.workspace.navigation.logs', icon: ScrollText },
  { section: 'monitoring', labelKey: 'pipelines.workspace.navigation.monitoring', icon: Gauge },
] as const

function QueryIssue({ unavailable, onRetry }: { unavailable: boolean; onRetry: () => void }) {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-36 flex-col items-start justify-center gap-2 px-5 py-6">
      <p className="text-[13px] font-semibold text-slate-800">
        {t(
          unavailable
            ? 'pipelines.workspace.runtime.unavailableTitle'
            : 'pipelines.workspace.runtime.errorTitle',
        )}
      </p>
      <p className="max-w-[34ch] text-[12px] leading-5 text-slate-500">
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
    <div className="flex min-h-36 items-center px-5 py-6 text-[12px] text-slate-500">
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
    'pipeline-workspace__nav-link flex h-10 items-center gap-2.5 rounded-lg px-3 text-[13px] font-semibold transition-[background-color,color,transform] focus-visible:ring-3 focus-visible:ring-[var(--pipeline-selection-ring)] focus-visible:outline-none active:scale-95 max-sm:justify-center max-sm:px-0',
    isActive && 'pipeline-workspace__nav-link--active',
  )
  const commonProps = {
    className,
    'aria-current': isActive ? ('page' as const) : undefined,
  }

  if (section === 'api') {
    return (
      <Link to="/pipelines/$pipelineId/edit/api" params={{ pipelineId }} {...commonProps}>
        {children}
      </Link>
    )
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
  activeSection,
  collapsed,
  onCollapsedChange,
}: {
  pipelineId: string
  activeSection: PipelineWorkspaceSection
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
}) {
  const { t } = useTranslation()

  return (
    <aside
      className={cn(
        'pipeline-workspace__navigation relative flex h-full shrink-0 overflow-hidden p-1 transition-[width] duration-150 motion-reduce:transition-none',
        collapsed ? 'w-14' : 'w-62 max-md:w-52',
      )}
      data-testid="workspace-navigation"
      data-collapsed={collapsed}
    >
      <div className="pipeline-workspace__navigation-panel flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg px-3 py-3">
        <div
          className={cn('flex h-10 items-center', collapsed ? 'justify-center' : 'justify-between')}
        >
          <Link
            to="/pipelines"
            className={cn(
              'inline-flex h-8 shrink-0 items-center rounded-lg text-slate-700 transition-[background-color,transform] hover:bg-slate-100 focus-visible:ring-3 focus-visible:ring-blue-500/30 focus-visible:outline-none active:scale-95',
              collapsed ? 'size-8 justify-center' : 'max-w-full gap-1 px-1.5',
            )}
            aria-label={t('pipelines.workspace.back')}
          >
            <ChevronLeft className="size-4 shrink-0" aria-hidden="true" />
            {!collapsed && (
              <span
                className="min-w-0 truncate text-[13px] font-semibold text-slate-800"
                data-testid="workspace-navigation-title"
              >
                {t('nav.pipelines')}
              </span>
            )}
          </Link>
          {!collapsed && (
            <button
              type="button"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-[background-color,color,transform] hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-3 focus-visible:ring-blue-500/30 focus-visible:outline-none active:scale-95"
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
            className="mt-1 inline-flex size-10 shrink-0 items-center justify-center self-center rounded-lg text-slate-400 transition-[background-color,color,transform] hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-3 focus-visible:ring-blue-500/30 focus-visible:outline-none active:scale-95"
            aria-label={t('pipelines.workspace.navigation.expand')}
            onClick={() => onCollapsedChange(false)}
          >
            <PanelLeftOpen className="size-4" aria-hidden="true" />
          </button>
        )}

        <div
          className={cn('mt-5 flex items-center gap-2.5 px-2', collapsed && 'justify-center px-0')}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#eaf2ff] text-[#2563eb]">
            <Workflow className="size-4" aria-hidden="true" />
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold text-slate-800">
                {pipelineId}
              </span>
              <span className="mt-0.5 block text-[10px] font-semibold tracking-[0.08em] text-slate-400 uppercase">
                {t('pipelines.workspace.navigation.workspace')}
              </span>
            </span>
          )}
        </div>

        <nav className="mt-7 space-y-1" aria-label={t('pipelines.workspace.navigation.label')}>
          {workspaceNavigation.map((item) => {
            const Icon = item.icon
            return (
              <WorkspaceNavLink
                key={item.section}
                pipelineId={pipelineId}
                section={item.section}
                activeSection={activeSection}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span className={cn(collapsed && 'sr-only')}>{t(item.labelKey)}</span>
              </WorkspaceNavLink>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}

function PipelineOrchestrationPage({ pipelineId }: { pipelineId: string }) {
  const { t } = useTranslation()
  const apiFetch = useAuthStore((state) => state.apiFetch)
  const [selection, setSelection] = useState<PipelineCanvasSelection | null>(null)
  const [isNodePanelOpen, setIsNodePanelOpen] = useState(false)
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
  const sources = useQuery({
    queryKey: ['sources'],
    queryFn: () => listSources(apiFetch),
  })
  const connectors = useQuery({
    queryKey: ['connectors'],
    queryFn: () => listConnectors(apiFetch),
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
  const connectorsBySourceId = useMemo(
    () => pipelineNodeConnectors(sources.data ?? [], connectors.data ?? []),
    [connectors.data, sources.data],
  )

  return (
    <section className="pipeline-canvas-surface relative h-full min-w-0 flex-1 overflow-hidden">
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
            connectorsBySourceId={connectorsBySourceId}
            onLayoutChange={scheduleLayoutSave}
            onSelectionChange={setSelection}
          />
        )}
      </section>

      <div className="pipeline-canvas__status pointer-events-none absolute bottom-5 left-1/2 z-20 flex h-8 -translate-x-1/2 items-center rounded-lg border px-2.5 text-[11px] font-medium max-sm:bottom-3">
        <span
          className={cn(
            'mr-1.5 size-1.5 rounded-full',
            layoutStatus === 'saving'
              ? 'bg-amber-400'
              : layoutStatus === 'error'
                ? 'bg-rose-500'
                : 'bg-emerald-500',
          )}
          aria-hidden="true"
        />
        {t(`pipelines.workspace.layout.${layoutStatus}`)}
      </div>

      {isNodePanelOpen && (
        <div
          className="pipeline-canvas__panel absolute top-5 left-5 z-20 w-60 overflow-hidden rounded-xl border motion-reduce:transition-none max-sm:top-3 max-sm:left-3 max-sm:w-[min(15rem,calc(100vw-5.75rem))]"
          aria-label={t('pipelines.workspace.nodeLibrary.label')}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-3.5 py-3">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-md bg-blue-50 text-blue-600">
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
              className="inline-flex size-8 items-center justify-center rounded-lg text-slate-400 transition-[background-color,color,transform] hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-3 focus-visible:ring-blue-500/30 focus-visible:outline-none active:scale-95 max-sm:size-10"
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
        </div>
      )}

      {!isNodePanelOpen && (
        <button
          type="button"
          className="pipeline-canvas__panel-trigger absolute top-5 left-5 z-20 flex size-10 items-center justify-center rounded-xl border transition-[background-color,transform] focus-visible:ring-3 focus-visible:ring-[var(--pipeline-selection-ring)] focus-visible:outline-none active:scale-95 max-sm:top-3 max-sm:left-3 max-sm:size-11"
          aria-label={t('pipelines.workspace.nodeLibrary.show')}
          onClick={() => setIsNodePanelOpen(true)}
        >
          <CirclePlus className="size-4" aria-hidden="true" />
        </button>
      )}

      {selection && (
        <aside className="pipeline-canvas__panel absolute top-5 right-5 z-20 max-h-[calc(100dvh-3rem)] w-[min(20rem,calc(100%-2.5rem))] overflow-hidden rounded-xl border max-sm:top-auto max-sm:right-3 max-sm:bottom-3 max-sm:left-16 max-sm:max-h-[min(22rem,calc(100dvh-5rem))] max-sm:w-auto">
          <div className="border-b border-slate-100 px-4 py-3.5">
            <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-400 uppercase">
              {t('pipelines.workspace.inspector.eyebrow')}
            </p>
            <h2 className="mt-1 truncate text-[14px] font-semibold text-slate-800">
              {selection?.label ?? t('pipelines.workspace.inspector.emptyTitle')}
            </h2>
          </div>
          <div className="max-h-[calc(100dvh-12rem)] overflow-y-auto max-sm:max-h-[min(16rem,calc(100dvh-9rem))]">
            <NodeInspector selection={selection} />
          </div>
        </aside>
      )}
    </section>
  )
}

function WorkspacePageFrame({
  section,
  pipelineId,
  children,
}: {
  section: Exclude<PipelineWorkspaceSection, 'orchestrate'>
  pipelineId: string
  children: ReactNode
}) {
  const { t } = useTranslation()
  const item = workspaceNavigation.find((navigation) => navigation.section === section)
  const Icon = item?.icon ?? Activity

  return (
    <section className="pipeline-canvas-surface relative min-w-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl px-8 py-10 max-md:px-6 max-sm:px-4">
        <div className="flex items-start gap-3 border-b border-slate-200 pb-6">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#2563eb] shadow-[0_1px_3px_rgba(15,23,42,0.1)]">
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
        {children}
      </div>
    </section>
  )
}

function MonitoringPage({ pipelineId }: { pipelineId: string }) {
  const { i18n, t } = useTranslation()
  const apiFetch = useAuthStore((state) => state.apiFetch)
  const status = useQuery({
    queryKey: ['pipelines', pipelineId, 'status'],
    queryFn: () => getPipelineStatus(pipelineId, apiFetch),
    retry: false,
    refetchInterval: 5_000,
  })
  const metrics = useQuery({
    queryKey: ['pipelines', pipelineId, 'metrics'],
    queryFn: () => getPipelineMetrics(pipelineId, apiFetch),
    retry: false,
    refetchInterval: 5_000,
  })

  if (status.isLoading || metrics.isLoading) return <LoadingPanel />
  if (status.isError || metrics.isError) {
    const issue = status.isError ? status : metrics
    return (
      <QueryIssue
        unavailable={issue.error instanceof PipelineClientError && issue.error.status === 404}
        onRetry={() => {
          void status.refetch()
          void metrics.refetch()
        }}
      />
    )
  }

  const metricEntries = Object.entries(metrics.data?.metrics ?? {})
  const offsetEntries = Object.entries(metrics.data?.perTableOffset ?? {})
  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.1)]">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <span className="text-[12px] text-slate-500">{t('pipelines.workspace.runtime.state')}</span>
        {status.data && (
          <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
            {t(`pipelines.workspace.runtime.states.${status.data.state}`)}
          </span>
        )}
      </div>
      {status.data?.failure && (
        <div className="border-b border-slate-100 px-5 py-4">
          <p className="text-[11px] font-semibold text-rose-700">{status.data.failure.code}</p>
          <p className="mt-1 text-[12px] leading-5 text-slate-600">{status.data.failure.message}</p>
        </div>
      )}
      <div className="divide-y divide-slate-100">
        {metricEntries.length === 0 && (
          <p className="px-5 py-6 text-[12px] leading-5 text-slate-500">
            {t('pipelines.workspace.runtime.emptyMetrics')}
          </p>
        )}
        {metricEntries.map(([metric, value]) => (
          <div key={metric} className="flex items-center justify-between gap-4 px-5 py-3">
            <span className="min-w-0 truncate text-[12px] text-slate-500" title={metric}>
              {metric}
            </span>
            <span className="shrink-0 font-mono text-[12px] font-semibold text-slate-700">
              {new Intl.NumberFormat(i18n.language).format(value)}
            </span>
          </div>
        ))}
      </div>
      {offsetEntries.length > 0 && (
        <div className="border-t border-slate-100 px-5 py-4">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-400 uppercase">
            {t('pipelines.workspace.runtime.offsets')}
          </p>
          <dl className="mt-2 divide-y divide-slate-100">
            {offsetEntries.map(([table, offset]) => (
              <div key={table} className="grid grid-cols-[1fr_auto] gap-3 py-2.5">
                <dt className="min-w-0 truncate text-[12px] text-slate-500" title={table}>
                  {table}
                </dt>
                <dd
                  className="max-w-56 truncate font-mono text-[11px] text-slate-600"
                  title={offset}
                >
                  {offset}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  )
}

function LogsPage({ pipelineId }: { pipelineId: string }) {
  const { i18n, t } = useTranslation()
  const apiFetch = useAuthStore((state) => state.apiFetch)
  const logs = useQuery({
    queryKey: ['pipelines', pipelineId, 'logs'],
    queryFn: () => getPipelineLogs(pipelineId, apiFetch),
    retry: false,
    refetchInterval: 5_000,
  })

  if (logs.isLoading) return <LoadingPanel />
  if (logs.isError) return <QueryIssue unavailable={false} onRetry={() => void logs.refetch()} />
  if (!logs.data) return null
  if (logs.data.lines.length === 0) {
    return (
      <p className="mt-6 text-[12px] leading-5 text-slate-500">
        {t('pipelines.workspace.runtime.emptyLogs')}
      </p>
    )
  }

  return (
    <ol className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.1)]">
      {logs.data.lines.map((line, index) => (
        <li
          key={`${line.timestampMillis}-${index}`}
          className="border-b border-slate-100 px-5 py-4 last:border-b-0"
        >
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

function ApiAccessPage({ pipelineId }: { pipelineId: string }) {
  const { t } = useTranslation()
  const apiFetch = useAuthStore((state) => state.apiFetch)
  const pipeline = useQuery({
    queryKey: ['pipelines', pipelineId],
    queryFn: () => getPipeline(pipelineId, apiFetch),
  })

  if (pipeline.isLoading) return <LoadingPanel />
  if (pipeline.isError) {
    return <QueryIssue unavailable={false} onRetry={() => void pipeline.refetch()} />
  }

  const serveNodes = pipeline.data?.dag.nodes.filter((node) => node.type === 'serve') ?? []
  if (serveNodes.length === 0) {
    return (
      <div className="mt-6">
        <p className="text-[13px] font-semibold text-slate-800">
          {t('pipelines.workspace.apiAccess.emptyTitle')}
        </p>
        <p className="mt-1.5 max-w-[48ch] text-[12px] leading-5 text-slate-500">
          {t('pipelines.workspace.apiAccess.emptyBody')}
        </p>
      </div>
    )
  }

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.1)]">
      <div className="px-5 py-4">
        <p className="text-[13px] font-semibold text-slate-800">
          {t('pipelines.workspace.apiAccess.pendingTitle')}
        </p>
        <p className="mt-1.5 max-w-[48ch] text-[12px] leading-5 text-slate-500">
          {t('pipelines.workspace.apiAccess.pendingBody')}
        </p>
      </div>
      <ul className="divide-y divide-slate-100 border-t border-slate-100">
        {serveNodes.map((node) => (
          <li key={node.id} className="flex items-center gap-2.5 px-5 py-3.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
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

export function PipelineWorkspacePage({
  pipelineId,
  section,
}: {
  pipelineId: string
  section: PipelineWorkspaceSection
}) {
  const [navigationCollapsed, setNavigationCollapsed] = useState(false)

  return (
    <main className="pipeline-workspace flex h-dvh min-h-0 overflow-hidden">
      <PipelineWorkspaceNav
        pipelineId={pipelineId}
        activeSection={section}
        collapsed={navigationCollapsed}
        onCollapsedChange={setNavigationCollapsed}
      />
      {section === 'orchestrate' ? (
        <PipelineOrchestrationPage pipelineId={pipelineId} />
      ) : (
        <WorkspacePageFrame pipelineId={pipelineId} section={section}>
          {section === 'monitoring' && <MonitoringPage pipelineId={pipelineId} />}
          {section === 'logs' && <LogsPage pipelineId={pipelineId} />}
          {section === 'api' && <ApiAccessPage pipelineId={pipelineId} />}
        </WorkspacePageFrame>
      )}
    </main>
  )
}

export function PipelineEditorPage({ pipelineId }: { pipelineId: string }) {
  return <PipelineWorkspacePage pipelineId={pipelineId} section="orchestrate" />
}
