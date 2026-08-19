import { describe, expect, it } from 'vitest'

import {
  createSource,
  deleteSource,
  getConnector,
  getSource,
  listConnectors,
  listSources,
  SourceClientError,
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
