import { ReactFlowProvider, type NodeProps } from '@xyflow/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act } from 'react'

import '@/i18n/index'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'

import type { CanvasNodeData } from './pipeline-canvas-types'

import { PipelineNode } from './pipeline-node'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const pipelineCanvasSource = readFileSync(
  resolve(process.cwd(), 'features/pipelines/components/canvas/pipeline-canvas.tsx'),
  'utf8',
)

let root: Root | undefined
let container: HTMLDivElement | undefined

afterEach(async () => {
  await act(async () => root?.unmount())
  container?.remove()
  root = undefined
  container = undefined
})

const nodeData: CanvasNodeData = {
  label: 'Orders',
  detail: null,
  description: '',
  nodeType: 'source',
  connector: null,
  hasInput: false,
  hasOutput: false,
  showInput: false,
  showOutput: true,
  configuration: null,
}

function renderNode(selected: boolean) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  const staleData = { ...nodeData, selected: true } as CanvasNodeData
  const nodeProps = {
    id: 'source:orders',
    type: 'source',
    data: staleData,
    selected,
    dragging: false,
    draggable: true,
    selectable: true,
    deletable: true,
    zIndex: 0,
  } as NodeProps<import('./pipeline-canvas-types').CanvasNode>
  act(() =>
    root?.render(
      <ReactFlowProvider>
        <PipelineNode {...nodeProps} />
      </ReactFlowProvider>,
    ),
  )
  return container
}

describe('PipelineNode selection', () => {
  it('removes the selected border when React Flow deselects a node', () => {
    const host = renderNode(true)
    const node = host.firstElementChild
    expect(node?.getAttribute('data-node-selected')).toBe('true')

    act(() =>
      root?.render(
        <ReactFlowProvider>
          <PipelineNode
            {...({
              id: 'source:orders',
              type: 'source',
              data: { ...nodeData, selected: true } as CanvasNodeData,
              selected: false,
              dragging: false,
              draggable: true,
              selectable: true,
              deletable: true,
              zIndex: 0,
            } as NodeProps<import('./pipeline-canvas-types').CanvasNode>)}
          />
        </ReactFlowProvider>,
      ),
    )

    expect(host.firstElementChild?.getAttribute('data-node-selected')).toBe('false')
    expect(host.firstElementChild?.className).toContain('border-transparent')
    expect(host.firstElementChild?.className).not.toContain('border-pipeline-node-selected-border')
  })

  it('keeps pane clicks from clearing the configuration selection', () => {
    expect(pipelineCanvasSource).not.toContain('onPaneClick={() => onSelectionChange(null)}')
    expect(pipelineCanvasSource).toContain('const preserveSelectionOnPaneClickRef = useRef(false)')
    expect(pipelineCanvasSource).toContain(
      "changes.every((change) => change.type === 'select' && !change.selected)",
    )
  })

  it('preserves React Flow selection when the graph is synchronized', () => {
    expect(pipelineCanvasSource).toContain(
      'selected: nodesRef.current.find((node) => node.id === flowNode.id)?.selected ?? false',
    )
  })
})
