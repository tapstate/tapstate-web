import { describe, expect, it } from 'vitest'

import {
  createSource,
  deleteSource,
  discoverSourceSchema,
  getConnector,
  getSource,
  getSourceSchema,
  listConnectors,
  listSources,
  SourceClientError,
  testConnection,
  updateSource,
  type ApiFetcher,
  type SourceDraft,
  type SourceView,
} from './source-client'

const source: SourceView = {
  id: 'orders',
  metadata: null,
  connector: 'mysql',
  config: { host: 'localhost' },
  configuredSecrets: ['password'],
  mode: 'cdc',
  tables: [{ type: 'literal', name: 'orders', pattern: null, filter: null, pk: null, options: {} }],
  options: { preserve: true },
  srs: null,
  experimental: { flag: true },
  contentHash: 'a'.repeat(64),
}

function jsonResponse(body: unknown, status = 200, etag?: string) {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...(etag ? { ETag: etag } : {}),
    },
  })
}

function fetcherFor(response: Response, seen: Request[] = []): ApiFetcher {
  return async (input, init) => {
    seen.push(new Request(typeof input === 'string' ? `http://test${input}` : input, init))
    return response
  }
}

describe('source client', () => {
  it('retains the verbatim connector spec source for a Formily consumer', async () => {
    const connector = {
      id: 'mysql',
      name: 'MySQL',
      group: 'database',
      modes: ['cdc'],
      discovery: 'table',
      sink: false,
      pushOut: false,
      origin: 'registered',
      icon: 'icons/mysql.png',
      runtimeAvailable: true,
      config: [],
      spec: {
        contentHash: 'b'.repeat(64),
        text: '{"configOptions":{"connection":{"type":"object","properties":{}}}}',
        unavailable: null,
      },
    }

    await expect(getConnector('mysql', fetcherFor(jsonResponse(connector)))).resolves.toEqual(
      connector,
    )
    await expect(
      listConnectors(fetcherFor(jsonResponse({ connectors: [connector] }))),
    ).resolves.toMatchObject([{ id: 'mysql', name: 'MySQL' }])
  })

  it('rejects malformed connector summaries instead of leaking an unsafe card model to the UI', async () => {
    await expect(
      listConnectors(
        fetcherFor(
          jsonResponse({
            connectors: [
              {
                id: 'mysql',
                name: 'MySQL',
                icon: 42,
                group: 'database',
                modes: ['cdc'],
                discovery: 'table',
                sink: false,
                pushOut: false,
                origin: 'registered',
              },
            ],
          }),
        ),
      ),
    ).rejects.toMatchObject({ kind: 'protocol' })
  })

  it('lists and fetches projected sources', async () => {
    const fetcher = fetcherFor(jsonResponse({ items: [source] }))
    await expect(listSources(fetcher)).resolves.toEqual([source])

    const detail = await getSource(
      'orders',
      fetcherFor(jsonResponse(source, 200, `"${source.contentHash}"`)),
    )
    expect(detail).toEqual({ source, etag: `"${source.contentHash}"` })
  })

  it('accepts nullable optional projection maps from the control plane', async () => {
    const nullableMapsSource = { ...source, options: null, experimental: null }
    const { options: _options, experimental: _experimental, ...omittedMapsSource } = source

    await expect(
      getSource(
        'orders',
        fetcherFor(jsonResponse(nullableMapsSource, 200, `"${source.contentHash}"`)),
      ),
    ).resolves.toEqual({ source: nullableMapsSource, etag: `"${source.contentHash}"` })

    await expect(
      getSource(
        'orders',
        fetcherFor(jsonResponse(omittedMapsSource, 200, `"${source.contentHash}"`)),
      ),
    ).resolves.toEqual({ source: omittedMapsSource, etag: `"${source.contentHash}"` })
  })

  it('captures the server ETag for create and reuses it for update', async () => {
    const requests: Request[] = []
    const draft: SourceDraft = {
      id: 'orders',
      connector: 'mysql',
      config: { host: 'localhost', password: 'write-only' },
      mode: 'cdc',
      options: {},
      experimental: {},
      clearSecrets: [],
    }
    const created = await createSource(
      draft,
      fetcherFor(jsonResponse(source, 201, `"${source.contentHash}"`), requests),
    )
    expect(created.etag).toBe(`"${source.contentHash}"`)
    expect(JSON.parse(await requests[0].clone().text())).toMatchObject({
      id: 'orders',
      connector: 'mysql',
      clearSecrets: [],
    })

    const updatedSource = { ...source, contentHash: 'b'.repeat(64) }
    const updated = await updateSource(
      'orders',
      { ...draft, config: { host: 'db.internal' } },
      created.etag,
      fetcherFor(jsonResponse(updatedSource, 200, `"${updatedSource.contentHash}"`), requests),
    )
    expect(updated.source).toEqual(updatedSource)
    expect(requests[1].headers.get('If-Match')).toBe(created.etag)
  })

  it('posts a connection draft and returns its structured test report', async () => {
    const requests: Request[] = []
    const report = {
      connectionId: 'orders',
      connectorId: 'mysql',
      outcome: 'PASSED' as const,
      checks: [
        {
          name: 'connection',
          status: 'PASSED' as const,
          message: 'Connected',
          reason: null,
          solution: null,
          connectorErrorCode: null,
        },
      ],
      testedAt: 1_754_800_000_000,
    }

    await expect(
      testConnection(
        {
          id: 'orders',
          connectorId: 'mysql',
          settings: { host: 'db.internal', password: 'write-only' },
        },
        fetcherFor(jsonResponse(report), requests),
      ),
    ).resolves.toEqual(report)

    expect(requests).toHaveLength(1)
    expect(requests[0].method).toBe('POST')
    expect(new URL(requests[0].url).pathname).toBe('/api/connections:test')
    expect(requests[0].headers.get('Content-Type')).toBe('application/json')
    await expect(requests[0].json()).resolves.toEqual({
      id: 'orders',
      connectorId: 'mysql',
      settings: { host: 'db.internal', password: 'write-only' },
    })
  })

  it('rejects a malformed or mismatched connection test report', async () => {
    await expect(
      testConnection(
        { id: 'orders', connectorId: 'mysql', settings: { host: 'db.internal' } },
        fetcherFor(
          jsonResponse({
            connectionId: 'another-source',
            connectorId: 'mysql',
            outcome: 'PASSED',
            checks: [],
            testedAt: 1_754_800_000_000,
          }),
        ),
      ),
    ).rejects.toMatchObject({ kind: 'protocol' })

    await expect(
      testConnection(
        { id: 'orders', connectorId: 'mysql', settings: { host: 'db.internal' } },
        fetcherFor(
          jsonResponse({
            connectionId: 'orders',
            connectorId: 'mysql',
            outcome: 'PASSED',
            checks: [{ name: 'connection', status: 'UNKNOWN' }],
            testedAt: 1_754_800_000_000,
          }),
        ),
      ),
    ).rejects.toMatchObject({ kind: 'protocol' })
  })

  it('discovers and reads a strict source schema report', async () => {
    const report = {
      connectionId: 'orders',
      connectorId: 'mysql',
      discoveredAt: 1_754_800_000_000,
      tables: [
        {
          name: 'orders',
          fields: [
            { name: 'id', type: 'BIGINT' },
            { name: 'email', type: 'VARCHAR' },
          ],
          primaryKey: ['id'],
          indexes: [{ name: 'idx_orders_id', fields: ['id'], unique: true }],
        },
      ],
    }
    const requests: Request[] = []
    const request = {
      id: 'orders',
      connectorId: 'mysql',
      settings: { host: 'db.internal', password: 'write-only' },
    }

    await expect(
      discoverSourceSchema(request, fetcherFor(jsonResponse(report), requests)),
    ).resolves.toEqual(report)
    expect(new URL(requests[0].url).pathname).toBe('/api/connections:discover-schema')
    await expect(requests[0].json()).resolves.toEqual(request)

    await expect(
      getSourceSchema(
        'orders',
        fetcherFor(jsonResponse(report, 200, `"${source.contentHash}"`), requests),
      ),
    ).resolves.toEqual(report)
    expect(new URL(requests[1].url).pathname).toBe('/api/sources/orders/schema')
  })

  it('rejects malformed or mismatched source schema reports', async () => {
    await expect(
      discoverSourceSchema(
        { id: 'orders', connectorId: 'mysql', settings: {} },
        fetcherFor(
          jsonResponse({
            connectionId: 'another-source',
            connectorId: 'mysql',
            discoveredAt: 1_754_800_000_000,
            tables: [],
          }),
        ),
      ),
    ).rejects.toMatchObject({ kind: 'protocol' })

    await expect(
      getSourceSchema(
        'orders',
        fetcherFor(
          jsonResponse({
            connectionId: 'orders',
            connectorId: 'mysql',
            discoveredAt: 1_754_800_000_000,
            tables: [
              { name: 'orders', fields: [{ name: 'id', type: 42 }], primaryKey: [], indexes: [] },
            ],
          }),
        ),
      ),
    ).rejects.toMatchObject({ kind: 'protocol' })
  })

  it('omits secret values unless the caller explicitly clears them', async () => {
    const requests: Request[] = []
    const draft: SourceDraft = {
      id: 'orders',
      connector: 'mysql',
      config: { host: 'localhost' },
      clearSecrets: ['password'],
    }
    await updateSource(
      'orders',
      draft,
      `"${source.contentHash}"`,
      fetcherFor(jsonResponse(source, 200, `"${source.contentHash}"`), requests),
    )
    const body = JSON.parse(await requests[0].text())
    expect(body.config).toEqual({ host: 'localhost' })
    expect(body.clearSecrets).toEqual(['password'])
  })

  it('preserves structured server errors including referrer params', async () => {
    const error = await getSource(
      'orders',
      fetcherFor(
        jsonResponse(
          { code: 'source.in-use', params: { id: 'orders', referrers: ['pipe-a', 'pipe-b'] } },
          409,
        ),
      ),
    ).catch((value) => value)

    expect(error).toBeInstanceOf(SourceClientError)
    expect(error).toMatchObject({
      kind: 'server',
      status: 409,
      code: 'source.in-use',
      params: { referrers: ['pipe-a', 'pipe-b'] },
    })
  })

  it('refuses missing or malformed ETags and malformed JSON', async () => {
    await expect(
      updateSource(
        'orders',
        { id: source.id, connector: source.connector, config: source.config },
        '',
        fetcherFor(jsonResponse(source)),
      ),
    ).rejects.toMatchObject({ kind: 'protocol', code: 'source.precondition-required' })

    await expect(
      deleteSource('orders', `"${source.contentHash}"`, fetcherFor(jsonResponse(null, 204))),
    ).resolves.toBeUndefined()

    await expect(
      listSources(
        fetcherFor(
          new Response('{not-json', {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      ),
    ).rejects.toMatchObject({ kind: 'protocol' })
  })
})
