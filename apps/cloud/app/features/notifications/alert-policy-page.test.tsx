import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { i18n } from '../../i18n'
import { cloudApi } from '../../service/cloud-api'
import { AlertPolicyPage } from './alert-policy-page'

vi.mock('../../state/cloud-app-state', () => ({
  useCloudAppState: () => ({
    activeOrganization: { id: 'org-1', name: 'Acme Data' },
  }),
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

describe('AlertPolicyPage', () => {
  beforeEach(() => {
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
})
