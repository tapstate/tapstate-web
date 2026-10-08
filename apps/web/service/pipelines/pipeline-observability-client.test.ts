import { describe, expect, it } from 'vitest'

import type { ApiFetcher } from '../source-client'

import { getPipelineExplain, getPipelineMetricsHistory } from './pipeline-observability-client'

const history = {
  pipelineId: 'orders/to_warehouse',
  from: '2026-09-20T10:00:00Z',
  to: '2026-09-20T11:00:00Z',
  effectiveFrom: '2026-09-20T10:00:00Z',
  effectiveTo: '2026-09-20T11:00:00Z',
  retentionCutoff: '2026-09-05T11:00:00Z',
  effectiveResolution: 'PT5M',
  status: 'OK',
  consistency: 'EVENTUAL',
  segments: [
    {
      intervalStart: '2026-09-20T10:00:00Z',
      intervalEnd: '2026-09-20T10:05:00Z',
      startReason: 'WINDOW_START',
      points: [
        {
          intervalStart: '2026-09-20T10:00:00Z',
          intervalEnd: '2026-09-20T10:05:00Z',
          recordsOut: { delta: 3000, averageRate: 10, maxRate: 25 },
          bytesOut: { delta: 240000, averageRate: 800, maxRate: 1600 },
          lag: [
            {
              table: 'public.orders',
              observedAt: '2026-09-20T10:04:00Z',
              last: 2,
              max: 12,
            },
          ],
        },
      ],
    },
    {
      intervalStart: '2026-09-20T10:30:00Z',
      intervalEnd: '2026-09-20T10:35:00Z',
      startReason: 'GAP',
      points: [
        {
          intervalStart: '2026-09-20T10:30:00Z',
          intervalEnd: '2026-09-20T10:35:00Z',
          recordsOut: { delta: 3000, averageRate: 10, maxRate: 10 },
          lag: [],
        },
      ],
    },
  ],
  gaps: [
    {
      intervalStart: '2026-09-20T10:05:00Z',
      intervalEnd: '2026-09-20T10:30:00Z',
      reason: 'SAMPLE_GAP',
    },
  ],
  unavailable: [{ metric: 'lag', table: 'public.order_items' }],
  nextCursor: 'opaque-page-two',
} as const

const explanation = {
  pipelineId: 'orders/to_warehouse',
  state: 'RUNNING',
  kind: 'OBSERVATION_STALE',
  message: 'The latest observation is stale.',
  observedAt: '2026-09-20T10:00:00Z',
  observedAgeMillis: 45000,
  freshness: 'STALE',
  evidence: [{ source: 'status', field: 'observedAgeMillis', value: 45000 }],
  cannotSay: ['What the pipeline is doing now: only the last published observation is available.'],
  next: { action: 'CHECK_SERVER', message: 'Check that the server is running and converging.' },
} as const

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function fetcherFor(response: Response, seen: Request[] = []): ApiFetcher {
  return async (input, init) => {
    seen.push(new Request(typeof input === 'string' ? `http://test${input}` : input, init))
    return response
  }
}

describe('Pipeline observability client', () => {
  it('forwards the history query without deriving rates, resets, or gaps in the browser', async () => {
    const requests: Request[] = []

    await expect(
      getPipelineMetricsHistory(
        'orders/to_warehouse',
        {
          from: history.from,
          to: history.to,
          resolution: 'PT5M',
          limit: 120,
          tables: ['public.orders', 'public.order_items'],
          cursor: 'opaque-page-one',
        },
        fetcherFor(jsonResponse(history), requests),
      ),
    ).resolves.toEqual(history)

    const url = new URL(requests[0].url)
    expect(url.pathname).toBe('/api/pipelines/orders%2Fto_warehouse/metrics/history')
    expect(url.searchParams.get('from')).toBe(history.from)
    expect(url.searchParams.get('to')).toBe(history.to)
    expect(url.searchParams.get('resolution')).toBe('PT5M')
    expect(url.searchParams.get('limit')).toBe('120')
    expect(url.searchParams.getAll('table')).toEqual(['public.orders', 'public.order_items'])
    expect(url.searchParams.get('cursor')).toBe('opaque-page-one')
    expect(history.segments[1].startReason).toBe('GAP')
    expect(history.gaps[0].reason).toBe('SAMPLE_GAP')
  })

  it('retains the explicit no-retained-samples response instead of inferring a reason', async () => {
    const emptyHistory = {
      ...history,
      status: 'NO_RETAINED_SAMPLES' as const,
      segments: [],
      gaps: [],
      unavailable: [],
      nextCursor: null,
    }

    await expect(
      getPipelineMetricsHistory(
        history.pipelineId,
        { from: history.from, to: history.to },
        fetcherFor(jsonResponse(emptyHistory)),
      ),
    ).resolves.toEqual(emptyHistory)
  })

  it('accepts only the authoritative explanation and preserves evidence value types', async () => {
    const requests: Request[] = []

    await expect(
      getPipelineExplain('orders/to_warehouse', fetcherFor(jsonResponse(explanation), requests)),
    ).resolves.toEqual(explanation)

    expect(new URL(requests[0].url).pathname).toBe('/api/pipelines/orders%2Fto_warehouse/explain')
    expect(explanation.evidence[0].value).toBe(45000)
  })

  it('fails closed when a history or explanation response drifts from the typed contract', async () => {
    const malformedHistory = { ...history, consistency: 'SNAPSHOT' }
    const malformedExplain = { ...explanation, kind: 'HEALTHY' }

    await expect(
      getPipelineMetricsHistory(
        history.pipelineId,
        { from: history.from, to: history.to },
        fetcherFor(jsonResponse(malformedHistory)),
      ),
    ).rejects.toMatchObject({ kind: 'protocol' })

    await expect(
      getPipelineExplain(history.pipelineId, fetcherFor(jsonResponse(malformedExplain))),
    ).rejects.toMatchObject({ kind: 'protocol' })
  })

  it('preserves coded server refusals for the shared error renderer', async () => {
    await expect(
      getPipelineMetricsHistory(
        history.pipelineId,
        { from: history.from, to: history.to, cursor: 'invalid' },
        fetcherFor(
          jsonResponse(
            {
              code: 'monitor.invalid-cursor',
              params: { reason: 'QUERY_MISMATCH' },
              message: 'The cursor cannot be used with this query.',
            },
            400,
          ),
        ),
      ),
    ).rejects.toMatchObject({
      kind: 'server',
      status: 400,
      code: 'monitor.invalid-cursor',
      params: { reason: 'QUERY_MISMATCH' },
    })
  })
})
