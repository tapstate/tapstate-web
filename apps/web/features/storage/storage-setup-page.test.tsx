import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { StorageSnapshot } from '@/service/storage-client'

import { i18n } from '@/i18n'
import { useAuthStore } from '@/stores/auth-store'

const storage = vi.hoisted(() => ({
  snapshot: undefined as StorageSnapshot | undefined,
  fetcher: vi.fn<typeof fetch>(),
  refresh: vi.fn(async () => {}),
  authorize: vi.fn(),
  session: 0,
}))
vi.mock('./storage-context', () => ({ useStorage: () => storage }))
import { ConfigurationTransfer } from './configuration-transfer'
import { StorageRecovery } from './storage-recovery'
import { StorageSetupForm } from './storage-setup-form'

let container: HTMLDivElement
let root: Root
const base: StorageSnapshot = {
  mode: 'OP',
  clusterId: 'cluster',
  operationId: 'setup',
  setupGeneration: 2,
  bindingVersion: 0,
  authGeneration: 0,
  stateVersion: 2,
  setupPhase: 'LOCAL_SETUP',
  businessPhase: 'NOT_CONFIGURED',
  health: { CONFIG: 'UNKNOWN', CACHE: 'UNKNOWN', MASTER: 'UNKNOWN' },
  allowedActions: ['storage.test', 'storage.setup.commit'],
  restartRequired: false,
}
async function render(component: React.ReactNode) {
  await act(async () => root.render(component))
}
async function click(key: string) {
  const button = [...container.querySelectorAll('button')].find(
    (value) => value.textContent === i18n.t(key),
  )
  expect(button).toBeTruthy()
  await act(async () => button!.click())
}
async function fill(label: string, value: string) {
  const element = [...container.querySelectorAll('label')]
    .find((labelElement) => labelElement.querySelector('span')?.textContent === i18n.t(label))
    ?.querySelector('input')
  expect(element, label).toBeTruthy()
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, value)
    element!.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
