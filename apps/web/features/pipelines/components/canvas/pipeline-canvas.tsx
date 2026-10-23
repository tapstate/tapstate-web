import '@xyflow/react/dist/style.css'
import { TooltipProvider } from '@langgenius/dify-ui/tooltip'
import { useOptionalToast } from '@tapstate-web/ui'
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
  type Viewport,
  useReactFlow,
  useEdgesState,
  useNodesState,
} from '@xyflow/react'
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'

import type { PipelineDag, PipelineLayout } from '@/service/pipelines/pipeline-client'
import type { ConnectorSummary, SourceView } from '@/service/source-client'

import type { PipelineNodeConfiguration } from '../../model/pipeline-node-model'
import type { PipelineTableLoader } from '../node-config/pipeline-data-node-schema'
import type {
  PipelineNodeChoice,
  PipelineNodeInsertionContext,
} from '../node-library/pipeline-node-library-types'
import type {
  CanvasEdge,
  CanvasNode,
  CanvasNoteRecord,
  PipelineCanvasSelection,
  PipelineCanvasNotesChangeOptions,
  PipelineNodeConnector,
} from './pipeline-canvas-types'

import {
  canPipelineNodeAcceptInput,
  canPipelineNodeEmitOutput,
} from '../../model/pipeline-node-rules'
import { PipelineNodeSelector } from '../node-library/pipeline-node-selector'
import { PipelineCanvasNote } from './pipeline-canvas-note'
import { applyCanvasNotePositions, readCanvasNotes } from './pipeline-canvas-notes'
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
  note: PipelineCanvasNote,
}

const edgeTypes: EdgeTypes = {
  pipeline: PipelineEdge,
}

function toLayout(
  nodes: CanvasNode[],
  viewport: PipelineLayout['viewport'],
): Pick<PipelineLayout, 'nodes' | 'viewport'> {
  return {
    nodes: Object.fromEntries(
      nodes.filter((node) => node.type !== 'note').map((node) => [node.id, node.position]),
    ),
    viewport,
  }
}

