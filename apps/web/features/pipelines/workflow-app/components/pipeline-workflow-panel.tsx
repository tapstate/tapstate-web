import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'

import type { PipelineDagNode } from '@/service/pipelines/pipeline-client'
import type { SourceView } from '@/service/source-client'

import type { PipelineCanvasSelection } from '../../components/canvas/pipeline-canvas-types'
import type {
  PipelineSchemaOption,
  PipelineTableLoader,
} from '../../components/node-config/pipeline-data-node-schema'
import type {
  PipelineNodeConfigurationChange,
  PipelineSourceTableSelection,
} from '../../model/pipeline-node-model'

import { PipelineNodeConfigPanel } from '../../components/node-config/pipeline-node-config-panel'

const NODE_PANEL_DEFAULT_WIDTH = 509
const PANEL_MIN_WIDTH = 400
const PANEL_MAX_WIDTH = 720
const PANEL_RESIZE_STEP = 16

function clampPanelWidth(width: number) {
  return Math.min(PANEL_MAX_WIDTH, Math.max(PANEL_MIN_WIDTH, width))
}

export interface PipelineWorkflowPanelProps {
  selection: PipelineCanvasSelection
  isReadOnly?: boolean
  onClose: () => void
  onConfigurationChange: (change: PipelineNodeConfigurationChange) => void
  onDescriptionChange: (description: string) => void
  onTitleChange: (title: string) => void
  onDelete: () => void
  nextNodes: readonly PipelineDagNode[]
  onSelectNextNode?: (nodeId: string) => void
  canAddNextStep: boolean
  onRequestNextStep: (screenPosition: { x: number; y: number }) => void
  onWidthChange?: (width: number) => void
  sourceOptions: readonly PipelineSchemaOption[]
  tableOptions?: readonly PipelineSchemaOption[]
  loadTables?: PipelineTableLoader
  sources?: readonly SourceView[]
  upstreamSourceTables?: readonly PipelineSourceTableSelection[]
  fieldTypes?: Readonly<Record<string, string>>
  upstreamInputs?: readonly string[]
}

/** Owns the resizable inspector shell; form rendering remains in the node-config feature. */
export function PipelineWorkflowPanel({
  selection,
  isReadOnly = false,
  onClose,
  onConfigurationChange,
  onDescriptionChange,
  onTitleChange,
  onDelete,
  nextNodes,
  onSelectNextNode,
  canAddNextStep,
  onRequestNextStep,
  onWidthChange,
  sourceOptions,
  tableOptions,
  loadTables,
  sources,
  upstreamSourceTables,
  fieldTypes,
  upstreamInputs,
}: PipelineWorkflowPanelProps) {
  const { t } = useTranslation()
  const [width, setWidth] = useState(NODE_PANEL_DEFAULT_WIDTH)
  const [isResizing, setIsResizing] = useState(false)
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null)

  function handleResizeStart(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    resizeRef.current = { startX: event.clientX, startWidth: width }
    setIsResizing(true)
  }

  function handleResizeMove(event: PointerEvent<HTMLDivElement>) {
    const resize = resizeRef.current
    if (!resize) return
    const nextWidth = clampPanelWidth(resize.startWidth + resize.startX - event.clientX)
    setWidth(nextWidth)
    onWidthChange?.(nextWidth)
  }

  function handleResizeEnd(event: PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId)
    }
    resizeRef.current = null
    setIsResizing(false)
  }

  function handleResizeKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const nextWidth =
      event.key === 'ArrowLeft'
        ? width + PANEL_RESIZE_STEP
        : event.key === 'ArrowRight'
          ? width - PANEL_RESIZE_STEP
          : event.key === 'Home'
            ? PANEL_MIN_WIDTH
            : event.key === 'End'
              ? PANEL_MAX_WIDTH
              : null
    if (nextWidth === null) return
    event.preventDefault()
    const clampedWidth = clampPanelWidth(nextWidth)
    setWidth(clampedWidth)
    onWidthChange?.(clampedWidth)
  }

  return (
    <aside
      className="pipeline-canvas__node-panel absolute right-0 bottom-0 z-20 flex flex-col max-[900px]:right-3 max-[900px]:bottom-3 max-[900px]:left-3 max-[900px]:max-h-[min(30rem,calc(100dvh-5rem))]"
      data-workflow-right-panel
      style={{ '--pipeline-node-panel-width': `${width}px` } as CSSProperties}
    >
      <div
        className="pipeline-canvas__node-panel-resize-handle"
        data-resizing={isResizing ? 'true' : undefined}
        role="separator"
        aria-label={t('pipelines.workspace.config.resizePanel')}
        aria-orientation="vertical"
        aria-valuemin={PANEL_MIN_WIDTH}
        aria-valuemax={PANEL_MAX_WIDTH}
        aria-valuenow={width}
        tabIndex={0}
        onKeyDown={handleResizeKeyDown}
        onPointerDown={handleResizeStart}
        onPointerMove={handleResizeMove}
        onPointerUp={handleResizeEnd}
        onPointerCancel={handleResizeEnd}
      >
        <span aria-hidden="true" />
      </div>
      <div className="pipeline-canvas__node-panel-surface">
        <PipelineNodeConfigPanel
          selection={selection}
          onClose={onClose}
          isReadOnly={isReadOnly}
          onConfigurationChange={onConfigurationChange}
          onDescriptionChange={onDescriptionChange}
          onTitleChange={onTitleChange}
          onDelete={onDelete}
          nextNodes={nextNodes}
          onSelectNextNode={onSelectNextNode}
          canAddNextStep={canAddNextStep}
          onRequestNextStep={onRequestNextStep}
          sourceOptions={sourceOptions}
          tableOptions={tableOptions}
          loadTables={loadTables}
          sources={sources}
          upstreamSourceTables={upstreamSourceTables}
          fieldTypes={fieldTypes}
          upstreamInputs={upstreamInputs}
        />
      </div>
    </aside>
  )
}
