import '@xyflow/react/dist/style.css'
import {
  addEdge,
  Background,
  ConnectionLineType,
  Controls,
  MiniMap,
  ReactFlow,
  type Connection,
  type EdgeChange,
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
import type { PipelineNodeConfiguration } from './pipeline-node-model'

import { PipelineConnectionLine } from './pipeline-connection-line'
import { isPipelineConnectionValid } from './pipeline-connections'
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
  configurations,
  onLayoutChange,
  onSelectionChange,
}: {
  dag: PipelineDag
  layout: PipelineLayout | null
  connectorsBySourceId: ReadonlyMap<string, PipelineNodeConnector>
  configurations: ReadonlyMap<string, PipelineNodeConfiguration>
  onLayoutChange: (next: Pick<PipelineLayout, 'nodes' | 'viewport'>) => void
  onSelectionChange: (selection: PipelineCanvasSelection | null) => void
}) {
  const graph = useMemo(
    () => pipelineDagToFlow(dag, layout, connectorsBySourceId, configurations),
    [configurations, connectorsBySourceId, dag, layout],
  )
  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNode>(graph.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<CanvasEdge>(graph.edges)
  const [viewport, setViewport] = useState<PipelineLayout['viewport']>(graph.viewport)

  useEffect(() => {
    setNodes(graph.nodes)
    setEdges(graph.edges)
    setViewport(graph.viewport)
  }, [graph, setEdges, setNodes])

  useEffect(() => {
    setNodes((currentNodes) => {
      let changed = false
      const incoming = new Set(edges.map((edge) => edge.target))
      const outgoing = new Set(edges.map((edge) => edge.source))
      const nextNodes = currentNodes.map((node) => {
        const hasInput = incoming.has(node.id)
        const hasOutput = outgoing.has(node.id)
        if (node.data.hasInput === hasInput && node.data.hasOutput === hasOutput) return node
        changed = true
        return { ...node, data: { ...node.data, hasInput, hasOutput } }
      })
      return changed ? nextNodes : currentNodes
    })
  }, [edges, setNodes])

  function handleEdgesChange(changes: EdgeChange<CanvasEdge>[]) {
    onEdgesChange(changes)
  }

  function isValidConnection(connection: Connection | CanvasEdge) {
    return isPipelineConnectionValid(connection, nodes, edges)
  }

  function handleConnect(connection: Connection) {
    if (!isValidConnection(connection) || !connection.source || !connection.target) return
    setEdges((currentEdges) =>
      addEdge(
        {
          ...connection,
          id: `edge:${connection.source}:${connection.target}`,
          type: 'pipeline',
        },
        currentEdges,
      ),
    )
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      connectionLineComponent={PipelineConnectionLine}
      connectionLineType={ConnectionLineType.Bezier}
      defaultViewport={graph.viewport ?? undefined}
      fitView={!graph.viewport}
      fitViewOptions={{ padding: 0.36, maxZoom: 0.92 }}
      minZoom={0.2}
      maxZoom={1.6}
      onNodesChange={onNodesChange}
      onEdgesChange={handleEdgesChange}
      onConnect={handleConnect}
      isValidConnection={isValidConnection}
      onNodeClick={(_, node) =>
        onSelectionChange({
          id: node.id,
          label: node.data.label,
          detail: node.data.detail,
          nodeType: node.data.nodeType,
          configuration: node.data.configuration,
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
