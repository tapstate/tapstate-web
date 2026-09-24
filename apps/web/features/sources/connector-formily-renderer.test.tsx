import '@/i18n/index'
import type { ISchema } from '@formily/json-schema'

import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'

import type { ConnectorConfigField } from '@/service/source-client'

import { formilyAntdPrefixCls, formilyAntdTheme } from '@/components/formily/formily-antd-provider'

import { ConnectorFormily } from './connector-formily'
import { connectorSpecConnectionSchema } from './connector-spec-formily-schema'

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.assign(globalThis, {
  IS_REACT_ACT_ENVIRONMENT: true,
  ResizeObserver: ResizeObserverMock,
})

const fields: ConnectorConfigField[] = [
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
    type: 'number',
    label: 'Port',
    required: true,
    defaultValue: '5432',
    secret: false,
    options: [],
    visibleWhen: null,
  },
  {
    name: 'tls',
    type: 'boolean',
    label: 'TLS',
    required: false,
    defaultValue: 'true',
    secret: false,
    options: [],
    visibleWhen: null,
  },
  {
    name: 'schemas',
    type: 'array',
    label: 'Schemas',
    required: false,
    defaultValue: '["public"]',
    secret: false,
    options: [],
    visibleWhen: null,
  },
  {
    name: 'database',
    type: 'string',
    label: 'Database',
    required: true,
    defaultValue: null,
    secret: false,
    options: [],
    visibleWhen: { controllingField: 'host', equalsAnyOf: ['db.local', 'db.staging'] },
  },
  {
    name: 'password',
    type: 'string',
    label: 'Password',
    required: true,
    defaultValue: null,
    secret: true,
    options: [],
    visibleWhen: null,
  },
  {
    name: 'mode',
    type: 'string',
    label: 'Mode',
    required: false,
    defaultValue: null,
    secret: false,
    options: [
      { value: '', label: 'Default' },
      { value: 'strict', label: 'Strict' },
    ],
    visibleWhen: null,
  },
]

let root: Root | undefined
let container: HTMLDivElement | undefined

afterEach(async () => {
  await act(async () => root?.unmount())
  container?.remove()
  root = undefined
  container = undefined
})

function fieldControl(label: string) {
  const field = [...(container?.querySelectorAll('[class*="formily-item"]') ?? [])].find(
    (element) => element.querySelector('label')?.textContent?.trim() === label,
  )
  if (!field) throw new Error(`Expected ${label} field`)
  return field.querySelector('input, textarea, button')
}

