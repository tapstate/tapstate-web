import '@/i18n/index'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, StrictMode, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuthStore } from '@/stores/auth-store'

import { AlertSettings } from './alert-settings'

const navigation = vi.hoisted(() => ({
  options: null as null | { shouldBlockFn: () => boolean; enableBeforeUnload: boolean },
  status: 'idle',
  proceed: vi.fn(),
  reset: vi.fn(),
}))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
  useBlocker: (options: typeof navigation.options) => {
    navigation.options = options
    return { status: navigation.status, proceed: navigation.proceed, reset: navigation.reset }
  },
}))
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let container: HTMLDivElement
let root: Root
let client: QueryClient
let fetcher: ReturnType<typeof vi.fn<typeof fetch>>
let candidates = new Map<string, string>()
let cloud = false
let saved = 0
const types = [
  {
    id: 'pipeline.failed',
    version: 1,
    resourceKinds: ['pipeline'],
    severity: 'MAJOR',
    enabledByDefault: true,
    inputAvailable: true,
    parameters: [{ name: 'trigger-for', minimum: 0, maximum: 3600, defaultValue: 0, unit: 's' }],
  },
]
const requests = () =>
  fetcher.mock.calls.map(([url, init]) => ({
    path: String(url),
    body: JSON.parse(String(init?.body ?? '{}')),
  }))
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10))
  })
}
async function click(text: string) {
  const button = [...document.querySelectorAll('button')].find((b) => b.textContent === text)
  expect(button, text).toBeTruthy()
  await act(async () => button!.click())
  await settle()
}
async function input(label: string, value: string) {
  const el = [...container.querySelectorAll('label')]
    .find((l) => l.querySelector('span')?.textContent === label)
    ?.querySelector('input')
  expect(el, label).toBeTruthy()
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, value)
    el!.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await settle()
}
async function choose(trigger: HTMLElement, text: string) {
  await act(async () => trigger.click())
  await settle()
  const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find((o) =>
    o.textContent?.includes(text),
  )
  expect(option, text).toBeTruthy()
  await act(async () => option!.click())
  await settle()
  await act(async () =>
    document.activeElement?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    ),
  )
  await settle()
}
async function render() {
  await act(async () =>
    root.render(
      <StrictMode>
        <QueryClientProvider client={client}>
          <AlertSettings />
        </QueryClientProvider>
      </StrictMode>,
    ),
  )
  await settle()
}
beforeEach(() => {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  cloud = false
  candidates = new Map()
  saved = 0
  navigation.status = 'idle'
  navigation.proceed.mockClear()
  navigation.reset.mockClear()
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  fetcher = vi.fn<typeof fetch>(async (url, init) => {
    const path = String(url)
    const body = JSON.parse(String(init?.body ?? '{}'))
    if (path.endsWith('/catalog'))
      return Response.json({ deployment: cloud ? 'CLOUD_MANAGED' : 'ON_PREM', types })
    if (path.endsWith('/configuration/list')) return Response.json({ rows: [], nextCursor: null })
    if (path.endsWith('/configuration/save')) {
      saved++
      return Response.json({ ...body.form, secret: undefined, privateCa: undefined, etag: '1' })
    }
    if (path.endsWith('/test')) {
      candidates.set(body.commandId, body.candidateId)
      return Response.json({
        id: 'test-fixture',
        candidateId: body.candidateId,
        outcome: 'ACCEPTED',
        stopped: true,
      })
    }
    if (path.endsWith('/test-result'))
      return Response.json({
        id: 'test-fixture',
        candidateId: candidates.get(body.commandId),
        outcome: 'ACCEPTED',
        stopped: true,
      })
    if (path.endsWith('/preview'))
      return Response.json({
        subject: 'Example',
        text: 'Example preview',
        html: '<p>Example</p>',
        webhook: '{}',
      })
    if (path.endsWith('/route-preview'))
      return Response.json({ rows: [], total: 0, nextCursor: null, previewOnly: true })
    throw new Error(`unexpected fixture path ${path}`)
  })
  useAuthStore.setState({ apiFetch: fetcher, profile: 'on-prem', sessionRevision: 1 })
})
afterEach(() => {
  act(() => root.unmount())
  client.clear()
  container.remove()
  document.querySelectorAll('[data-base-ui-portal]').forEach((el) => el.remove())
  vi.restoreAllMocks()
})
async function receiver() {
  await render()
  await click('Receivers')
  await click('Create')
  await input('Name', 'Current candidate')
  await input('SMTP host', 'smtp.example.test')
  await input('From address', 'alerts@example.test')
}
describe('current receiver candidate', () => {
  it('tests the chosen current recipient and invalidates results when the target changes', async () => {
    await receiver()
    const recipients = [...container.querySelectorAll('label')]
      .find((l) => l.querySelector('span')?.textContent === 'Recipients (one per line)')!
      .querySelector('textarea')!
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(
        recipients,
        'first@example.test\nSecond@EXAMPLE.TEST',
      )
      recipients.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await settle()
    const target = container.querySelector<HTMLButtonElement>('[aria-label="Test recipient"]')
    expect(target).not.toBeNull()
    await act(async () => target!.click())
    await settle()
    const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find((el) =>
      el.textContent?.includes('Second@EXAMPLE.TEST'),
    )!
    expect(option).toBeTruthy()
    await act(async () => option.click())
    await settle()
    await click('Send test message')
    expect(requests().find((r) => r.path.endsWith('/test'))!.body.target).toBe(
      'Second@EXAMPLE.TEST',
    )
    expect(container.textContent).toContain('Test accepted, not saved')
    await act(async () => target!.click())
    await settle()
    const first = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find((el) =>
      el.textContent?.includes('first@example.test'),
    )!
    await act(async () => first.click())
    await settle()
    expect(container.textContent).not.toContain('Test accepted, not saved')
    expect(requests().filter((r) => r.path.endsWith('/test'))).toHaveLength(1)
  }, 15000)
  it('tests current unsaved form without saving and invalidates its accepted result on edit', async () => {
    await receiver()
    await click('Send test message')
    expect(saved).toBe(0)
    const sent = requests().find((r) => r.path.endsWith('/test'))!
    expect(sent.body.form.transport.host).toBe('smtp.example.test')
    expect(sent.body.commandId).toMatch(/^act1\./)
    expect(container.textContent).toContain('Test accepted, not saved')
    await input('SMTP host', 'edited.example.test')
    expect(container.textContent).not.toContain('Test accepted, not saved')
    expect(requests().filter((r) => r.path.endsWith('/test'))).toHaveLength(1)
  })
  it('offers all three leave choices and saves before leaving', async () => {
    await receiver()
    expect(navigation.options?.shouldBlockFn()).toBe(true)
    expect(navigation.options?.enableBeforeUnload).toBe(true)
    await click('Close')
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain(
      'Testing does not save',
    )
    await click('Continue editing')
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    await click('Close')
    await click('Save and leave')
    expect(saved).toBe(1)
    expect(container.querySelector('.alert-editor')).toBeNull()
  })
  it('keeps the form and leave dialog if saving is refused', async () => {
    await receiver()
    fetcher.mockImplementation(async (url) =>
      String(url).endsWith('/configuration/save')
        ? Response.json({ code: 'alert.stale-action' }, { status: 409 })
        : Response.json({ rows: [] }),
    )
    await click('Close')
    await click('Save and leave')
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    expect(container.querySelector('.alert-editor')).not.toBeNull()
    expect(container.textContent).toContain('operation was refused')
  })
  it('discards without a save or send', async () => {
    await receiver()
    await click('Close')
    await click('Discard changes')
    expect(container.querySelector('.alert-editor')).toBeNull()
    expect(saved).toBe(0)
    expect(requests().some((r) => r.path.endsWith('/test'))).toBe(false)
  })
  it('queries the original command after an uncertain response without automatic resend', async () => {
    await receiver()
    fetcher.mockImplementation(async (url, init) => {
      const path = String(url)
      if (path.endsWith('/test')) {
        const body = JSON.parse(String(init?.body))
        candidates.set(body.commandId, body.candidateId)
        throw new TypeError('controlled connection loss')
      }
      if (path.endsWith('/test-result'))
        return Response.json({
          id: 'original',
          candidateId: candidates.get(JSON.parse(String(init?.body)).commandId),
          outcome: 'UNKNOWN',
          stopped: true,
        })
      throw new Error(String(init))
    })
    await click('Send test message')
    await settle()
    const calls = requests()
    const initial = calls.find((r) => r.path.endsWith('/test'))!
    expect(calls.find((r) => r.path.endsWith('/test-result'))?.body.commandId).toBe(
      initial.body.commandId,
    )
    expect(calls.filter((r) => r.path.endsWith('/test'))).toHaveLength(1)
    expect(container.textContent).toContain('result is unknown')
  })
  it('does not let a rejected command query an older successful candidate', async () => {
    await receiver()
    fetcher.mockImplementation(async (url) =>
      String(url).endsWith('/test')
        ? Response.json({ code: 'alert.command-conflict' }, { status: 409 })
        : Response.json({ id: 'old', candidateId: 'other', outcome: 'ACCEPTED', stopped: true }),
    )
    await click('Send test message')
    expect(requests().some((r) => r.path.endsWith('/test-result'))).toBe(false)
    expect(container.textContent).not.toContain('Test accepted, not saved')
    expect(container.textContent).toContain('operation was refused')
  })
  it('does not validate this form with an uncertain response for another candidate', async () => {
    await receiver()
    fetcher.mockImplementation(async (url) => {
      if (String(url).endsWith('/test')) throw new TypeError('controlled loss')
      return Response.json({ id: 'old', candidateId: 'other', outcome: 'ACCEPTED', stopped: true })
    })
    await click('Send test message')
    expect(container.textContent).not.toContain('Test accepted, not saved')
    expect(container.textContent).toContain('not bound to the current candidate')
  })
  it('previews route matches without saving, testing or retrying a notification', async () => {
    await render()
    await click('Subscription routes')
    await click('Create')
    await input('Name', 'Match preview')
    await click('Preview matching alerts')
    const request = requests().find((r) => r.path.endsWith('/route-preview'))
    expect(request?.body.form.resourceKinds).toContain('pipeline')
    expect(saved).toBe(0)
    expect(requests().some((r) => r.path.endsWith('/test') || r.path.endsWith('/retry'))).toBe(
      false,
    )
    expect(container.textContent).toContain('Nothing is sent or planned')
  })
  it('clears explicit selections before saving all resources', async () => {
    const fallback = fetcher.getMockImplementation()!
    fetcher.mockImplementation(async (url, init) =>
      String(url).endsWith('/resources')
        ? Response.json({
            rows: [{ kind: 'pipeline', id: 'orders', incarnation: '1' }],
            nextCursor: null,
          })
        : fallback(url, init),
    )
    await render()
    await click('Create')
    await input('Name', 'Scope switch')
    const all = [...container.querySelectorAll('label')]
      .find((l) => l.textContent?.includes('All current resources'))!
      .querySelector('input')!
    await act(async () => all.click())
    await settle()
    await choose(container.querySelectorAll<HTMLElement>('[role="combobox"]')[2], 'orders')
    await act(async () => all.click())
    await settle()
    await click('Save and activate')
    const sent = requests().find((r) => r.path.endsWith('/configuration/save'))!
    expect(sent.body.form.allResources).toBe(true)
    expect(sent.body.form.resources).toEqual([])
  })
  it('preserves a selected receiver from a later page when adding a visible one', async () => {
    const route = {
      id: 'route',
      etag: '1',
      kind: 'SUBSCRIPTION',
      name: 'Existing route',
      enabled: true,
      resourceKinds: ['pipeline'],
      allResources: true,
      resources: [],
      typeIds: [],
      severities: [],
      groupBy: ['RESOURCE'],
      initialWaitSeconds: 30,
      changeIntervalSeconds: 300,
      repeatIntervalSeconds: 14400,
      channels: [
        {
          channelType: 'email',
          receivers: ['later-page'],
          messages: { titlePrefix: '', titleSuffix: '', messageNote: '', footerText: '' },
        },
      ],
      inhibition: [],
    }
    const fallback = fetcher.getMockImplementation()!
    fetcher.mockImplementation(async (url, init) => {
      const body = JSON.parse(String(init?.body ?? '{}'))
      if (String(url).endsWith('/configuration/list'))
        return Response.json(
          body.kind === 'SUBSCRIPTION'
            ? { rows: [route] }
            : {
                rows: [
                  {
                    id: 'visible',
                    name: 'Visible receiver',
                    kind: 'RECEIVER',
                    transport: { channelType: 'email' },
                  },
                ],
                nextCursor: 'more',
              },
        )
      return fallback(url, init)
    })
    await render()
    await click('Subscription routes')
    await click('Edit')
    const select = [...container.querySelectorAll('label')]
      .find((l) => l.querySelector('span')?.textContent === 'Receivers')!
      .querySelector<HTMLElement>('[role="combobox"]')!
    await choose(select, 'Visible receiver')
    await click('Save and activate')
    const sent = requests().find((r) => r.path.endsWith('/configuration/save'))!
    expect(sent.body.form.channels[0].receivers).toEqual(
      expect.arrayContaining(['visible', 'later-page']),
    )
  })
  it('editing one inhibition edge preserves unrelated edges', async () => {
    const second = { rootType: 'source.connection-failed', dependentType: 'pipeline.failed' }
    const route = {
      id: 'route',
      etag: '1',
      kind: 'SUBSCRIPTION',
      name: 'Existing route',
      enabled: true,
      resourceKinds: ['pipeline'],
      allResources: true,
      resources: [],
      typeIds: [],
      severities: [],
      groupBy: ['RESOURCE'],
      initialWaitSeconds: 30,
      changeIntervalSeconds: 300,
      repeatIntervalSeconds: 14400,
      channels: [
        {
          channelType: 'email',
          receivers: ['visible'],
          messages: { titlePrefix: '', titleSuffix: '', messageNote: '', footerText: '' },
        },
      ],
      inhibition: [
        { rootType: 'pipeline.failed', dependentType: 'pipeline.observation-stale' },
        second,
      ],
    }
    const fallback = fetcher.getMockImplementation()!
    fetcher.mockImplementation(async (url, init) => {
      const path = String(url)
      const body = JSON.parse(String(init?.body ?? '{}'))
      if (path.endsWith('/catalog'))
        return Response.json({
          deployment: 'ON_PREM',
          types: [
            ...types,
            ...[
              'pipeline.observation-stale',
              'source.connection-failed',
              'cluster.node-unavailable',
            ].map((id) => ({ ...types[0], id })),
          ],
        })
      if (path.endsWith('/configuration/list'))
        return Response.json({
          rows:
            body.kind === 'SUBSCRIPTION'
              ? [route]
              : [
                  {
                    id: 'visible',
                    name: 'Visible receiver',
                    kind: 'RECEIVER',
                    transport: { channelType: 'email' },
                  },
                ],
        })
      return fallback(url, init)
    })
    await render()
    await click('Subscription routes')
    await click('Edit')
    const select = [...container.querySelectorAll('label')]
      .find((l) => l.querySelector('span')?.textContent?.startsWith('Dependent alert type'))!
      .querySelector<HTMLElement>('[role="combobox"]')!
    await choose(select, 'Cluster node unavailable')
    await click('Save and activate')
    const sent = requests().find((r) => r.path.endsWith('/configuration/save'))!
    expect(sent.body.form.inhibition).toHaveLength(2)
    expect(sent.body.form.inhibition).toContainEqual(second)
  })
  it('hides direct external configuration and controls for Cloud', async () => {
    cloud = true
    useAuthStore.setState({ profile: 'cloud' })
    await render()
    expect(container.textContent).toContain('Cloud-managed Clusters')
    expect([...container.querySelectorAll('[role="tab"]')].map((t) => t.textContent)).toEqual([
      'Rules',
      'Subscription routes',
      'Silence & inhibition',
    ])
    expect(container.textContent).not.toContain('Send test message')
    expect(requests().some((r) => r.body.kind === 'RECEIVER')).toBe(false)
  })
})
