import '@xyflow/react/dist/style.css'
import {
  Background,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  getBezierPath,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type EdgeProps,
  type EdgeTypes,
  type Node,
  type NodeProps,
  type NodeTypes,
  useEdgesState,
  useNodesState,
} from '@xyflow/react'
import {
  ArrowDownToLine,
  Boxes,
  Braces,
  Code2,
  Combine,
  Database,
  Filter,
  GitFork,
  GitMerge,
  Radio,
  WandSparkles,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { PipelineDag, PipelineLayout } from '@/service/pipeline-client'

import { cn } from '@/lib/utils'

import { pipelineDagToFlow } from './pipeline-graph'

export interface PipelineCanvasSelection {
  id: string
  label: string
  detail: string | null
  nodeType: string
}

interface CanvasNodeData extends Record<string, unknown> {
  label: string
  detail: string | null
  nodeType: string
}

interface CanvasEdgeData extends Record<string, unknown> {
  label?: string
}

type CanvasNode = Node<CanvasNodeData>
type CanvasEdge = Edge<CanvasEdgeData, 'pipeline'>

function NodeIcon({ nodeType, detail }: Pick<CanvasNodeData, 'nodeType' | 'detail'>) {
  if (nodeType === 'source') return <Database className="size-4" aria-hidden="true" />
  if (nodeType === 'target') return <ArrowDownToLine className="size-4" aria-hidden="true" />
  if (nodeType === 'view') return <GitFork className="size-4" aria-hidden="true" />
  if (nodeType === 'serve') return <Radio className="size-4" aria-hidden="true" />
  if (detail === 'filter') return <Filter className="size-4" aria-hidden="true" />
  if (detail === 'map') return <Braces className="size-4" aria-hidden="true" />
  if (detail === 'union') return <Combine className="size-4" aria-hidden="true" />
  if (detail === 'nest') return <Boxes className="size-4" aria-hidden="true" />
  if (detail === 'join') return <GitMerge className="size-4" aria-hidden="true" />
  if (detail === 'js') return <Code2 className="size-4" aria-hidden="true" />
  return <WandSparkles className="size-4" aria-hidden="true" />
}

function nodeTone(nodeType: string) {
  if (nodeType === 'source') return 'bg-sky-50 text-sky-700 ring-sky-200'
  if (nodeType === 'target') return 'bg-amber-50 text-amber-700 ring-amber-200'
  if (nodeType === 'view') return 'bg-violet-50 text-violet-700 ring-violet-200'
  if (nodeType === 'serve') return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  return 'bg-slate-100 text-slate-700 ring-slate-200'
}

function CanvasNodeCard({ data, selected }: NodeProps<CanvasNode>) {
  const { t } = useTranslation()
  const detail = data.detail ?? t('pipelines.workspace.nodeDescriptions.defaultDetail')
  const descriptionKey = `pipelines.workspace.nodeDescriptions.${data.nodeType}`

  return (
    <div
      className={cn(
        'group relative w-60 rounded-[14px] border bg-white p-2.5 shadow-[0_5px_16px_rgba(15,23,42,0.08)] transition-[border-color,box-shadow,transform] duration-150 motion-reduce:transition-none',
        selected
          ? 'border-blue-500 shadow-[0_10px_26px_rgba(37,99,235,0.18)]'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-[0_8px_22px_rgba(15,23,42,0.12)]',
      )}
    >
      <Handle
        id="input"
        type="target"
        position={Position.Left}
        isConnectable={false}
        className={cn(
          '!top-[1.15rem] !-left-2 !size-4 !rounded-none !border-0 !bg-transparent !outline-none before:absolute before:top-1/2 before:left-1.5 before:h-2 before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-slate-300 before:transition-[background-color,transform] group-hover:before:scale-y-125 group-hover:before:bg-slate-500',
          selected && 'before:bg-blue-500',
        )}
        aria-label={t('pipelines.workspace.handles.input', { node: data.label })}
      />
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset',
            nodeTone(data.nodeType),
          )}
        >
          <NodeIcon nodeType={data.nodeType} detail={data.detail} />
        </span>
        <span className="min-w-0 pt-0.5">
          <span className="block truncate text-[13px] leading-4 font-semibold text-slate-800">
            {data.label}
          </span>
          <span className="mt-1 block truncate text-[11px] leading-4 text-slate-500">
            {t(descriptionKey, { detail })}
          </span>
        </span>
      </div>
      <Handle
        id="output"
        type="source"
        position={Position.Right}
        isConnectable={false}
        className={cn(
          '!top-[1.15rem] !-right-2 !size-4 !rounded-none !border-0 !bg-transparent !outline-none before:absolute before:top-1/2 before:right-1.5 before:h-2 before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-slate-300 before:transition-[background-color,transform] group-hover:before:scale-y-125 group-hover:before:bg-slate-500',
          selected && 'before:bg-blue-500',
        )}
        aria-label={t('pipelines.workspace.handles.output', { node: data.label })}
      />
    </div>
  )
}

