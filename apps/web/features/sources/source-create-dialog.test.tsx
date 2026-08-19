import '@/i18n/index'

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ConnectorDetail, ConnectorSummary, SourceView } from '@/service/source-client'

const { getConnector, listConnectors } = vi.hoisted(() => ({
  getConnector: vi.fn(),
  listConnectors: vi.fn(),
}))

vi.mock('@/service/source-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/service/source-client')>()),
  getConnector,
  listConnectors,
}))

import { SourceCreateDialog } from './source-create-dialog'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const mysql: ConnectorSummary = {
  id: 'mysql',
  name: 'MySQL',
  icon: 'icons/mysql.png',
  group: 'database',
  modes: ['snapshot'],
  discovery: 'catalog',
  sink: false,
  pushOut: false,
  origin: 'registered',
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
  return [...document.body.querySelectorAll('button')].find(
    (button) => button.textContent?.includes('MySQL'),
  )
}

function backButton() {
  return [...document.body.querySelectorAll('button')].find(
    (button) => button.textContent?.includes('Choose another connector'),
  )
}

beforeEach(() => {
  listConnectors.mockResolvedValue([mysql])
  getConnector.mockResolvedValue(detail)
})

afterEach(async () => {
  await act(async () => root?.unmount())
  host?.remove()
  root = undefined
  host = undefined
  vi.clearAllMocks()
})

describe('SourceCreateDialog', () => {
  it('opens on registered connector cards and enters the spec-backed form immediately', async () => {
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)

    await act(async () => {
      root?.render(
        <SourceCreateDialog open onOpenChange={() => undefined} onCreated={(_source: SourceView) => undefined} />,
      )
    })

    await vi.waitFor(() => expect(connectorCard()).toBeDefined())
    expect(document.body.textContent).not.toContain('Step 1')
    expect(document.body.textContent).not.toContain('Continue')
    expect(document.body.querySelector('[data-fallback="M"]')).toBeDefined()

    await act(async () => connectorCard()?.click())

    await vi.waitFor(() => {
      expect(getConnector).toHaveBeenCalledWith('mysql', expect.any(Function))
      expect(document.body.textContent).toContain('Spec host')
    })
    expect(document.body.textContent).toContain('Connector documentation')

    await act(async () => backButton()?.click())
    await vi.waitFor(() => {
      expect(connectorCard()).toBeDefined()
      expect(document.activeElement).toBe(connectorCard())
    })
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
        <SourceCreateDialog open onOpenChange={() => undefined} onCreated={(_source: SourceView) => undefined} />,
      )
    })
    await vi.waitFor(() => expect(connectorCard()).toBeDefined())

    await act(async () => connectorCard()?.click())

    await vi.waitFor(() =>
      expect(document.body.textContent).toContain('does not provide a stored form specification'),
    )
    expect(document.body.textContent).not.toContain('Spec host')
  })
})
