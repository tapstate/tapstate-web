import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { i18n } from '../../i18n'
import { cloudApi } from '../../service/cloud-api'
import { AlertPolicyPage } from './alert-policy-page'

const cloudState = vi.hoisted(() => ({
  activeOrganization: { id: 'org-1', name: 'Acme Data' },
}))

vi.mock('../../state/cloud-app-state', () => ({
  useCloudAppState: () => cloudState,
}))

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let host: HTMLDivElement
let root: Root

function setInput(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

async function renderPage() {
  await act(async () => {
    root.render(
      <I18nextProvider i18n={i18n}>
        <AlertPolicyPage />
      </I18nextProvider>,
    )
  })
  await act(async () => {
    await Promise.resolve()
  })
}

function button(label: string) {
  return Array.from(host.querySelectorAll('button')).find(
    (candidate) => candidate.textContent?.trim() === label,
  )
}

function policy(id: string, name: string) {
  return {
    id,
    name,
    enabled: true,
    eventTypes: ['*'],
    minSeverity: 'INFO' as const,
    recipients: ['owner@example.com'],
    channel: 'EMAIL',
    cooldownSeconds: 300,
    quietHoursStart: null,
    quietHoursEnd: null,
    timezone: 'UTC',
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((complete) => {
    resolve = complete
  })
  return { promise, resolve }
}

describe('AlertPolicyPage', () => {
  beforeEach(() => {
    cloudState.activeOrganization = { id: 'org-1', name: 'Acme Data' }
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    vi.spyOn(cloudApi, 'alertPolicies').mockResolvedValue([])
    vi.spyOn(cloudApi, 'createAlertPolicy').mockResolvedValue({
      id: 'policy-1',
      name: 'Night alerts',
      enabled: true,
      eventTypes: ['*'],
      minSeverity: 'INFO',
      recipients: ['owner@example.com'],
      channel: 'EMAIL',
      cooldownSeconds: 300,
      quietHoursStart: null,
      quietHoursEnd: null,
      timezone: 'UTC',
    })
    vi.spyOn(cloudApi, 'updateAlertPolicy').mockResolvedValue(policy('policy-1', 'Night alerts'))
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    host.remove()
    vi.restoreAllMocks()
  })

  it('blocks an empty policy before calling the API', async () => {
    await renderPage()

    const save = button('Save')
    expect(save).not.toBeUndefined()
    await act(async () => {
      save?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(host.textContent).toContain('Name is required.')
    expect(cloudApi.createAlertPolicy).not.toHaveBeenCalled()
  })

  it('creates a policy with the fixed EMAIL channel', async () => {
    await renderPage()

    const name = host.querySelector(
      'input[placeholder="Critical pipeline alerts"]',
    ) as HTMLInputElement
    const recipients = Array.from(host.querySelectorAll('input')).find((input) =>
      input.parentElement?.textContent?.includes('Recipients'),
    ) as HTMLInputElement

    await act(async () => {
      setInput(name, 'Night alerts')
      setInput(recipients, 'owner@example.com')
    })

    const save = button('Save')
    await act(async () => {
      save?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    expect(cloudApi.createAlertPolicy).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({
        name: 'Night alerts',
        recipients: ['owner@example.com'],
        channel: 'EMAIL',
      }),
    )
  })

  it('clears existing quiet hours when both fields are emptied', async () => {
    vi.mocked(cloudApi.alertPolicies).mockResolvedValue([
      {
        ...policy('policy-1', 'Night alerts'),
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
      },
    ])
    await renderPage()

    await act(async () => {
      button('Edit')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    const quietStart = host.querySelector('input[placeholder="22:00"]') as HTMLInputElement
    const quietEnd = host.querySelector('input[placeholder="07:00"]') as HTMLInputElement
    await act(async () => {
      setInput(quietStart, '')
      setInput(quietEnd, '')
    })
    await act(async () => {
      button('Save')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    expect(cloudApi.updateAlertPolicy).toHaveBeenCalledWith(
      'org-1',
      'policy-1',
      expect.objectContaining({ quietHoursStart: '', quietHoursEnd: '' }),
    )
  })

  it('discards an unsaved policy draft when the organization changes', async () => {
    await renderPage()
    const name = host.querySelector(
      'input[placeholder="Critical pipeline alerts"]',
    ) as HTMLInputElement
    const recipients = Array.from(host.querySelectorAll('input')).find((input) =>
      input.parentElement?.textContent?.includes('Recipients'),
    ) as HTMLInputElement
    await act(async () => {
      setInput(name, 'Organization A alerts')
      setInput(recipients, 'owner@example.com')
    })

    await act(async () => {
      cloudState.activeOrganization = { id: 'org-2', name: 'Another Org' }
      root.render(
        <I18nextProvider i18n={i18n}>
          <AlertPolicyPage />
        </I18nextProvider>,
      )
      await Promise.resolve()
    })

    expect(name.value).toBe('')
    expect(recipients.value).toBe('')
    expect(host.textContent).toContain('Another Org')
  })

  it('ignores policy responses from a previously selected organization', async () => {
    const firstOrganization = deferred<ReturnType<typeof policy>[]>()
    const secondOrganization = deferred<ReturnType<typeof policy>[]>()
    vi.mocked(cloudApi.alertPolicies).mockImplementation((orgId) =>
      orgId === 'org-1' ? firstOrganization.promise : secondOrganization.promise,
    )

    await renderPage()
    await act(async () => {
      cloudState.activeOrganization = { id: 'org-2', name: 'Another Org' }
      root.render(
        <I18nextProvider i18n={i18n}>
          <AlertPolicyPage />
        </I18nextProvider>,
      )
    })
    await act(async () => {
      secondOrganization.resolve([policy('policy-2', 'Organization B policy')])
      await secondOrganization.promise
    })
    expect(host.textContent).toContain('Organization B policy')

    await act(async () => {
      firstOrganization.resolve([policy('policy-1', 'Organization A policy')])
      await firstOrganization.promise
    })

    expect(host.textContent).toContain('Organization B policy')
    expect(host.textContent).not.toContain('Organization A policy')
  })
})
