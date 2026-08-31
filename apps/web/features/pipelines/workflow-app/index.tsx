import { ReactFlowProvider } from '@xyflow/react'

import type { PipelineWorkflowChildrenProps } from './components/pipeline-workflow-children'

import { PipelineWorkflow } from './components/pipeline-workflow'
import { PipelineWorkflowChildren } from './components/pipeline-workflow-children'

/**
 * Pipeline equivalent of the workflow inner context boundary: one React Flow
 * provider owns the canvas and all sibling workflow surfaces.
 */
export function PipelineWorkflowWithInnerContext(props: PipelineWorkflowChildrenProps) {
  return (
    <ReactFlowProvider>
      <PipelineWorkflow>
        <PipelineWorkflowChildren {...props} />
      </PipelineWorkflow>
    </ReactFlowProvider>
  )
}
