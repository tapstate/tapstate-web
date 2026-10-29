import '@/i18n/index'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'

import { useAuthStore } from '@/stores/auth-store'

import { HealthPage } from './health-page'
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}))
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
it('does not report a detector failure while its initial health read is pending', async () => {
  const node = document.createElement('div')
  document.body.append(node)
  const root = createRoot(node)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  useAuthStore.setState({ apiFetch: vi.fn(() => new Promise<Response>(() => {})) })
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <HealthPage />
        </QueryClientProvider>,
      ),
    )
    expect(node.textContent).toContain('Loading…')
    expect(node.textContent).not.toContain('Degraded or stopped')
    expect(node.textContent).not.toContain('Connected detectors are running')
  } finally {
    act(() => root.unmount())
    client.clear()
    node.remove()
  }
})
it('replaces a stale healthy detector label when refreshing health fails', async () => {
  const node = document.createElement('div')
  document.body.append(node)
  const root = createRoot(node)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const fetcher = vi.fn(async () =>
    Response.json({ coverage: [], degraded: false, closed: false, queuedInputs: 0, rejected: 0 }),
  )
  useAuthStore.setState({ apiFetch: fetcher })
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <HealthPage />
        </QueryClientProvider>,
      ),
    )
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    expect(node.textContent).toContain('Connected detectors are running')
    fetcher.mockRejectedValue(new TypeError('controlled read failure'))
    await act(async () => {
      await client.invalidateQueries({ queryKey: ['alerts', 'health'] })
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    expect(node.textContent).not.toContain('Connected detectors are running')
    expect(node.textContent).not.toContain('Degraded or stopped')
    expect(node.textContent).toContain('Unable to load current alert data')
  } finally {
    act(() => root.unmount())
    client.clear()
    node.remove()
  }
})
it('renders measured evaluation, delivery and cleanup facts and removes them after a failed refresh', async () => {
  const node = document.createElement('div')
  document.body.append(node)
  const root = createRoot(node)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const fetcher = vi.fn(async () =>
    Response.json({
      coverage: ['pipeline.failed'],
      degraded: false,
      closed: false,
      queuedInputs: 0,
      rejected: 0,
      evaluationLagMillis: 800,
      lastEvaluatedAt: '2026-10-29T00:00:00Z',
      cleanupAvailable: true,
      maintenance: {
        available: true,
        degraded: false,
        warning: false,
        capacitySampleStale: false,
        logicalBytes: 8192,
        admissionReservedBytes: 1024,
        capacityBytes: 536870912,
        pressure: 'NORMAL',
        pending: 3,
        oldestPendingAgeSeconds: 7,
        failed: 1,
        exhausted: 0,
        lastSuccess: '2026-10-29T00:00:00Z',
        cadenceSeconds: 300,
        changed: 12,
        failures: 0,
        oldestCandidateAgeSeconds: 0,
        skipped: {},
      },
    }),
  )
  useAuthStore.setState({ apiFetch: fetcher })
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <HealthPage />
        </QueryClientProvider>,
      ),
    )
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    expect(node.textContent).toContain('0.8 s')
    expect(node.textContent).toContain('9216 / 536870912 bytes')
    expect(node.textContent).toContain('Pending 3 · oldest 7 s · failed 1 · exhausted 0')
    expect(node.textContent).toContain('Reclaimed / pruned 12')
    expect(node.textContent).toContain('Completed · every 5 minutes')
    expect(node.querySelectorAll('.alert-health-stat')).toHaveLength(3)
    fetcher.mockRejectedValue(new TypeError('controlled refresh failure'))
    await act(async () => {
      await client.invalidateQueries({ queryKey: ['alerts', 'health'] })
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    expect(node.textContent).not.toContain('0.8 s')
    expect(node.textContent).not.toContain('9216 / 536870912 bytes')
    expect(node.textContent).not.toContain('Reclaimed / pruned 12')
  } finally {
    act(() => root.unmount())
    client.clear()
    node.remove()
  }
})
