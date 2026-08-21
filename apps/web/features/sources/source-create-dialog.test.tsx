import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ConnectorDetail, ConnectorSummary, SourceView } from '@/service/source-client'

import { i18n } from '@/i18n/index'

const { getConnector, listConnectors, testConnection } = vi.hoisted(() => ({
  getConnector: vi.fn(),
  listConnectors: vi.fn(),
  testConnection: vi.fn(),
}))

vi.mock('@/service/source-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/service/source-client')>()),
  getConnector,
  listConnectors,
  testConnection,
}))

import { SourceCreateDialog } from './source-create-dialog'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const mysql: ConnectorSummary = {
  id: 'mysql',
  name: 'MySQL',
  icon: 'icons/mysql.png',
  group: 'database',
  modes: ['snapshot', 'cdc'],
  discovery: 'catalog',
  sink: false,
  pushOut: false,
  origin: 'registered',
}

const mongodb: ConnectorSummary = {
  ...mysql,
  id: 'mongodb',
  name: 'MongoDB',
}

const postgresql: ConnectorSummary = {
  ...mysql,
  id: 'postgresql',
  name: 'PostgreSQL',
}

const detail: ConnectorDetail = {
  ...mysql,
  config: [
    {
      name: 'host',
      type: 'string',
      label: 'Host',
      required: true,
      defaultValue: null,
      secret: false,
      options: [],
      visibleWhen: null,
    },
  ],
  spec: {
    contentHash: 'a'.repeat(64),
    text: JSON.stringify({
      configOptions: {
        connection: {
          type: 'object',
          properties: {
            host: {
              type: 'string',
              title: 'Spec host',
              required: true,
              'x-decorator': 'FormItem',
              'x-component': 'Input',
            },
          },
        },
      },
    }),
    unavailable: null,
  },
  runtimeAvailable: true,
}

let root: Root | undefined
let host: HTMLDivElement | undefined

function connectorCard() {
  return [...document.body.querySelectorAll('button')].find((button) =>
    button.textContent?.includes('MySQL'),
  )
}

function backButton() {
  return [...document.body.querySelectorAll('button')].find(
    (button) => button.getAttribute('aria-label') === 'Choose another connector',
  )
}

function dialogContent() {
  return document.body.querySelector<HTMLElement>('[data-slot="dialog-content"]')
}

function testResultDialog() {
  return [...document.body.querySelectorAll<HTMLElement>('[data-slot="dialog-content"]')].find(
    (content) =>
      content.querySelector('[data-slot="dialog-title"]')?.textContent === 'Connection test',
  )
}

function connectorSearchField() {
  return document.body.querySelector<HTMLInputElement>('input[aria-label="Search connectors"]')
}

function hasClasses(element: Element | null | undefined, ...classes: string[]) {
  return Boolean(element && classes.every((className) => element.classList.contains(className)))
}

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

function buttonWithText(text: string) {
  return [...document.body.querySelectorAll('button')].find((button) => button.textContent === text)
}

beforeEach(async () => {
  await i18n.changeLanguage('en')
  listConnectors.mockResolvedValue([mysql, mongodb])
  getConnector.mockResolvedValue(detail)
  testConnection.mockResolvedValue({
    connectionId: 'orders',
    connectorId: 'mysql',
    outcome: 'PASSED',
    checks: [
      {
        name: 'connection',
        status: 'PASSED',
        message: 'Connected',
        reason: null,
        solution: null,
        connectorErrorCode: null,
      },
    ],
    testedAt: 1_754_800_000_000,
  })
})

afterEach(async () => {
  await act(async () => root?.unmount())
  await i18n.changeLanguage('en')
  host?.remove()
  root = undefined
  host = undefined
  vi.clearAllMocks()
})

