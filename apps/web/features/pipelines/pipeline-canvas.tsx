import '@xyflow/react/dist/style.css'
import {
  Background,
  BaseEdge,
  Controls,
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
  hasInput: boolean
  hasOutput: boolean
}

type CanvasNode = Node<CanvasNodeData>
type CanvasEdge = Edge<Record<string, never>, 'pipeline'>

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
        'group relative w-56 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.08)] transition-[border-color,box-shadow] duration-150 hover:border-slate-300 hover:shadow-[0_8px_18px_rgba(15,23,42,0.12)] motion-reduce:transition-none',
        selected && 'border-[#528bff] ring-2 ring-[#528bff]/25',
      )}
    >
      {data.hasInput && (
        <Handle
          id="input"
          type="target"
          position={Position.Left}
          isConnectable={false}
          className={cn(
            '!top-1/2 !-left-2 !size-4 !rounded-none !border-0 !bg-transparent !outline-none before:absolute before:top-1/2 before:left-1.5 before:h-3 before:w-0.5 before:-translate-y-1/2 before:bg-slate-300 before:transition-[background-color,transform] group-hover:before:scale-y-125 group-hover:before:bg-slate-500',
            selected && 'before:bg-[#528bff]',
          )}
          aria-label={t('pipelines.workspace.handles.input', { node: data.label })}
        />
      )}
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={cn(
            'flex size-6 shrink-0 items-center justify-center rounded-md ring-1 ring-inset',
            nodeTone(data.nodeType),
          )}
        >
          <NodeIcon nodeType={data.nodeType} detail={data.detail} />
        </span>
        <span className="min-w-0 truncate text-[13px] leading-5 font-semibold text-slate-800">
          {data.label}
        </span>
      </div>
      <p className="mt-2 min-h-5 truncate px-0.5 text-[11px] leading-5 text-slate-500">
        {t(descriptionKey, { detail })}
      </p>
      {data.hasOutput && (
        <Handle
          id="output"
          type="source"
          position={Position.Right}
          isConnectable={false}
          className={cn(
            '!top-1/2 !-right-2 !size-4 !rounded-none !border-0 !bg-transparent !outline-none before:absolute before:top-1/2 before:right-1.5 before:h-3 before:w-0.5 before:-translate-y-1/2 before:bg-slate-300 before:transition-[background-color,transform] group-hover:before:scale-y-125 group-hover:before:bg-slate-500',
            selected && 'before:bg-[#528bff]',
          )}
          aria-label={t('pipelines.workspace.handles.output', { node: data.label })}
        />
      )}
    </div>
  )
}

function PipelineEdge({
  id,
  markerEnd,
  selected,
  sourceX,
  sourceY,
  targetX,
  targetY,
}: EdgeProps<CanvasEdge>) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition: Position.Right,
    targetX,
    targetY,
    targetPosition: Position.Left,
    curvature: 0.22,
  })

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: selected ? '#528bff' : '#cbd5e1',
          strokeWidth: selected ? 2.25 : 1.75,
        }}
      />
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
      fitViewOptions={{ padding: 0.36, maxZoom: 0.92 }}
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
      <Background color="#bdcce0" gap={18} size={1.15} />
      <Controls
        showInteractive={false}
        className="!bottom-5 !left-[17rem] !overflow-hidden !rounded-xl !border !border-slate-200 !bg-white !shadow-[0_6px_18px_rgba(15,23,42,0.1)] max-md:!left-16 max-md:!hidden"
      />
      <MiniMap
        className="!right-5 !bottom-5 !rounded-xl !border !border-slate-200 !bg-white !shadow-[0_6px_18px_rgba(15,23,42,0.1)] max-md:!hidden"
        maskColor="rgba(248,250,255,0.76)"
        nodeColor="#7b8ba4"
        pannable
        zoomable
      />
    </ReactFlow>
  )
}
