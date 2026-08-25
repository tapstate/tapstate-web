import '@xyflow/react/dist/style.css'
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type EdgeTypes,
  type NodeTypes,
  useEdgesState,
  useNodesState,
} from '@xyflow/react'
import { useEffect, useMemo, useState } from 'react'

import type { PipelineDag, PipelineLayout } from '@/service/pipeline-client'

import type {
  CanvasEdge,
  CanvasNode,
  PipelineCanvasSelection,
  PipelineNodeConnector,
} from './pipeline-canvas-types'

import { PipelineEdge } from './pipeline-edge'
import { pipelineDagToFlow } from './pipeline-graph'
import { PipelineNode } from './pipeline-node'

const nodeTypes: NodeTypes = {
  source: PipelineNode,
  transform: PipelineNode,
  view: PipelineNode,
  serve: PipelineNode,
  target: PipelineNode,
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
  connectorsBySourceId,
  onLayoutChange,
  onSelectionChange,
}: {
  dag: PipelineDag
  layout: PipelineLayout | null
  connectorsBySourceId: ReadonlyMap<string, PipelineNodeConnector>
  onLayoutChange: (next: Pick<PipelineLayout, 'nodes' | 'viewport'>) => void
  onSelectionChange: (selection: PipelineCanvasSelection | null) => void
}) {
  const graph = useMemo(
    () => pipelineDagToFlow(dag, layout, connectorsBySourceId),
    [connectorsBySourceId, dag, layout],
  )
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
      className="pipeline-canvas"
      proOptions={{ hideAttribution: true }}
    >
      <Background color="var(--pipeline-grid-dot)" gap={18} size={1.15} />
      <Controls
        showInteractive={false}
        className="pipeline-canvas__controls !bottom-5 !left-5 max-md:!hidden"
      />
      <MiniMap
        className="pipeline-canvas__minimap !right-5 !bottom-5 max-md:!hidden"
        maskColor="var(--pipeline-minimap-mask)"
        nodeColor="var(--pipeline-minimap-node)"
        pannable
        zoomable
      />
    </ReactFlow>
  )
}
