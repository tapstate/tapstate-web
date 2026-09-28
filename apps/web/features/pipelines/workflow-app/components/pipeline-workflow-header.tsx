import { Play, Save } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export interface PipelineWorkflowHeaderProps {
  placement?: 'floating' | 'sticky'
  isDirty: boolean
  isSaving: boolean
  isRunning: boolean
  isBusy?: boolean
  isReadOnly?: boolean
  canSave?: boolean
  saveLabel?: string
  savePendingLabel?: string
  runLabel?: string
  runPendingLabel?: string
  onSave: () => void
  onRun: () => void
}

/** Owns the workflow-level actions independently from the canvas and inspector. */
export function PipelineWorkflowHeader({
  placement = 'floating',
  isDirty,
  isSaving,
  isRunning,
  isBusy = false,
  isReadOnly = false,
  canSave,
  saveLabel,
  savePendingLabel,
  runLabel,
  runPendingLabel,
  onSave,
  onRun,
}: PipelineWorkflowHeaderProps) {
  const { t } = useTranslation()

  return (
    <div
      className={
        placement === 'sticky'
          ? 'pipeline-workflow-header--sticky pointer-events-none sticky bottom-0 z-10 w-full shrink-0'
          : 'pointer-events-none absolute top-7 left-0 z-10 flex h-0 w-full items-center justify-between px-3'
      }
      data-workflow-header
      data-placement={placement}
    >
      <div
        className="pointer-events-auto ml-auto flex items-center gap-2"
        role="toolbar"
        aria-label={t('pipelines.workspace.actions.toolbar')}
      >
        <div className="border-pipeline-actionbar-border bg-pipeline-actionbar-bg flex h-8 items-center rounded-lg border-[0.5px] px-0.5 shadow-xs backdrop-blur-[10px]">
          <button
            type="button"
            className="hover:bg-pipeline-actionbar-bg-accent inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-[var(--pipeline-text-muted)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--pipeline-selection-ring)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isReadOnly || !(canSave ?? isDirty) || isSaving || isBusy}
            onClick={onSave}
          >
            <Save className="size-3.5" aria-hidden="true" />
            {isSaving
              ? (savePendingLabel ?? t('pipelines.workspace.actions.saving'))
              : (saveLabel ?? t('pipelines.workspace.actions.save'))}
          </button>
        </div>
        <button
          type="button"
          className="bg-pipeline-actionbar-primary hover:bg-pipeline-actionbar-primary-hover inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium text-white shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-[var(--pipeline-selection-ring)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isReadOnly || isRunning || isSaving || isBusy}
          aria-busy={isRunning}
          onClick={onRun}
        >
          <Play className="size-3.5" aria-hidden="true" />
          {isRunning
            ? (runPendingLabel ?? t('pipelines.workspace.actions.running'))
            : (runLabel ?? t('pipelines.workspace.actions.run'))}
        </button>
      </div>
    </div>
  )
}
