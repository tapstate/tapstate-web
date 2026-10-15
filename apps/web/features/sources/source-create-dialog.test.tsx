import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, type ComponentProps } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ConnectorDetail, ConnectorSummary, SourceView } from '@/service/source-client'

import { i18n } from '@/i18n/index'

const {
  getConnector,
  listConnectors,
  testConnection,
  getDeploymentProfile,
  loadCloudWorkspaceContext,
} = vi.hoisted(() => ({
  getConnector: vi.fn(),
  listConnectors: vi.fn(),
  testConnection: vi.fn(),
  getDeploymentProfile: vi.fn(() => 'on-prem'),
  loadCloudWorkspaceContext: vi.fn(),
}))

vi.mock('@/utils/deployment-profile', () => ({
  getDeploymentProfile,
  deploymentProfile: 'on-prem',
}))
vi.mock('@/service/cloud-workspace-client', () => ({ loadCloudWorkspaceContext }))

vi.mock('@/service/source-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/service/source-client')>()),
  getConnector,
  listConnectors,
  testConnection,
}))

import { SourceCreateDialog as DialogUnderTest } from './source-create-dialog'

let queryClient: QueryClient

function SourceCreateDialog(props: ComponentProps<typeof DialogUnderTest>) {
  return (
    <QueryClientProvider client={queryClient}>
      <DialogUnderTest {...props} />
    </QueryClientProvider>
  )
}

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
    {
      name: 'port',
      type: 'string',
      label: 'Port',
      required: true,
      defaultValue: '3306',
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
            port: {
              type: 'string',
              title: 'Spec port',
              default: '3306',
              required: true,
              'x-decorator': 'FormItem',
              'x-component': 'InputNumber',
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

function connectorSearchField() {
  return document.body.querySelector<HTMLInputElement>('input[aria-label="Search connectors"]')
}

function fieldInput(label: string) {
  return document.body.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)
}

function changeInput(input: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  valueSetter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

function hasClasses(element: Element | null | undefined, ...classes: string[]) {
  return Boolean(element && classes.every((className) => element.classList.contains(className)))
}

beforeEach(async () => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } })
  getDeploymentProfile.mockReturnValue('on-prem')
  loadCloudWorkspaceContext.mockResolvedValue({
    organizationId: 'org-one',
    organizationName: 'Workspace',
    clusterName: 'Analytics',
    region: 'us-east-1',
    clusterState: 'READY',
    ec2PublicIp: '203.0.113.42',
    egressAddressStatus: 'STABLE',
  })
  await i18n.changeLanguage('en')
  listConnectors.mockResolvedValue([mysql, mongodb])
  getConnector.mockResolvedValue(detail)
  testConnection.mockResolvedValue({
    connectionId: 'orders',
    connectorId: 'mysql',
    outcome: 'PASSED',
    checks: [{ name: 'connection', status: 'PASSED', message: 'Connected' }],
    testedAt: 1_754_800_000_000,
  })
})

afterEach(async () => {
  await act(async () => root?.unmount())
  queryClient.clear()
  await i18n.changeLanguage('en')
  host?.remove()
  root = undefined
  host = undefined
  vi.clearAllMocks()
})

