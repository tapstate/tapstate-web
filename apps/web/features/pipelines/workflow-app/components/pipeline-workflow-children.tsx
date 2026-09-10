import type { ComponentProps } from 'react'

import type { PipelineCanvasSelection } from '../../components/canvas/pipeline-canvas-types'
import type { PipelineWorkflowHeaderProps } from './pipeline-workflow-header'
import type { PipelineWorkflowPanelProps } from './pipeline-workflow-panel'

import { PipelineCanvasContent } from '../../components/canvas/pipeline-canvas'
import { PipelineWorkflowHeader } from './pipeline-workflow-header'
import { PipelineWorkflowPanel } from './pipeline-workflow-panel'

export interface PipelineWorkflowChildrenProps {
  canvas: ComponentProps<typeof PipelineCanvasContent>
  header: PipelineWorkflowHeaderProps
  panel: Omit<PipelineWorkflowPanelProps, 'selection'> & {
    selection: PipelineCanvasSelection | null
  }
}

/**
 * Composes the workflow surface layers in one place. The canvas owns React
 * Flow primitives and its local operators; the header and inspector remain
 * siblings so their z-index and available-width contracts are predictable.
 */
export function PipelineWorkflowChildren({ canvas, header, panel }: PipelineWorkflowChildrenProps) {
  return (
    <>
      <PipelineWorkflowHeader {...header} />
      {panel.selection && <PipelineWorkflowPanel {...panel} selection={panel.selection} />}
      <PipelineCanvasContent {...canvas} />
    </>
  )
}
