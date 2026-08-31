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
    <div className="pipeline-workflow-header pointer-events-none" data-workflow-header>
      <div
        className="pipeline-workflow-header__actions pointer-events-auto flex items-center gap-1.5 rounded-xl border p-1 shadow-sm"
        role="toolbar"
        aria-label={t('pipelines.workspace.actions.toolbar')}
      >
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold transition-[background-color,color,transform] hover:bg-slate-100 focus-visible:ring-3 focus-visible:ring-[var(--pipeline-selection-ring)] focus-visible:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
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
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-[12px] font-semibold text-white transition-[background-color,transform] hover:bg-slate-700 focus-visible:ring-3 focus-visible:ring-[var(--pipeline-selection-ring)] focus-visible:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
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