export function PipelineCanvasContent({
  pipelineId,
  dag,
  layout,
  connectorsBySourceId,
  configurations,
  descriptions,
  onLayoutChange,
  onGraphChange,
  requestedInsertion,
  canUndo = false,
  canRedo = false,
  historyPastCount = 0,
  historyFutureCount = 0,
  onUndo,
  onRedo,
  onJumpHistory,
  sources,
  connectors,
  sourceState,
  onAddNode,
  onAddNodes,
  loadTables,
  onSelectionChange,
  notes: controlledNotes,
  onNotesChange,
  focusNodeId,
  readOnly = false,
}: {
  pipelineId: string
  dag: PipelineDag
  layout: PipelineLayout | null
  connectorsBySourceId: ReadonlyMap<string, PipelineNodeConnector>
  configurations: ReadonlyMap<string, PipelineNodeConfiguration>
  descriptions?: ReadonlyMap<string, string>
  onLayoutChange: (next: Pick<PipelineLayout, 'nodes' | 'viewport'>) => void
  onGraphChange: (next: PipelineDag) => void
  requestedInsertion?: PipelineNodeInsertionContext | null
  canUndo?: boolean
  canRedo?: boolean
  historyPastCount?: number
  historyFutureCount?: number
  onUndo?: () => void
  onRedo?: () => void
  onJumpHistory?: (direction: 'undo' | 'redo', steps: number) => void
  sources: SourceView[] | undefined
  connectors: ConnectorSummary[] | undefined
  sourceState: 'loading' | 'success' | 'error'
  onAddNode: (choice: PipelineNodeChoice, context: PipelineNodeInsertionContext) => void
  onAddNodes?: (
    choices: readonly PipelineNodeChoice[],
    context: PipelineNodeInsertionContext,
  ) => void
  loadTables?: PipelineTableLoader
  onSelectionChange: (selection: PipelineCanvasSelection | null) => void
  notes?: CanvasNoteRecord[]
  onNotesChange?: (notes: CanvasNoteRecord[], options?: PipelineCanvasNotesChangeOptions) => void
  focusNodeId?: string | null
  readOnly?: boolean
}) {
  const { t } = useTranslation()
  const toast = useOptionalToast()
  const [nodeInsertion, setNodeInsertion] = useState<PipelineNodeInsertionContext | null>(null)
  const [localNotes, setLocalNotes] = useState<CanvasNoteRecord[]>(() =>
    readCanvasNotes(pipelineId),
  )
  const notes = controlledNotes ?? localNotes
  const [placingNote, setPlacingNote] = useState(false)
  const notesPipelineIdRef = useRef(pipelineId)
  const skipInitialNotesPersistenceRef = useRef(true)
  const notesPersistenceWarningShownRef = useRef(false)
  const updateNotes = useCallback(
    (nextNotes: CanvasNoteRecord[], options?: PipelineCanvasNotesChangeOptions) => {
      if (controlledNotes === undefined) setLocalNotes(nextNotes)
      onNotesChange?.(nextNotes, options)
    },
    [controlledNotes, onNotesChange],
  )
  const openNodeSelector = useCallback((context: PipelineNodeInsertionContext) => {
    setNodeInsertion(context)
  }, [])

  useEffect(() => {
    if (requestedInsertion) setNodeInsertion(requestedInsertion)
  }, [requestedInsertion])
  const [nodes, setNodes] = useNodesState<CanvasNode>([])
  const [edges, setEdges] = useEdgesState<CanvasEdge>([])
  const [viewport, setViewport] = useState<PipelineLayout['viewport']>(null)
  const [fitView, setFitView] = useState(() => !layout?.viewport)
  const [interactionMode, setInteractionMode] = useState<'pointer' | 'hand'>('hand')
  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  const preserveSelectionOnPaneClickRef = useRef(false)
  const {
    screenToFlowPosition,
    fitView: fitCanvasView,
    getNode,
    getViewport,
    setViewport: panViewport,
  } = useReactFlow()

  const persistViewport = useCallback(
    (nextViewport: Viewport) => {
      if (readOnly) return
      setViewport(nextViewport)
      onLayoutChange(toLayout(nodesRef.current, nextViewport))
    },
    [onLayoutChange, readOnly, setViewport],
  )

  const keepSelectedNodeVisible = useCallback(
    (nodeId: string) => {
      requestAnimationFrame(() => {
        const workspace = document.querySelector<HTMLElement>(
          '[data-testid="pipeline-workflow-container"]',
        )
        const panel = workspace?.querySelector<HTMLElement>('[data-workflow-right-panel]')
        const canvas = workspace?.querySelector<HTMLElement>('.react-flow')
        const node = getNode(nodeId)
        if (!panel || !canvas || !node) return

        const canvasRect = canvas.getBoundingClientRect()
        const panelRect = panel.getBoundingClientRect()
        const currentViewport = getViewport()
        const nodeLeft =
          canvasRect.left + currentViewport.x + node.position.x * currentViewport.zoom
        const nodeRight = nodeLeft + (node.measured?.width ?? 240) * currentViewport.zoom
        const safeRight = panelRect.left - 24
        const safeLeft = canvasRect.left + 64
        const shift = Math.min(0, safeRight - nodeRight)
        if (shift === 0 || nodeLeft + shift < safeLeft) return

        void panViewport({ ...currentViewport, x: currentViewport.x + shift }, { duration: 180 })
      })
    },
    [getNode, getViewport, panViewport],
  )

  useEffect(() => {
    if (!focusNodeId) return
    requestAnimationFrame(() => {
      const workspace = document.querySelector<HTMLElement>(
        '[data-testid="pipeline-workflow-container"]',
      )
      const panel = workspace?.querySelector<HTMLElement>('[data-workflow-right-panel]')
      const canvas = workspace?.querySelector<HTMLElement>('.react-flow')
      const node = getNode(focusNodeId)
      if (!canvas || !node) return
      const canvasRect = canvas.getBoundingClientRect()
      const panelRect = panel?.getBoundingClientRect()
      const safeRight =
        panelRect && panelRect.top < canvasRect.top + 80 ? panelRect.left : canvasRect.right
      const viewport = getViewport()
      const nodeCenterX = node.position.x + (node.measured?.width ?? 240) / 2
      const nodeCenterY = node.position.y + (node.measured?.height ?? 52) / 2
      void panViewport(
        {
          x: (canvasRect.left + safeRight) / 2 - canvasRect.left - nodeCenterX * viewport.zoom,
          y: canvasRect.height / 2 - nodeCenterY * viewport.zoom,
          zoom: viewport.zoom,
        },
        { duration: 180 },
      )
    })
  }, [focusNodeId, getNode, getViewport, panViewport])

  const organizeNodes = useCallback(() => {
    const semanticNodes = nodesRef.current.filter((node) => node.type !== 'note')
    const levels = new Map<string, number>(semanticNodes.map((node) => [node.id, 0]))
    const successors = new Map<string, string[]>()
    const indegree = new Map<string, number>(semanticNodes.map((node) => [node.id, 0]))
    for (const edge of edgesRef.current) {
      if (!levels.has(edge.source) || !levels.has(edge.target)) continue
      successors.set(edge.source, [...(successors.get(edge.source) ?? []), edge.target])
      indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1)
    }
    const queue = semanticNodes.filter((node) => indegree.get(node.id) === 0).map((node) => node.id)
    for (let index = 0; index < queue.length; index++) {
      const source = queue[index]
      for (const target of successors.get(source) ?? []) {
        levels.set(target, Math.max(levels.get(target) ?? 0, (levels.get(source) ?? 0) + 1))
        indegree.set(target, (indegree.get(target) ?? 1) - 1)
        if (indegree.get(target) === 0) queue.push(target)
      }
    }
    const rowByLevel = new Map<number, number>()
    const nextNodes = nodesRef.current.map((node) => {
      if (node.type === 'note') return node
      const level = levels.get(node.id) ?? 0
      const row = rowByLevel.get(level) ?? 0
      rowByLevel.set(level, row + 1)
      return { ...node, position: { x: level * 330, y: row * 170 } }
    })
    nodesRef.current = nextNodes
    setNodes(nextNodes)
    onLayoutChange(toLayout(nextNodes, viewport))
    void fitCanvasView({ padding: 0.3, maxZoom: 1, duration: 180 }).then(() => {
      persistViewport(getViewport())
    })
  }, [fitCanvasView, getViewport, onLayoutChange, persistViewport, setNodes, viewport])

  useEffect(() => {
    if (notesPipelineIdRef.current !== pipelineId) {
      notesPipelineIdRef.current = pipelineId
      setLocalNotes(readCanvasNotes(pipelineId))
      return
    }
    if (skipInitialNotesPersistenceRef.current) {
      skipInitialNotesPersistenceRef.current = false
      return
    }

    try {
      const key = `tapstate:pipeline-notes:${pipelineId}`
      if (notes.length === 0) localStorage.removeItem(key)
      else localStorage.setItem(key, JSON.stringify(notes))
    } catch {
      if (notesPersistenceWarningShownRef.current) return
      notesPersistenceWarningShownRef.current = true
      toast?.show({
        tone: 'warning',
        title: t('pipelines.workspace.actions.notesStorageUnavailable'),
        description: t('pipelines.workspace.actions.notesStorageUnavailableDescription'),
        duration: 6000,
      })
    }
  }, [notes, pipelineId, t, toast])

  const changeNote = useCallback(
    (id: string, text: string) => {
      updateNotes(
        notes.map((note) => (note.id === id ? { ...note, text } : note)),
        { recordHistory: false },
      )
    },
    [notes, updateNotes],
  )
  const deleteNote = useCallback(
    (id: string) => {
      updateNotes(notes.filter((note) => note.id !== id))
    },
    [notes, updateNotes],
  )
  const addNote = useCallback(
    (screenPosition: { x: number; y: number }) => {
      const position = screenToFlowPosition(screenPosition)
      updateNotes([...notes, { id: `note:${crypto.randomUUID()}`, text: '', position }])
    },
    [notes, screenToFlowPosition, updateNotes],
  )

  useEffect(() => {
    if (!placingNote) return
    const cancel = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPlacingNote(false)
    }
    window.addEventListener('keydown', cancel)
    return () => window.removeEventListener('keydown', cancel)
  }, [placingNote])

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      const nextNodes = nodesRef.current.filter((node) => node.id !== nodeId)
      if (nextNodes.length === nodesRef.current.length) return
      const nextEdges = edgesRef.current.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId,
      )
      nodesRef.current = nextNodes
      edgesRef.current = nextEdges
      setNodes(nextNodes)
      setEdges(nextEdges)
      onGraphChange(flowToPipelineDag(nextNodes, nextEdges))
      onSelectionChange(null)
    },
    [onGraphChange, onSelectionChange, setEdges, setNodes],
  )

  const graph = useMemo(() => {
    const base = pipelineDagToFlow(dag, layout, connectorsBySourceId, configurations, descriptions)
    return {
      ...base,
      nodes: base.nodes.map((flowNode) => ({
        ...flowNode,
        selected: nodesRef.current.find((node) => node.id === flowNode.id)?.selected ?? false,
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
          onRequestDelete: () => handleDeleteNode(flowNode.id),
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
  }, [
    configurations,
    connectorsBySourceId,
    dag,
    descriptions,
    handleDeleteNode,
    layout,
    openNodeSelector,
  ])

  const noteNodes = useMemo(
    () =>
      notes.map(
        (note): CanvasNode => ({
          id: note.id,
          type: 'note',
          position: note.position,
          selected: nodesRef.current.find((node) => node.id === note.id)?.selected ?? false,
          data: {
            label: '',
            detail: null,
            description: '',
            nodeType: 'note',
            connector: null,
            hasInput: false,
            hasOutput: false,
            showInput: false,
            showOutput: false,
            configuration: null,
            noteText: note.text,
            noteReadOnly: readOnly,
            onNoteChange: changeNote,
            onNoteDelete: deleteNote,
          },
        }),
      ),
    [notes, readOnly, changeNote, deleteNote],
  )
  const noteNodesRef = useRef(noteNodes)
  noteNodesRef.current = noteNodes

  useEffect(() => {
    nodesRef.current = nodes
  }, [nodes])

  useEffect(() => {
    edgesRef.current = edges
  }, [edges])

  useEffect(() => {
    setNodes([...graph.nodes, ...noteNodesRef.current])
    setEdges(graph.edges)
    setViewport(graph.viewport)
  }, [graph, setEdges, setNodes])

  useEffect(() => {
    setNodes((currentNodes) => [
      ...currentNodes.filter((node) => node.type !== 'note'),
      ...noteNodes,
    ])
  }, [noteNodes, setNodes])

  useEffect(() => {
    setNodes((currentNodes) => {
      let changed = false
      const incoming = new Set(edgesRef.current.map((edge) => edge.target))
      const outgoing = new Set(edgesRef.current.map((edge) => edge.source))
      const nextNodes = currentNodes.map((node) => {
        const hasInput = incoming.has(node.id)
        const hasOutput = outgoing.has(node.id)
        const ruleNode = {
          id: node.id,
          type: node.data.nodeType as PipelineDag['nodes'][number]['type'],
          detail: node.data.detail,
        }
        const canAddInput =
          node.data.showInput && canPipelineNodeAcceptInput(ruleNode, edgesRef.current)
        const canAddOutput =
          node.data.showOutput && canPipelineNodeEmitOutput(ruleNode, edgesRef.current)
        if (
          node.data.hasInput === hasInput &&
          node.data.hasOutput === hasOutput &&
          node.data.canAddInput === canAddInput &&
          node.data.canAddOutput === canAddOutput
        )
          return node
        changed = true
        return { ...node, data: { ...node.data, hasInput, hasOutput, canAddInput, canAddOutput } }
      })
      return changed ? nextNodes : currentNodes
    })
  }, [edges, setNodes])

  function handleNodesChange(changes: NodeChange<CanvasNode>[]) {
    if (readOnly && changes.some((change) => change.type !== 'select')) return
    const removedNoteIds = new Set(
      changes.flatMap((change) =>
        change.type === 'remove' &&
        nodesRef.current.some((node) => node.id === change.id && node.type === 'note')
          ? [change.id]
          : [],
      ),
    )
    if (removedNoteIds.size > 0) {
      updateNotes(notes.filter((note) => !removedNoteIds.has(note.id)))
    }
    setNodes((currentNodes) => {
      const isPaneDeselection =
        preserveSelectionOnPaneClickRef.current &&
        changes.length > 0 &&
        changes.every((change) => change.type === 'select' && !change.selected)
      if (isPaneDeselection) {
        preserveSelectionOnPaneClickRef.current = false
        return currentNodes
      }
      const nextNodes = applyNodeChanges(changes, currentNodes) as CanvasNode[]
      nodesRef.current = nextNodes
      const removedNodeIds = new Set(
        changes.filter((change) => change.type === 'remove').map((change) => change.id),
      )
      const removedPipelineNode = currentNodes.some(
        (node) => node.type !== 'note' && removedNodeIds.has(node.id),
      )
      if (removedPipelineNode) {
        const nextEdges = edgesRef.current.filter(
          (edge) => !removedNodeIds.has(edge.source) && !removedNodeIds.has(edge.target),
        )
        edgesRef.current = nextEdges
        setEdges(nextEdges)
        onGraphChange(flowToPipelineDag(nextNodes, nextEdges))
        onSelectionChange(null)
      }
      return nextNodes
    })
  }

  function handleEdgesChange(changes: EdgeChange<CanvasEdge>[]) {
    if (readOnly) return
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
    if (readOnly) return
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
    <TooltipProvider delay={300} closeDelay={200}>
      <>
        <PipelineCanvasToolbar
          interactionMode={interactionMode}
          onInteractionModeChange={setInteractionMode}
          onRequestNodeSelector={openNodeSelector}
          onRequestNote={() => setPlacingNote((current) => !current)}
          notePlacementActive={placingNote}
          onOrganize={organizeNodes}
          disabled={readOnly}
        />
        <PipelineNodeSelector
          open={nodeInsertion !== null}
          insertion={nodeInsertion}
          sources={sources}
          connectors={connectors}
          sourceState={sourceState}
          loadTables={loadTables}
          onChoose={(choice) => {
            if (!nodeInsertion) return
            onAddNode(choice, nodeInsertion)
            setNodeInsertion(null)
          }}
          onChooseMany={(choices) => {
            if (!nodeInsertion) return
            if (onAddNodes) onAddNodes(choices, nodeInsertion)
            else choices.forEach((choice) => onAddNode(choice, nodeInsertion))
            setNodeInsertion(null)
          }}
          onOpenChange={(open) => {
            if (!open) setNodeInsertion(null)
          }}
          disabled={readOnly}
        />
        <PipelineCanvasOperator
          canUndo={canUndo}
          canRedo={canRedo}
          historyPastCount={historyPastCount}
          historyFutureCount={historyFutureCount}
          onUndo={onUndo}
          onRedo={onRedo}
          onJumpHistory={onJumpHistory}
          onViewportChange={persistViewport}
          readOnly={readOnly}
        />
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          connectionLineComponent={PipelineConnectionLine}
          connectionLineType={ConnectionLineType.Bezier}
          defaultViewport={graph.viewport ?? undefined}
          fitView={fitView}
          fitViewOptions={{ padding: 0.36, maxZoom: 0.92 }}
          minZoom={0.25}
          maxZoom={2}
          onInit={() => setFitView(false)}
          panOnDrag={interactionMode === 'hand'}
          selectionOnDrag={interactionMode === 'pointer'}
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={handleConnect}
          isValidConnection={isValidConnection}
          onNodeClick={(_, node) => {
            if (node.type === 'note') return
            onSelectionChange({
              id: node.id,
              label: node.data.label,
              detail: node.data.detail,
              description: node.data.description,
              nodeType: node.data.nodeType,
              connector: node.data.connector,
              configuration: node.data.configuration,
            })
            keepSelectedNodeVisible(node.id)
          }}
          onPaneClick={(event) => {
            if (placingNote) {
              addNote({ x: event.clientX, y: event.clientY })
              setPlacingNote(false)
              return
            }
            preserveSelectionOnPaneClickRef.current = true
            queueMicrotask(() => {
              preserveSelectionOnPaneClickRef.current = false
            })
          }}
          onMoveEnd={(event, nextViewport) => {
            if (readOnly) return
            setViewport(nextViewport)
            if (!event) return
            onLayoutChange(toLayout(nodesRef.current, nextViewport))
          }}
          onNodeDragStop={(_, node, draggedNodes) => {
            if (readOnly) return
            if (node.type === 'note') {
              updateNotes(
                applyCanvasNotePositions(
                  notes,
                  draggedNodes
                    .filter((draggedNode) => draggedNode.type === 'note')
                    .map(({ id, position }) => ({ id, position })),
                ),
              )
              return
            }
            const nextNodes = nodesRef.current.map((current) =>
              current.id === node.id ? { ...current, position: node.position } : current,
            )
            nodesRef.current = nextNodes
            setNodes(nextNodes)
            onLayoutChange(toLayout(nextNodes, viewport ?? graph.viewport))
          }}
          onPaneContextMenu={(event) => {
            if (readOnly) return
            event.preventDefault()
            openNodeSelector({
              position: screenToFlowPosition({ x: event.clientX, y: event.clientY }),
              screenPosition: { x: event.clientX, y: event.clientY },
              connectFrom: null,
              connectTo: null,
            })
          }}
          className={`pipeline-canvas${placingNote ? ' pipeline-canvas--placing-note' : ''}`}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="var(--pipeline-grid-dot)" gap={14} size={2} />
        </ReactFlow>
      </>
    </TooltipProvider>
  )
}

export function PipelineCanvas(props: ComponentProps<typeof PipelineCanvasContent>) {
  return (
    <ReactFlowProvider>
      <PipelineCanvasContent {...props} />
    </ReactFlowProvider>
  )
}