describe('ConnectorFormily', () => {
  it('shares a generic shadcn-aligned provider with other Formily renderers', () => {
    expect(formilyAntdPrefixCls).toBe('tap')
    expect(formilyAntdTheme.token).toMatchObject({
      borderRadius: 10,
      colorBgContainer: 'var(--pipeline-surface-subtle)',
      colorBorder: 'transparent',
      colorPrimary: 'var(--primary)',
      colorText: 'var(--foreground)',
      controlOutline: 'color-mix(in oklch, var(--ring) 20%, transparent)',
    })
  })

  it('renders Formily radio groups as shadcn-style segmented button groups', async () => {
    const changes: Array<Record<string, unknown>> = []
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const schema: ISchema = {
      type: 'object',
      properties: {
        strategy: {
          type: 'string',
          title: 'Strategy',
          enum: [
            { label: 'Balanced', value: 'balanced' },
            { label: 'Fast', value: 'fast' },
          ],
          'x-decorator': 'FormItem',
          'x-component': 'Radio.Group',
        },
      },
    }

    await act(async () => {
      root?.render(
        <ConnectorFormily
          fields={fields}
          schema={schema}
          resetKey="create:radio-group"
          initialValues={{ strategy: 'balanced' }}
          onValuesChange={(values) => changes.push(values)}
        />,
      )
    })

    const group = container.querySelector<HTMLElement>('[role="group"][aria-label="Strategy"]')
    expect(group?.dataset.slot).toBe('button-group')
    expect(group?.classList).toContain('bg-muted')
    expect(group?.classList).toContain('border-border')

    const buttons = [...(group?.querySelectorAll<HTMLButtonElement>('button') ?? [])]
    expect(buttons.map((button) => button.textContent)).toEqual(['Balanced', 'Fast'])
    expect(buttons[0]?.getAttribute('aria-pressed')).toBe('true')
    expect(buttons[1]?.getAttribute('aria-pressed')).toBe('false')

    await act(async () => buttons[1]?.click())

    expect(changes.at(-1)).toMatchObject({ strategy: 'fast' })
  })

  it('lets an Atlas connection switch from URI to tested standard fields', async () => {
    const changes: Array<Record<string, unknown>> = []
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const schema = connectorSpecConnectionSchema(
      JSON.stringify({
        configOptions: {
          connection: {
            type: 'object',
            properties: {
              isUri: {
                type: 'boolean',
                title: 'Connection method',
                default: true,
                'x-decorator': 'FormItem',
                'x-component': 'Radio.Group',
                enum: [
                  { label: 'URI Mode', value: true, disabled: false },
                  { label: 'Standard Mode', value: false, disabled: true },
                ],
              },
            },
          },
        },
      }),
      'en',
      'mongodb-atlas',
    )

    await act(async () => {
      root?.render(
        <ConnectorFormily
          fields={fields}
          schema={schema}
          resetKey="create:mongodb-atlas:spec"
          initialValues={{ isUri: true }}
          onValuesChange={(values) => changes.push(values)}
        />,
      )
    })

    const buttons = [...(container.querySelectorAll<HTMLButtonElement>('button') ?? [])]
    const standard = buttons.find((button) => button.textContent === 'Standard Mode')
    expect(standard?.disabled).toBe(false)
    await act(async () => standard?.click())
    expect(changes.at(-1)).toMatchObject({ isUri: false })
  })

  it('registers adapter components and backend-compatible aliases', async () => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const schema: ISchema = {
      type: 'object',
      properties: {
        adapterPassword: {
          type: 'string',
          title: 'Adapter password',
          'x-decorator': 'FormItem',
          'x-component': 'Password',
        },
        adapterPort: {
          type: 'number',
          title: 'Adapter port',
          'x-decorator': 'FormItem',
          'x-component': 'InputNumber',
        },
      },
    }

    await act(async () => {
      root?.render(
        <ConnectorFormily
          fields={fields}
          schema={schema}
          resetKey="create:adapter-password"
          initialValues={{ adapterPassword: '', adapterPort: 5432 }}
        />,
      )
    })

    expect(container.querySelector('.tap-formily-layout.tap-form-vertical')).not.toBeNull()
    expect(fieldControl('Adapter password')).toHaveProperty('type', 'password')
    expect(fieldControl('Adapter port')).toHaveProperty('value', '5432')
  })

  it('renders the connection schema declared in connector spec text', async () => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const schema = connectorSpecConnectionSchema(
      JSON.stringify({
        configOptions: {
          connection: {
            type: 'object',
            properties: {
              host: {
                type: 'string',
                title: 'Spec host',
                'x-decorator': 'FormItem',
                'x-component': 'Input',
              },
            },
          },
        },
      }),
      'en',
    )

    await act(async () => {
      root?.render(
        <ConnectorFormily
          fields={fields}
          schema={schema}
          resetKey="create:mysql:spec"
          initialValues={{ host: 'db.local' }}
        />,
      )
    })

    expect(fieldControl('Spec host')).toBeInstanceOf(HTMLInputElement)
    expect(container.textContent).not.toContain('Host')
  })

  it('uses the AntD Password renderer for unconfigured catalog secrets in raw specs', async () => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    const schema = connectorSpecConnectionSchema(
      JSON.stringify({
        configOptions: {
          connection: {
            type: 'object',
            properties: {
              password: {
                type: 'string',
                title: 'Spec password',
                'x-decorator': 'FormItem',
                'x-component': 'Input',
              },
            },
          },
        },
      }),
      'en',
    )

    await act(async () => {
      root?.render(
        <ConnectorFormily
          fields={fields}
          schema={schema}
          resetKey="create:mysql:secret-spec"
          initialValues={{ password: '' }}
        />,
      )
    })

    expect(fieldControl('Spec password')).toHaveProperty('type', 'password')
    expect(container.querySelector('[aria-label="Replace configured secret"]')).toBeNull()
  })

  it('renders catalog field types and synchronizes Formily input changes', async () => {
    const changes: Array<Record<string, unknown>> = []
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    await act(async () => {
      root?.render(
        <ConnectorFormily
          fields={fields}
          resetKey="create:postgres"
          initialValues={{
            host: 'db.local',
            port: 5432,
            tls: true,
            schemas: ['public'],
            password: '',
            mode: '',
          }}
          onValuesChange={(values) => changes.push(values)}
        />,
      )
    })

    expect(fieldControl('Host')).toBeInstanceOf(HTMLInputElement)
    expect(fieldControl('Port')?.getAttribute('role')).toBe('spinbutton')
    expect(fieldControl('TLS')?.getAttribute('role')).toBe('switch')
    expect(fieldControl('Schemas')).toBeInstanceOf(HTMLTextAreaElement)
    expect((fieldControl('Schemas') as HTMLTextAreaElement).value).toBe('[\n  "public"\n]')
    expect(fieldControl('Database')).toBeInstanceOf(HTMLInputElement)
    expect(fieldControl('Password')).toHaveProperty('type', 'password')
    expect(fieldControl('Mode')?.getAttribute('aria-label')).toBe('Mode')

    const host = fieldControl('Host') as HTMLInputElement
    const setNativeValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    await act(async () => {
      setNativeValue?.call(host, 'db.staging')
      host.dispatchEvent(new Event('input', { bubbles: true }))
    })

    expect(changes.at(-1)).toMatchObject({ host: 'db.staging', port: 5432, tls: true })
  })

  it('resets Formily state only when the source version changes', async () => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    await act(async () => {
      root?.render(
        <ConnectorFormily
          fields={fields}
          resetKey="orders:etag-1"
          initialValues={{
            host: 'db.local',
            port: 5432,
            tls: true,
            schemas: ['public'],
            password: '',
            mode: '',
          }}
        />,
      )
    })

    expect((fieldControl('Host') as HTMLInputElement).value).toBe('db.local')

    await act(async () => {
      root?.render(
        <ConnectorFormily
          fields={fields}
          resetKey="orders:etag-2"
          initialValues={{
            host: 'db.staging',
            port: 5433,
            tls: false,
            schemas: ['audit'],
            password: '',
            mode: 'strict',
          }}
        />,
      )
    })

    expect((fieldControl('Host') as HTMLInputElement).value).toBe('db.staging')
    expect((fieldControl('Port') as HTMLInputElement).value).toBe('5433')
  })

  it('keeps configured secrets write-only while exposing replace and clear actions', async () => {
    const secretChanges: Array<{ name: string; action: string; value: string }> = []
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    await act(async () => {
      root?.render(
        <ConnectorFormily
          fields={fields}
          resetKey="orders:etag-1"
          initialValues={{
            host: 'db.local',
            port: 5432,
            tls: true,
            schemas: ['public'],
            mode: '',
          }}
          configuredSecrets={['password']}
          secretDrafts={{ password: { action: 'keep', value: '' } }}
          onSecretChange={(name, draft) => secretChanges.push({ name, ...draft })}
        />,
      )
    })

    const password = fieldControl('Password') as HTMLInputElement
    expect(password.value).toBe('')
    expect(password.disabled).toBe(true)

    const replace = container.querySelector<HTMLButtonElement>(
      '[aria-label="Replace configured secret"]',
    )
    await act(async () => replace?.click())

    expect(secretChanges).toContainEqual({ name: 'password', action: 'replace', value: '' })
  })

  it('only exposes clearing for configured optional secrets', async () => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    await act(async () => {
      root?.render(
        <ConnectorFormily
          fields={fields}
          resetKey="orders:etag-1"
          initialValues={{
            host: 'db.local',
            port: 5432,
            tls: true,
            schemas: ['public'],
            mode: '',
          }}
          configuredSecrets={['password']}
          secretDrafts={{ password: { action: 'keep', value: '' } }}
        />,
      )
    })

    expect(container.querySelector('[aria-label="Clear secret"]')).toBeNull()

    await act(async () => {
      root?.render(
        <ConnectorFormily
          fields={fields.map((field) =>
            field.name === 'password' ? { ...field, required: false } : field,
          )}
          resetKey="orders:etag-2"
          initialValues={{
            host: 'db.local',
            port: 5432,
            tls: true,
            schemas: ['public'],
            mode: '',
          }}
          configuredSecrets={['password']}
          secretDrafts={{ password: { action: 'keep', value: '' } }}
        />,
      )
    })

    expect(container.querySelector('[aria-label="Clear secret"]')).not.toBeNull()
  })

  it('reflects configured secret draft changes back into the Formily control', async () => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    function SecretDraftBridge() {
      const [secretDrafts, setSecretDrafts] = useState({
        password: { action: 'keep' as const, value: '' },
      })

      return (
        <ConnectorFormily
          fields={fields}
          resetKey="orders:etag-1"
          initialValues={{
            host: 'db.local',
            port: 5432,
            tls: true,
            schemas: ['public'],
            mode: '',
          }}
          configuredSecrets={['password']}
          secretDrafts={secretDrafts}
          onSecretChange={(name, draft) =>
            setSecretDrafts((current) => ({ ...current, [name]: draft }))
          }
        />
      )
    }

    await act(async () => {
      root?.render(<SecretDraftBridge />)
    })

    const password = fieldControl('Password') as HTMLInputElement
    expect(password.disabled).toBe(true)

    const replace = container.querySelector<HTMLButtonElement>(
      '[aria-label="Replace configured secret"]',
    )
    await act(async () => replace?.click())

    expect((fieldControl('Password') as HTMLInputElement).disabled).toBe(false)
  })
})
