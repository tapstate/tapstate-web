import '@/i18n/index'
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query'
import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { useAuthStore } from '@/stores/auth-store'

import { AlertsPage, type AlertSearch } from './alerts-page'

const route = vi.hoisted(() => ({ search: {} as AlertSearch, navigate: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({
  useSearch: () => route.search,
  useNavigate: () => route.navigate,
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}))
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: Root
let node: HTMLDivElement
let client: QueryClient
let recovered = false
let detailReads = 0
beforeEach(() => {
  vi.useFakeTimers()
  focusManager.setFocused(true)
  recovered = false
  detailReads = 0
  route.search = { key: 'original-key', episode: 1 }
  route.navigate.mockReset()
  node = document.createElement('div')
  document.body.append(node)
  root = createRoot(node)
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  useAuthStore.setState({
    sessionRevision: 1,
    apiFetch: vi.fn(async (url, init) => {
      const path = String(url)
      if (path.endsWith('/catalog')) return Response.json({ deployment: 'ON_PREM', types: [] })
      if (path.endsWith('/detail')) {
        detailReads++
        return Response.json({
          key: 'original-key',
          episode: 1,
          typeId: 'pipeline.failed',
          resource: { kind: 'pipeline', id: 'orders', incarnation: '1' },
          severity: 'MAJOR',
          status: recovered ? 'RECOVERED' : 'ACTIVE',
          firedAt: '2026-10-28T00:00:00Z',
          diagnostics: {
            status: 'CAPTURED',
            text: recovered ? 'new original evidence' : 'old original evidence',
          },
        })
      }
      if (path.endsWith('/deliveries') && !JSON.parse(String(init?.body)).id)
        return Response.json({ rows: [], total: 0 })
      if (path.endsWith('/deliveries'))
        return Response.json({
          id: 'delivery-original',
          etag: '2',
          title: 'Frozen original title',
          target: 'original@example.test',
          channel: 'email',
          displayState: 'UNKNOWN',
          outcome: 'UNKNOWN',
          deadline: '2026-10-29T00:00:00Z',
          stopped: true,
          canRetry: true,
          attempts: 1,
        })
      return Response.json({ rows: [], total: 0 })
    }),
  })
})
afterEach(() => {
  act(() => root.unmount())
  client.clear()
  node.remove()
  focusManager.setFocused(undefined)
  vi.useRealTimers()
})
async function render() {
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <AlertsPage />
      </QueryClientProvider>,
    ),
  )
  await act(async () => {
    await vi.advanceTimersByTimeAsync(20)
  })
}
it('refreshes an open original episode after recovery without reselection', async () => {
  await render()
  expect(node.textContent).toContain('old original evidence')
  recovered = true
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5100)
  })
  expect(detailReads).toBeGreaterThan(1)
  expect(node.textContent).toContain('new original evidence')
  expect(node.textContent).not.toContain('old original evidence')
  expect(route.navigate).not.toHaveBeenCalled()
})
it('shows frozen notification and target before retry and keeps delivery filters in the return action', async () => {
  route.search = {
    view: 'deliveries',
    delivery: 'delivery-original',
    channel: 'email',
    result: 'UNKNOWN',
  }
  await render()
  expect(node.textContent).toContain('Frozen original title')
  expect(node.textContent).toContain('original@example.test')
  const back = [...node.querySelectorAll('button')].find((button) =>
    button.textContent?.startsWith('Back'),
  )!
  await act(async () => back.click())
  const search = route.navigate.mock.calls[0][0].search
  const result = typeof search === 'function' ? search(route.search) : search
  expect(result).toMatchObject({ view: 'deliveries', channel: 'email', result: 'UNKNOWN' })
  expect(result.delivery).toBeUndefined()
})
