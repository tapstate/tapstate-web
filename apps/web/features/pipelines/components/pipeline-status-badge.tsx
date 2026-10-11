import { useTranslation } from 'react-i18next'

import type { PipelineCatalogState } from '@/service/pipelines/pipeline-client'

import { cn } from '@/lib/utils'

const pipelineStatusClasses: Record<PipelineCatalogState, string> = {
  DRAFT: 'pipeline-list__status--draft text-slate-600 bg-slate-100 border-slate-200',
  NEW: 'pipeline-list__status--new text-sky-700 bg-sky-50/80 border-sky-200/50',
  STARTING: 'pipeline-list__status--starting text-blue-700 bg-blue-50/80 border-blue-200/50',
  RUNNING: 'pipeline-list__status--running text-blue-700 bg-blue-50/80 border-blue-200/50',
  PAUSING: 'pipeline-list__status--pausing text-amber-700 bg-amber-50/80 border-amber-200/50',
  PAUSED: 'pipeline-list__status--paused text-slate-600 bg-slate-100 border-slate-200',
  RESUMING: 'pipeline-list__status--resuming text-blue-700 bg-blue-50/80 border-blue-200/50',
  STOPPING: 'pipeline-list__status--stopping text-amber-700 bg-amber-50/80 border-amber-200/50',
  STOPPED: 'pipeline-list__status--stopped text-slate-600 bg-slate-100 border-slate-200',
  COMPLETED:
    'pipeline-list__status--completed text-emerald-700 bg-emerald-50/80 border-emerald-200/50',
  FAILED: 'pipeline-list__status--failed text-rose-700 bg-rose-50/80 border-rose-200/50',
  UNAVAILABLE: 'pipeline-list__status--unavailable text-slate-600 bg-slate-100 border-slate-200',
}

export function PipelineStatusBadge({
  status,
  className,
}: {
  status?: PipelineCatalogState
  className?: string
}) {
  const { t } = useTranslation()

  if (!status) {
    return null
  }

  return (
    <span
      className={cn(
        'pipeline-list__status inline-flex h-6 shrink-0 items-center gap-1.5 self-start rounded-md border px-2 text-[11px] leading-4 font-semibold tracking-[-0.01em]',
        pipelineStatusClasses[status],
        className,
      )}
      data-state={status}
      data-testid="pipeline-status"
    >
      <span className="pipeline-list__status-dot" aria-hidden="true" />
      {t(['pipelines.workspace.runtime.states', status].join('.'))}
    </span>
  )
}
