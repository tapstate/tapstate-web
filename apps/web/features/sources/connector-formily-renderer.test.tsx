import '@/i18n/index'
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'

import type { ConnectorConfigField } from '@/service/source-client'

import { ConnectorFormily } from './connector-formily'
import { connectorSpecConnectionSchema } from './connector-spec-formily-schema'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

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
  const field = [...(container?.querySelectorAll('label') ?? [])].find(
    (element) => element.querySelector('.source-field__label')?.textContent?.trim() === label,
  )
  if (!field) throw new Error(`Expected ${label} field`)
  return field.querySelector('input, textarea, button')
}

describe('ConnectorFormily', () => {
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
      fields,
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
    expect(fieldControl('Port')).toHaveProperty('type', 'number')
    expect(fieldControl('TLS')).toHaveProperty('type', 'checkbox')
    expect(fieldControl('Schemas')).toBeInstanceOf(HTMLTextAreaElement)
    expect(fieldControl('Database')).toBeInstanceOf(HTMLInputElement)
    expect(fieldControl('Password')).toHaveProperty('type', 'password')
    expect(fieldControl('Mode')?.getAttribute('aria-label')).toBe('select')

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
