import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ChevronLeft, CirclePlus, Database, PanelsTopLeft, Sparkles, Workflow } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'
import {
  getPipeline,
  getPipelineLayout,
  savePipelineLayout,
  type PipelineLayout,
} from '@/service/pipeline-client'
import { useAuthStore } from '@/stores/auth-store'

import { PipelineCanvas, type PipelineCanvasSelection } from './pipeline-canvas'

const paletteItems = [
  {
    id: 'source',
    label: 'Source',
    description: 'Read from a data source',
    icon: Database,
    tone: 'text-sky-600 bg-sky-50',
  },
  {
    id: 'transform',
    label: 'Transform',
    description: 'Filter, map, join, or nest',
    icon: Workflow,
    tone: 'text-slate-700 bg-slate-100',
  },
  {
    id: 'view',
    label: 'View',
    description: 'Expose a derived collection',
    icon: PanelsTopLeft,
    tone: 'text-violet-600 bg-violet-50',
  },
  {
    id: 'serve',
    label: 'Serve',
    description: 'Send to a destination',
    icon: Sparkles,
    tone: 'text-emerald-600 bg-emerald-50',
  },
]

function nodeHeading(selection: PipelineCanvasSelection | null) {
  if (!selection) return 'Select a node'
  return selection.label
}

function nodeDescription(selection: PipelineCanvasSelection | null) {
  if (!selection) return 'Select a node on the canvas to inspect its Pipeline configuration.'
  if (selection.nodeType === 'source') return 'This node reads an output declared by a Source.'
  if (selection.nodeType === 'target')
    return 'This node is the destination Source configured by serve.'
  if (selection.nodeType === 'transform')
    return 'Transform parameters remain part of the Pipeline DAG.'
  if (selection.nodeType === 'view') return 'A view makes this branch queryable.'
  return 'Serve delivers this branch to its configured outputs.'
}

export function PipelineEditorPage({ pipelineId }: { pipelineId: string }) {
  const apiFetch = useAuthStore((state) => state.apiFetch)
  const [selection, setSelection] = useState<PipelineCanvasSelection | null>(null)
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

  return (
    <main className="relative h-dvh min-h-0 overflow-hidden bg-[#fbfcfe] text-slate-900">
      <a
        href="#pipeline-canvas"
        className="sr-only absolute top-3 left-3 z-50 rounded-lg bg-slate-950 px-3 py-2 text-sm text-white focus:not-sr-only"
      >
        Skip to pipeline canvas
      </a>

      <section id="pipeline-canvas" className="absolute inset-0 min-h-0">
        {isLoading && (
          <div className="flex h-full items-center justify-center bg-[#fbfcfe] text-sm font-medium text-slate-500">
            Loading Pipeline canvas
          </div>
        )}
        {error && (
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#fbfcfe] px-6 text-center">
            <p className="text-sm font-semibold text-slate-800">We could not load this Pipeline.</p>
            <button
              type="button"
              className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition-[background-color,transform] hover:bg-slate-700 active:scale-95"
              onClick={() => {
                void pipeline.refetch()
                void layout.refetch()
              }}
            >
              Retry
            </button>
          </div>
        )}
        {pipeline.data && layout.data && (
          <PipelineCanvas
            dag={pipeline.data.dag}
            layout={layout.data}
            onLayoutChange={scheduleLayoutSave}
            onSelectionChange={setSelection}
          />
        )}
      </section>

      <Link
        to="/pipelines"
        className="absolute top-5 left-5 z-20 inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700 shadow-[0_8px_24px_rgba(15,23,42,0.1)] transition-[background-color,transform] hover:bg-slate-50 focus-visible:ring-3 focus-visible:ring-blue-500/30 focus-visible:outline-none active:scale-95"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Pipelines
      </Link>

      <div className="absolute top-5 right-5 z-20 flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 shadow-[0_8px_24px_rgba(15,23,42,0.1)]">
        <span
          className={cn(
            'size-1.5 rounded-full',
            saveLayout.isPending
              ? 'bg-amber-400'
              : saveLayout.isError
                ? 'bg-rose-500'
                : 'bg-emerald-500',
          )}
          aria-hidden="true"
        />
        <span className="text-[12px] font-medium text-slate-500">
          {saveLayout.isPending
            ? 'Saving layout'
            : saveLayout.isError
              ? 'Layout not saved'
              : 'Layout saved'}
        </span>
      </div>

      <aside
        className={cn(
          'absolute top-20 left-5 z-20 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-[0_14px_40px_rgba(15,23,42,0.12)] transition-[opacity,transform] duration-200 max-md:top-16 max-md:left-3 max-md:w-[min(16rem,calc(100vw-1.5rem))]',
          isNodePanelOpen
            ? 'translate-x-0 opacity-100'
            : 'pointer-events-none -translate-x-3 opacity-0',
        )}
        aria-label="Add Pipeline node"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-3.5 py-3">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <CirclePlus className="size-3.5" aria-hidden="true" />
            </span>
            <h1 className="text-[13px] font-semibold text-slate-800">Add node</h1>
          </div>
          <button
            type="button"
            className="text-[11px] font-medium text-slate-400 hover:text-slate-700"
            onClick={() => setIsNodePanelOpen(false)}
          >
            Hide
          </button>
        </div>
        <div className="space-y-1 p-2">
          {paletteItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                disabled
                title="Pipeline graph mutation is not available yet."
                className="group flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left opacity-45"
              >
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
                    {item.label}
                  </span>
                  <span className="block truncate text-[11px] text-slate-500">
                    {item.description}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
        <p className="border-t border-slate-100 px-3.5 py-2.5 text-[11px] leading-4 text-slate-400">
          Node creation becomes available with Pipeline DAG save.
        </p>
      </aside>

      {!isNodePanelOpen && (
        <button
          type="button"
          className="absolute top-20 left-5 z-20 flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-[0_8px_24px_rgba(15,23,42,0.1)] transition-[background-color,transform] hover:bg-slate-50 active:scale-95"
          aria-label="Show node panel"
          onClick={() => setIsNodePanelOpen(true)}
        >
          <CirclePlus className="size-4" aria-hidden="true" />
        </button>
      )}

      <aside
        className="absolute right-5 bottom-5 z-20 w-[min(20rem,calc(100vw-2.5rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-[0_14px_40px_rgba(15,23,42,0.12)] max-md:hidden"
        aria-live="polite"
      >
        <div className="border-b border-slate-100 px-4 py-3.5">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-400 uppercase">
            Configuration
          </p>
          <h2 className="mt-1 truncate text-[14px] font-semibold text-slate-800">
            {nodeHeading(selection)}
          </h2>
        </div>
        <div className="px-4 py-3.5">
          <p className="text-[12px] leading-5 text-slate-500">{nodeDescription(selection)}</p>
          {selection?.detail && (
            <div className="mt-3 inline-flex rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
              {selection.detail}
            </div>
          )}
        </div>
      </aside>
    </main>
  )
}
