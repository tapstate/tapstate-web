import { describe, expect, it } from 'vitest'

import type { ConnectorSummary } from '@/service/source-client'

import { isTargetConnector, targetSources } from './pipeline-target-connectors'

const connectors = [
  { id: 'mongodb-atlas', sink: true },
  { id: 'mongodb', sink: true },
  { id: 'postgres', sink: true },
  { id: 'mysql', sink: false },
  { id: 'aws-rds-mysql', sink: true },
  { id: 'db2', sink: true },
] as unknown as ConnectorSummary[]

describe('pipeline target connectors', () => {
  it('keeps MongoDB and Atlas cloud targets and uses declared sink capability in OP', () => {
    expect(isTargetConnector('mongodb-atlas', 'cloud', connectors)).toBe(true)
    expect(isTargetConnector('mongodb', 'cloud', connectors)).toBe(true)
    expect(isTargetConnector('postgres', 'cloud', connectors)).toBe(false)
    expect(isTargetConnector('postgres', 'on-prem', connectors)).toBe(true)
    expect(isTargetConnector('mysql', 'on-prem', connectors)).toBe(false)
    expect(isTargetConnector(null, 'on-prem', connectors)).toBe(false)
  })

  it('keeps source-only previews out of targets even if a catalog row declares writes', () => {
    for (const profile of ['cloud', 'on-prem'] as const) {
      expect(isTargetConnector('aws-rds-mysql', profile, connectors)).toBe(false)
      expect(isTargetConnector('db2', profile, connectors)).toBe(false)
    }
  })

  it('filters sources by deployment policy while preserving order', () => {
    const sources = [
      { id: 'mysql_orders', connector: 'mysql' },
      { id: 'rds_orders', connector: 'aws-rds-mysql' },
      { id: 'db2_orders', connector: 'db2' },
      { id: 'pg_warehouse', connector: 'postgres' },
      { id: 'atlas_out', connector: 'mongodb-atlas', metadata: { labels: { store: 'true' } } },
      { id: 'mongo_out', connector: 'mongodb', metadata: { labels: { store: 'true' } } },
      { id: 'mongo_unmarked', connector: 'mongodb' },
    ]
    expect(targetSources(sources, connectors, 'on-prem').map(({ id }) => id)).toEqual([
      'pg_warehouse',
      'atlas_out',
      'mongo_out',
      'mongo_unmarked',
    ])
    expect(targetSources(sources, connectors, 'cloud').map(({ id }) => id)).toEqual([
      'atlas_out',
      'mongo_out',
    ])
    expect(targetSources([], connectors, 'on-prem')).toEqual([])
  })
})
