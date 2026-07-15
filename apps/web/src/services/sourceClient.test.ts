import {
  createSource,
  getConnector,
  listConnectors,
  listSources,
  SourceClientError,
} from './sourceClient.ts'

interface FetchCall {
  input: RequestInfo | URL
  init?: RequestInit
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const calls: FetchCall[] = []
async function fetcher(input: RequestInfo | URL, init?: RequestInit) {
  calls.push({ input, init })
  const path = String(input)

  if (path === '/api/sources' && init?.method === 'POST') {
    return jsonResponse({ id: 'warehouse', connector: 'postgres', config: {}, configuredSecrets: [], mode: 'cdc', tables: null, options: {}, srs: null, experimental: {}, contentHash: 'hash' }, 201)
  }
  if (path === '/api/sources') {
    return jsonResponse({ items: [] })
  }
  if (path === '/api/connectors/postgres') {
    return jsonResponse({ id: 'postgres', name: 'PostgreSQL', icon: null, group: 'database', modes: ['cdc'], discovery: 'catalog', sink: true, pushOut: false, origin: 'bundled', config: [] })
  }
  if (path === '/api/connectors') {
    return jsonResponse({ connectors: [{ id: 'postgres', name: 'PostgreSQL', group: 'database', modes: ['cdc'], discovery: 'catalog', sink: true, pushOut: false, origin: 'bundled' }] })
  }
  return jsonResponse({ code: 'connector.not-found' }, 404)
}

await listSources(fetcher)
const connectors = await listConnectors(fetcher)
const connector = await getConnector('postgres', fetcher)
await createSource({ id: 'warehouse', connector: 'postgres', config: {}, mode: 'cdc' }, fetcher)

if (connectors[0]?.id !== 'postgres' || connector.config.length !== 0) {
  throw new Error('connector catalog responses must preserve the backend contract')
}

const createCall = calls.find(call => call.init?.method === 'POST')
if (createCall?.init?.headers === undefined || createCall.init.body === undefined) {
  throw new Error('source creation must send a JSON request')
}

try {
  await getConnector('missing', fetcher)
  throw new Error('coded API errors must reject')
}
catch (error) {
  if (!(error instanceof SourceClientError) || error.code !== 'connector.not-found' || error.status !== 404) {
    throw error
  }
}
