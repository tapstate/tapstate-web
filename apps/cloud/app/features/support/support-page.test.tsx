import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { tickets, createTicket, ticket, closeTicket } = vi.hoisted(() => ({
  tickets: vi.fn(),
  createTicket: vi.fn(),
  ticket: vi.fn(),
  closeTicket: vi.fn(),
}))

vi.mock('../../service/cloud-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../service/cloud-api')>()
  return {
    ...actual,
    cloudApi: {
      ...actual.cloudApi,
      tickets,
      createTicket,
      ticket,
      closeTicket,
    },
  }
})

import { i18n } from '../../i18n'
import { CloudApiError } from '../../service/cloud-api'
import { SupportPage } from './support-page'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const messages = [
  ['en', 'Verify your Cloud account email before submitting a ticket.'],
  ['zh-CN', '请先验证 Cloud 账户邮箱，再提交工单。'],
  ['zh-TW', '請先驗證 Cloud 帳戶電子郵件，再提交工單。'],
] as const

let host: HTMLDivElement | undefined
let root: Root | undefined

async function renderPage() {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(
      <I18nextProvider i18n={i18n}>
        <SupportPage />
      </I18nextProvider>,
    )
  })
  await vi.waitFor(() => expect(tickets).toHaveBeenCalled())
}

function setValue(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const prototype =
    element instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype
  const valueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set
  valueSetter?.call(element, value)
  element.dispatchEvent(new Event('input', { bubbles: true }))
}

