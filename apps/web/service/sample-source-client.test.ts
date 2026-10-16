import { describe, expect, it, vi } from 'vitest'

import type { SourceView } from './source-client'

import {
  addSampleSources,
  isSampleSource,
  loadSampleSources,
  removeSampleSources,
  type SampleSourceSetting,
} from './sample-source-client'

function view(id: string, sample = false): SourceView {
  return {
    id,
    metadata: sample ? { labels: { sample: 'true' }, description: id } : null,
    connector: 'mysql',
    config: {},
    configuredSecrets: [],
    mode: 'cdc',
    tables: null,
    srs: null,
    contentHash: 'a'.repeat(64),
  }
}

const coreBanking: SampleSourceSetting = {
  id: 'sample_core_banking',
  name: 'Core banking',
  description: 'Customers, accounts and transactions',
  connector: 'mysql',
}

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

describe('loadSampleSources', () => {
  it('reads non-secret sample metadata from the server', async () => {
    const fetcher = vi.fn(async () => json({ sources: [coreBanking] }))

    await expect(loadSampleSources(fetcher)).resolves.toEqual([coreBanking])
    expect(fetcher).toHaveBeenCalledWith('/api/sample-sources/catalog', expect.anything())
  })

  it('offers nothing when the server has no samples or returns malformed metadata', async () => {
    await expect(loadSampleSources(vi.fn(async () => json({}, 404)))).resolves.toBeNull()
    await expect(
      loadSampleSources(vi.fn(async () => json({ sources: [{ id: 1 }] }))),
    ).resolves.toBeNull()
    await expect(
      loadSampleSources(vi.fn(async () => new Response('<html>', { status: 200 }))),
    ).resolves.toBeNull()
  })
})

describe('addSampleSources', () => {
  it('asks the server to install both samples without sending credentials', async () => {
    const fetcher = vi.fn(async () =>
      json({
        added: [view('sample_cards_crm', true)],
        existing: ['sample_core_banking'],
      }),
    )
    const cards = { ...coreBanking, id: 'sample_cards_crm', name: 'Cards & CRM' }

    const result = await addSampleSources(
      [coreBanking, cards],
      [view('sample_core_banking', true)],
      fetcher,
    )

    expect(result.existing).toEqual(['sample_core_banking'])
    expect(result.added.map((source) => source.id)).toEqual(['sample_cards_crm'])
    expect(fetcher).toHaveBeenCalledWith('/api/sample-sources:install', { method: 'POST' })
  })
})

describe('removeSampleSources', () => {
  it('deletes only sample sources and stops, naming the pipelines, when one is in use', async () => {
    const deleted: string[] = []
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const id = decodeURIComponent(String(input).split('/').pop() ?? '')
      if (init?.method === 'DELETE') {
        if (id === 'sample_cards_crm')
          return json({ code: 'source.in-use', params: { id, referrers: ['c360_pipeline'] } }, 409)
        deleted.push(id)
        return new Response(null, { status: 204 })
      }
      return json(view(id, true), 200, { ETag: `"${'c'.repeat(64)}"` })
    })

    const result = await removeSampleSources(
      [view('sample_core_banking', true), view('orders'), view('sample_cards_crm', true)],
      fetcher,
    )

    expect(deleted).toEqual(['sample_core_banking'])
    expect(result).toEqual({
      removed: ['sample_core_banking'],
      refused: { sourceId: 'sample_cards_crm', referrers: ['c360_pipeline'] },
    })
  })

  it('recognises a sample only by its label', () => {
    expect(isSampleSource(view('sample_core_banking', true))).toBe(true)
    expect(isSampleSource(view('sample_core_banking'))).toBe(false)
  })
})
