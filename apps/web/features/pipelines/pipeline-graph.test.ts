import { describe, expect, it } from 'vitest'

import type { PipelineDag } from '@/service/pipeline-client'

import { pipelineDagToFlow } from './pipeline-graph'

describe('pipelineDagToFlow', () => {
  it('uses persisted positions without putting geometry in the semantic DAG', () => {
    const dag: PipelineDag = {
      nodes: [
        { id: 'source:orders', type: 'source', label: 'orders', detail: null },
        {
          id: 'transform:filter_orders',
          type: 'transform',
          label: 'filter_orders',
          detail: 'filter',
        },
      ],
      edges: [
        {
          id: 'source:orders->transform:filter_orders',
          source: 'source:orders',
          target: 'transform:filter_orders',
          alias: null,
        },
      ],
    }

    const graph = pipelineDagToFlow(dag, {
      nodes: { 'transform:filter_orders': { x: 520, y: 160 } },
      viewport: { x: -20, y: 48, zoom: 0.9 },
    })

    expect(graph.nodes).toEqual([
      expect.objectContaining({ id: 'source:orders', position: { x: 80, y: 96 } }),
      expect.objectContaining({ id: 'transform:filter_orders', position: { x: 520, y: 160 } }),
    ])
    expect(graph.edges).toEqual([
      expect.objectContaining({
        type: 'bezier',
        source: 'source:orders',
        target: 'transform:filter_orders',
      }),
    ])
    expect(graph.viewport).toEqual({ x: -20, y: 48, zoom: 0.9 })
  })

  it('derives a stable left-to-right layout when a Pipeline has no saved editor state', () => {
    const graph = pipelineDagToFlow({
      nodes: [
        { id: 'source:orders', type: 'source', label: 'orders', detail: null },
        {
          id: 'transform:filter_orders',
          type: 'transform',
          label: 'filter_orders',
          detail: 'filter',
        },
        { id: 'serve:orders_api', type: 'serve', label: 'orders_api', detail: null },
        { id: 'target:warehouse', type: 'target', label: 'warehouse', detail: 'sync' },
      ],
      edges: [
        { id: 'a', source: 'source:orders', target: 'transform:filter_orders', alias: null },
        { id: 'b', source: 'transform:filter_orders', target: 'serve:orders_api', alias: null },
        { id: 'c', source: 'serve:orders_api', target: 'target:warehouse', alias: null },
      ],
    })

    expect(graph.nodes.map((node) => node.position)).toEqual([
      { x: 80, y: 96 },
      { x: 360, y: 96 },
      { x: 640, y: 96 },
      { x: 920, y: 96 },
    ])
  })
})
