import '@xyflow/react/dist/style.css'
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  ConnectionLineType,
  ReactFlow,
  ReactFlowProvider,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type EdgeTypes,
  type NodeTypes,
  useReactFlow,
  useEdgesState,
  useNodesState,
} from '@xyflow/react'
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from 'react'

import type { PipelineDag, PipelineLayout } from '@/service/pipelines/pipeline-client'
import type { ConnectorSummary, SourceView } from '@/service/source-client'

import type { PipelineNodeConfiguration } from '../../model/pipeline-node-model'
import type {
  PipelineNodeChoice,
  PipelineNodeInsertionContext,
} from '../node-library/pipeline-node-library-types'
import type {
  CanvasEdge,
  CanvasNode,
  PipelineCanvasSelection,
  PipelineNodeConnector,
} from './pipeline-canvas-types'

import { PipelineNodeSelector } from '../node-library/pipeline-node-selector'
import { PipelineCanvasOperator } from './pipeline-canvas-operator'
import { PipelineCanvasToolbar } from './pipeline-canvas-toolbar'
import { PipelineConnectionLine } from './pipeline-connection-line'
import { isPipelineConnectionValid } from './pipeline-connections'
import { PipelineEdge } from './pipeline-edge'
import { flowToPipelineDag, pipelineDagToFlow } from './pipeline-graph'
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

