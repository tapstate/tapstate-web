import '@/i18n/index'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { TableTransformsManager, type TransformStep } from './TableTransformsManager'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let root: Root | undefined
let container: HTMLDivElement | undefined

afterEach(async () => {
  await act(async () => root?.unmount())
  container?.remove()
  root = undefined
  container = undefined
})

describe('wizard transform picker', () => {
  it('offers publishable transforms and seeds a runnable JavaScript step', async () => {
    const onChange = vi.fn<(steps: TransformStep[]) => void>()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () =>
      root?.render(
        <TableTransformsManager
          tableName="orders"
          columns={[]}
          transforms={[]}
          onChange={onChange}
        />,
      ),
    )

    await act(async () => container?.querySelector('button')?.click())
    const choices = Array.from(container.querySelectorAll('button'))
    expect(choices.some((button) => button.textContent?.includes('Union'))).toBe(false)
    expect(choices.some((button) => button.textContent?.includes('Unwind'))).toBe(true)

    const javascript = choices.find((button) => button.textContent?.includes('JavaScript'))
    expect(javascript).toBeDefined()
    await act(async () => javascript?.click())

    const created = onChange.mock.lastCall?.[0]?.[0]
    expect(created?.type).toBe('js')
    expect(created?.config.js?.script).toContain('function process(record, ctx)')
  })

  it('configures additional union inputs on top of the current stream', async () => {
    const onChange = vi.fn<(steps: TransformStep[]) => void>()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () =>
      root?.render(
        <TableTransformsManager
          tableName="orders"
          columns={[]}
          transforms={[
            { id: 'merge-orders', name: 'Union', type: 'union', config: { union: { from: [] } } },
          ]}
          availableUnionInputs={[
            { reference: 'warehouse.archive_orders', label: 'Warehouse · archive_orders' },
            { reference: 'crm.priority_orders', label: 'CRM · priority_orders' },
          ]}
          onChange={onChange}
        />,
      ),
    )

    const archiveOrders = container.querySelector<HTMLInputElement>(
      'input[type="checkbox"][value="warehouse.archive_orders"]',
    )
    expect(archiveOrders).toBeDefined()
    await act(async () => archiveOrders?.click())
    expect(onChange.mock.lastCall?.[0]?.[0]?.config.union?.from).toEqual([
      'warehouse.archive_orders',
    ])
    expect(container.textContent).toContain('Current pipeline output')
    expect(container.textContent).toContain('orders')
    expect(container.textContent).toContain('Warehouse · archive_orders')
  })

  it('creates a union step with an empty additional-input list', async () => {
    const onChange = vi.fn<(steps: TransformStep[]) => void>()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () =>
      root?.render(
        <TableTransformsManager
          tableName="orders"
          columns={[]}
          transforms={[]}
          availableUnionInputs={[
            { reference: 'warehouse.archive_orders', label: 'Warehouse · archive_orders' },
          ]}
          onChange={onChange}
        />,
      ),
    )

    await act(async () => container?.querySelector('button')?.click())
    const union = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Union'),
    )
    await act(async () => union?.click())

    expect(onChange.mock.lastCall?.[0]?.[0]).toMatchObject({
      type: 'union',
      config: { union: { from: [] } },
    })
  })

  it('shows and preserves configured inputs from an existing union draft', async () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () =>
      root?.render(
        <TableTransformsManager
          tableName="orders"
          columns={[]}
          transforms={[
            {
              id: 'saved-union',
              name: 'Union',
              type: 'union',
              config: { union: { from: ['warehouse.archive_orders'] } },
            },
          ]}
          availableUnionInputs={[
            { reference: 'warehouse.archive_orders', label: 'Warehouse · archive_orders' },
          ]}
          onChange={vi.fn()}
        />,
      ),
    )

    expect(
      container.querySelector<HTMLInputElement>(
        'input[type="checkbox"][value="warehouse.archive_orders"]',
      )?.checked,
    ).toBe(true)
    expect(container.textContent).not.toContain('Union needs explicit multi-stream references')
  })
})
