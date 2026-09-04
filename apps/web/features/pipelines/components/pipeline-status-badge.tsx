import { useTranslation } from 'react-i18next'

import type { PipelineRuntimeState } from '@/service/pipelines/pipeline-client'

import { cn } from '@/lib/utils'

const pipelineStatusClasses: Record<PipelineRuntimeState, string> = {
  NEW: 'pipeline-list__status--new text-sky-700 bg-sky-50/80 border-sky-200/50',
  RUNNING: 'pipeline-list__status--running text-blue-700 bg-blue-50/80 border-blue-200/50',
  PAUSED: 'pipeline-list__status--paused text-slate-600 bg-slate-100 border-slate-200',
  STOPPED: 'pipeline-list__status--stopped text-slate-600 bg-slate-100 border-slate-200',
  COMPLETED:
    'pipeline-list__status--completed text-emerald-700 bg-emerald-50/80 border-emerald-200/50',
  FAILED: 'pipeline-list__status--failed text-rose-700 bg-rose-50/80 border-rose-200/50',
}

export function PipelineStatusBadge({
  status,
  className,
}: {
  status?: PipelineRuntimeState
  className?: string
}) {
  const { t } = useTranslation()

  if (!status) {
    return (
      <span
        className={cn(
          'pipeline-list__status pipeline-list__status--unavailable border-gray-200 bg-gray-50 text-gray-500',
          className,
        )}
        data-state="unavailable"
        data-testid="pipeline-status"
      >
        <span className="pipeline-list__status-dot" aria-hidden="true" />
        {t('pipelines.status.unavailable')}
      </span>
    )
  }

  return (
    <span
      className={cn(
        'pipeline-list__status inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[12px] leading-5 font-medium',
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
