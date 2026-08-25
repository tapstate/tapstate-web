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
          label: null,
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
        type: 'pipeline',
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
        { id: 'a', source: 'source:orders', target: 'transform:filter_orders', label: null },
        { id: 'b', source: 'transform:filter_orders', target: 'serve:orders_api', label: null },
        { id: 'c', source: 'serve:orders_api', target: 'target:warehouse', label: null },
      ],
    })

    expect(graph.nodes.map((node) => node.position)).toEqual([
      { x: 80, y: 96 },
      { x: 360, y: 96 },
      { x: 640, y: 96 },
      { x: 920, y: 96 },
    ])
  })

  it('centers a fan-in node on its incoming source group', () => {
    const graph = pipelineDagToFlow({
      nodes: [
        { id: 'source:accounts', type: 'source', label: 'accounts', detail: null },
        { id: 'source:orders', type: 'source', label: 'orders', detail: null },
        { id: 'source:payments', type: 'source', label: 'payments', detail: null },
        { id: 'transform:combine', type: 'transform', label: 'combine', detail: 'union' },
        { id: 'serve:combined', type: 'serve', label: 'combined', detail: null },
      ],
      edges: [
        { id: 'a', source: 'source:accounts', target: 'transform:combine', label: null },
        { id: 'b', source: 'source:orders', target: 'transform:combine', label: null },
        { id: 'c', source: 'source:payments', target: 'transform:combine', label: null },
        { id: 'd', source: 'transform:combine', target: 'serve:combined', label: null },
      ],
    })

    expect(graph.nodes.map((node) => ({ id: node.id, position: node.position }))).toEqual([
      { id: 'source:accounts', position: { x: 80, y: 96 } },
      { id: 'source:orders', position: { x: 80, y: 248 } },
      { id: 'source:payments', position: { x: 80, y: 400 } },
      { id: 'transform:combine', position: { x: 360, y: 248 } },
      { id: 'serve:combined', position: { x: 640, y: 248 } },
    ])
  })

  it('carries a semantic edge label into the canvas edge data without adding layout data', () => {
    const graph = pipelineDagToFlow({
      nodes: [
        { id: 'source:orders', type: 'source', label: 'orders', detail: null },
        { id: 'view:open_orders', type: 'view', label: 'open_orders', detail: null },
      ],
      edges: [
        {
          id: 'source:orders->view:open_orders',
          source: 'source:orders',
          target: 'view:open_orders',
          label: 'open_orders',
        },
      ],
    })

    expect(graph.edges).toEqual([
      expect.objectContaining({
        type: 'pipeline',
        data: { label: 'open_orders' },
      }),
    ])
  })
})