describe('SourceCreateDialog', () => {
  it('renders a compact floating connector grid and enters the spec-backed form immediately', async () => {
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)

    await act(async () => {
      root?.render(
        <SourceCreateDialog
          open
          onOpenChange={() => undefined}
          onCreated={(_source: SourceView) => undefined}
        />,
      )
    })

    await vi.waitFor(() => expect(connectorCard()).toBeDefined())
    expect(dialogContent()?.querySelector('[data-slot="dialog-title"]')?.textContent).toBe(
      'Choose a connector',
    )
    expect(
      hasClasses(
        dialogContent(),
        'max-w-[1100px]',
        'h-[90vh]',
        'max-h-[800px]',
        'p-0',
        'flex',
        'flex-col',
      ),
    ).toBe(true)
    expect(
      hasClasses(
        dialogContent()?.querySelector('[role="list"]'),
        'mx-auto',
        'max-w-5xl',
        'grid',
        'grid-cols-1',
        'sm:grid-cols-2',
        'xl:grid-cols-3',
        'gap-3',
      ),
    ).toBe(true)
    expect(
      hasClasses(
        dialogContent()?.querySelector('[role="list"]')?.parentElement?.parentElement,
        'bg-gray-50/40',
      ),
    ).toBe(true)
    expect(connectorSearchField()).not.toBeNull()
    expect(hasClasses(connectorSearchField()?.closest('label'), 'mx-auto', 'max-w-[460px]')).toBe(
      true,
    )
    expect(
      hasClasses(
        connectorCard(),
        'bg-background',
        'h-16',
        'rounded-xl',
        'px-4',
        'shadow-[0_1px_3px_rgba(0,0,0,0.04)]',
        'transition-all',
        'duration-300',
        'hover:-translate-y-px',
        'hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.08)]',
      ),
    ).toBe(true)
    expect(connectorCard()?.closest('[role="listitem"]')?.classList.contains('border')).toBe(false)
    const connectorIcon = connectorCard()?.querySelector('.connector-icon')
    expect(connectorIcon?.classList.contains('bg-muted')).toBe(false)
    expect(connectorIcon?.classList.contains('border')).toBe(false)
    expect(document.body.textContent).not.toContain('Step 1')
    expect(document.body.textContent).not.toContain('Continue')
    expect(document.body.querySelector('[data-fallback="M"]')).toBeDefined()

    await act(async () => connectorCard()?.click())

    await vi.waitFor(() => {
      expect(getConnector).toHaveBeenCalledWith('mysql', expect.any(Function))
      expect(document.body.textContent).toContain('Spec host')
    })
    expect(document.body.textContent).not.toContain('Connection configuration')
    expect(document.body.textContent).not.toContain(
      'Fields normalized from MySQL connector metadata.',
    )
    expect(document.body.textContent).toContain('Source ID')
    expect(document.body.textContent).toContain(
      'A globally unique identifier for this source. It can’t be changed after creation.',
    )
    const sourceIdInput = dialogContent()?.querySelector('label.source-field input')
    expect(sourceIdInput?.getAttribute('placeholder')).toBeNull()
    expect(document.body.textContent).toContain('Connector documentation')
    expect(
      hasClasses(dialogContent()?.querySelector('aside'), 'hidden', 'w-[360px]', 'xl:w-[420px]'),
    ).toBe(true)

    const modeGroup = document.body.querySelector('[role="group"][aria-label="Read mode"]')
    expect(hasClasses(modeGroup, 'inline-flex', 'bg-muted', 'border-border')).toBe(true)
    const cdcMode = [...(modeGroup?.querySelectorAll('button') ?? [])].find(
      (button) => button.textContent === 'cdc',
    )
    await act(async () => cdcMode?.click())
    expect(cdcMode?.getAttribute('aria-pressed')).toBe('true')

    await act(async () => backButton()?.click())
    await vi.waitFor(() => {
      expect(connectorCard()).toBeDefined()
      expect(document.activeElement).toBe(connectorCard())
    })
  })

  it('keeps search visible when the connector catalog grows beyond two entries', async () => {
    listConnectors.mockResolvedValue([mysql, mongodb, postgresql])
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)

    await act(async () => {
      root?.render(
        <SourceCreateDialog
          open
          onOpenChange={() => undefined}
          onCreated={(_source: SourceView) => undefined}
        />,
      )
    })

    await vi.waitFor(() => expect(connectorSearchField()).not.toBeNull())
    expect(hasClasses(connectorSearchField()?.closest('label'), 'mx-auto', 'max-w-[460px]')).toBe(
      true,
    )
  })

  it('does not fabricate a configuration form when the registered connector lacks spec text', async () => {
    getConnector.mockResolvedValue({
      ...detail,
      spec: { contentHash: detail.spec.contentHash, text: null, unavailable: 'not-stored' },
    })
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)

    await act(async () => {
      root?.render(
        <SourceCreateDialog
          open
          onOpenChange={() => undefined}
          onCreated={(_source: SourceView) => undefined}
        />,
      )
    })
    await vi.waitFor(() => expect(connectorCard()).toBeDefined())

    await act(async () => connectorCard()?.click())

    await vi.waitFor(() =>
      expect(document.body.textContent).toContain('does not provide a stored form specification'),
    )
    expect(document.body.textContent).not.toContain('Spec host')
  })

  it('uses the active i18next locale to resolve connector spec messages', async () => {
    getConnector.mockResolvedValue({
      ...detail,
      spec: {
        ...detail.spec,
        text: JSON.stringify({
          messages: {
            en_US: { host: 'English host' },
            zh_CN: { host: '主机地址' },
          },
          configOptions: {
            connection: {
              type: 'object',
              properties: {
                host: {
                  type: 'string',
                  title: '${host}',
                  'x-decorator': 'FormItem',
                  'x-component': 'Input',
                },
              },
            },
          },
        }),
      },
    })
    await i18n.changeLanguage('zh-CN')
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)

    await act(async () => {
      root?.render(
        <SourceCreateDialog
          open
          onOpenChange={() => undefined}
          onCreated={(_source: SourceView) => undefined}
        />,
      )
    })
    await vi.waitFor(() => expect(connectorCard()).toBeDefined())

    await act(async () => connectorCard()?.click())

    await vi.waitFor(() => expect(document.body.textContent).toContain('主机地址'))
    expect(document.body.textContent).not.toContain('English host')
  })

  it('tests the current draft and opens the complete one-shot result in a dialog', async () => {
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)

    await act(async () => {
      root?.render(
        <SourceCreateDialog
          open
          onOpenChange={() => undefined}
          onCreated={(_source: SourceView) => undefined}
        />,
      )
    })
    await vi.waitFor(() => expect(connectorCard()).toBeDefined())

    await act(async () => connectorCard()?.click())
    await vi.waitFor(() =>
      expect(document.body.querySelector('input[aria-label="Spec host"]')).toBeDefined(),
    )

    const sourceId = dialogContent()?.querySelector<HTMLInputElement>('label.source-field input')
    const sourceHost = document.body.querySelector<HTMLInputElement>(
      'input[aria-label="Spec host"]',
    )
    expect(sourceId).toBeDefined()
    expect(sourceHost).toBeDefined()
    await act(async () => {
      setInputValue(sourceId as HTMLInputElement, 'orders')
      setInputValue(sourceHost as HTMLInputElement, 'db.internal')
    })

    await act(async () => buttonWithText('Test connection')?.click())

    await vi.waitFor(() =>
      expect(testConnection).toHaveBeenCalledWith(
        { id: 'orders', connectorId: 'mysql', settings: { host: 'db.internal' } },
        expect.any(Function),
      ),
    )
    await vi.waitFor(() => expect(testResultDialog()).toBeDefined())
    expect(testResultDialog()?.textContent).toContain('Connection test passed')
    expect(testResultDialog()?.textContent).toContain('Connected')
    expect(dialogContent()?.textContent).not.toContain('Connection test passed')

    await act(async () =>
      testResultDialog()
        ?.querySelector<HTMLButtonElement>('[data-slot="dialog-footer"] button')
        ?.click(),
    )
    await vi.waitFor(() => expect(testResultDialog()).toBeUndefined())
    expect(document.body.querySelector('input[aria-label="Spec host"]')).not.toBeNull()
  })
})
