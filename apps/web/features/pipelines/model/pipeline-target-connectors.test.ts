import { describe, expect, it } from 'vitest'

import type { ConnectorSummary } from '@/service/source-client'

import { isTargetConnector, targetSources } from './pipeline-target-connectors'

const connectors = [
  { id: 'mongodb-atlas', sink: true },
  { id: 'mongodb', sink: true },
  { id: 'postgres', sink: true },
  { id: 'mysql', sink: false },
] as unknown as ConnectorSummary[]

describe('pipeline target connectors', () => {
  it('limits cloud to Atlas and uses declared sink capability in OP', () => {
    expect(isTargetConnector('mongodb-atlas', 'cloud', connectors)).toBe(true)
    expect(isTargetConnector('mongodb', 'cloud', connectors)).toBe(false)
    expect(isTargetConnector('postgres', 'on-prem', connectors)).toBe(true)
    expect(isTargetConnector('mysql', 'on-prem', connectors)).toBe(false)
    expect(isTargetConnector(null, 'on-prem', connectors)).toBe(false)
  })

  it('filters sources by deployment policy while preserving order', () => {
    const sources = [
      { id: 'mysql_orders', connector: 'mysql' },
      { id: 'pg_warehouse', connector: 'postgres' },
      { id: 'atlas_out', connector: 'mongodb-atlas', metadata: { labels: { store: 'true' } } },
      { id: 'mongo_out', connector: 'mongodb' },
    ]
    expect(targetSources(sources, connectors, 'on-prem').map(({ id }) => id)).toEqual([
      'pg_warehouse',
      'atlas_out',
      'mongo_out',
    ])
    expect(targetSources(sources, connectors, 'cloud').map(({ id }) => id)).toEqual(['atlas_out'])
    expect(targetSources([], connectors, 'on-prem')).toEqual([])
  })
})
