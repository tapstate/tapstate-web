import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ConnectorSummary } from '@/service/source-client'

import { isTargetConnector, targetSources } from './pipeline-target-connectors'

const connectors = [
  { id: 'mongodb-atlas', sink: true },
  { id: 'mongodb', sink: true },
  { id: 'postgres', sink: true },
  { id: 'mysql', sink: false },
] as unknown as ConnectorSummary[]

const localCloud = { profile: 'cloud', localDevelopment: true } as const
const releaseCloud = { profile: 'cloud', localDevelopment: false } as const
const onPrem = { profile: 'on-prem', localDevelopment: false } as const

afterEach(() => vi.unstubAllEnvs())

describe('pipeline target connectors', () => {
  it('uses only the explicit policy even when the compiled environment disagrees', () => {
    vi.stubEnv('VITE_LOCAL_DEVELOPMENT', 'true')
    expect(isTargetConnector('mongodb', connectors, releaseCloud)).toBe(false)
    vi.stubEnv('VITE_LOCAL_DEVELOPMENT', 'false')
    expect(isTargetConnector('mongodb', connectors, localCloud)).toBe(true)
  })
  it('allows a catalog-confirmed MongoDB target only in a local Cloud distribution', () => {
    expect(isTargetConnector('mongodb', connectors, localCloud)).toBe(true)
    expect(isTargetConnector('mongodb', connectors, releaseCloud)).toBe(false)
    expect(isTargetConnector('postgres', connectors, localCloud)).toBe(false)
    expect(isTargetConnector('mysql', connectors, localCloud)).toBe(false)
    expect(isTargetConnector('mongodb', [], localCloud)).toBe(false)
    expect(
      isTargetConnector(
        'mongodb',
        [{ id: 'mongodb', sink: false }] as unknown as ConnectorSummary[],
        localCloud,
      ),
    ).toBe(false)
    expect(
      targetSources([{ id: 'local_out', connector: 'mongodb' }], connectors, localCloud).map(
        ({ id }) => id,
      ),
    ).toEqual(['local_out'])
  })

  it('limits cloud to Atlas and uses declared sink capability in OP', () => {
    expect(isTargetConnector('mongodb-atlas', connectors, releaseCloud)).toBe(true)
    expect(isTargetConnector('mongodb', connectors, releaseCloud)).toBe(false)
    expect(isTargetConnector('postgres', connectors, onPrem)).toBe(true)
    expect(isTargetConnector('mysql', connectors, onPrem)).toBe(false)
    expect(isTargetConnector(null, connectors, onPrem)).toBe(false)
  })

  it('keeps Atlas store markers required while confining the MongoDB exception to local builds', () => {
    const sources = [
      { id: 'unmarked_atlas', connector: 'mongodb-atlas' },
      { id: 'store_atlas', connector: 'mongodb-atlas', metadata: { labels: { store: true } } },
      { id: 'local_mongo', connector: 'mongodb' },
      { id: 'marked_mongo', connector: 'mongodb', metadata: { labels: { store: true } } },
      { id: 'marked_postgres', connector: 'postgres', metadata: { labels: { store: true } } },
    ]
    expect(targetSources(sources, connectors, localCloud).map(({ id }) => id)).toEqual([
      'store_atlas',
      'local_mongo',
      'marked_mongo',
    ])
    expect(targetSources(sources, connectors, releaseCloud).map(({ id }) => id)).toEqual([
      'store_atlas',
    ])
  })

  it('filters sources by deployment policy while preserving order', () => {
    const sources = [
      { id: 'mysql_orders', connector: 'mysql' },
      { id: 'pg_warehouse', connector: 'postgres' },
      { id: 'atlas_out', connector: 'mongodb-atlas', metadata: { labels: { store: 'true' } } },
      { id: 'mongo_out', connector: 'mongodb' },
    ]
    expect(targetSources(sources, connectors, onPrem).map(({ id }) => id)).toEqual([
      'pg_warehouse',
      'atlas_out',
      'mongo_out',
    ])
    expect(targetSources(sources, connectors, releaseCloud).map(({ id }) => id)).toEqual([
      'atlas_out',
    ])
    expect(targetSources([], connectors, onPrem)).toEqual([])
  })
})
