import '@/i18n/index'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ConnectorDetail, SourceView } from '@/service/source-client'

const { apiFetch, getConnector, testConnection } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  getConnector: vi.fn(),
  testConnection: vi.fn(),
}))

vi.mock('@/service/source-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/service/source-client')>()),
  getConnector,
  testConnection,
}))
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: <T,>(selector: (state: { apiFetch: typeof fetch }) => T) => selector({ apiFetch }),
}))

import { AtlasStoreDialog } from './atlas-store-dialog'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const detail: ConnectorDetail = {
  id: 'mongodb-atlas',
  name: 'MongoDB Atlas',
  icon: 'icons/mongodb-atlas.png',
  group: 'database',
  modes: ['snapshot'],
  discovery: 'catalog',
  sink: false,
  pushOut: false,
  origin: 'registered',
  config: [],
  spec: {
    contentHash: 'a'.repeat(64),
    text: JSON.stringify({
      properties: { tags: ['ssl'] },
      configOptions: { connection: { type: 'object', properties: {} } },
    }),
    unavailable: null,
  },
  runtimeAvailable: true,
}

let host: HTMLDivElement
let root: Root
let queryClient: QueryClient

function changeInput(input: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  valueSetter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  getConnector.mockReset().mockResolvedValue(detail)
  testConnection.mockReset().mockResolvedValue({ outcome: 'PASSED' })
  apiFetch.mockReset().mockResolvedValue({
    ok: true,
    json: async () => ({ id: 'atlas-store' }) as SourceView,
  })
})

afterEach(async () => {
  await act(async () => root.unmount())
  queryClient.clear()
  host.remove()
  vi.clearAllMocks()
})

describe('AtlasStoreDialog', () => {
  it('keeps tag-injected TLS settings in the test and state-store payloads', async () => {
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <AtlasStoreDialog open onOpenChange={() => undefined} onCreated={() => undefined} />
        </QueryClientProvider>,
      )
    })

    let password: HTMLInputElement | null = null
    await vi.waitFor(() => {
      password = host.querySelector<HTMLInputElement>('input[aria-label="Client key password"]')
      expect(password).not.toBeNull()
    })

    await act(async () => {
      changeInput(password as HTMLInputElement, 'key-password')
    })
    await act(async () => {
      host.querySelector<HTMLButtonElement>('button[type="submit"]')?.click()
    })

    await vi.waitFor(() => expect(testConnection).toHaveBeenCalled())
    expect(testConnection.mock.calls[0]?.[0]).toMatchObject({
      id: 'atlas-store',
      connectorId: 'mongodb-atlas',
      settings: { sslKeyPassword: 'key-password' },
    })
    const request = apiFetch.mock.calls[0]?.[1] as RequestInit | undefined
    expect(JSON.parse(String(request?.body))).toMatchObject({ sslKeyPassword: 'key-password' })
  })
})
