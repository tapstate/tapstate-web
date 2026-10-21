import { describe, expect, it } from 'vitest'

import type { SourceView } from './source-client'

import { isDataSource, stateStoreSource } from './state-store-source'

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
