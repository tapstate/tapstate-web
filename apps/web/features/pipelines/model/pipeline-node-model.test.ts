import { describe, expect, it } from 'vitest'

import type { PipelineView } from '@/service/pipelines/pipeline-client'

import { buildPipelineDraftMutation } from './pipeline-draft-document'
import { createPipelineGraphDraft } from './pipeline-graph-edit'
import { pipelineNodeConfigurations } from './pipeline-node-model'

const pipeline = {
  id: 'orders',
  contentHash: 'hash',
  metadata: { labels: {}, description: 'Orders pipeline' },
  sources: [{ id: 'mysql_source', metadata: null, connector: 'mysql' }],
  transforms: [
    {
      id: 'normalize',
      type: 'map',
      from: ['orders'],
      fields: { customer_id: { from: 'customerId' } },
    },
    { id: 'keep_active', type: 'filter', from: ['normalize'], expr: 'active == true' },
  ],
  view: null,
  serve: { id: 'serve', from: 'keep_active', sync: [] },
  settings: null,
  experimental: {},
  dag: {
    nodes: [
      { id: 'source:mysql_source:orders', type: 'source', label: 'orders', detail: 'mysql_source' },
      { id: 'transform:normalize', type: 'transform', label: 'normalize', detail: 'map' },
      { id: 'transform:keep_active', type: 'transform', label: 'keep_active', detail: 'filter' },
      {
        id: 'target:mongodb_target:orders',
        type: 'target',
        label: 'orders',
        detail: 'mongodb_target',
      },
    ],
    edges: [],
  },
} satisfies PipelineView

describe('pipelineNodeConfigurations', () => {
  it('projects source and target nodes into data-node configuration models', () => {
    const configurations = pipelineNodeConfigurations(pipeline)

    expect(configurations.get('source:mysql_source:orders')).toEqual({
      kind: 'source',
      nodeId: 'source:mysql_source:orders',
      sourceId: 'mysql_source',
      table: 'orders',
      connectorId: 'mysql',
    })
    expect(configurations.get('target:mongodb_target:orders')).toMatchObject({
      kind: 'target',
      nodeId: 'target:mongodb_target:orders',
      sourceId: 'mongodb_target',
      table: 'orders',
      writeMode: 'upsert',
    })
  })

  it('keeps transform bodies and selects a custom editor by transform type', () => {
    const configurations = pipelineNodeConfigurations(pipeline)

    expect(configurations.get('transform:normalize')).toMatchObject({
      kind: 'transform',
      stepId: 'normalize',
      transformType: 'map',
      body: { fields: { customer_id: { from: 'customerId' } } },
    })
    expect(configurations.get('transform:keep_active')).toMatchObject({
      kind: 'transform',
      stepId: 'keep_active',
      transformType: 'filter',
      body: { expr: 'active == true' },
    })
  })

  it('retains step experimental settings on an Artifact to draft round trip', () => {
    const withExperimental: PipelineView = {
      ...pipeline,
      transforms: [
        { ...pipeline.transforms[0], experimental: { 'field-mode': 'permissive' } },
        pipeline.transforms[1],
      ],
    }
    const mutation = buildPipelineDraftMutation(createPipelineGraphDraft(withExperimental), {
      nodes: {},
      viewport: { x: 0, y: 0, zoom: 1 },
    })

    expect(
      mutation.graph?.nodes.find((node) => node.metadata.stepId === 'normalize')?.config,
    ).toMatchObject({ experimental: { 'field-mode': 'permissive' } })
  })

  it('accepts snake_case write mode values from the PipelineView projection', () => {
    const configurations = pipelineNodeConfigurations({
      ...pipeline,
      serve: {
        id: 'serve',
        from: 'keep_active',
        sync: [{ id: 'mongodb_player', source: 'mongodb_target', write_mode: 'append' }],
      },
    })

    expect(configurations.get('target:mongodb_target:orders')).toMatchObject({
      kind: 'target',
      writeMode: 'append',
    })
  })

  it('matches target write mode by destination source id, not sync mapping id', () => {
    const configurations = pipelineNodeConfigurations({
      ...pipeline,
      dag: {
        ...pipeline.dag,
        nodes: [
          ...pipeline.dag.nodes.filter((node) => !node.id.startsWith('target:')),
          {
            id: 'target:mongodb_target:Player',
            type: 'target',
            label: 'Player',
            detail: 'mongodb_target',
          },
        ],
      },
      serve: {
        id: 'serve',
        from: 'keep_active',
        sync: [{ id: 'mongodb_player', source: 'mongodb_target', write_mode: 'append' }],
      },
    })

    expect(configurations.get('target:mongodb_target:Player')).toMatchObject({
      sourceId: 'mongodb_target',
      table: 'Player',
      writeMode: 'append',
    })
  })

  it('does not manufacture a configuration for the serve container', () => {
    const configurations = pipelineNodeConfigurations(pipeline)
    expect(configurations.has('serve')).toBe(false)
  })
})
