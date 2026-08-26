import { BaseEdge, getBezierPath, type ConnectionLineComponentProps, Position } from '@xyflow/react'

/** Keeps the in-progress connection visually consistent with persisted edges. */
export function PipelineConnectionLine({
  fromX,
  fromY,
  toX,
  toY,
  fromPosition,
  toPosition,
  connectionStatus,
}: ConnectionLineComponentProps) {
  const [path] = getBezierPath({
    sourceX: fromX,
    sourceY: fromY,
    sourcePosition: fromPosition ?? Position.Right,
    targetX: toX,
    targetY: toY,
    targetPosition: toPosition ?? Position.Left,
    curvature: 0.22,
  })

  return (
    <BaseEdge
      id="pipeline-connection-preview"
      path={path}
      interactionWidth={24}
      style={{
        stroke:
          connectionStatus === 'invalid'
            ? 'var(--pipeline-edge-invalid)'
            : 'var(--pipeline-selection)',
        strokeWidth: 2,
        strokeDasharray: connectionStatus === 'invalid' ? '4 4' : undefined,
      }}
    />
  )
}
