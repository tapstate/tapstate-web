import '@xyflow/react/dist/style.css'
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
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

type CanvasNode = Node<CanvasNodeData>

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
  return (
    <div
      className={cn(
        'min-w-52 rounded-xl border bg-white p-2.5 shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition-[border-color,box-shadow,transform] duration-150',
        selected
          ? 'border-blue-500 shadow-[0_12px_30px_rgba(37,99,235,0.18)]'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-[0_10px_26px_rgba(15,23,42,0.11)]',
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={false}
        className="!size-2.5 !border-2 !border-white !bg-slate-400"
      />
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset',
            nodeTone(data.nodeType),
          )}
        >
          <NodeIcon nodeType={data.nodeType} detail={data.detail} />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-semibold text-slate-800">
            {data.label}
          </span>
          <span className="mt-0.5 block truncate text-[11px] font-medium text-slate-500">
            {data.detail ?? data.nodeType}
          </span>
        </span>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={false}
        className="!size-2.5 !border-2 !border-white !bg-blue-500"
      />
    </div>
  )
}

const nodeTypes: NodeTypes = {
  source: CanvasNodeCard,
  transform: CanvasNodeCard,
  view: CanvasNodeCard,
  serve: CanvasNodeCard,
  target: CanvasNodeCard,
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
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(graph.edges)
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
      className="bg-[#fbfcfe]"
      proOptions={{ hideAttribution: true }}
    >
      <Background color="#dce3ef" gap={20} size={1} />
      <Controls
        showInteractive={false}
        className="!overflow-hidden !rounded-xl !border !border-slate-200 !bg-white !shadow-[0_8px_24px_rgba(15,23,42,0.1)]"
      />
      <MiniMap
        className="!rounded-xl !border !border-slate-200 !bg-white !shadow-[0_8px_24px_rgba(15,23,42,0.1)]"
        maskColor="rgba(248,250,252,0.72)"
        nodeColor="#94a3b8"
        pannable
        zoomable
      />
    </ReactFlow>
  )
}
