import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { i18n } from '@/i18n'
import { storageRequest, type StorageSnapshot } from '@/service/storage-client'
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
import { StorageError, StorageHealthPanel } from './storage-ui'

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
    (value) =>
      value.textContent === i18n.t(key) || value.getAttribute('aria-label') === i18n.t(key),
  )
  expect(button).toBeTruthy()
  await act(async () => button!.click())
}
async function fill(label: string, value: string) {
  const labelElement = [...container.querySelectorAll('label')].find(
    (value) => value.querySelector('span')?.textContent === i18n.t(label),
  )
  const element =
    labelElement?.querySelector('input') ??
    (labelElement?.htmlFor
      ? (document.getElementById(labelElement.htmlFor) as HTMLInputElement)
      : null)
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
  storage.session = 0
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
  it('keeps the URI hidden by default and reveals it only on explicit toggle', async () => {
    await render(<StorageSetupForm />)
    await fill('storage.uri', 'mongodb://user:visibility-sentinel@localhost/admin')
    const input = container.querySelector<HTMLInputElement>('input[type="password"]')!
    expect(input).toBeTruthy()
    await click('storage.showUri')
    expect(input.type).toBe('text')
    expect(input.value).toContain('visibility-sentinel')
    expect(container.querySelector('button[aria-pressed="true"]')).toBeTruthy()
    await click('storage.hideUri')
    expect(input.type).toBe('password')
    expect(storage.fetcher).not.toHaveBeenCalled()
  })
  it.each(['en', 'zh-CN', 'zh-TW'])(
    'checks platform CONFIG with the first Cloud database test in %s',
    async (locale) => {
      await i18n.changeLanguage(locale)
      storage.snapshot = { ...base, mode: 'CLOUD', health: { ...base.health, CONFIG: 'AVAILABLE' } }
      storage.fetcher.mockImplementation(async (url, init) => {
        const body = JSON.parse(String(init?.body))
        return String(url).endsWith('/test')
          ? Response.json({
              layer: body.layer,
              testStamp: `proof-${body.layer}`,
              expiresAt: new Date(Date.now() + 600000).toISOString(),
            })
          : Response.json({ setupPhase: 'COMPLETE' })
      })
      await render(<StorageSetupForm />)
      await fill('storage.uri', 'mongodb+srv://user:secret@cluster.example/')
      expect(storage.fetcher).not.toHaveBeenCalled()
      const buttons = [...container.querySelectorAll('button')].filter(
        (button) => button.textContent === i18n.t('storage.test'),
      )
      expect(buttons).toHaveLength(2)
      await act(async () => buttons[0].click())
      expect(
        storage.fetcher.mock.calls.map(([, init]) => JSON.parse(String(init?.body)).layer),
      ).toEqual(['CONFIG', 'CACHE'])
      await act(async () => buttons[1].click())
      await click('storage.save')
      const commit = storage.fetcher.mock.calls.find(([url]) => String(url).endsWith('/commit'))!
      expect(JSON.parse(String(commit[1]?.body)).testStamps).toEqual({
        CONFIG: 'proof-CONFIG',
        CACHE: 'proof-CACHE',
        MASTER: 'proof-MASTER',
      })
    },
  )
  it('does not send the customer check after an old automatic CONFIG response changes session', async () => {
    storage.snapshot = { ...base, mode: 'CLOUD' }
    let finish!: (response: Response) => void
    storage.fetcher.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    await render(<StorageSetupForm />)
    await fill('storage.uri', 'mongodb+srv://user:secret@cluster.example/')
    await click('storage.test')
    storage.session = 1
    useAuthStore.setState({ sessionRevision: 1 })
    await render(<StorageSetupForm />)
    await act(async () =>
      finish(
        Response.json({
          layer: 'CONFIG',
          testStamp: 'old',
          expiresAt: new Date(Date.now() + 600000).toISOString(),
        }),
      ),
    )
    expect(storage.fetcher).toHaveBeenCalledTimes(1)
    expect(container.textContent).not.toContain(i18n.t('storage.testPassed'))
  })
  it('shows red failure and invalidates a previously passed layer on a failed retest', async () => {
    let fail = false
    storage.fetcher.mockImplementation(async (_url, init) => {
      const { layer } = JSON.parse(String(init?.body))
      return fail
        ? Response.json(
            { code: 'control.storage-test-failed', params: { causeCode: 'store.unreachable' } },
            { status: 400 },
          )
        : Response.json({
            layer,
            testStamp: layer,
            expiresAt: new Date(Date.now() + 600000).toISOString(),
          })
    })
    await render(<StorageSetupForm />)
    await fill('storage.uri', 'mongodb://user:secret@localhost/admin')
    for (const button of [...container.querySelectorAll('button')].filter(
      (button) => button.textContent === i18n.t('storage.test'),
    ))
      await act(async () => button.click())
    expect(container.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(
      false,
    )
    const cache = [...container.querySelectorAll('[role="group"]')].find(
      (group) => group.getAttribute('aria-label') === i18n.t('storage.layers.CACHE'),
    )!
    expect(cache.querySelector('.text-success svg')).toBeTruthy()
    fail = true
    await act(async () => cache.querySelector<HTMLButtonElement>('button')!.click())
    expect(cache.querySelector('.text-destructive svg')).toBeTruthy()
    expect(cache.textContent).toContain(i18n.t('storage.testFailed'))
    expect(container.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(true)
  })
  it('expires the displayed passed state and save permission without another interaction', async () => {
    vi.useFakeTimers()
    try {
      storage.fetcher.mockImplementation(async (_url, init) => {
        const { layer } = JSON.parse(String(init?.body))
        return Response.json({
          layer,
          testStamp: layer,
          expiresAt: new Date(Date.now() + 1000).toISOString(),
        })
      })
      await render(<StorageSetupForm />)
      await fill('storage.uri', 'mongodb://localhost/admin')
      for (const button of [...container.querySelectorAll('button')].filter(
        (button) => button.textContent === i18n.t('storage.test'),
      ))
        await act(async () => button.click())
      expect(container.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(
        false,
      )
      await act(async () => {
        vi.advanceTimersByTime(1002)
      })
      expect(container.textContent).not.toContain(i18n.t('storage.testPassed'))
      expect(container.textContent).toContain(i18n.t('storage.testExpired'))
      expect(container.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(
        true,
      )
    } finally {
      vi.useRealTimers()
    }
  })
  it('uses status icons and readable labels for available, failed and unverified storage', async () => {
    await render(
      <StorageHealthPanel
        snapshot={{
          ...base,
          health: { CONFIG: 'AVAILABLE', CACHE: 'UNAVAILABLE', MASTER: 'UNKNOWN' },
        }}
      />,
    )
    expect(container.querySelectorAll('dd svg[aria-hidden="true"]')).toHaveLength(3)
    expect(container.querySelector('dd .text-success')!.textContent).toBe(
      i18n.t('storage.health.AVAILABLE'),
    )
    expect(container.querySelector('dd .text-destructive')!.textContent).toBe(
      i18n.t('storage.health.UNAVAILABLE'),
    )
    expect(container.textContent).toContain(i18n.t('storage.health.UNKNOWN'))
  })

  it('shows the actual application-data check time instead of an unverified placeholder', async () => {
    const checkedAt = new Date().toISOString()
    const verified = {
      ...base,
      applicationDataVerification: {
        status: 'PASSED',
        checkedAt,
        validUntil: new Date(Date.now() + 600_000).toISOString(),
      },
    } as StorageSnapshot
    await render(<StorageHealthPanel snapshot={verified} />)
    expect(container.querySelector('time')?.dateTime).toBe(checkedAt)
    expect(container.textContent).toContain('Last check passed')
  })

  it('expires a visible successful check without a network write or losing its check time', async () => {
    vi.useFakeTimers()
    try {
      const checkedAt = new Date().toISOString()
      await render(
        <StorageHealthPanel
          snapshot={{
            ...base,
            applicationDataVerification: {
              status: 'PASSED',
              checkedAt,
              validUntil: new Date(Date.now() + 1000).toISOString(),
            },
          }}
        />,
      )
      expect(container.textContent).toContain('Last check passed')
      await act(async () => vi.advanceTimersByTime(1002))
      expect(container.textContent).toContain('Check expired')
      expect(container.textContent).not.toContain('Last check passed')
      expect(container.querySelector('time')?.dateTime).toBe(checkedAt)
      expect(storage.fetcher).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('shows a failed report with its timestamp and no successful application-data indicator', async () => {
    const checkedAt = new Date().toISOString()
    await render(
      <StorageHealthPanel
        snapshot={{
          ...base,
          applicationDataVerification: {
            status: 'FAILED',
            checkedAt,
            validUntil: new Date(Date.now() + 600_000).toISOString(),
          },
        }}
      />,
    )
    expect(container.textContent).toContain('Last check failed')
    expect(container.querySelector('dd .text-destructive')).toBeTruthy()
    expect(container.querySelector('time')?.dateTime).toBe(checkedAt)
  })

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
  const sharedPlan = {
    operationId: 'shared-recovery',
    previousOperationId: null,
    scope: 'SHARED_SRS',
    pipelineIds: [],
    canonicalChain: 'canonical-s1',
    physicalChain: 'original-s1',
    affectedPipelineIds: ['pipeline-a', 'pipeline-b'],
    phase: 'PLANNED',
    controlRevision: 8,
    planHash: 'original-hash',
    preflightCurrent: true,
  }
  function sharedReady() {
    storage.snapshot = {
      ...base,
      setupPhase: 'COMPLETE',
      businessPhase: 'READY',
      authGeneration: 1,
      allowedActions: [
        'storage.recovery.plan',
        'storage.recovery.confirm',
        'storage.recovery.status',
      ],
    }
  }
  function sharedConfirmation() {
    return [...container.querySelectorAll('button')].find(
      (button) => button.textContent === i18n.t('storage.recovery.sharedConfirm'),
    )!
  }
  it('previews both original shared identities and keeps the influence list server-owned', async () => {
    sharedReady()
    storage.fetcher.mockResolvedValue(Response.json(sharedPlan))
    await render(<StorageRecovery />)
    await click('storage.recovery.preview')
    expect(storage.fetcher).not.toHaveBeenCalled()
    await fill('storage.recovery.canonicalChain', 'canonical-s1')
    await click('storage.recovery.preview')
    expect(storage.fetcher).not.toHaveBeenCalled()
    await fill('storage.recovery.physicalChain', 'original-s1')
    await click('storage.recovery.preview')
    expect(JSON.parse(String(storage.fetcher.mock.calls[0][1]?.body))).toEqual({
      scope: 'SHARED_SRS',
      pipelineIds: [],
      canonicalChain: 'canonical-s1',
      physicalChain: 'original-s1',
    })
    expect(container.textContent).toContain('pipeline-a')
    expect(container.textContent).toContain('pipeline-b')
    expect(container.textContent).not.toContain('pipeline-c')
    expect(sharedConfirmation().disabled).toBe(true)
    expect(container.textContent).toContain(i18n.t('storage.recovery.sharedConfirmHelp'))
    await act(async () =>
      container.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click(),
    )
    expect(sharedConfirmation().disabled).toBe(false)
    await fill('storage.recovery.physicalChain', 'changed-s1')
    expect(sharedConfirmation()).toBeUndefined()
  })
  it.each([false, undefined])(
    'does not authorize a shared h0 without finalized preflight %s',
    async (preflightCurrent) => {
      sharedReady()
      storage.fetcher.mockResolvedValue(Response.json({ ...sharedPlan, preflightCurrent }))
      await render(<StorageRecovery />)
      await fill('storage.operationId', sharedPlan.operationId)
      await click('storage.queryResult')
      await act(async () =>
        container.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click(),
      )
      expect(sharedConfirmation().disabled).toBe(true)
      await click('storage.recovery.sharedConfirm')
      expect(storage.fetcher).toHaveBeenCalledTimes(1)
    },
  )
  it('finds a saved provisional operation after the first preview fails and only explicitly rechecks that operation', async () => {
    sharedReady()
    storage.fetcher
      .mockResolvedValueOnce(
        Response.json({ code: 'control.storage-recovery-member-unavailable' }, { status: 500 }),
      )
      .mockResolvedValueOnce(Response.json({ ...sharedPlan, preflightCurrent: false }))
      .mockResolvedValueOnce(
        Response.json({ ...sharedPlan, controlRevision: 9, planHash: 'rechecked-hash' }),
      )
    await render(<StorageRecovery />)
    await fill('storage.recovery.canonicalChain', 'canonical-s1')
    await fill('storage.recovery.physicalChain', 'original-s1')
    await click('storage.recovery.preview')
    expect(storage.refresh).toHaveBeenCalledTimes(1)
    expect(storage.fetcher).toHaveBeenCalledTimes(1)
    storage.snapshot = { ...storage.snapshot!, operationId: sharedPlan.operationId }
    await render(<StorageRecovery />)
    const operation = [...container.querySelectorAll('label')]
      .find((label) => label.querySelector('span')?.textContent === i18n.t('storage.operationId'))!
      .querySelector('input')!
    expect(operation.value).toBe(sharedPlan.operationId)
    await click('storage.queryResult')
    expect(JSON.parse(String(storage.fetcher.mock.calls[1][1]?.body))).toEqual({
      operationId: sharedPlan.operationId,
    })
    expect(sharedConfirmation().disabled).toBe(true)
    await click('storage.recovery.repreview')
    expect(JSON.parse(String(storage.fetcher.mock.calls[2][1]?.body))).toEqual({
      scope: 'SHARED_SRS',
      pipelineIds: [],
      canonicalChain: 'canonical-s1',
      physicalChain: 'original-s1',
      operationId: sharedPlan.operationId,
    })
    expect(sharedConfirmation().disabled).toBe(true)
    expect(storage.fetcher).toHaveBeenCalledTimes(3)
  })
  it('preserves an explicitly entered operation when the server snapshot refreshes', async () => {
    sharedReady()
    await render(<StorageRecovery />)
    await fill('storage.operationId', 'original-manual-operation')
    storage.snapshot = { ...storage.snapshot!, operationId: sharedPlan.operationId }
    await render(<StorageRecovery />)
    storage.fetcher.mockResolvedValue(Response.json({ ...sharedPlan, preflightCurrent: false }))
    await click('storage.queryResult')
    expect(JSON.parse(String(storage.fetcher.mock.calls[0][1]?.body))).toEqual({
      operationId: 'original-manual-operation',
    })
    expect(sharedConfirmation().disabled).toBe(true)
  })
  it('does not refresh or discover a provisional result from an old login session', async () => {
    sharedReady()
    let finish!: (response: Response) => void
    storage.fetcher.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    await render(<StorageRecovery />)
    await fill('storage.recovery.canonicalChain', 'canonical-s1')
    await fill('storage.recovery.physicalChain', 'original-s1')
    await click('storage.recovery.preview')
    useAuthStore.setState({ sessionRevision: 1 })
    await act(async () =>
      finish(
        Response.json({ code: 'control.storage-recovery-member-unavailable' }, { status: 500 }),
      ),
    )
    expect(storage.refresh).not.toHaveBeenCalled()
    expect(storage.fetcher).toHaveBeenCalledTimes(1)
    expect(sharedConfirmation()).toBeUndefined()
  })
  it('rechecks a cancelled running shared scope under the same operation and requires a fresh confirmation', async () => {
    sharedReady()
    storage.fetcher
      .mockResolvedValueOnce(
        Response.json({
          ...sharedPlan,
          phase: 'RUNNING',
          executionErrorCode: 'io.cache-business-fenced',
        }),
      )
      .mockResolvedValueOnce(
        Response.json({ ...sharedPlan, controlRevision: 12, planHash: 'rechecked-hash' }),
      )
      .mockResolvedValueOnce(
        Response.json({
          ...sharedPlan,
          controlRevision: 12,
          planHash: 'rechecked-hash',
          phase: 'COMPLETE',
        }),
      )
    await render(<StorageRecovery />)
    await fill('storage.operationId', sharedPlan.operationId)
    await click('storage.queryResult')
    expect(container.textContent).toContain(i18n.t('storage.recovery.sharedFailure'))
    await click('storage.recovery.repreview')
    expect(JSON.parse(String(storage.fetcher.mock.calls[1][1]?.body))).toEqual({
      scope: 'SHARED_SRS',
      pipelineIds: [],
      canonicalChain: 'canonical-s1',
      physicalChain: 'original-s1',
      operationId: 'shared-recovery',
    })
    expect(sharedConfirmation().disabled).toBe(true)
    await act(async () =>
      container.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click(),
    )
    await click('storage.recovery.sharedConfirm')
    expect(JSON.parse(String(storage.fetcher.mock.calls[2][1]?.body))).toEqual({
      operationId: 'shared-recovery',
      planHash: 'rechecked-hash',
      controlRevision: 12,
      confirmed: true,
    })
    expect(container.textContent).toContain(i18n.t('storage.recovery.sharedComplete'))
    expect(storage.fetcher).toHaveBeenCalledTimes(3)
    expect(container.querySelector('a[href="/pipelines"]')).toBeTruthy()
    expect(
      [...container.querySelectorAll('button')].some(
        (button) => button.textContent === i18n.t('storage.recovery.selectPipeline'),
      ),
    ).toBe(false)
    expect(storage.fetcher).toHaveBeenCalledTimes(3)
  })

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
  it('continues only the original confirmed recovery after querying its result', async () => {
    storage.snapshot = {
      ...base,
      businessPhase: 'AWAITING_REBUILD_CONFIRMATION',
      allowedActions: ['storage.recovery.status', 'storage.recovery.confirm'],
    }
    const running = {
      operationId: 'original-recovery',
      scope: 'CLUSTER',
      affectedPipelineIds: ['pipeline-a'],
      phase: 'RUNNING',
      controlRevision: 8,
      planHash: 'fixed-hash',
    }
    storage.fetcher.mockImplementation(async () => Response.json(running))
    await render(<StorageRecovery />)
    expect(storage.fetcher).not.toHaveBeenCalled()
    await click('storage.queryResult')
    expect(container.querySelector('input[type="checkbox"]')).toBeNull()
    await click('storage.recovery.continueOriginal')
    expect(storage.fetcher.mock.calls[1][0]).toContain('/storage/recovery/confirm')
    expect(JSON.parse(String(storage.fetcher.mock.calls[1][1]?.body))).toEqual({
      operationId: 'original-recovery',
      planHash: 'fixed-hash',
      controlRevision: 8,
      confirmed: true,
    })
    expect(storage.fetcher.mock.calls.some(([url]) => String(url).endsWith('/plan'))).toBe(false)
  })
  it('shows target handling and requires a fresh preview before a pipeline confirmation', async () => {
    storage.snapshot = {
      ...base,
      businessPhase: 'READY',
      allowedActions: [
        'storage.recovery.plan',
        'storage.recovery.status',
        'storage.recovery.confirm',
      ],
    }
    const plan = {
      operationId: 'full-a',
      phase: 'PLANNED',
      scope: 'PIPELINE',
      pipelineIds: ['pipeline-a'],
      affectedPipelineIds: ['pipeline-a'],
      controlRevision: 8,
      planHash: 'fixed-hash',
      preflightCurrent: false,
      targetPolicies: [],
    }
    storage.fetcher.mockImplementation(async (url) =>
      Response.json(
        String(url).endsWith('/plan')
          ? {
              ...plan,
              preflightCurrent: true,
              targetPolicies: [{ node: 'copy', source: 'warehouse', policy: 'CLEAR' }],
            }
          : plan,
      ),
    )
    await render(<StorageRecovery />)
    await click('storage.queryResult')
    expect(
      [...container.querySelectorAll('label')]
        .find((label) => label.textContent === i18n.t('storage.recovery.pipelines'))
        ?.querySelector<HTMLInputElement>('input[type="radio"]')?.checked,
    ).toBe(true)
    await act(async () =>
      container.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click(),
    )
    const confirm = () =>
      [...container.querySelectorAll('button')].find(
        (button) => button.textContent === i18n.t('storage.recovery.confirm'),
      )!
    expect(confirm().disabled).toBe(true)
    expect(container.textContent).toContain(i18n.t('storage.recovery.stalePreview'))
    await click('storage.recovery.repreview')
    expect(JSON.parse(String(storage.fetcher.mock.calls[1][1]?.body))).toEqual({
      scope: 'PIPELINE',
      pipelineIds: ['pipeline-a'],
      operationId: 'full-a',
    })
    expect(container.textContent).toContain('copy → warehouse')
    expect(container.textContent).toContain(i18n.t('storage.recovery.policy.CLEAR'))
    expect(confirm().disabled).toBe(true)
    await act(async () =>
      container.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click(),
    )
    expect(confirm().disabled).toBe(false)
    expect(storage.fetcher.mock.calls.some(([url]) => String(url).endsWith('/confirm'))).toBe(false)
  })
  it('carries a completed cluster operation only into a user-selected pipeline preview', async () => {
    storage.snapshot = {
      ...base,
      businessPhase: 'READY',
      allowedActions: ['storage.recovery.plan', 'storage.recovery.status'],
    }
    storage.fetcher.mockImplementation(async () =>
      Response.json({
        operationId: 'cluster-recovery',
        phase: 'COMPLETE',
        scope: 'CLUSTER',
        pipelineIds: [],
        affectedPipelineIds: ['a', 'b'],
      }),
    )
    await render(<StorageRecovery />)
    await click('storage.queryResult')
    await click('storage.recovery.selectPipeline')
    expect(storage.fetcher).toHaveBeenCalledOnce()
    await fill('storage.resourceIds', 'a')
    await click('storage.recovery.preview')
    expect(JSON.parse(String(storage.fetcher.mock.calls[1][1]?.body))).toEqual({
      scope: 'PIPELINE',
      pipelineIds: ['a'],
      previousOperationId: 'cluster-recovery',
    })
    expect(storage.fetcher.mock.calls.some(([url]) => String(url).endsWith('/confirm'))).toBe(false)
  })
  it.each(['en', 'zh-CN', 'zh-TW'])(
    'keeps configuration transfer collapsed until explicitly opened in %s',
    async (locale) => {
      await i18n.changeLanguage(locale)
      storage.snapshot = {
        ...base,
        setupPhase: 'COMPLETE',
        businessPhase: 'READY',
        allowedActions: ['configuration.export', 'configuration.import.preflight'],
      }
      await render(<ConfigurationTransfer />)
      const summary = [...container.querySelectorAll('summary')].find(
        (element) => element.textContent === i18n.t('storage.transfer.title'),
      )
      expect(summary).toBeTruthy()
      const disclosure = summary!.parentElement as HTMLDetailsElement
      expect(disclosure.tagName).toBe('DETAILS')
      expect(disclosure.open).toBe(false)
      expect(container.querySelector('input')?.closest('details')).toBe(disclosure)
      await act(async () => summary!.click())
      expect(disclosure.open).toBe(true)
      await fill('storage.transfer.key', 'request-only-key')
      await act(async () => summary!.click())
      expect(disclosure.open).toBe(false)
      await act(async () => summary!.click())
      expect(disclosure.open).toBe(true)
      expect(container.querySelector<HTMLInputElement>('input[type="password"]')?.value).toBe(
        'request-only-key',
      )
      expect(storage.fetcher).not.toHaveBeenCalled()
    },
  )
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
    await act(async () => container.querySelector('summary')!.click())
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

describe('storage connection failure guidance', () => {
  it.each([
    ['io.store-unauthorized', 'The database rejected these credentials'],
    ['store.database-access-failed', 'required database permissions'],
    ['store.unreachable', 'DNS, network access'],
  ])('distinguishes database failure %s from the Cloud session', async (causeCode, guidance) => {
    const error = await storageRequest(
      async () =>
        Response.json(
          {
            code: 'control.storage-test-failed',
            params: { causeCode, layer: 'CACHE' },
            message: 'unsafe-secret-message',
          },
          { status: 400 },
        ),
      'storage.test',
    ).catch((failure) => failure)
    await render(<StorageError error={error} />)
    expect(container.textContent).toContain(guidance)
    expect(container.textContent).not.toContain('unsafe-secret-message')
    expect(container.textContent).not.toContain('Your session has expired')
  })
})
