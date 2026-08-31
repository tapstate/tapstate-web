import { describe, expect, it } from 'vitest'

import type { PipelineDag } from '@/service/pipelines/pipeline-client'

import { normalizePipelineDag, pipelineDagToFlow } from './pipeline-graph'

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

  it('keeps node descriptions separate from connector and transform details', () => {
    const graph = pipelineDagToFlow(
      {
        nodes: [
          {
            id: 'source:orders',
            type: 'source',
            label: 'orders',
            detail: 'mysql',
            description: 'Loads order rows',
          },
        ],
        edges: [],
      },
      null,
      new Map(),
      new Map(),
      new Map([['source:orders', 'Reads the active order stream']]),
    )

    expect(graph.nodes[0]?.data).toMatchObject({
      detail: 'mysql',
      description: 'Reads the active order stream',
    })
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
    ])
    expect(graph.nodes.map((node) => node.id)).not.toContain('serve:orders_api')
    expect(graph.edges).toEqual([
      expect.objectContaining({
        source: 'source:orders',
        target: 'transform:filter_orders',
      }),
      expect.objectContaining({
        source: 'transform:filter_orders',
        target: 'target:warehouse',
      }),
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
    ])
  })

  it('normalizes legacy serve hops without creating dangling edges', () => {
    const normalized = normalizePipelineDag({
      nodes: [
        { id: 'source:orders', type: 'source', label: 'orders', detail: null },
        { id: 'serve:orders_api', type: 'serve', label: 'orders_api', detail: null },
      ],
      edges: [{ id: 'a', source: 'source:orders', target: 'serve:orders_api', label: 'ignored' }],
    })

    expect(normalized.nodes.map((node) => node.id)).toEqual(['source:orders'])
    expect(normalized.edges).toEqual([])
  })

  it('folds a chain of serve containers and deduplicates parallel target pairs', () => {
    const normalized = normalizePipelineDag({
      nodes: [
        { id: 'source:a', type: 'source', label: 'a', detail: null },
        { id: 'serve:first', type: 'serve', label: 'first', detail: null },
        { id: 'serve:second', type: 'serve', label: 'second', detail: null },
        { id: 'target:a', type: 'target', label: 'a', detail: null },
        { id: 'target:b', type: 'target', label: 'b', detail: null },
      ],
      edges: [
        { id: 'in', source: 'source:a', target: 'serve:first', label: null },
        { id: 'hop', source: 'serve:first', target: 'serve:second', label: null },
        { id: 'out-a', source: 'serve:second', target: 'target:a', label: 'a' },
        { id: 'out-a-duplicate', source: 'serve:second', target: 'target:a', label: 'duplicate' },
        { id: 'out-b', source: 'serve:second', target: 'target:b', label: 'b' },
      ],
    })

    expect(normalized.nodes.map((node) => node.type)).toEqual(['source', 'target', 'target'])
    expect(normalized.edges).toEqual([
      expect.objectContaining({ source: 'source:a', target: 'target:a', label: null }),
      expect.objectContaining({ source: 'source:a', target: 'target:b', label: null }),
    ])
  })

  it('does not carry semantic edge labels into the canvas rendering data', () => {
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
        source: 'source:orders',
        target: 'view:open_orders',
      }),
    ])
    expect(graph.edges[0]).not.toHaveProperty('data')
  })

  it('attaches the real connector metadata to source and target nodes', () => {
    const graph = pipelineDagToFlow(
      {
        nodes: [
          {
            id: 'source:mysql_source:Player',
            type: 'source',
            label: 'Player',
            detail: 'mysql_source',
          },
          {
            id: 'target:mongodb_target:Player',
            type: 'target',
            label: 'Player',
            detail: 'mongodb_target',
          },
        ],
        edges: [
          {
            id: 'source:mysql_source:Player->target:mongodb_target:Player',
            source: 'source:mysql_source:Player',
            target: 'target:mongodb_target:Player',
            label: null,
          },
        ],
      },
      null,
      new Map([
        ['mysql_source', { id: 'mysql', name: 'MySQL', icon: 'icons/mysql.png' }],
        ['mongodb_target', { id: 'mongodb', name: 'MongoDB', icon: 'icons/mongodb.png' }],
      ]),
    )

    expect(graph.nodes.map((node) => ({ id: node.id, connector: node.data.connector }))).toEqual([
      {
        id: 'source:mysql_source:Player',
        connector: { id: 'mysql', name: 'MySQL', icon: 'icons/mysql.png' },
      },
      {
        id: 'target:mongodb_target:Player',
        connector: { id: 'mongodb', name: 'MongoDB', icon: 'icons/mongodb.png' },
      },
    ])
  })

  it('keeps potential ports on nodes even when the semantic DAG has no edge yet', () => {
    const graph = pipelineDagToFlow({
      nodes: [
        { id: 'source:orders', type: 'source', label: 'orders', detail: null },
        { id: 'transform:normalize', type: 'transform', label: 'normalize', detail: 'map' },
        { id: 'target:warehouse', type: 'target', label: 'warehouse', detail: null },
      ],
      edges: [],
    })

    expect(
      graph.nodes.map((node) => ({
        id: node.id,
        hasInput: node.data.hasInput,
        hasOutput: node.data.hasOutput,
        showInput: node.data.showInput,
        showOutput: node.data.showOutput,
      })),
    ).toEqual([
      {
        id: 'source:orders',
        hasInput: false,
        hasOutput: false,
        showInput: false,
        showOutput: true,
      },
      {
        id: 'transform:normalize',
        hasInput: false,
        hasOutput: false,
        showInput: true,
        showOutput: true,
      },
      {
        id: 'target:warehouse',
        hasInput: false,
        hasOutput: false,
        showInput: true,
        showOutput: true,
      },
    ])
  })
})
