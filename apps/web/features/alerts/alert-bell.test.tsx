import '@/i18n/index'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { useAuthStore } from '@/stores/auth-store'

import { AlertBell } from './alert-shared'
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, className }: { to: string; children: ReactNode; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}))
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: Root
let node: HTMLDivElement
let client: QueryClient
let fetcher: ReturnType<typeof vi.fn<typeof fetch>>
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10))
  })
}
async function render() {
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <AlertBell />
      </QueryClientProvider>,
    ),
  )
  await settle()
}
beforeEach(() => {
  node = document.createElement('div')
  document.body.append(node)
  root = createRoot(node)
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  fetcher = vi.fn(async () =>
    Response.json({
      total: 7,
      rows: Array.from({ length: 6 }, (_, i) => ({
        key: String(i),
        episode: 1,
        severity: 'MAJOR',
        typeId: 'pipeline.failed',
        resource: { id: `orders-${i}` },
      })),
    }),
  )
  useAuthStore.setState({ apiFetch: fetcher, profile: 'on-prem', sessionRevision: 1 })
})
afterEach(() => {
  act(() => root.unmount())
  client.clear()
  node.remove()
})
it('focus followed by click opens once, limits preview to five, and Escape closes it', async () => {
  await render()
  const trigger = node.querySelector('button')!
  await act(async () => {
    trigger.focus()
    trigger.click()
  })
  expect(trigger.getAttribute('aria-expanded')).toBe('true')
  expect(node.querySelectorAll('.alert-preview-row')).toHaveLength(5)
  expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body)).limit).toBe(5)
  await act(async () =>
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
  )
  expect(node.querySelector('[role="dialog"]')).toBeNull()
})
it('zero activity hides the badge and provides history without claiming whole-system health', async () => {
  fetcher.mockResolvedValue(Response.json({ rows: [], total: 0 }))
  await render()
  await act(async () => node.querySelector('button')!.click())
  expect(node.querySelector('.alert-count')).toBeNull()
  expect(node.textContent).toContain('No active alerts')
  expect(node.textContent).toContain('View alert center and history')
  expect(node.textContent).not.toContain('healthy')
})
it('a failed refresh does not keep advertising the old active count', async () => {
  await render()
  expect(node.querySelector('.alert-count')?.textContent).toBe('7')
  fetcher.mockRejectedValue(new TypeError('controlled failure'))
  await act(async () => {
    await client.invalidateQueries({ queryKey: ['alerts', 'bell'] })
  })
  await settle()
  expect(node.querySelector('.alert-count')).toBeNull()
  await act(async () => node.querySelector('button')!.click())
  expect(node.textContent).toContain('Unable to load current alert data')
  expect(node.textContent).not.toContain('No active alerts')
})
