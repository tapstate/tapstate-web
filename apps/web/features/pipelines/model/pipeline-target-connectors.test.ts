import { describe, expect, it } from 'vitest'

import {
  TARGET_CONNECTOR_IDS,
  isTargetConnector,
  targetSources,
} from './pipeline-target-connectors'

describe('pipeline target connectors', () => {
  it('admits every connector of the MongoDB family and refuses every other data source type', () => {
    // A deployment on a managed variant registers that variant's id and no other, so admitting only
    // the bare id would leave it with no Source it could put under a target at all.
    expect(TARGET_CONNECTOR_IDS).toEqual([
      'mongodb',
      'mongodb-atlas',
      'aliyun-db-mongodb',
      'tencent-db-mongodb',
    ])
    for (const connector of TARGET_CONNECTOR_IDS) {
      expect(isTargetConnector(connector)).toBe(true)
    }
    for (const connector of [
      'mysql',
      'postgres',
      'oracle',
      'sqlserver',
      'aws-rds-mysql',
      'kafka',
      // Not in the release's supported set: a server accepting it is one an operator widened.
      'mongodb3',
    ]) {
      expect(isTargetConnector(connector)).toBe(false)
    }
    expect(isTargetConnector(null)).toBe(false)
    expect(isTargetConnector(undefined)).toBe(false)
    expect(isTargetConnector('')).toBe(false)
  })

  it('keeps only the Sources a target may write to, in the order they were given', () => {
    const sources = [
      { id: 'mysql_orders', connector: 'mysql' },
      { id: 'rds_orders', connector: 'aws-rds-mysql' },
      { id: 'mongo_out', connector: 'mongodb' },
      { id: 'atlas_out', connector: 'mongodb-atlas' },
      { id: 'legacy_out', connector: 'mongodb3' },
      { id: 'mongo_archive', connector: 'mongodb' },
    ]
    expect(targetSources(sources).map((source) => source.id)).toEqual([
      'mongo_out',
      'atlas_out',
      'mongo_archive',
    ])
    expect(targetSources([])).toEqual([])
  })
})