function PipelineEdge({
  id,
  data,
  markerEnd,
  selected,
  sourceX,
  sourceY,
  targetX,
  targetY,
}: EdgeProps<CanvasEdge>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: sourceX - 8,
    sourceY,
    sourcePosition: Position.Right,
    targetX: targetX + 8,
    targetY,
    targetPosition: Position.Left,
    curvature: 0.16,
  })

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: selected ? '#2563eb' : '#9aa9bd',
          strokeWidth: selected ? 2.25 : 1.8,
        }}
      />
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            className="pointer-events-none absolute rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] leading-3 font-medium text-slate-500 shadow-[0_2px_6px_rgba(15,23,42,0.08)]"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

const nodeTypes: NodeTypes = {
  source: CanvasNodeCard,
  transform: CanvasNodeCard,
  view: CanvasNodeCard,
  serve: CanvasNodeCard,
  target: CanvasNodeCard,
}

const edgeTypes: EdgeTypes = {
  pipeline: PipelineEdge,
}

function toLayout(
  nodes: CanvasNode[],
  viewport: PipelineLayout['viewport'],
): Pick<PipelineLayout, 'nodes' | 'viewport'> {
  return {
    nodes: Object.fromEntries(nodes.map((node) => [node.id, node.position])),
    viewport,
  }
}

export function PipelineCanvas({
  dag,
  layout,
  onLayoutChange,
  onSelectionChange,
}: {
  dag: PipelineDag
  layout: PipelineLayout | null
  onLayoutChange: (next: Pick<PipelineLayout, 'nodes' | 'viewport'>) => void
  onSelectionChange: (selection: PipelineCanvasSelection | null) => void
}) {
  const graph = useMemo(() => pipelineDagToFlow(dag, layout), [dag, layout])
  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNode>(graph.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<CanvasEdge>(graph.edges)
  const [viewport, setViewport] = useState<PipelineLayout['viewport']>(graph.viewport)

  useEffect(() => {
    setNodes(graph.nodes)
    setEdges(graph.edges)
    setViewport(graph.viewport)
  }, [graph, setEdges, setNodes])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      defaultViewport={graph.viewport ?? undefined}
      fitView={!graph.viewport}
      fitViewOptions={{ padding: 0.24, maxZoom: 1 }}
      minZoom={0.2}
      maxZoom={1.6}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={(_, node) =>
        onSelectionChange({
          id: node.id,
          label: node.data.label,
          detail: node.data.detail,
          nodeType: node.data.nodeType,
        })
      }
      onPaneClick={() => onSelectionChange(null)}
      onMoveEnd={(_, nextViewport) => {
        setViewport(nextViewport)
        onLayoutChange(toLayout(nodes, nextViewport))
      }}
      onNodeDragStop={(_, node) => {
        const nextNodes = nodes.map((current) =>
          current.id === node.id ? { ...current, position: node.position } : current,
        )
        setNodes(nextNodes)
        onLayoutChange(toLayout(nextNodes, viewport))
      }}
      className="bg-[#f8faff]"
      proOptions={{ hideAttribution: true }}
    >
      <Background color="#d8e1ee" gap={20} size={1} />
      <Controls
        showInteractive={false}
        className="!bottom-5 !left-5 !overflow-hidden !rounded-[14px] !border !border-slate-200 !bg-white !shadow-[0_8px_22px_rgba(15,23,42,0.12)] max-md:!hidden"
      />
      <MiniMap
        className="!right-5 !bottom-5 !rounded-[14px] !border !border-slate-200 !bg-white !shadow-[0_8px_22px_rgba(15,23,42,0.12)] max-md:!hidden"
        maskColor="rgba(248,250,255,0.76)"
        nodeColor="#7b8ba4"
        pannable
        zoomable
      />
    </ReactFlow>
  )
}
