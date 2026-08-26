import '@/i18n/index'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'

import type { TransformEditorProps } from './types'

import { TransformEditor } from './transform-editor'

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.assign(globalThis, {
  IS_REACT_ACT_ENVIRONMENT: true,
  ResizeObserver: ResizeObserverMock,
})

let root: Root | undefined
let container: HTMLDivElement | undefined

afterEach(async () => {
  await act(async () => root?.unmount())
  container?.remove()
  root = undefined
  container = undefined
})

function renderEditor(props: TransformEditorProps) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  act(() => root?.render(<TransformEditor {...props} />))
  return container
}

function inputValues(label: string) {
  return [
    ...(container?.querySelectorAll<HTMLInputElement>(`input[aria-label="${label}"]`) ?? []),
  ].map((input) => input.value)
}

function setInput(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const prototype =
    input instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set
  act(() => {
    setter?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

const base = {
  kind: 'transform',
  nodeId: 'transform:step',
  stepId: 'step',
  options: null,
  from: ['source'],
} as const

describe('TransformEditor', () => {
  it('renders and updates multiple filter conditions without losing OR logic', () => {
    const changes: Array<{ body?: Record<string, unknown>; from?: unknown }> = []
    const host = renderEditor({
      config: {
        ...base,
        transformType: 'filter',
        body: { expr: 'active == true OR name.contains("Ada")' },
      },
      onChange: (patch) => changes.push(patch),
    })

    expect(inputValues('Field')).toEqual(['active', 'name'])
    expect(inputValues('Value')).toEqual(['true', 'Ada'])

    const values = [...host.querySelectorAll<HTMLInputElement>('input[aria-label="Value"]')]
    setInput(values[1]!, 'Grace')

    expect(changes.at(-1)).toEqual({ body: { expr: 'active == "true" OR name.contains("Grace")' } })
  })

  it('keeps one editable filter row after removing the last condition', () => {
    const host = renderEditor({
      config: { ...base, transformType: 'filter', body: { expr: 'active == "true"' } },
    })

    const remove = host.querySelector<HTMLButtonElement>('button[aria-label="Remove condition"]')
    act(() => remove?.click())

    expect(host.querySelectorAll('input[aria-label="Field"]')).toHaveLength(1)
    expect(host.querySelector<HTMLInputElement>('input[aria-label="Field"]')?.value).toBe('')
  })

  it('serializes map field rules using the DSL value forms', () => {
    const changes: Array<Record<string, unknown>> = []
    const host = renderEditor({
      config: {
        ...base,
        transformType: 'map',
        body: {
          fields: {
            customer: '$customerId',
            removed: false,
            computed: '=amount * rate',
            literal: 'fixed',
          },
        },
      },
      onChange: (patch) => changes.push(patch.body ?? {}),
    })

    expect(inputValues('Source field or expression')).toEqual([
      'customerId',
      '',
      'amount * rate',
      'fixed',
    ])
    const source = host.querySelector<HTMLInputElement>(
      'input[aria-label="Source field or expression"]',
    )
    setInput(source!, 'accountId')

    expect(changes.at(-1)).toMatchObject({
      fields: {
        customer: '$accountId',
        removed: false,
        computed: '=amount * rate',
        literal: 'fixed',
      },
    })
  })

  it('edits join aliases while preserving the SQL body contract', () => {
    const changes: Array<{ body?: Record<string, unknown>; from?: unknown }> = []
    const host = renderEditor({
      config: {
        ...base,
        transformType: 'join',
        from: { orders: 'orders', users: 'users' },
        body: { engine: 'duckdb', sql: 'select *' },
      },
      onChange: (patch) => changes.push(patch),
    })

    const alias = host.querySelector<HTMLInputElement>('input[aria-label="Input alias"]')
    setInput(alias!, 'order_rows')

    expect(changes.at(-1)).toMatchObject({
      body: { engine: 'duckdb', sql: 'select *' },
      from: { order_rows: 'orders', users: 'users' },
    })
  })

  it('uses the nested root and snake_case nest settings', () => {
    const changes: Array<Record<string, unknown>> = []
    const host = renderEditor({
      config: {
        ...base,
        transformType: 'nest',
        body: {
          primary_key: 'id',
          order: 'main_first',
          entries_in_memory: 100,
          max_elements_per_document: 20,
          root: {
            from: 'orders',
            key: ['id'],
            mode: 'upsert',
            embed: [{ from: 'items', on: { order_id: 'id' }, as: 'array', path: 'items' }],
          },
        },
      },
      onChange: (patch) => changes.push(patch.body ?? {}),
    })

    expect(host.querySelector<HTMLInputElement>('input[aria-label="Root stream"]')?.value).toBe(
      'orders',
    )
    const primaryKey = host.querySelector<HTMLInputElement>('input[aria-label="Primary key"]')
    setInput(primaryKey!, 'order_id')

    expect(changes.at(-1)).toMatchObject({
      primary_key: 'order_id',
      order: 'main_first',
      entries_in_memory: 100,
      max_elements_per_document: 20,
      root: {
        from: 'orders',
        key: ['id'],
        mode: 'upsert',
        embed: [{ from: 'items', on: { order_id: 'id' }, as: 'array', path: 'items' }],
      },
    })
  })

  it('does not emit NaN when a nest capacity is edited with an invalid value', () => {
    const changes: Array<Record<string, unknown>> = []
    const host = renderEditor({
      config: {
        ...base,
        transformType: 'nest',
        body: { entries_in_memory: 100, max_elements_per_document: 20 },
      },
      onChange: (patch) => changes.push(patch.body ?? {}),
    })

    const capacity = host.querySelector<HTMLInputElement>('input[aria-label="Entries in memory"]')
    setInput(capacity!, '10.5')

    expect(host.textContent).toContain('Use a whole number or leave this field empty.')
    expect(changes).toHaveLength(0)
  })

  it('updates union branches and exposes inputs in the editor shell', () => {
    const changes: Array<unknown> = []
    const host = renderEditor({
      config: { ...base, transformType: 'union', from: ['orders', 'returns'], body: {} },
      onChange: (patch) => changes.push(patch.from),
    })

    expect(host.textContent).toContain('orders')
    expect(host.textContent).toContain('returns')
    const branches = [
      ...host.querySelectorAll<HTMLInputElement>('input[aria-label="Input branch"]'),
    ]
    setInput(branches[1]!, 'refunds')

    expect(changes.at(-1)).toEqual(['orders', 'refunds'])
  })

  it('initializes JavaScript language from body.engine', () => {
    const host = renderEditor({
      config: {
        ...base,
        transformType: 'js',
        body: { engine: 'typescript', script: 'return record' },
      },
    })

    expect(host.textContent).toContain('TypeScript')
    expect(host.querySelector<HTMLTextAreaElement>('textarea[aria-label="Script"]')?.value).toBe(
      'return record',
    )
  })

  it('round-trips valid JSON for an unknown transform', () => {
    const changes: Array<Record<string, unknown>> = []
    const host = renderEditor({
      config: { ...base, transformType: 'custom', body: { mode: 'strict' } },
      onChange: (patch) => changes.push(patch.body ?? {}),
    })

    const editor = host.querySelector<HTMLTextAreaElement>('textarea')
    setInput(editor!, '{"mode":"lenient"}')

    expect(changes.at(-1)).toEqual({ mode: 'lenient' })
  })
})
