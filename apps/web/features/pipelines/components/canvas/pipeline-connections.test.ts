import { describe, expect, it } from 'vitest'

import type { CanvasEdge, CanvasNode } from './pipeline-canvas-types'

import { isPipelineConnectionValid } from './pipeline-connections'

const nodes = [
  {
    id: 'source:orders',
    type: 'source',
    position: { x: 0, y: 0 },
    data: {
      label: 'orders',
      detail: null,
      description: '',
      nodeType: 'source',
      connector: null,
      hasInput: false,
      hasOutput: false,
      showInput: false,
      showOutput: true,
      configuration: null,
    },
  },
  {
    id: 'transform:filter',
    type: 'transform',
    position: { x: 280, y: 0 },
    data: {
      label: 'filter',
      detail: 'filter',
      description: '',
      nodeType: 'transform',
      connector: null,
      hasInput: false,
      hasOutput: false,
      showInput: true,
      showOutput: true,
      configuration: null,
    },
  },
  {
    id: 'target:warehouse',
    type: 'target',
    position: { x: 560, y: 0 },
    data: {
      label: 'warehouse',
      detail: null,
      description: '',
      nodeType: 'target',
      connector: null,
      hasInput: false,
      hasOutput: false,
      showInput: true,
      showOutput: true,
      configuration: null,
    },
  },
] satisfies CanvasNode[]

const edge = (source: string, target: string): CanvasEdge => ({
  id: `${source}->${target}`,
  source,
  target,
  type: 'pipeline',
})

const connection = (source: string, target: string) => ({
  source,
  target,
  sourceHandle: null,
  targetHandle: null,
})

describe('isPipelineConnectionValid', () => {
  it('accepts an output-to-input connection and rejects self connections', () => {
    expect(
      isPipelineConnectionValid(
        {
          source: 'source:orders',
          sourceHandle: 'output',
          target: 'transform:filter',
          targetHandle: 'input',
        },
        nodes,
        [],
      ),
    ).toBe(true)
    expect(
      isPipelineConnectionValid(connection('transform:filter', 'transform:filter'), nodes, []),
    ).toBe(false)
  })

  it('rejects wrong-direction handles, unsupported endpoints, and duplicates', () => {
    expect(
      isPipelineConnectionValid(
        {
          source: 'source:orders',
          sourceHandle: 'input',
          target: 'target:warehouse',
          targetHandle: 'input',
        },
        nodes,
        [],
      ),
    ).toBe(false)
    expect(
      isPipelineConnectionValid(connection('target:warehouse', 'transform:filter'), nodes, []),
    ).toBe(true)
    expect(
      isPipelineConnectionValid(connection('source:orders', 'transform:filter'), nodes, [
        edge('source:orders', 'transform:filter'),
      ]),
    ).toBe(false)
  })
})
