import type { MouseEvent, ReactNode, Ref } from 'react'

import { Link } from '@tanstack/react-router'
import { Button } from '@tapstate-web/ui/button'
import { useReactFlow } from '@xyflow/react'
import { useTranslation } from 'react-i18next'

import type { PipelineCatalogState } from '@/service/pipelines/pipeline-client'

import { PipelineStatusBadge } from '../../components/pipeline-status-badge'

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
  runButtonId?: string
  runButtonRef?: Ref<HTMLButtonElement>
  runButtonActiveGuide?: boolean
  dockStatus?: ReactNode
  draftUpdatedAt?: string | null
  hasPublishedArtifact?: boolean
  runtimeStatus?: PipelineCatalogState
  pipelineId?: string
  selectedNodeId?: string | null
  stopAction?: ReactNode
  onSave: () => void
  onRun: () => void
}

function ScrollToSelectedNodeButton({ selectedNodeId }: { selectedNodeId: string }) {
  const { getNode, getViewport, setCenter } = useReactFlow()

  function scrollToSelectedNode(event: MouseEvent<HTMLButtonElement>) {
    const node = getNode(selectedNodeId)
    const workspace = event.currentTarget.closest<HTMLElement>(
      '[data-testid="pipeline-workflow-container"]',
    )
    if (!node || !workspace) return
    const panel = workspace.querySelector<HTMLElement>('[data-workflow-right-panel]')
    const zoom = getViewport().zoom
    const panelWidth = panel?.getBoundingClientRect().width ?? 0
    const centerX = node.position.x + (node.measured?.width ?? 240) / 2 + panelWidth / (2 * zoom)
    const centerY = node.position.y + (node.measured?.height ?? 56) / 2
    void setCenter(centerX, centerY, { zoom, duration: 180 })
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="small"
      className="pointer-events-auto absolute left-1/2 -translate-x-1/2"
      onClick={scrollToSelectedNode}
    >
      {useTranslation().t('pipelines.workspace.actions.scrollToSelectedNode')}
    </Button>
  )
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
  runButtonId,
  runButtonRef,
  runButtonActiveGuide,
  dockStatus,
  draftUpdatedAt,
  hasPublishedArtifact = false,
  runtimeStatus,
  pipelineId,
  selectedNodeId,
  stopAction,
  onSave,
  onRun,
}: PipelineWorkflowHeaderProps) {
  const { t } = useTranslation()
  const toolbar = (
    <div
      className="pointer-events-auto ml-auto flex items-center gap-2"
      role="toolbar"
      aria-label={t('pipelines.workspace.actions.toolbar')}
    >
      <div className="border-components-button-secondary-border bg-components-button-secondary-bg flex h-8 items-center rounded-lg border-[0.5px] px-0.5 shadow-xs">
        {stopAction ??
          (!isReadOnly && (
            <button
              ref={runButtonRef}
              id={runButtonId}
              data-guide-active={runButtonActiveGuide || undefined}
              type="button"
              className="text-components-button-secondary-accent-text hover:bg-state-accent-hover flex h-7 cursor-pointer items-center rounded-md px-2.5 text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isRunning || isSaving || isBusy}
              aria-busy={isRunning}
              onClick={onRun}
            >
              <span className="i-ri-play-large-line mr-1 size-4" aria-hidden="true" />
              {isRunning
                ? (runPendingLabel ?? t('pipelines.workspace.actions.running'))
                : (runLabel ?? t('pipelines.workspace.actions.run'))}
            </button>
          ))}
        {pipelineId && (
          <>
            <span className="bg-divider-regular mx-0.5 h-3.5 w-px" aria-hidden="true" />
            <Link
              to="/pipelines/$pipelineId/edit/logs"
              params={{ pipelineId }}
              className="text-components-button-ghost-text hover:bg-state-accent-hover hover:text-components-button-secondary-accent-text flex size-7 items-center justify-center rounded-md"
              aria-label={t('pipelines.workspace.navigation.logs')}
              title={t('pipelines.workspace.navigation.logs')}
            >
              <span className="i-ri-history-line size-4" aria-hidden="true" />
            </Link>
          </>
        )}
      </div>
      {pipelineId && (
        <div className="border-components-button-secondary-border bg-components-button-secondary-bg flex h-8 items-center rounded-lg border-[0.5px] shadow-xs backdrop-blur-[10px]">
          <Link
            to="/pipelines/$pipelineId/edit/monitoring"
            params={{ pipelineId }}
            className="hover:bg-state-base-hover text-text-tertiary hover:text-text-secondary flex size-8 items-center justify-center rounded-md"
            aria-label={t('pipelines.workspace.navigation.monitoring')}
            title={t('pipelines.workspace.navigation.monitoring')}
          >
            <span className="i-ri-line-chart-line size-4" aria-hidden="true" />
          </Link>
        </div>
      )}
      {!isReadOnly && (
        <Button
          type="button"
          variant="primary"
          size="medium"
          disabled={!(canSave ?? isDirty) || isSaving || isBusy}
          onClick={onSave}
        >
          <span className="i-ri-save-3-line size-4" aria-hidden="true" />
          {isSaving
            ? (savePendingLabel ?? t('pipelines.workspace.actions.saving'))
            : (saveLabel ?? t('pipelines.workspace.actions.save'))}
        </Button>
      )}
    </div>
  )
  const builderActions = (
    <div
      className="pointer-events-auto ml-auto flex items-center gap-2"
      role="toolbar"
      aria-label={t('pipelines.workspace.actions.toolbar')}
    >
      <div data-assistant-apply-action-slot className="flex items-center gap-2 empty:hidden" />
      {!isReadOnly && (
        <Button
          type="button"
          variant="secondary"
          size="medium"
          disabled={!(canSave ?? isDirty) || isSaving || isBusy}
          onClick={onSave}
        >
          <span className="i-ri-save-3-line size-4" aria-hidden="true" />
          {isSaving
            ? (savePendingLabel ?? t('pipelines.workspace.actions.saving'))
            : (saveLabel ?? t('pipelines.workspace.actions.save'))}
        </Button>
      )}
      {stopAction ??
        (!isReadOnly && (
          <Button
            ref={runButtonRef}
            id={runButtonId}
            type="button"
            variant="primary"
            size="medium"
            disabled={isRunning || isSaving || isBusy}
            aria-busy={isRunning}
            onClick={onRun}
          >
            <span className="i-ri-play-large-line size-4" aria-hidden="true" />
            {isRunning
              ? (runPendingLabel ?? t('pipelines.workspace.actions.running'))
              : (runLabel ?? t('pipelines.workspace.actions.run'))}
          </Button>
        ))}
    </div>
  )

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
      {placement === 'sticky' ? (
        <>
          <svg
            aria-hidden="true"
            className="pipeline-workflow-action-dock__filters"
            focusable="false"
          >
            <defs>
              <filter
                id="pipeline-workflow-action-dock-refraction"
                x="-8%"
                y="-35%"
                width="116%"
                height="170%"
                colorInterpolationFilters="sRGB"
              >
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency="0.012 0.08"
                  numOctaves="1"
                  seed="7"
                  result="glass-ripple"
                />
                <feDisplacementMap
                  in="SourceGraphic"
                  in2="glass-ripple"
                  scale="6"
                  xChannelSelector="R"
                  yChannelSelector="G"
                />
              </filter>
            </defs>
          </svg>
          <div className="pipeline-workflow-action-dock">
            {dockStatus}
            {builderActions}
          </div>
        </>
      ) : (
        <>
          <div
            role="status"
            className="system-xs-regular text-text-tertiary pointer-events-none ml-1 flex h-4.5 min-w-75 items-center whitespace-nowrap"
          >
            {isSaving || isDirty ? (
              <span>{isSaving ? t('wizard.autosaving') : t('wizard.unsavedChanges')}</span>
            ) : (
              <>
                <span className="flex items-center gap-1">
                  <span>{t('pipelines.workspace.actions.autoSaved')}</span>
                  {draftUpdatedAt && !Number.isNaN(Date.parse(draftUpdatedAt)) && (
                    <time dateTime={draftUpdatedAt}>
                      {new Date(draftUpdatedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false,
                        timeZoneName: 'short',
                      })}
                    </time>
                  )}
                </span>
                <span aria-hidden="true" className="mx-1">
                  ·
                </span>
                <span>
                  {hasPublishedArtifact
                    ? t('pipelines.workspace.actions.published')
                    : t('pipelines.workspace.actions.unpublished')}
                </span>
              </>
            )}
            {runtimeStatus && (
              <>
                <span aria-hidden="true" className="mx-1">
                  ·
                </span>
                <PipelineStatusBadge status={runtimeStatus} className="h-4 px-1 text-[9px]" />
              </>
            )}
          </div>
          {selectedNodeId && <ScrollToSelectedNodeButton selectedNodeId={selectedNodeId} />}
          {toolbar}
        </>
      )}
    </div>
  )
}
