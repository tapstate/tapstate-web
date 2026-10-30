import { describe, expect, it } from 'vitest'

import type { PipelineView } from '@/service/pipelines/pipeline-client'
import type { ValidationSourceHints, ValidationTask } from '@/service/pipelines/validation-client'

import { validationLoadedFieldHints, validationMappingHints } from './validation-mapping-hints'

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
  it('loads exact retained fields for each physical side and shares each source read', async () => {
    const value = pipeline()
    value.outputTargets = {
      outputs: ['orders', 'items'].map((table) => ({
        element: 'copy',
        kind: 'replica',
        connection: 'mongo',
        table: `actual_${table}`,
        identity: `copy:${table}`,
      })),
      unresolved: [],
    }
    const calls: string[] = []
    const rows = await validationLoadedFieldHints(
      value,
      await validationMappingHints(value, noHints, null, makeIds()),
      async (source) => {
        calls.push(source)
        return {
          connectionId: source,
          tables:
            source === 'mysql'
              ? [
                  { name: 'orders', fields: [{ name: 'source_id' }] },
                  { name: 'items', fields: [] },
                ]
              : [
                  { name: 'actual_orders', fields: [{ name: 'target_id' }] },
                  { name: 'wrong-display-name', fields: [{ name: 'must_not_appear' }] },
                ],
        }
      },
    )
    expect(calls.sort()).toEqual(['mongo', 'mysql'])
    expect(rows[0].sourceFields).toEqual(['source_id'])
    expect(rows[0].targetFields).toEqual(['target_id'])
    expect(rows[1].sourceFields).toEqual([])
    expect(rows[1].targetFields).toEqual([])
  })
  it('leaves field menus empty without discovery and never uses another connection model', async () => {
    const value = pipeline()
    const rows = await validationMappingHints(value, noHints, null, makeIds())
    const absent = await validationLoadedFieldHints(value, rows, async () => null)
    expect(
      absent.every((row) => row.sourceFields?.length === 0 && row.targetFields?.length === 0),
    ).toBe(true)
    const wrong = await validationLoadedFieldHints(value, rows, async () => ({
      connectionId: 'foreign',
      tables: [{ name: 'orders', fields: [{ name: 'foreign_field' }] }],
    }))
    expect(wrong[0].sourceFields).toEqual([])
  })
  it('resolves the admitted 1024-table page without multiplying model reads', async () => {
    const value = pipeline()
    const rows = Array.from({ length: 1024 }, (_, i) => ({
      key: `table_${i}`,
      outputId: 'copy',
      sourceId: 'mysql',
      table: `table_${i}`,
      targetSourceId: 'mongo',
      choice: { mappingId: `map_${i}`, outputId: 'copy', sourceId: 'mysql', table: `table_${i}` },
      reason: null,
      retainedDiscoveryAt: 100,
    }))
    value.outputTargets = {
      outputs: rows.map((row) => ({
        element: 'copy',
        kind: 'replica',
        connection: 'mongo',
        identity: `copy:${row.table}`,
        table: `actual_${row.table}`,
      })),
      unresolved: [],
    }
    const calls: string[] = []
    const loaded = await validationLoadedFieldHints(value, rows, async (source) => {
      calls.push(source)
      return {
        connectionId: source,
        tables: rows.map((row) => ({
          name: source === 'mysql' ? row.table : `actual_${row.table}`,
          fields: [{ name: 'id' }],
        })),
      }
    })
    expect(calls.sort()).toEqual(['mongo', 'mysql'])
    expect(loaded).toHaveLength(1024)
    expect(
      loaded.every((row) => row.sourceFields?.[0] === 'id' && row.targetFields?.[0] === 'id'),
    ).toBe(true)
  })
  it('bounds combined selected field retention across both physical models', async () => {
    const value = pipeline()
    const rows = await validationMappingHints(value, noHints, null, makeIds())
    value.outputTargets = {
      outputs: [
        {
          element: 'copy',
          kind: 'replica',
          connection: 'mongo',
          identity: 'copy:orders',
          table: 'actual_orders',
        },
      ],
      unresolved: [],
    }
    await expect(
      validationLoadedFieldHints(value, [rows[0]], async (source) => ({
        connectionId: source,
        tables: [
          {
            name: source === 'mysql' ? 'orders' : 'actual_orders',
            fields: Array.from({ length: 4096 }, (_, i) => ({
              name: `field_${i}_`.padEnd(512, 'x'),
            })),
          },
        ],
      })),
    ).rejects.toMatchObject({ kind: 'protocol' })
  })
  it('binds source-qualified replica identities and rejects ambiguous bare table identities', async () => {
    const value = pipeline()
    const rows = await validationMappingHints(value, noHints, null, makeIds())
    const second = {
      ...rows[0],
      key: 'postgres-orders',
      sourceId: 'postgres',
      choice: { ...rows[0].choice!, sourceId: 'postgres', mappingId: 'postgres-orders' },
    }
    value.outputTargets = {
      outputs: [
        {
          element: 'copy',
          kind: 'replica',
          connection: 'mongo',
          table: 'mysql_target',
          identity: 'copy:mysql.orders',
        },
        {
          element: 'copy',
          kind: 'replica',
          connection: 'mongo',
          table: 'pg_target',
          identity: 'copy:postgres.orders',
        },
      ],
      unresolved: [],
    }
    const read = async (source: string) => ({
      connectionId: source,
      tables: [
        { name: 'mysql_target', fields: [{ name: 'mysql_key' }] },
        { name: 'pg_target', fields: [{ name: 'pg_key' }] },
      ],
    })
    const qualified = await validationLoadedFieldHints(value, [rows[0], second], read)
    expect(qualified.map((row) => row.targetFields)).toEqual([['mysql_key'], ['pg_key']])
    const single = await validationLoadedFieldHints(value, [rows[0]], read)
    expect(single[0].targetFields).toEqual(['mysql_key'])
    value.outputTargets.outputs = [
      {
        element: 'copy',
        kind: 'replica',
        connection: 'mongo',
        table: 'mysql_target',
        identity: 'copy:orders',
      },
    ]
    const ambiguous = await validationLoadedFieldHints(value, [rows[0], second], read)
    expect(ambiguous.map((row) => row.targetFields)).toEqual([[], []])
  })
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
