import { describe, expect, it } from 'vitest'

import { TARGET_CONNECTOR_ID, isTargetConnector, targetSources } from './pipeline-target-connectors'

describe('pipeline target connectors', () => {
  it('admits the MongoDB connector and refuses every other data source type', () => {
    expect(isTargetConnector(TARGET_CONNECTOR_ID)).toBe(true)
    for (const connector of [
      'mysql',
      'postgres',
      'oracle',
      'sqlserver',
      'kafka',
      // The managed MongoDB variants are separate connectors, and none of them is admitted here.
      'mongodb-atlas',
      'mongodb3',
      'aliyun-db-mongodb',
      'tencent-db-mongodb',
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
      { id: 'mongo_out', connector: 'mongodb' },
      { id: 'atlas_out', connector: 'mongodb-atlas' },
      { id: 'mongo_archive', connector: 'mongodb' },
    ]
    expect(targetSources(sources).map((source) => source.id)).toEqual([
      'mongo_out',
      'mongo_archive',
    ])
    expect(targetSources([])).toEqual([])
  })
})