async function submitTicket(summaryText: string, descriptionText: string) {
  await act(async () => {
    const trigger = Array.from(host?.querySelectorAll('button') ?? []).find(
      (button) => button.getAttribute('aria-haspopup') === 'dialog',
    )
    trigger?.click()
  })
  const summary = document.querySelector<HTMLInputElement>('[role=dialog] input')
  const description = document.querySelector<HTMLTextAreaElement>('[role=dialog] textarea')
  const form = document.querySelector('[role=dialog] form')
  expect(summary).toBeDefined()
  expect(description).toBeDefined()
  expect(form).toBeDefined()
  await act(async () => {
    setValue(summary!, summaryText)
    setValue(description!, descriptionText)
    form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
}

async function clickButtonWithText(text: string) {
  const button = Array.from(host?.querySelectorAll('button') ?? []).find((candidate) =>
    candidate.textContent?.includes(text),
  )
  expect(button).toBeDefined()
  await act(async () => button?.click())
}

const openTicket = {
  id: '65f123456789012345678901',
  jiraKey: 'TSSD-20',
  summary: 'Support request',
  description: 'The cluster cannot connect to the source.',
  status: 'Open',
  statusCategory: 'new',
  createdAt: '2026-10-26T00:00:00Z',
  canClose: true,
}

const closedTicket = { ...openTicket, status: 'Closed', statusCategory: 'done', canClose: false }

describe('Support page email verification errors', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    tickets.mockResolvedValue({
      items: [],
      page: 0,
      size: 20,
      totalItems: 0,
      totalPages: 0,
      hasNext: false,
    })
    createTicket.mockRejectedValue(
      new CloudApiError('Email is not verified', 403, 'ticket.email-not-verified'),
    )
    ticket.mockReset()
    closeTicket.mockReset()
  })

  afterEach(async () => {
    await act(async () => root?.unmount())
    host?.remove()
    host = undefined
    root = undefined
    vi.clearAllMocks()
  })

  it.each(messages)(
    'shows the email verification guidance in %s',
    async (locale, expectedMessage) => {
      await i18n.changeLanguage(locale)
      await renderPage()
      await submitTicket(
        'Email verification',
        'Verify the current account email before creating a Jira customer.',
      )

      await vi.waitFor(() =>
        expect(document.querySelector('[role="alert"]')?.textContent).toContain(expectedMessage),
      )
      expect(createTicket).toHaveBeenCalledWith({
        summary: 'Email verification',
        description: 'Verify the current account email before creating a Jira customer.',
      })
    },
  )

  it('shows an empty state before the first ticket is submitted', async () => {
    await renderPage()

    expect(host?.textContent).toContain('Get help with Tapstate Cloud.')
    expect(host?.textContent).toContain('First response within 1 business day.')
    expect(host?.textContent).toContain('No tickets yet')
    expect(host?.textContent).toContain('Create a ticket when you need help')
  })

  it('explains that a support account cannot be resolved without exposing Jira details', async () => {
    createTicket.mockRejectedValue(
      new CloudApiError('Customer setup failed', 409, 'ticket.customer-not-ready'),
    )
    await renderPage()

    await submitTicket('Support request', 'The cluster cannot connect to the source.')

    await vi.waitFor(() =>
      expect(document.querySelector('[role="alert"]')?.textContent).toContain(
        'Your verified Cloud email could not be linked to one support customer.',
      ),
    )
    expect(host?.textContent).not.toContain('Customer setup failed')
  })

  it('shows a recovery instruction when Jira may have created a ticket before timing out', async () => {
    createTicket.mockRejectedValue(
      new CloudApiError('The response was lost', 503, 'ticket.submission-uncertain'),
    )
    await renderPage()

    await submitTicket('Support request', 'The cluster cannot connect to the source.')

    await vi.waitFor(() =>
      expect(document.querySelector('[role="alert"]')?.textContent).toContain(
        'Cloud could not confirm whether the ticket was created.',
      ),
    )
    expect(document.querySelector('[role=dialog]')?.textContent).toContain(
      'Check My tickets before submitting again.',
    )
  })

  it('creates a ticket, refreshes My tickets, and loads the Jira details', async () => {
    createTicket.mockResolvedValue(openTicket)
    tickets
      .mockResolvedValueOnce({
        items: [],
        page: 0,
        size: 20,
        totalItems: 0,
        totalPages: 0,
        hasNext: false,
      })
      .mockResolvedValue({
        items: [openTicket],
        page: 0,
        size: 20,
        totalItems: 1,
        totalPages: 1,
        hasNext: false,
      })
    ticket.mockResolvedValue(openTicket)
    await renderPage()

    await submitTicket('Support request', 'The cluster cannot connect to the source.')

    await vi.waitFor(() => expect(host?.textContent).toContain('TSSD-20'))
    expect(host?.textContent).toContain('Your ticket was submitted.')
    expect(host?.textContent).toContain('The cluster cannot connect to the source.')
    expect(createTicket).toHaveBeenCalledWith({
      summary: 'Support request',
      description: 'The cluster cannot connect to the source.',
    })
    expect(ticket).toHaveBeenCalledWith(openTicket.id)
  })

  it('closes only the selected ticket when Jira reports a close transition', async () => {
    tickets
      .mockResolvedValueOnce({
        items: [openTicket],
        page: 0,
        size: 20,
        totalItems: 1,
        totalPages: 1,
        hasNext: false,
      })
      .mockResolvedValueOnce({
        items: [closedTicket],
        page: 0,
        size: 20,
        totalItems: 1,
        totalPages: 1,
        hasNext: false,
      })
    ticket.mockResolvedValue(openTicket)
    closeTicket.mockResolvedValue(closedTicket)
    await renderPage()

    await clickButtonWithText('TSSD-20')
    await vi.waitFor(() => expect(ticket).toHaveBeenCalledWith(openTicket.id))
    await clickButtonWithText('Close ticket')
    await clickButtonWithText('Confirm close')

    await vi.waitFor(() => expect(closeTicket).toHaveBeenCalledWith(openTicket.id))
    await vi.waitFor(() => expect(host?.textContent).toContain('Closed'))
  })

  it('shows a safe error when Jira rejects a close transition', async () => {
    tickets.mockResolvedValue({
      items: [openTicket],
      page: 0,
      size: 20,
      totalItems: 1,
      totalPages: 1,
      hasNext: false,
    })
    ticket.mockResolvedValue(openTicket)
    closeTicket.mockRejectedValue(
      new CloudApiError('Workflow changed', 409, 'ticket.close-unavailable'),
    )
    await renderPage()

    await clickButtonWithText('TSSD-20')
    await vi.waitFor(() => expect(ticket).toHaveBeenCalledWith(openTicket.id))
    await clickButtonWithText('Close ticket')
    await clickButtonWithText('Confirm close')

    await vi.waitFor(() =>
      expect(document.querySelector('[role="alert"]')?.textContent).toContain(
        'This ticket cannot be closed in its current Jira workflow.',
      ),
    )
    expect(closeTicket).toHaveBeenCalledWith(openTicket.id)
  })

  it('keeps the ticket list unavailable when JSM has no deployment configuration', async () => {
    tickets.mockRejectedValue(
      new CloudApiError('Missing Jira configuration', 503, 'ticket.not-configured'),
    )
    await renderPage()

    await vi.waitFor(() =>
      expect(document.querySelector('[role="alert"]')?.textContent).toContain(
        'The support ticket service is temporarily unavailable.',
      ),
    )
  })

  it('explains when the current Jira workflow does not allow close', async () => {
    const nonClosable = { ...openTicket, canClose: false }
    tickets.mockResolvedValue({
      items: [nonClosable],
      page: 0,
      size: 20,
      totalItems: 1,
      totalPages: 1,
      hasNext: false,
    })
    ticket.mockResolvedValue(nonClosable)
    await renderPage()

    await clickButtonWithText('TSSD-20')
    await vi.waitFor(() => expect(ticket).toHaveBeenCalledWith(openTicket.id))

    expect(host?.textContent).toContain(
      'This Jira workflow does not currently allow this ticket to be closed.',
    )
    expect(closeTicket).not.toHaveBeenCalled()
  })
})