describe('Cluster outbound IP guidance', () => {
  async function renderDialog(open = true) {
    if (!host) {
      host = document.createElement('div')
      document.body.append(host)
      root = createRoot(host)
    }
    await act(async () => {
      root?.render(
        <SourceCreateDialog
          open={open}
          initialConnectorId="mysql"
          onOpenChange={() => undefined}
          onCreated={() => undefined}
        />,
      )
    })
    if (open) await vi.waitFor(() => expect(fieldInput('Spec host')).not.toBeNull())
  }

  function copyButton() {
    return [...document.body.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Copy IP',
    )
  }

  it('shows and copies the stable Cluster IP, then resets feedback when reopened', async () => {
    getDeploymentProfile.mockReturnValue('cloud')
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    await renderDialog()
    await vi.waitFor(() => expect(copyButton()).toBeDefined())
    expect(document.body.textContent).toContain('203.0.113.42')
    expect(document.body.textContent).toContain('Allowlist this IP')
    await act(async () => copyButton()?.click())
    expect(writeText).toHaveBeenCalledWith('203.0.113.42')
    expect(document.body.textContent).toContain('Copied')
    await renderDialog(false)
    await renderDialog()
    await vi.waitFor(() => expect(copyButton()).toBeDefined())
  })

  it('reports clipboard failure and leaves the configuration usable', async () => {
    getDeploymentProfile.mockReturnValue('cloud')
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    })
    await renderDialog()
    await vi.waitFor(() => expect(copyButton()).toBeDefined())
    await act(async () => copyButton()?.click())
    expect(document.body.textContent).toContain('Clipboard access failed')
    expect(fieldInput('Spec host')).not.toBeNull()
  })

  it('allows configuration without an address and never invents one', async () => {
    getDeploymentProfile.mockReturnValue('cloud')
    loadCloudWorkspaceContext.mockResolvedValue({
      organizationId: 'org',
      organizationName: 'Org',
      clusterName: 'Cluster',
      region: 'us-east-1',
      clusterState: 'READY',
    })
    await renderDialog()
    await vi.waitFor(() =>
      expect(document.body.textContent).toContain('has not reported an outbound IP'),
    )
    expect(copyButton()).toBeUndefined()
    expect(fieldInput('Spec host')).not.toBeNull()
  })

  it('shows loading without blocking connector fields', async () => {
    getDeploymentProfile.mockReturnValue('cloud')
    loadCloudWorkspaceContext.mockReturnValue(new Promise(() => undefined))
    await renderDialog()
    expect(document.body.textContent).toContain('Checking the IP')
    expect(fieldInput('Spec host')).not.toBeNull()
  })

  it('shows a retryable context error without blocking connector fields', async () => {
    getDeploymentProfile.mockReturnValue('cloud')
    loadCloudWorkspaceContext.mockRejectedValue(new Error('unavailable'))
    await renderDialog()
    await vi.waitFor(() => expect(document.body.textContent).toContain('Could not load'))
    expect(fieldInput('Spec host')).not.toBeNull()
  })

  it('does not show Cloud firewall guidance in on-prem mode', async () => {
    await renderDialog()
    expect(document.body.textContent).not.toContain('Cluster outbound IP')
    expect(loadCloudWorkspaceContext).not.toHaveBeenCalled()
  })

  it('hides a cached address when its refresh fails', async () => {
    getDeploymentProfile.mockReturnValue('cloud')
    queryClient.setQueryData(['cloud-workspace-context'], {
      ec2PublicIp: '203.0.113.42',
      egressAddressStatus: 'STABLE',
    })
    loadCloudWorkspaceContext.mockRejectedValue(new Error('unavailable'))
    await renderDialog()
    await vi.waitFor(() => expect(document.body.textContent).toContain('Could not load'))
    expect(document.body.textContent).not.toContain('203.0.113.42')
    expect(copyButton()).toBeUndefined()
  })

  it.each(['STABILIZING', 'ATTACHING'])('prevents copying an address during %s', async (status) => {
    getDeploymentProfile.mockReturnValue('cloud')
    loadCloudWorkspaceContext.mockResolvedValue({
      ec2PublicIp: '203.0.113.42',
      egressAddressStatus: status,
    })
    await renderDialog()
    await vi.waitFor(() =>
      expect(document.body.textContent).toContain('Stable IP setup is in progress'),
    )
    expect(copyButton()).toBeUndefined()
  })

  it.each([
    ['DYNAMIC', 'may change if the Cluster instance is replaced'],
    ['FAILED', 'Stable IP setup failed'],
  ])('labels %s addresses accurately', async (status, message) => {
    getDeploymentProfile.mockReturnValue('cloud')
    loadCloudWorkspaceContext.mockResolvedValue({
      ec2PublicIp: '203.0.113.42',
      egressAddressStatus: status,
    })
    await renderDialog()
    await vi.waitFor(() => expect(document.body.textContent).toContain(message))
    expect(document.body.textContent).not.toContain(
      'Allowlist this IP in your database firewall to let',
    )
  })
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

  it('tests the same validated draft that will be used to create a Source', async () => {
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
    await vi.waitFor(() => expect(fieldInput('Spec host')).toBeDefined())

    const sourceIdInput = dialogContent()?.querySelector<HTMLInputElement>(
      'label.source-field input',
    )
    const hostInput = fieldInput('Spec host')
    expect(sourceIdInput).toBeDefined()
    expect(hostInput).toBeDefined()

    await act(async () => {
      changeInput(sourceIdInput!, 'orders')
      changeInput(hostInput!, 'db.internal')
    })

    const testButton = [...document.body.querySelectorAll('button')].find(
      (button) => button.textContent === 'Test connection',
    )
    expect(testButton).toBeDefined()

    await act(async () => testButton?.click())

    await vi.waitFor(() => {
      expect(testConnection).toHaveBeenCalledWith(
        {
          id: 'orders',
          connectorId: 'mysql',
          settings: { host: 'db.internal', port: 3306 },
        },
        expect.any(Function),
      )
      expect(document.body.textContent).toContain('Connection test passed')
      expect(document.body.textContent).toContain('Connected')
    })
  })
})