export function PipelineCanvasContent({
  dag,
  layout,
  connectorsBySourceId,
  configurations,
  descriptions,
  onLayoutChange,
  onGraphChange,
  sources,
  connectors,
  sourceState,
  onAddNode,
  onSelectionChange,
  availableWidth,
}: {
  dag: PipelineDag
  layout: PipelineLayout | null
  connectorsBySourceId: ReadonlyMap<string, PipelineNodeConnector>
  configurations: ReadonlyMap<string, PipelineNodeConfiguration>
  descriptions?: ReadonlyMap<string, string>
  onLayoutChange: (next: Pick<PipelineLayout, 'nodes' | 'viewport'>) => void
  onGraphChange: (next: PipelineDag) => void
  sources: SourceView[] | undefined
  connectors: ConnectorSummary[] | undefined
  sourceState: 'loading' | 'success' | 'error'
  onAddNode: (choice: PipelineNodeChoice, context: PipelineNodeInsertionContext) => void
  onSelectionChange: (selection: PipelineCanvasSelection | null) => void
  availableWidth?: number
}) {
  const [nodeInsertion, setNodeInsertion] = useState<PipelineNodeInsertionContext | null>(null)
  const openNodeSelector = useCallback((context: PipelineNodeInsertionContext) => {
    setNodeInsertion(context)
  }, [])
  const graph = useMemo(() => {
    const base = pipelineDagToFlow(dag, layout, connectorsBySourceId, configurations, descriptions)
    return {
      ...base,
      nodes: base.nodes.map((flowNode) => ({
        ...flowNode,
        data: {
          ...flowNode.data,
          onRequestAdd: (
            direction: 'input' | 'output',
            screenPosition?: { x: number; y: number },
          ) => {
            const node = base.nodes.find((candidate) => candidate.id === flowNode.id)
            if (!node) return
            const nodeId = flowNode.id
            const isInput = direction === 'input'
            openNodeSelector({
              position: { x: node.position.x + (isInput ? -300 : 300), y: node.position.y },
              screenPosition,
              connectFrom: isInput ? null : nodeId,
              connectTo: isInput ? nodeId : null,
            })
          },
        },
      })),
      edges: base.edges.map((edge) => ({
        ...edge,
        data: {
          onRequestInsert: (screenPosition: { x: number; y: number }) => {
            const source = base.nodes.find((candidate) => candidate.id === edge.source)
            const target = base.nodes.find((candidate) => candidate.id === edge.target)
            openNodeSelector({
              position:
                source && target
                  ? {
                      x: (source.position.x + target.position.x) / 2,
                      y: (source.position.y + target.position.y) / 2,
                    }
                  : { x: 120, y: 120 },
              screenPosition,
              connectFrom: null,
              connectTo: null,
              insertEdge: { id: edge.id, source: edge.source, target: edge.target },
            })
          },
        },
      })),
    }
  }, [configurations, connectorsBySourceId, dag, descriptions, layout, openNodeSelector])
  const [nodes, setNodes] = useNodesState<CanvasNode>(graph.nodes)
  const [edges, setEdges] = useEdgesState<CanvasEdge>(graph.edges)
  const [viewport, setViewport] = useState<PipelineLayout['viewport']>(graph.viewport)
  const [interactionMode, setInteractionMode] = useState<'pointer' | 'hand'>('hand')
  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  const { screenToFlowPosition } = useReactFlow()

  useEffect(() => {
    nodesRef.current = nodes
  }, [nodes])

  useEffect(() => {
    edgesRef.current = edges
  }, [edges])

  useEffect(() => {
    setNodes(graph.nodes)
    setEdges(graph.edges)
    setViewport(graph.viewport)
  }, [graph, setEdges, setNodes])

  useEffect(() => {
    setNodes((currentNodes) => {
      let changed = false
      const incoming = new Set(edgesRef.current.map((edge) => edge.target))
      const outgoing = new Set(edgesRef.current.map((edge) => edge.source))
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

  function handleNodesChange(changes: NodeChange<CanvasNode>[]) {
    setNodes((currentNodes) => {
      const nextNodes = applyNodeChanges(changes, currentNodes) as CanvasNode[]
      nodesRef.current = nextNodes
      if (changes.some((change) => change.type === 'remove')) {
        onGraphChange(flowToPipelineDag(nextNodes, edgesRef.current))
      }
      return nextNodes
    })
  }

  function handleEdgesChange(changes: EdgeChange<CanvasEdge>[]) {
    setEdges((currentEdges) => {
      const nextEdges = applyEdgeChanges(changes, currentEdges) as CanvasEdge[]
      edgesRef.current = nextEdges
      onGraphChange(flowToPipelineDag(nodesRef.current, nextEdges))
      return nextEdges
    })
  }

  function isValidConnection(connection: Connection | CanvasEdge) {
    return isPipelineConnectionValid(connection, nodesRef.current, edgesRef.current)
  }

  function handleConnect(connection: Connection) {
    if (!isValidConnection(connection) || !connection.source || !connection.target) return
    setEdges((currentEdges) => {
      const nextEdges = addEdge(
        {
          ...connection,
          id: `edge:${connection.source}:${connection.target}`,
          type: 'pipeline',
        },
        currentEdges,
      ) as CanvasEdge[]
      edgesRef.current = nextEdges
      onGraphChange(flowToPipelineDag(nodesRef.current, nextEdges))
      return nextEdges
    })
  }

  return (
    <>
      <PipelineCanvasToolbar
        interactionMode={interactionMode}
        onInteractionModeChange={setInteractionMode}
        onRequestNodeSelector={openNodeSelector}
      />
      <PipelineNodeSelector
        open={nodeInsertion !== null}
        insertion={nodeInsertion}
        sources={sources}
        connectors={connectors}
        sourceState={sourceState}
        onChoose={(choice) => {
          if (!nodeInsertion) return
          onAddNode(choice, nodeInsertion)
          setNodeInsertion(null)
        }}
        onOpenChange={(open) => {
          if (!open) setNodeInsertion(null)
        }}
      />
      <PipelineCanvasOperator availableWidth={availableWidth} />
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
        panOnDrag={interactionMode === 'hand'}
        selectionOnDrag={interactionMode === 'pointer'}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        isValidConnection={isValidConnection}
        onNodeClick={(_, node) =>
          onSelectionChange({
            id: node.id,
            label: node.data.label,
            detail: node.data.detail,
            description: node.data.description,
            nodeType: node.data.nodeType,
            connector: node.data.connector,
            configuration: node.data.configuration,
          })
        }
        onPaneClick={() => onSelectionChange(null)}
        onMoveEnd={(_, nextViewport) => {
          setViewport(nextViewport)
          onLayoutChange(toLayout(nodesRef.current, nextViewport))
        }}
        onNodeDragStop={(_, node) => {
          const nextNodes = nodesRef.current.map((current) =>
            current.id === node.id ? { ...current, position: node.position } : current,
          )
          nodesRef.current = nextNodes
          setNodes(nextNodes)
          onLayoutChange(toLayout(nextNodes, viewport ?? graph.viewport))
        }}
        onPaneContextMenu={(event) => {
          event.preventDefault()
          openNodeSelector({
            position: screenToFlowPosition({ x: event.clientX, y: event.clientY }),
            screenPosition: { x: event.clientX, y: event.clientY },
            connectFrom: null,
            connectTo: null,
          })
        }}
        className="pipeline-canvas"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="var(--pipeline-grid-dot)" gap={18} size={1.15} />
      </ReactFlow>
    </>
  )
}

export function PipelineCanvas(props: ComponentProps<typeof PipelineCanvasContent>) {
  return (
    <ReactFlowProvider>
      <PipelineCanvasContent {...props} />
    </ReactFlowProvider>
  )
}
