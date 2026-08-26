import type { ComponentType, SVGProps } from 'react'

import { useQuery } from '@tanstack/react-query'
import {
  ChevronDown,
  ChevronRight,
  Database,
  GitMerge,
  LayoutTemplate,
  Network,
  Plus,
  Sparkles,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import {
  listPipelines,
  type PipelineRuntimeState,
  type PipelineView,
} from '@/service/pipelines/pipeline-client'
import { useAuthStore } from '@/stores/auth-store'

import { TreeItem } from '../components/navigation/tree-item'
import { WizardBuilder } from './wizard-builder'

export function PipelinesPage() {
  const { t } = useTranslation()
  const apiFetch = useAuthStore((state) => state.apiFetch)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creationMode, setCreationMode] = useState<'wizard' | null>(null)
  const pipelinesQuery = useQuery({
    queryKey: ['pipelines'],
    queryFn: () => listPipelines(apiFetch),
  })
  const pipelines = pipelinesQuery.data ?? []
  const selectedPipeline = useMemo(
    () => pipelines.find((pipeline) => pipeline.id === selectedId) ?? null,
    [pipelines, selectedId],
  )

  const createModes: Array<{
    value: 'wizard' | 'sql' | 'dag' | 'ai'
    labelKey: string
    descriptionKey: string
    icon: ComponentType<SVGProps<SVGSVGElement>>
    iconClass: string
  }> = [
    {
      value: 'wizard',
      labelKey: 'pipelines.createMenu.wizard',
      descriptionKey: 'pipelines.createMenu.wizardDescription',
      icon: LayoutTemplate,
      iconClass: 'bg-gray-100 text-gray-600 group-hover:bg-gray-200',
    },
    {
      value: 'sql',
      labelKey: 'pipelines.createMenu.sql',
      descriptionKey: 'pipelines.createMenu.sqlDescription',
      icon: Database,
      iconClass: 'bg-blue-50 text-blue-600 group-hover:bg-blue-100',
    },
    {
      value: 'dag',
      labelKey: 'pipelines.createMenu.dag',
      descriptionKey: 'pipelines.createMenu.dagDescription',
      icon: Network,
      iconClass: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100',
    },
    {
      value: 'ai',
      labelKey: 'pipelines.createMenu.ai',
      descriptionKey: 'pipelines.createMenu.aiDescription',
      icon: Sparkles,
      iconClass: 'bg-purple-50 text-purple-600 group-hover:bg-purple-100',
    },
  ]

  if (creationMode === 'wizard') return <WizardBuilder onBack={() => setCreationMode(null)} />
  return (
    <section className="flex h-full w-full flex-col overflow-hidden bg-white">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-gray-100/70 px-4 md:px-6">
        <h1 className="min-w-0 truncate text-[15px] font-semibold text-gray-900">
          {t('pipelines.title')}
        </h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" className="shrink-0 px-3 text-[13px] font-medium shadow-sm">
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              {t('common.create')}
              <ChevronDown className="-mr-1 ml-0.5 h-3.5 w-3.5 opacity-70" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-72 border-gray-200/70 p-1.5 shadow-[0_12px_40px_rgba(15,23,42,0.12)]"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel>{t('pipelines.createMenu.title')}</DropdownMenuLabel>
              {createModes.map((mode) => {
                const Icon = mode.icon
                const item = (
                  <>
                    <span
                      className={cn(
                        'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors',
                        mode.iconClass,
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-medium text-gray-900">
                        {t(mode.labelKey)}
                      </span>
                      <span className="block text-[11px] text-gray-500">
                        {t(mode.descriptionKey)}
                      </span>
                    </span>
                  </>
                )
                return (
                  <DropdownMenuItem
                    key={mode.labelKey}
                    className="group items-start gap-3 px-3 py-2"
                    disabled={mode.value === 'dag'}
                    onClick={() => {
                      if (mode.value === 'wizard') setCreationMode(mode.value)
                    }}
                  >
                    {item}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
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
              <PipelineTable pipelines={pipelines} />
            )}
          </div>
        </main>
      </div>
    </section>
  )
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

function PipelineTable({ pipelines }: { pipelines: PipelineView[] }) {
  const { t } = useTranslation()

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200/70">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-gray-200/70 bg-gray-50/70 text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">{t('pipelines.table.resourceName')}</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">
                {t('pipelines.table.type')}
              </th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">
                {t('pipelines.table.version')}
              </th>
              <th className="px-4 py-3 font-medium">{t('pipelines.table.status')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100/70">
            {pipelines.map((pipeline) => (
              <tr
                key={pipeline.id}
                className="group transition-colors focus-within:bg-gray-50/70 hover:bg-gray-50/70"
              >
                <td className="px-4 py-2.5">
                  <a
                    className="inline-flex min-h-9 max-w-full items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                    href={`/pipelines/${encodeURIComponent(pipeline.id)}/edit`}
                    aria-label={t('pipelines.actions.editPipeline', { id: pipeline.id })}
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg border border-gray-200/70 bg-gray-50">
                      <GitMerge className="h-3.5 w-3.5 text-blue-500" aria-hidden="true" />
                    </div>
                    <span className="min-w-0 font-medium break-words text-gray-900">
                      {pipeline.id}
                    </span>
                    <ChevronRight
                      className="h-3.5 w-3.5 shrink-0 text-gray-400 transition-all md:-translate-x-1 md:opacity-0 md:group-focus-within:translate-x-0 md:group-focus-within:opacity-100 md:group-hover:translate-x-0 md:group-hover:opacity-100"
                      aria-hidden="true"
                    />
                  </a>
                </td>
                <td className="hidden px-4 py-3 text-gray-500 sm:table-cell">
                  {t('pipelines.type.pipeline')}
                </td>
                <td className="hidden px-4 py-3 md:table-cell">
                  <code
                    className="font-mono text-[12px] text-gray-500"
                    title={pipeline.contentHash}
                  >
                    {pipeline.contentHash.slice(0, 12)}
                  </code>
                </td>
                <td className="px-4 py-3">
                  <PipelineStatusCell status={pipeline.status?.state} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const pipelineStatusClasses: Record<PipelineRuntimeState, string> = {
  NEW: 'pipeline-list__status--new',
  RUNNING: 'pipeline-list__status--running',
  PAUSED: 'pipeline-list__status--paused',
  STOPPED: 'pipeline-list__status--stopped',
  COMPLETED: 'pipeline-list__status--completed',
  FAILED: 'pipeline-list__status--failed',
}

function PipelineStatusCell({ status }: { status?: PipelineRuntimeState }) {
  const { t } = useTranslation()

  if (!status) {
    return (
      <span className="pipeline-list__status pipeline-list__status--unavailable">
        <span className="pipeline-list__status-dot" aria-hidden="true" />
        {t('pipelines.status.unavailable')}
      </span>
    )
  }

  return (
    <span className={cn('pipeline-list__status', pipelineStatusClasses[status])}>
      <span className="pipeline-list__status-dot" aria-hidden="true" />
      {t(['pipelines.workspace.runtime.states', status].join('.'))}
    </span>
  )
}
