// @vitest-environment jsdom

import { createForm } from '@formily/core'
import { connect, mapProps, observer, useField } from '@formily/react'
import { act, type ReactNode, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { FormilySchema, useFormilyForm } from './index'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let root: Root | undefined
let container: HTMLDivElement | undefined

const Input = connect(
  ({ value, onChange }: { value?: unknown; onChange?: (value: string) => void }) => (
    <input
      value={typeof value === 'string' ? value : ''}
      onChange={(event) => onChange?.(event.target.value)}
    />
  ),
  mapProps((props, field) => ({
    ...props,
    value: (field as any).value,
    onChange: (field as any).onInput,
  })),
)

const FormItem = observer(function FormItem({ children }: { children?: ReactNode }) {
  const field = useField<any>()
  return (
    <label>
      <span>{field.title}</span>
      {children}
    </label>
  )
})

afterEach(async () => {
  await act(async () => root?.unmount())
  container?.remove()
  root = undefined
  container = undefined
})

describe('FormilySchema', () => {
  it('uses an injected component map and keeps values in the Formily form', async () => {
    const form = createForm({ initialValues: { host: 'db.local' } })
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    await act(async () => {
      root?.render(
        <FormilySchema
          form={form}
          components={{ FormItem, Input }}
          schema={{
            type: 'object',
            properties: {
              host: {
                type: 'string',
                title: 'Host',
                required: true,
                'x-decorator': 'FormItem',
                'x-component': 'Input',
              },
            },
          }}
        />,
      )
    })

    const input = container.querySelector('input')
    expect(container.textContent).toContain('Host')
    expect(container.firstElementChild?.getAttribute('class')).toBeNull()
    expect(input).toBeInstanceOf(HTMLInputElement)
    expect((input as HTMLInputElement).value).toBe('db.local')

    const setNativeValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    await act(async () => {
      setNativeValue?.call(input, 'db.internal')
      input?.dispatchEvent(new Event('input', { bubbles: true }))
    })

    expect(form.values).toMatchObject({ host: 'db.internal' })
  })

  it('does not notify React state setters while an array field is rendering', async () => {
    const ArrayInput = connect(
      ({ value }: { value?: unknown }) => (
        <textarea value={Array.isArray(value) ? JSON.stringify(value) : ''} readOnly />
      ),
      mapProps((props, field) => ({ ...props, value: (field as any).value })),
    )
    const Harness = () => {
      const [, setValues] = useState<Record<string, unknown>>({})
      const form = useFormilyForm({
        initialValues: { schemas: ['public'] },
        onValuesChange: setValues,
      })
      return (
        <FormilySchema
          form={form}
          components={{ ArrayItems: ArrayInput }}
          schema={{
            type: 'object',
            properties: {
              schemas: { type: 'array', 'x-component': 'ArrayItems' },
            },
          }}
        />
      )
    }

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    await act(async () => {
      root?.render(<Harness />)
    })

    expect(
      consoleError.mock.calls.some(([message]) =>
        String(message).includes('Cannot update a component'),
      ),
    ).toBe(false)
    consoleError.mockRestore()
  })
})
