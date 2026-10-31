import '@/i18n/index'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { useAuthStore } from '@/stores/auth-store'

import { AlertBell } from './alert-shared'
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    children,
    className,
    search,
  }: {
    to: string
    children: ReactNode
    className?: string
    search?: object
  }) => (
    <a data-search={JSON.stringify(search)} href={to} className={className}>
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
  })
  expect(trigger.getAttribute('aria-expanded')).toBe('true')
  await act(async () => trigger.click())
  expect(trigger.getAttribute('aria-expanded')).toBe('true')
  expect(document.querySelectorAll('.alert-preview-row')).toHaveLength(5)
  expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body)).limit).toBe(5)
  await act(async () =>
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
  )
  await settle()
  expect(document.querySelector('[role="dialog"]')).toBeNull()
  expect(document.activeElement).toBe(trigger)
})
it('zero activity hides the badge and provides history without claiming whole-system health', async () => {
  fetcher.mockResolvedValue(Response.json({ rows: [], total: 0 }))
  await render()
  await act(async () => node.querySelector('button')!.click())
  expect(node.querySelector('.alert-count')).toBeNull()
  expect(document.body.textContent).toContain('No active alerts')
  expect(document.body.textContent).toContain('View alert center and history')
  expect(document.body.textContent).not.toContain('healthy')
  expect(document.querySelector('a')?.getAttribute('data-search')).toBe(
    JSON.stringify({ view: 'history' }),
  )
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
  expect(document.body.textContent).toContain('Unable to load current alert data')
  expect(document.body.textContent).not.toContain('No active alerts')
})
it('opens on a later focus after closing while the trigger itself already has focus', async () => {
  await render()
  const trigger = node.querySelector('button')!
  await act(async () => trigger.focus())
  await settle()
  await act(async () => {
    trigger.focus()
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  })
  await settle()
  const outside = document.createElement('button')
  document.body.append(outside)
  try {
    await act(async () => outside.focus())
    await act(async () => trigger.focus())
    await settle()
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
  } finally {
    outside.remove()
  }
})

it.each([
  { total: 7, critical: 1, label: '1 critical' },
  { total: 7, critical: 5, label: 'At least 5 critical' },
  { total: 5, critical: 5, label: '5 critical' },
])(
  'reports only the critical count proven by the bounded ordered page: $label',
  async ({ total, critical, label }) => {
    fetcher.mockResolvedValue(
      Response.json({
        total,
        rows: Array.from({ length: 5 }, (_, i) => ({
          key: String(i),
          episode: 1,
          severity: i < critical ? 'CRITICAL' : 'MAJOR',
          typeId: 'pipeline.failed',
          resource: { id: `orders-${i}` },
        })),
      }),
    )
    await render()
    await act(async () => node.querySelector('button')!.click())
    expect(document.querySelector('.alert-bell-critical')?.textContent).toBe(label)
    expect(document.querySelector('.alert-preview-row strong')?.textContent).toBe(
      'Pipeline execution failed',
    )
    expect(document.querySelector('.alert-preview-resource')?.textContent).toBe('orders-0')
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body)).limit).toBe(5)
  },
)
