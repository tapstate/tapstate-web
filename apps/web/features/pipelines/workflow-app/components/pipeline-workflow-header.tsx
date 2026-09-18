import { Play, Save } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export interface PipelineWorkflowHeaderProps {
  isDirty: boolean
  isSaving: boolean
  isRunning: boolean
  onSave: () => void
  onRun: () => void
}

/** Owns the workflow-level actions independently from the canvas and inspector. */
export function PipelineWorkflowHeader({
  isDirty,
  isSaving,
  isRunning,
  onSave,
  onRun,
}: PipelineWorkflowHeaderProps) {
  const { t } = useTranslation()

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-7 z-10 flex h-0 items-center px-3"
      data-workflow-header
    >
      <div
        className="pointer-events-auto ml-auto flex h-8 items-center gap-0.5 rounded-lg border-[0.5px] border-pipeline-actionbar-border bg-pipeline-actionbar-bg p-0.5 shadow-md backdrop-blur-[10px]"
        role="toolbar"
        aria-label={t('pipelines.workspace.actions.toolbar')}
      >
        <button
          type="button"
          className="inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-[var(--pipeline-text-muted)] transition-[background-color,color,transform] hover:bg-pipeline-actionbar-bg-accent hover:text-[var(--pipeline-text)] focus-visible:ring-2 focus-visible:ring-[var(--pipeline-selection-ring)] focus-visible:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
          disabled={!isDirty || isSaving}
          onClick={onSave}
        >
          <Save className="size-3.5" aria-hidden="true" />
          {isSaving
            ? t('pipelines.workspace.actions.saving')
            : t('pipelines.workspace.actions.save')}
        </button>
        <button
          type="button"
          className="inline-flex h-7 items-center gap-1.5 rounded-md bg-[var(--pipeline-text)] px-2.5 text-[13px] font-medium text-[var(--pipeline-surface)] transition-[background-color,transform] hover:bg-[var(--pipeline-text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--pipeline-selection-ring)] focus-visible:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
          disabled={isRunning || isSaving}
          onClick={onRun}
        >
          <Play className="size-3.5" aria-hidden="true" />
          {isRunning
            ? t('pipelines.workspace.actions.running')
            : t('pipelines.workspace.actions.run')}
        </button>
      </div>
    </div>
  )
}
