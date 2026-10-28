import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const source = readFileSync('public/installation-reconnect.js', 'utf8')
function worker(fetcher: ReturnType<typeof vi.fn>, language = 'en') {
  const handlers = new Map<string, (event: any) => void>()
  vm.runInNewContext(source, {
    self: {
      location: {
        origin: 'http://127.0.0.1:62787',
        href: `http://127.0.0.1:62787/installation-reconnect.js?lang=${language}`,
      },
      addEventListener: (name: string, callback: (event: any) => void) =>
        handlers.set(name, callback),
      skipWaiting: () => Promise.resolve(),
      clients: { claim: () => Promise.resolve() },
    },
    URL,
    Response,
    crypto,
    fetch: fetcher,
  })
  return (path: string, mode = 'navigate', destination = 'document') => {
    let response: Promise<Response> | undefined
    handlers.get('fetch')!({
      request: { url: `http://127.0.0.1:62787${path}`, mode, destination },
      respondWith: (value: Promise<Response>) => {
        response = value
      },
    })
    return response
  }
}

describe('stateless installation navigation reconnect', () => {
  it('serves a self-contained waiting page for a refresh while the listener is offline', async () => {
    const navigate = worker(vi.fn().mockRejectedValue(new TypeError('offline')))
    const response = await navigate('/overview')!
    expect(response.status).toBe(200)
    const html = await response.text()
    expect(html).toContain('Restarting Tapstate')
    expect(html).toContain("fetch('/auth/storage-entry'")
    expect(html).not.toContain('CacheStorage')
    expect(response.headers.get('content-security-policy')).toContain("default-src 'none'")
  })
  it('reopens the waiting navigation if restart interrupts the initial script download', async () => {
    const response = await worker(vi.fn().mockRejectedValue(new TypeError('offline')))(
      '/assets/index.js',
      'cors',
      'script',
    )!
    expect(response.status).toBe(200)
    expect(await response.text()).toBe("location.replace('/installation-wait')")
  })
  it('uses the same waiting page for a transient 503 script response', async () => {
    const response = await worker(
      vi.fn().mockResolvedValue(new Response('starting', { status: 503 })),
    )('/assets/index.js', 'cors', 'script')!
    expect(await response.text()).toBe("location.replace('/installation-wait')")
  })
  it('keeps the refreshable waiting route independent of the stopped server', async () => {
    const fetcher = vi.fn()
    const response = await worker(fetcher)('/installation-wait')!
    expect(await response.text()).toContain('Restarting Tapstate')
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('returns to live milestones as soon as the recovering backend can report progress', async () => {
    const response = await worker(vi.fn().mockRejectedValue(new TypeError('offline')))('/overview')!
    const html = await response.text()
    const script = html.match(/<script[^>]*>([\s\S]*?)<\/script>/)![1]
    const redirect = vi.fn()
    vm.runInNewContext(script, {
      Date,
      document: { getElementById: () => ({ hidden: true, textContent: '', onclick: undefined }) },
      fetch: vi
        .fn()
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            mode: 'OP',
            management: true,
            entry: 'UNAVAILABLE',
            initializationProgress: { state: 'RUNNING' },
          }),
        }),
      AbortSignal,
      location: { replace: redirect },
      setTimeout: vi.fn(),
      clearTimeout: vi.fn(),
    })
    await vi.waitFor(() => expect(redirect).toHaveBeenCalledWith('/overview'))
  })
  it('does not intercept or retry API reads or writes', () => {
    const fetcher = vi.fn()
    expect(worker(fetcher)('/api/storage/setup/commit', 'same-origin')).toBeUndefined()
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('preserves genuine authorization failures', async () => {
    const response = await worker(
      vi.fn().mockResolvedValue(new Response('forbidden', { status: 403 })),
    )('/')!
    expect(response.status).toBe(403)
    expect(await response.text()).toBe('forbidden')
  })
  it('provides the existing simplified Chinese language choice offline', async () => {
    const response = await worker(
      vi.fn().mockRejectedValue(new TypeError('offline')),
      'zh-CN',
    )('/')!
    expect(await response.text()).toContain('正在重启 Tapstate')
  })
})
