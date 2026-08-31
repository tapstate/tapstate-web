import type { ReactNode } from 'react'

interface PipelineWorkflowProps {
  children: ReactNode
}

/** Owns the shared stacking context for the workflow header, panels, and canvas. */
export function PipelineWorkflow({ children }: PipelineWorkflowProps) {
  return (
    <div
      id="pipeline-workflow-container"
      className="pipeline-workflow-container relative isolate size-full min-w-0 overflow-hidden"
      data-testid="pipeline-workflow-container"
    >
      {children}
    </div>
  )
}
