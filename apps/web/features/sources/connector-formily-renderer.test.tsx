import '@/i18n/index'
import type { ISchema } from '@formily/json-schema'

import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ConnectorConfigField } from '@/service/source-client'

import { formilyAntdPrefixCls, formilyDifyTheme } from '@/components/formily/formily-antd-provider'

import { ConnectorFormily } from './connector-formily'
import {
  connectorSpecConfigFields,
  connectorSpecConnectionSchema,
} from './connector-spec-formily-schema'
import { createInitialConfig } from './source-form'

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
  vi.restoreAllMocks()
})

function fieldControl(label: string) {
  const field = [...(container?.querySelectorAll('[class*="formily-item"]') ?? [])].find(
    (element) => element.querySelector('label')?.textContent?.trim() === label,
  )
  if (!field) throw new Error(`Expected ${label} field`)
  return field.querySelector('input, textarea, button')
}

describe('ConnectorFormily', () => {
  it('uses the shared Tapstate tokens for Formily controls', () => {
    expect(formilyAntdPrefixCls).toBe('tap')
    expect(formilyDifyTheme.token).toMatchObject({
      borderRadius: 8,
      colorBgContainer: 'var(--color-components-input-bg-normal)',
      colorBorder: 'transparent',
      colorPrimary: 'var(--color-text-accent)',
      colorText: 'var(--color-text-primary)',
      controlOutline: 'color-mix(in srgb, var(--color-state-accent-solid) 20%, transparent)',
    })
  })

  it('renders Formily radio groups with the vendored Dify segmented control', async () => {
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

    const group = container.querySelector<HTMLElement>('[role="radiogroup"][aria-label="Strategy"]')
    expect(group?.className).toContain('components-segmented-control-bg-normal')

    const options = [...(group?.querySelectorAll<HTMLButtonElement>('[role="radio"]') ?? [])]
    expect(options.map((option) => option.textContent)).toEqual(['Balanced', 'Fast'])
    expect(options[0]?.getAttribute('aria-checked')).toBe('true')
    expect(options[1]?.getAttribute('aria-checked')).toBe('false')

    await act(async () => options[1]?.click())

    expect(changes.at(-1)).toMatchObject({ strategy: 'fast' })
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

  it('renders tag-gated TLS and SSH fields and reads certificate files as base64', async () => {
    const specText = JSON.stringify({
      properties: { tags: ['ssl', 'ssh'] },
      configOptions: {
        connection: { type: 'object', properties: { host: { type: 'string' } } },
      },
    })
    const fields = connectorSpecConfigFields(specText, [], 'en')
    const changes: Array<Record<string, unknown>> = []
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    await act(async () => {
      root?.render(
        <ConnectorFormily
          fields={fields}
          schema={connectorSpecConnectionSchema(specText, 'en')}
          initialValues={createInitialConfig(fields)}
          resetKey="tagged-tls-ssh"
          onValuesChange={(values) => changes.push(values)}
        />,
      )
    })

    expect(container.textContent).toContain('TLS settings')
    expect(container.textContent).toContain('SSH tunnel')
    expect(container.querySelector('[aria-label="SSH host"]')).not.toBeNull()

    const tlsToggle = fieldControl('Use TLS')
    expect(tlsToggle?.getAttribute('aria-checked')).toBe('false')
    const tlsFieldSelectors = [
      'input[type="file"][aria-label="CA certificate"]',
      'input[type="file"][aria-label="Client certificate"]',
      'input[type="file"][aria-label="Client key"]',
      'input[aria-label="Client key password"]',
    ]
    expect(tlsFieldSelectors.map((selector) => container!.querySelector(selector))).toEqual([
      null,
      null,
      null,
      null,
    ])

    await act(async () => {
      tlsToggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(
      tlsFieldSelectors.map((selector) => container!.querySelector(selector) !== null),
    ).toEqual([true, true, true, true])
    const input = container.querySelector<HTMLInputElement>(
      'input[type="file"][aria-label="CA certificate"]',
    )
    expect(input).not.toBeNull()
    const file = new File(['cert'], 'ca.pem', { type: 'application/x-pem-file' })
    Object.defineProperty(input, 'files', { configurable: true, value: [file] })
    await act(async () => {
      input?.dispatchEvent(new Event('change', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 30))
    })

    expect(changes.at(-1)).toMatchObject({
      sslCa: 'Y2VydA==',
      sslCAFile: 'ca.pem',
    })

    await act(async () => {
      tlsToggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(tlsFieldSelectors.map((selector) => container!.querySelector(selector))).toEqual([
      null,
      null,
      null,
      null,
    ])
  })

  it('emits the companion filename when replacing a configured private key', async () => {
    const specText = JSON.stringify({
      properties: { tags: ['ssl'] },
      configOptions: { connection: { type: 'object', properties: {} } },
    })
    const fields = connectorSpecConfigFields(specText, [], 'en')
    const changes: Array<Record<string, unknown>> = []
    const secretChanges: Array<{ name: string; action: string; value: string }> = []
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    await act(async () => {
      root?.render(
        <ConnectorFormily
          fields={fields}
          schema={connectorSpecConnectionSchema(specText, 'en')}
          initialValues={{ ...createInitialConfig(fields), sslKeyFile: 'old-client.key' }}
          resetKey="configured-key-filename"
          configuredSecrets={['sslKey']}
          secretDrafts={{ sslKey: { action: 'replace', value: '' } }}
          onValuesChange={(values) => changes.push(values)}
          onSecretChange={(name, draft) => secretChanges.push({ name, ...draft })}
        />,
      )
    })

    await act(async () => {
      fieldControl('Use TLS')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const input = container.querySelector<HTMLInputElement>(
      'input[type="file"][aria-label="Client key"]',
    )
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [new File(['private-key'], 'new-client.key')],
    })
    await act(async () => {
      input?.dispatchEvent(new Event('change', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 30))
    })

    expect(secretChanges).toEqual([
      { name: 'sslKey', action: 'replace', value: 'cHJpdmF0ZS1rZXk=' },
    ])
    expect(changes.at(-1)).toMatchObject({ sslKeyFile: 'new-client.key' })
  })

  it('does not let a pending key upload override a later clear action', async () => {
    const pendingReaders: FileReader[] = []
    vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(function (this: FileReader) {
      pendingReaders.push(this)
    })
    const specText = JSON.stringify({
      properties: { tags: ['ssl'] },
      configOptions: { connection: { type: 'object', properties: {} } },
    })
    const fields = connectorSpecConfigFields(specText, [], 'en')
    const secretChanges: Array<{ name: string; action: string; value: string }> = []
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    await act(async () => {
      root?.render(
        <ConnectorFormily
          fields={fields}
          schema={connectorSpecConnectionSchema(specText, 'en')}
          resetKey="configured-key-pending-read"
          initialValues={createInitialConfig(fields)}
          configuredSecrets={['sslKey']}
          secretDrafts={{ sslKey: { action: 'replace', value: '' } }}
          onSecretChange={(name, draft) => secretChanges.push({ name, ...draft })}
        />,
      )
    })

    await act(async () => {
      fieldControl('Use TLS')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const input = container.querySelector<HTMLInputElement>(
      'input[type="file"][aria-label="Client key"]',
    )
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [new File(['private-key'], 'client.key')],
    })
    await act(async () => {
      input?.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(pendingReaders).toHaveLength(1)

    await act(async () => {
      const clearButton = [
        ...(container?.querySelectorAll<HTMLButtonElement>('button') ?? []),
      ].find((button) => button.textContent?.includes('Clear secret'))
      clearButton?.click()
    })
    expect(secretChanges).toEqual([{ name: 'sslKey', action: 'clear', value: '' }])

    await act(async () => {
      const reader = pendingReaders[0]
      if (reader) {
        Object.defineProperty(reader, 'result', {
          configurable: true,
          value: 'data:application/octet-stream;base64,cHJpdmF0ZS1rZXk=',
        })
        reader.dispatchEvent(new ProgressEvent('load'))
      }
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(secretChanges).toEqual([{ name: 'sslKey', action: 'clear', value: '' }])
  })

  it('reads text files as text and rejects files over the declared size limit', async () => {
    const fileFields: ConnectorConfigField[] = [
      {
        name: 'notes',
        type: 'string',
        label: 'Notes file',
        required: false,
        defaultValue: null,
        secret: false,
        options: [],
        visibleWhen: null,
      },
      {
        name: 'notesFile',
        type: 'string',
        label: 'Notes file name',
        required: false,
        defaultValue: null,
        secret: false,
        options: [],
        visibleWhen: null,
      },
    ]
    const changes: Array<Record<string, unknown>> = []
    const schema = {
      type: 'object',
      properties: {
        notes: {
          type: 'string',
          title: 'Notes file',
          'x-decorator': 'FormItem',
          'x-component': 'TextFileReader',
          'x-component-props': { accept: 'text/*', maxFileSize: 1 },
          fileNameField: 'notesFile',
        },
      },
    } as ISchema
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    await act(async () => {
      root?.render(
        <ConnectorFormily
          fields={fileFields}
          schema={schema}
          resetKey="text-file-reader"
          initialValues={{ notes: '', notesFile: '' }}
          onValuesChange={(values) => changes.push(values)}
        />,
      )
    })

    const input = container.querySelector<HTMLInputElement>('input[type="file"]')
    expect(input?.accept).toBe('text/*')
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [new File(['x'.repeat(1025)], 'too-big.txt')],
    })
    await act(async () => {
      input?.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(container.textContent).toContain('Choose a file smaller than 1 KB.')

    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [new File(['hello'], 'notes.txt', { type: 'text/plain' })],
    })
    await act(async () => {
      input?.dispatchEvent(new Event('change', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 30))
    })

    expect(changes.at(-1)).toMatchObject({ notes: 'hello', notesFile: 'notes.txt' })
  })

  it('keeps the previous file value when FileReader reports a read failure', async () => {
    vi.spyOn(FileReader.prototype, 'readAsText').mockImplementation(function (this: FileReader) {
      queueMicrotask(() => this.dispatchEvent(new ProgressEvent('error')))
    })
    const fileFields: ConnectorConfigField[] = [
      {
        name: 'notes',
        type: 'string',
        label: 'Notes file',
        required: false,
        defaultValue: null,
        secret: false,
        options: [],
        visibleWhen: null,
      },
      {
        name: 'notesFile',
        type: 'string',
        label: 'Notes file name',
        required: false,
        defaultValue: null,
        secret: false,
        options: [],
        visibleWhen: null,
      },
    ]
    const changes: Array<Record<string, unknown>> = []
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    await act(async () => {
      root?.render(
        <ConnectorFormily
          fields={fileFields}
          schema={
            {
              type: 'object',
              properties: {
                notes: {
                  type: 'string',
                  title: 'Notes file',
                  'x-decorator': 'FormItem',
                  'x-component': 'TextFileReader',
                  fileNameField: 'notesFile',
                },
              },
            } as ISchema
          }
          resetKey="text-file-reader-error"
          initialValues={{ notes: 'saved contents', notesFile: 'saved.txt' }}
          onValuesChange={(values) => changes.push(values)}
        />,
      )
    })

    const input = container.querySelector<HTMLInputElement>('input[type="file"]')
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [new File(['replacement'], 'replacement.txt', { type: 'text/plain' })],
    })
    await act(async () => {
      input?.dispatchEvent(new Event('change', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(container.textContent).toContain('The file could not be read. Try another file.')
    expect(container.textContent).toContain('File ready')
    expect(changes).toEqual([])
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
