import { describe, expect, it } from 'vitest'

import type { PipelineView } from '@/service/pipelines/pipeline-client'
import type { ValidationSourceHints, ValidationTask } from '@/service/pipelines/validation-client'

import { validationMappingHints } from './validation-mapping-hints'

const pipeline = (): PipelineView => ({
  id: 'flow',
  contentHash: 'saved-hash',
  sources: [{ id: 'mysql', metadata: null, connector: 'mysql' }],
  transforms: [],
  serve: {
    id: 'serve',
    from: ['mysql.orders', 'mysql.items'],
    sync: [{ id: 'copy', source: 'mongo', rename: { prefix: 'actual_' } }],
  },
  dag: {
    nodes: [
      { id: 'orders', type: 'source', label: 'orders', detail: 'mysql' },
      { id: 'items', type: 'source', label: 'items', detail: 'mysql' },
      {
        id: 'target',
        type: 'target',
        label: 'wrong-display-name',
        detail: 'mongo',
        tableRefs: ['wrong-1', 'wrong-2'],
      },
    ],
    edges: [
      { id: 'e1', source: 'orders', target: 'target', label: 'copy' },
      { id: 'e2', source: 'items', target: 'target', label: 'copy' },
    ],
  },
})
const noHints = async () => {
  throw new Error('literal mappings do not need retained discovery')
}
const makeIds = () => {
  let n = 0
  return () => `opaque-${++n}`
}
const hints = (count = 2): ValidationSourceHints => ({
  connectionId: 'mysql',
  connectorId: 'mysql',
  discoveredAt: 100,
  tables: Array.from({ length: count }, (_, i) => ({ name: `physical_${i}` })),
})

describe('validation authoring mapping hints', () => {
  it('uses actual SYNC edge identities and source coordinates, leaving target renames to evaluation', async () => {
    const rows = await validationMappingHints(pipeline(), noHints, null, makeIds())
    expect(rows.map((row) => row.choice)).toEqual([
      { mappingId: 'opaque-1', outputId: 'copy', sourceId: 'mysql', table: 'orders' },
      { mappingId: 'opaque-2', outputId: 'copy', sourceId: 'mysql', table: 'items' },
    ])
    expect(rows.map((row) => row.targetSourceId)).toEqual(['mongo', 'mongo'])
    expect(rows.every((row) => row.reason === null)).toBe(true)
  })
  it('retains saved mapping identities rather than resetting key-confirmation associations', async () => {
    const saved = {
      mappings: [
        { mappingId: 'retained-map', outputId: 'copy', sourceId: 'mysql', sourceTable: 'orders' },
      ],
    } as unknown as ValidationTask
    const rows = await validationMappingHints(pipeline(), noHints, saved, makeIds())
    expect(rows[0].choice?.mappingId).toBe('retained-map')
  })
  it('consumes whole-Source names only as retained server-scoped hints and keeps their observation time', async () => {
    const value = pipeline()
    value.serve!.from = 'mysql'
    value.dag.nodes[0] = { ...value.dag.nodes[0], label: 'mysql', detail: null }
    value.dag.edges = [value.dag.edges[0]]
    const rows = await validationMappingHints(value, async () => hints(), null, makeIds())
    expect(rows.map((row) => row.choice?.table)).toEqual(['physical_0', 'physical_1'])
    expect(rows.every((row) => row.retainedDiscoveryAt === 100)).toBe(true)
  })
  it('does not treat a literal table named like its Source as a whole-Source reference', async () => {
    const value = pipeline()
    value.serve!.from = 'mysql.mysql'
    value.dag.nodes[0] = { ...value.dag.nodes[0], label: 'mysql' }
    value.dag.edges = [value.dag.edges[0]]
    expect((await validationMappingHints(value, noHints, null, makeIds()))[0].choice?.table).toBe(
      'mysql',
    )
  })
  it('does not silently select the recognizable subset of a mixed or unknown output', async () => {
    const mixed = pipeline()
    mixed.dag.nodes[1] = { ...mixed.dag.nodes[1], type: 'transform' }
    const rows = await validationMappingHints(mixed, noHints, null, makeIds())
    expect(rows).toHaveLength(1)
    expect(rows[0].reason).toBe('unsupported-path')
    expect(rows[0].choice).toBeNull()
    const regex = pipeline()
    regex.serve!.from = '/orders.*/'
    regex.dag.nodes[0].label = '/orders.*/'
    regex.dag.edges = [regex.dag.edges[0]]
    expect((await validationMappingHints(regex, noHints, null))[0].reason).toBe('unknown-scope')
  })
  it('refuses missing, oversized and duplicate hint sets without partial mapping or truncation', async () => {
    const value = pipeline()
    value.serve!.from = 'mysql'
    value.dag.nodes[0] = { ...value.dag.nodes[0], label: 'mysql', detail: null }
    value.dag.edges = [value.dag.edges[0]]
    expect((await validationMappingHints(value, async () => null, null))[0].reason).toBe(
      'missing-discovery',
    )
    expect(
      (await validationMappingHints(value, async () => hints(1025), null, makeIds()))[0].reason,
    ).toBe('mapping-limit')
    const duplicate = { ...hints(), tables: [{ name: 'same' }, { name: 'same' }] }
    expect(
      (await validationMappingHints(value, async () => duplicate, null, makeIds()))[0].reason,
    ).toBe('ambiguous-input')
  })
  it('keeps reused/empty outputs and ambiguous bare references unavailable', async () => {
    const reused = pipeline()
    reused.serve = { use: 'shared' }
    expect((await validationMappingHints(reused, noHints, null))[0].reason).toBe(
      'unresolved-output',
    )
    const bare = pipeline()
    bare.sources!.push({ id: 'other', metadata: null, connector: 'postgres' })
    bare.serve!.from = 'orders'
    bare.dag.edges = [bare.dag.edges[0]]
    expect((await validationMappingHints(bare, noHints, null))[0].reason).toBe('unknown-scope')
  })
  it('keeps a qualified table separate from another whole Source with the same label', async () => {
    const value = pipeline()
    value.sources = [
      { id: 'a', metadata: null, connector: 'mysql' },
      { id: 'b', metadata: null, connector: 'postgres' },
    ]
    value.serve!.from = ['a.b', 'b']
    value.dag.nodes[0] = { ...value.dag.nodes[0], detail: 'a', label: 'b' }
    value.dag.nodes[1] = { ...value.dag.nodes[1], detail: null, label: 'b' }
    const rows = await validationMappingHints(
      value,
      async (source) => ({ ...hints(1), connectionId: source }),
      null,
      makeIds(),
    )
    expect(rows.map((row) => [row.choice?.sourceId, row.choice?.table])).toEqual([
      ['a', 'b'],
      ['b', 'physical_0'],
    ])
  })
})
