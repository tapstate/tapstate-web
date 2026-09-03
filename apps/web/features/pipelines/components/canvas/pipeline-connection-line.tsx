import { getBezierPath, Position, type ConnectionLineComponentProps } from '@xyflow/react'

/** Mirrors Dify's lightweight connection preview and endpoint marker. */
export function PipelineConnectionLine({
  fromX,
  fromY,
  toX,
  toY,
  fromPosition,
  toPosition,
}: ConnectionLineComponentProps) {
  const [path] = getBezierPath({
    sourceX: fromX,
    sourceY: fromY,
    sourcePosition: fromPosition ?? Position.Right,
    targetX: toX,
    targetY: toY,
    targetPosition: toPosition ?? Position.Left,
    curvature: 0.16,
  })

  return (
    <g>
      <path fill="none" stroke="var(--pipeline-edge-preview)" strokeWidth={2} d={path} />
      <rect x={toX} y={toY - 4} width={2} height={8} fill="var(--pipeline-edge-preview-target)" />
    </g>
  )
}
