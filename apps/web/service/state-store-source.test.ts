import { describe, expect, it } from 'vitest'

import type { SourceView } from './source-client'

import { isDataSource, stateStoreDatabase, stateStoreSource } from './state-store-source'

describe('server-projected default target identity', () => {
  it('does not infer managed identity from a bare legacy id', () => {
    const ordinary: SourceView = {
      id: 'views',
      connector: 'mongodb',
      metadata: null,
      config: {},
      configuredSecrets: [],
      mode: null,
      tables: null,
      srs: null,
      contentHash: 'hash',
    }
    expect(stateStoreSource([ordinary], 'on-prem')).toBeNull()
    expect(isDataSource(ordinary)).toBe(true)
  })
  it('uses the server-owned projection for both modes', () => {
    const managed = {
      id: 'actual-default',
      connector: 'mongodb',
      metadata: { labels: { store: 'true' } },
      config: {},
      configuredSecrets: [],
      mode: null,
      tables: null,
      srs: null,
      contentHash: 'hash',
    } satisfies SourceView
    expect(stateStoreSource([managed], 'on-prem')).toBe(managed)
    expect(stateStoreSource([managed], 'cloud')).toBe(managed)
    expect(isDataSource(managed)).toBe(false)
  })
})

describe('default application database label', () => {
  it.each([
    [
      'mongodb://private-user:private-password@host-a:27017,host-b:27017/orders?authSource=admin',
      'orders',
    ],
    ['mongodb+srv://private-user:private-password@cluster.example/orders%2Dprod', 'orders-prod'],
    ['mongodb://host/?authSource=admin', null],
    ['mongodb://host/bad%2Fname', null],
    ['mongodb://host/bad%ZZname', null],
    ['https://user:password@host/not-a-mongo-store', null],
  ])('projects only the database from a URI', (uri, expected) => {
    expect(stateStoreDatabase({ config: { uri } })).toBe(expected)
  })
  it('retains an explicit database projection', () => {
    expect(stateStoreDatabase({ config: { database: 'application', uri: '<redacted>' } })).toBe(
      'application',
    )
  })
})