beforeEach(async () => {
  await i18n.changeLanguage('en')
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  storage.snapshot = base
  storage.fetcher.mockReset()
  storage.refresh.mockClear()
  storage.authorize.mockClear()
  useAuthStore.setState({ sessionRevision: 0 })
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('storage setup form', () => {
  it.each(['en', 'zh-CN', 'zh-TW'])(
    'requires explicit layer tests and confirmation in %s',
    async (locale) => {
      await i18n.changeLanguage(locale)
      storage.fetcher.mockImplementation(async (url, init) => {
        const body = JSON.parse(String(init?.body))
        return String(url).endsWith('/test')
          ? Response.json({
              layer: body.layer,
              testStamp: `proof-${body.layer}`,
              expiresAt: new Date(Date.now() + 600000).toISOString(),
              checks: [],
            })
          : Response.json({ setupPhase: 'COMPLETE' })
      })
      await render(<StorageSetupForm />)
      expect(storage.fetcher).not.toHaveBeenCalled()
      await fill('storage.uri', 'mongodb://user:secret@localhost/admin?tls=true')
      expect(
        [...container.querySelectorAll('button')].find((button) => button.type === 'submit')
          ?.disabled,
      ).toBe(true)
      for (const button of [...container.querySelectorAll('button')].filter(
        (button) => button.textContent === i18n.t('storage.test'),
      ))
        await act(async () => button.click())
      await click('storage.save')
      const commits = storage.fetcher.mock.calls.filter(
        ([url]) => url === '/api/storage/setup/commit',
      )
      expect(commits).toHaveLength(1)
      expect(JSON.parse(String(commits[0][1]?.body))).toMatchObject({
        operationId: 'setup',
        generation: 2,
        testStamps: { CONFIG: 'proof-CONFIG', CACHE: 'proof-CACHE', MASTER: 'proof-MASTER' },
        candidate: {
          configuration: { database: 'tapstate_config' },
          cache: { database: 'tapstate_cache' },
          master: { database: 'tapstate_views' },
        },
      })
      expect(storage.authorize).toHaveBeenCalledWith('')
      expect(container.textContent).not.toContain('user:secret')
    },
  )
  it('drops all test proofs after any connection input changes', async () => {
    storage.fetcher.mockImplementation(async (_url, init) => {
      const { layer } = JSON.parse(String(init?.body))
      return Response.json({
        layer,
        testStamp: layer,
        expiresAt: new Date(Date.now() + 600000).toISOString(),
      })
    })
    await render(<StorageSetupForm />)
    await fill('storage.uri', 'mongodb://one/admin')
    for (const button of [...container.querySelectorAll('button')].filter(
      (button) => button.textContent === i18n.t('storage.test'),
    ))
      await act(async () => button.click())
    expect(container.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(
      false,
    )
    await fill('storage.uri', 'mongodb://two/admin')
    expect(container.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(true)
    expect(storage.fetcher).toHaveBeenCalledTimes(3)
  })
  it('never requests a platform URI or master custom CA in Cloud mode', async () => {
    storage.snapshot = { ...base, mode: 'CLOUD', setupPhase: 'CONFIG_PREPARED' }
    await render(<StorageSetupForm />)
    expect(container.textContent).toContain('Provided by the platform')
    expect(container.querySelectorAll('textarea')).toHaveLength(1)
    expect(container.querySelectorAll('input[type="radio"]')).toHaveLength(0)
    expect(container.textContent).toContain('outside this release')
    expect(storage.fetcher).not.toHaveBeenCalled()
  })
})
describe('explicit recovery and import', () => {
  it('locks the selected recovery ID while its original result is being checked', async () => {
    storage.snapshot = {
      ...base,
      businessPhase: 'AWAITING_REBUILD_CONFIRMATION',
      allowedActions: ['storage.recovery.plan', 'storage.recovery.status'],
    }
    let finish!: (response: Response) => void
    storage.fetcher.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    await render(<StorageRecovery />)
    await fill('storage.operationId', 'operation-a')
    await click('storage.queryResult')
    const field = [...container.querySelectorAll('label')]
      .find((label) => label.querySelector('span')?.textContent === i18n.t('storage.operationId'))!
      .querySelector('input')!
    expect(field.disabled).toBe(true)
    await act(async () => finish(Response.json({ operationId: 'operation-a', phase: 'UNKNOWN' })))
  })
  it('shows the complete shared impact before allowing confirmation', async () => {
    storage.snapshot = {
      ...base,
      businessPhase: 'AWAITING_REBUILD_CONFIRMATION',
      allowedActions: [
        'storage.recovery.plan',
        'storage.recovery.confirm',
        'storage.recovery.status',
      ],
    }
    const planned = {
      operationId: 'recovery-id',
      scope: 'CLUSTER',
      affectedPipelineIds: ['pipeline-a', 'pipeline-b'],
      phase: 'PLANNED',
      controlRevision: 8,
      planHash: 'original-hash',
    }
    storage.fetcher.mockImplementation(async (url) =>
      Response.json({
        ...planned,
        phase: String(url).endsWith('/confirm') ? 'COMPLETE' : 'PLANNED',
      }),
    )
    await render(<StorageRecovery />)
    expect(storage.fetcher).not.toHaveBeenCalled()
    await click('storage.recovery.preview')
    expect(container.textContent).toContain('pipeline-a')
    expect(container.textContent).toContain('pipeline-b')
    expect(
      [...container.querySelectorAll('button')].find(
        (button) => button.textContent === i18n.t('storage.recovery.clusterConfirm'),
      )?.disabled,
    ).toBe(true)
    await act(async () =>
      container.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click(),
    )
    expect(container.textContent).toContain(i18n.t('storage.recovery.clusterConfirmHelp'))
    await click('storage.recovery.clusterConfirm')
    expect(JSON.parse(String(storage.fetcher.mock.calls[1][1]?.body))).toEqual({
      operationId: 'recovery-id',
      planHash: 'original-hash',
      controlRevision: 8,
      confirmed: true,
    })
    expect(storage.refresh).toHaveBeenCalledOnce()
    expect(container.textContent).toContain(i18n.t('storage.recovery.clusterComplete'))
  })
  it('keeps an unknown import attached to the original ID and queries before another submission', async () => {
    storage.snapshot = {
      ...base,
      setupPhase: 'COMPLETE',
      businessPhase: 'READY',
      allowedActions: [
        'configuration.import.preflight',
        'configuration.import.commit',
        'configuration.import.status',
      ],
    }
    storage.fetcher.mockImplementation(async (url) => {
      if (String(url).endsWith('/preflight'))
        return Response.json({
          operation: {
            ticket: { id: 'original-import', expiresAt: 'later' },
            phase: 'PENDING',
            receipt: null,
          },
          preparedTransfer: 'prepared-ciphertext',
        })
      if (String(url).endsWith('/commit')) throw new TypeError('connection lost with secret')
      return Response.json({
        importId: 'original-import',
        phase: 'COMMITTED',
        ticket: null,
        receipt: { id: 'original-import', resourceHashes: {}, usernames: [], layoutIds: [] },
      })
    })
    await render(<ConfigurationTransfer defaultSourceId="destination-default" />)
    await fill('storage.transfer.key', 'request-only-key')
    const file = container.querySelector<HTMLInputElement>('input[type="file"]')!
    Object.defineProperty(file, 'files', {
      value: [
        {
          size: 100,
          text: async () =>
            JSON.stringify({ transfer: 'encrypted-package', defaultSourceId: 'source-default' }),
        },
      ],
    })
    await act(async () => file.dispatchEvent(new Event('change', { bubbles: true })))
    await click('storage.transfer.preflight')
    await act(async () =>
      container.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click(),
    )
    await click('storage.transfer.commit')
    expect(container.textContent).not.toContain('connection lost with secret')
    expect(container.querySelector<HTMLInputElement>('input[type="file"]')!.disabled).toBe(true)
    await click('storage.queryResult')
    expect(JSON.parse(String(storage.fetcher.mock.calls[1][1]?.body))).toMatchObject({
      importId: 'original-import',
      transfer: 'prepared-ciphertext',
      defaultSourceMapping: { 'source-default': 'destination-default' },
    })
    expect(JSON.parse(String(storage.fetcher.mock.calls[2][1]?.body))).toEqual({
      importId: 'original-import',
    })
    expect(
      storage.fetcher.mock.calls.filter(([url]) => String(url).endsWith('/commit')),
    ).toHaveLength(1)
    expect(container.textContent).toContain('Committed')
  })
})
