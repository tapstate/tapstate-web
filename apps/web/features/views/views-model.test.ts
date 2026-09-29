import { describe, expect, it } from 'vitest'

import type { ViewFreshness, ViewSummary } from '@/service/view-client'

import { durationParts, formatBytes, sortViews, summarizeViews } from './views-model'

function view(collection: string, status: ViewFreshness): ViewSummary {
  return {
    id: collection,
    kind: 'view',
    location: { storeId: 'views', database: null, collection },
    pipelineId: 'p',
    status,
    documents: null,
    sizeBytes: null,
    lastAppliedAt: null,
  }
}

describe('summarizeViews', () => {
  it('counts fresh and stale views and keeps the slowest fresh lag', () => {
    const summary = summarizeViews([
      view('a', { state: 'fresh', behindSeconds: 3 }),
      view('b', { state: 'fresh', behindSeconds: 4 }),
      view('c', { state: 'stale', staleSeconds: 720 }),
      view('d', { state: 'loading', percent: 42 }),
      view('e', { state: 'not-loaded' }),
    ])

    expect(summary).toEqual({
      total: 5,
      fresh: 2,
      stale: 1,
      loading: 1,
      notLoaded: 1,
      slowestBehindSeconds: 4,
    })
  })

  it('has no slowest lag when nothing is fresh', () => {
    expect(summarizeViews([view('a', { state: 'not-loaded' })]).slowestBehindSeconds).toBeNull()
  })
})

describe('formatting', () => {
  it('rounds a duration down to its largest whole unit', () => {
    expect(durationParts(3.9)).toEqual({ value: 3, unit: 's' })
    expect(durationParts(720)).toEqual({ value: 12, unit: 'min' })
    expect(durationParts(7200)).toEqual({ value: 2, unit: 'h' })
    expect(durationParts(4 * 86400 + 5)).toEqual({ value: 4, unit: 'd' })
    expect(durationParts(-1)).toEqual({ value: 0, unit: 's' })
  })

  it('formats sizes in binary units', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(20 * 1024 * 1024)).toBe('20 MB')
  })

  it('sorts views by collection name', () => {
    const sorted = sortViews([
      view('b', { state: 'not-loaded' }),
      view('a', { state: 'not-loaded' }),
    ])
    expect(sorted.map((entry) => entry.id)).toEqual(['a', 'b'])
  })
})
