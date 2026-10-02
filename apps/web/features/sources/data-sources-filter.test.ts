import { describe, expect, it } from 'vitest'

import { filterSourcesBySearchAndStatus } from './data-sources-filter'

const sources = [
  { name: 'Orders', type: 'postgres', host: 'db.local', status: 'connected' as const },
  { name: 'Events', type: 'kafka', host: 'broker.local', status: 'error' as const },
]

describe('data sources filter', () => {
  it('filters by search text and connection status', () => {
    expect(filterSourcesBySearchAndStatus(sources, 'broker', 'all')).toEqual([sources[1]])
    expect(filterSourcesBySearchAndStatus(sources, '', 'connected')).toEqual([sources[0]])
    expect(filterSourcesBySearchAndStatus(sources, 'missing', 'all')).toEqual([])
  })
})
