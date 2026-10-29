import '@/i18n/index'
import { act, useState } from 'react'
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
  it('shows a default source identity name and lets an author restore it after customization', async () => {
    const onChange = vi.fn<(steps: TransformStep[]) => void>()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    const steps: TransformStep[] = [
      {
        id: 'tags',
        name: 'Unwind',
        type: 'unwind',
        isExpanded: true,
        config: { unwind: { path: 'TAGS', include_array_index: 'TAG_NO' } },
      },
    ]
    await act(async () =>
      root?.render(
        <TableTransformsManager
          tableName="orders"
          columns={['_id', 'TAGS']}
          transforms={steps}
          onChange={onChange}
        />,
      ),
    )
    const input = container.querySelector<HTMLInputElement>('details input')
    expect(input?.value).toBe('_unwind_source_id')
    expect(input?.getAttribute('aria-describedby')).toBeTruthy()
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    await act(async () => {
      setter?.call(input, 'original_order_id')
      input?.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(onChange.mock.lastCall?.[0]?.[0]?.config.unwind?.source_id_field).toBe(
      'original_order_id',
    )
    await act(async () => container?.querySelector<HTMLButtonElement>('details button')?.click())
    expect(onChange.mock.lastCall?.[0]?.[0]?.config.unwind?.source_id_field).toBe(
      '_unwind_source_id',
    )
  })

  it('shows the inherited name and restores an explicit default for successive unwinds', async () => {
    const onChange = vi.fn<(steps: TransformStep[]) => void>()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    const steps: TransformStep[] = [
      {
        id: 'first',
        name: 'Unwind',
        type: 'unwind',
        isExpanded: true,
        config: {
          unwind: { path: 'items', include_array_index: 'position', source_id_field: 'parent_id' },
        },
      },
      {
        id: 'second',
        name: 'Unwind',
        type: 'unwind',
        isExpanded: true,
        config: { unwind: { path: 'nested', include_array_index: 'nested_position' } },
      },
    ]
    await act(async () =>
      root?.render(
        <TableTransformsManager
          tableName="orders"
          columns={['_id', 'items', 'nested']}
          transforms={steps}
          onChange={onChange}
        />,
      ),
    )
    expect(
      Array.from(container.querySelectorAll<HTMLInputElement>('details input')).map(
        (input) => input.value,
      ),
    ).toEqual(['parent_id', 'parent_id'])
    await act(async () =>
      container?.querySelectorAll<HTMLButtonElement>('details button')[1]?.click(),
    )
    const updated = onChange.mock.lastCall?.[0]
    expect(updated?.[0]?.config.unwind?.source_id_field).toBe('parent_id')
    expect(updated?.[1]?.config.unwind?.source_id_field).toBe('_unwind_source_id')
  })

  it('keeps the Unwind preserve-empty description clickable after migrating its checkbox', async () => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const changed = vi.fn()
    await act(async () =>
      root?.render(
        <TableTransformsManager
          tableName="orders"
          columns={['items']}
          transforms={[
            {
              id: 'unwind',
              name: 'Unwind',
              type: 'unwind',
              isExpanded: true,
              config: { unwind: { path: 'items' } },
            },
          ]}
          onChange={changed}
        />,
      ),
    )
    const label = [...container.querySelectorAll<HTMLLabelElement>('label[for]')].find((element) =>
      element.textContent?.includes('Preserve empty arrays'),
    )!
    expect(label).toBeDefined()
    await act(async () => label.click())
    expect(changed.mock.lastCall?.[0][0].config.unwind.preserve_null_and_empty_arrays).toBe(true)
  })

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
    const union = choices.find((button) => button.textContent?.includes('Union'))
    expect(union).toBeDefined()
    expect(union?.disabled).toBe(true)
    expect(container.querySelector('[role="status"]')?.textContent).toContain(
      'No additional source tables are available for this Union.',
    )
    expect(choices.some((button) => button.textContent?.includes('Unwind'))).toBe(true)

    const javascript = choices.find((button) => button.textContent?.includes('JavaScript'))
    expect(javascript).toBeDefined()
    await act(async () => javascript?.click())

    const created = onChange.mock.lastCall?.[0]?.[0]
    expect(created?.type).toBe('js')
    expect(created?.name).toBe('JavaScript')
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
            {
              reference: 'warehouse.archive_orders',
              label: 'Warehouse · archive_orders',
              sourceId: 'warehouse',
              sourceName: 'Warehouse',
              connectorId: 'mysql',
              tableName: 'archive_orders',
            },
            {
              reference: 'crm.priority_orders',
              label: 'CRM · priority_orders',
              sourceId: 'crm',
              sourceName: 'CRM',
              connectorId: 'mongodb',
              tableName: 'priority_orders',
            },
          ]}
          onChange={onChange}
        />,
      ),
    )

    const archiveOrders = container.querySelector<HTMLElement>(
      '[data-union-input="warehouse.archive_orders"]',
    )
    expect(archiveOrders).not.toBeNull()
    await act(async () => archiveOrders?.click())
    expect(onChange.mock.lastCall?.[0]?.[0]?.config.union?.from).toEqual([
      'warehouse.archive_orders',
    ])
    expect(container.textContent).toContain('archive_orders')
    expect(container.querySelector('[data-union-selected="warehouse.archive_orders"]')).toBeNull()
  })

  it('keeps the step name in the card header and hides the internal DSL ID', async () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () =>
      root?.render(
        <TableTransformsManager
          tableName="orders"
          columns={['status']}
          transforms={[
            {
              id: 'internal-filter-id',
              name: 'Keep active orders',
              type: 'filter',
              isExpanded: true,
              config: { filter: { expr: "after.status == 'ACTIVE'" } },
            },
          ]}
          onChange={vi.fn()}
        />,
      ),
    )

    const header = container.querySelector('[data-transform-header]')
    expect(header?.querySelector<HTMLInputElement>('input[aria-label="Step name"]')?.value).toBe(
      'Keep active orders',
    )
    expect(container.textContent).not.toContain('#1')
    expect(container.textContent).not.toContain('System DSL ID')
    expect(container.querySelector('input[value="internal-filter-id"]')).toBeNull()
  })

  it('toggles from the header while name editing and action buttons keep their own behavior', async () => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const changed = vi.fn()
    function Harness() {
      const [steps, setSteps] = useState<TransformStep[]>([
        {
          id: 'filter',
          name: 'filter',
          type: 'filter',
          isExpanded: false,
          config: { filter: { expr: '' } },
        },
      ])
      return (
        <TableTransformsManager
          tableName="customers"
          columns={['status']}
          transforms={steps}
          onChange={(next) => {
            changed(next)
            setSteps(next)
          }}
        />
      )
    }
    await act(async () => root?.render(<Harness />))
    const header = container.querySelector<HTMLElement>('[data-transform-header]')!
    await act(async () => header.click())
    expect(changed.mock.lastCall?.[0][0].isExpanded).toBe(true)
    const name = header.querySelector<HTMLInputElement>('input[aria-label="Step name"]')!
    expect(name.value).toBe('Filter')
    changed.mockClear()
    await act(async () => name.click())
    expect(changed).not.toHaveBeenCalled()
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
        name,
        'Keep active customers',
      )
      name.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(changed.mock.lastCall?.[0][0]).toMatchObject({
      name: 'Keep active customers',
      isExpanded: true,
    })
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(name, '')
      name.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(name.value).toBe('')
    await act(async () => name.dispatchEvent(new FocusEvent('focusout', { bubbles: true })))
    expect(changed.mock.lastCall?.[0][0].name).toBe('Filter')
    await act(async () =>
      header.querySelector<HTMLButtonElement>('[aria-label="Collapse step"]')?.click(),
    )
    expect(changed.mock.lastCall?.[0][0].isExpanded).toBe(false)
  })

  it('places the transform chooser after the existing step cards', async () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () =>
      root?.render(
        <TableTransformsManager
          tableName="orders"
          columns={['status']}
          transforms={[
            {
              id: 'existing-filter',
              name: 'Keep active orders',
              type: 'filter',
              isExpanded: false,
              config: { filter: { expr: "after.status == 'ACTIVE'" } },
            },
          ]}
          availableUnionInputs={[]}
          onChange={vi.fn()}
        />,
      ),
    )

    const host = container!
    await act(async () =>
      Array.from(host.querySelectorAll('button'))
        .find((button) => button.textContent?.includes('Add next transform'))
        ?.click(),
    )

    const step = host.querySelector('[data-transform-id="existing-filter"]')
    const picker = host.querySelector('[data-transform-picker]')
    expect(step).not.toBeNull()
    expect(picker).not.toBeNull()
    expect(Boolean(step!.compareDocumentPosition(picker!) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(
      true,
    )
  })

  it('uses shared searchable and Select controls for transform choices', async () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () =>
      root?.render(
        <TableTransformsManager
          tableName="orders"
          columns={['status', 'items']}
          transforms={[
            {
              id: 'filter-id',
              name: 'Filter active',
              type: 'filter',
              isExpanded: true,
              config: { filter: { expr: '' } },
            },
            {
              id: 'map-id',
              name: 'Rename fields',
              type: 'map',
              isExpanded: true,
              config: {
                map: {
                  fields: [
                    {
                      id: 'map-status',
                      outputField: 'status_copy',
                      ruleType: 'rename',
                      value: '$status',
                    },
                  ],
                  passthroughUnlisted: true,
                },
              },
            },
            {
              id: 'unwind-id',
              name: 'Expand items',
              type: 'unwind',
              isExpanded: true,
              config: { unwind: { path: 'items' } },
            },
          ]}
          onChange={vi.fn()}
        />,
      ),
    )

    expect(container.querySelector('select')).toBeNull()
    expect(container.querySelectorAll('[data-wizard-search-control]').length).toBeGreaterThan(0)
    expect(container.querySelector('[aria-label="Array field to expand (path)"]')).not.toBeNull()
    expect(container.querySelector('[aria-label="Rule type"]')).toBeNull()
    expect(container.querySelector('[data-map-operation="rename"]')).not.toBeNull()
    expect(container.textContent).toContain('Delete fields')
  })

  it('shows the first Filter condition immediately and keeps unfinished rows out of CEL', async () => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const changed = vi.fn()
    function Harness() {
      const [steps, setSteps] = useState<TransformStep[]>([
        { id: 'filter', name: 'Filter', type: 'filter', config: { filter: { expr: '' } } },
      ])
      return (
        <TableTransformsManager
          tableName="customers"
          columns={['status']}
          transforms={steps}
          onChange={(next) => {
            changed(next)
            setSteps(next)
          }}
        />
      )
    }
    await act(async () => root?.render(<Harness />))
    const field = container.querySelector<HTMLInputElement>('[aria-label="Field"]')!
    expect(field).not.toBeNull()
    expect(container.querySelectorAll('.wizard-filter-condition')).toHaveLength(1)
    await act(async () =>
      container?.querySelector<HTMLButtonElement>('[data-wizard-search-trigger]')?.click(),
    )
    const option = [...document.body.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (item) => item.textContent?.includes('status'),
    )!
    await act(async () => option.click())
    expect(field.value).toBe('status')
    expect(changed.mock.lastCall?.[0][0].config.filter.expr).toBe('')
    const value = [
      ...container.querySelectorAll<HTMLInputElement>('.wizard-filter-condition input[aria-label]'),
    ].find((element) => element.getAttribute('aria-label') !== 'Field')!
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
        value,
        'ACTIVE',
      )
      value.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(changed.mock.lastCall?.[0][0].config.filter.expr).toBe('after.status == "ACTIVE"')
    const add = [...container.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Add filter condition'),
    )!
    await act(async () => add.click())
    expect(container.querySelectorAll('.wizard-filter-condition')).toHaveLength(2)
    expect(changed.mock.lastCall?.[0][0].config.filter.expr).toBe('after.status == "ACTIVE"')
  })

  it('offers direct Map operations immediately after adding an empty Map', async () => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    function Harness() {
      const [steps, setSteps] = useState<TransformStep[]>([
        { id: 'map', name: 'Map', type: 'map', isExpanded: true, config: { map: { fields: [] } } },
      ])
      return (
        <TableTransformsManager
          tableName="customers"
          columns={['name']}
          transforms={steps}
          onChange={setSteps}
        />
      )
    }
    await act(async () => root?.render(<Harness />))
    const operation = [...container.querySelectorAll<HTMLButtonElement>('button')].find(
      (item) => item.textContent?.trim() === 'Delete fields',
    )
    expect(operation).toBeDefined()
    await act(async () => operation!.click())
    expect(container.querySelector('[role="combobox"][aria-label="Delete fields"]')).not.toBeNull()
  })

  it('retains an unsupported raw expression instead of displaying empty visual conditions', async () => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const changed = vi.fn()
    await act(async () =>
      root?.render(
        <TableTransformsManager
          tableName="customers"
          columns={['status']}
          transforms={[
            {
              id: 'filter',
              name: 'Filter',
              type: 'filter',
              config: { filter: { expr: 'size(after.items) > 3', isRawCel: true } },
            },
          ]}
          onChange={changed}
        />,
      ),
    )
    const toggle = [...container.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('visual conditions'),
    )!
    await act(async () => toggle.click())
    expect(container.querySelector('textarea')?.value).toBe('size(after.items) > 3')
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      'cannot be represented',
    )
    expect(changed).not.toHaveBeenCalled()
  })

  it('keeps the Unwind path editable when no source schema is available', async () => {
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
              id: 'unwind-id',
              name: 'Expand items',
              type: 'unwind',
              isExpanded: true,
              config: { unwind: { path: 'items' } },
            },
          ]}
          onChange={vi.fn()}
        />,
      ),
    )

    const path = container.querySelector<HTMLInputElement>(
      'input[aria-label="Array field to expand (path)"]',
    )
    expect(path?.value).toBe('items')
    expect(path?.disabled).toBe(false)
    expect(path?.hasAttribute('data-wizard-search-control')).toBe(false)
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
            {
              id: 'saved-union',
              name: 'Union',
              type: 'union',
              config: { union: { from: ['warehouse.archive_orders'] } },
            },
          ]}
          availableUnionInputs={[
            { reference: 'warehouse.archive_orders', label: 'Warehouse · archive_orders' },
            { reference: 'crm.priority_orders', label: 'CRM · priority_orders' },
          ]}
          onChange={onChange}
        />,
      ),
    )

    expect(
      container.querySelector('[data-union-selected="warehouse.archive_orders"]'),
    ).not.toBeNull()
    expect(container.textContent).not.toContain('Union needs explicit multi-stream references')
    expect(container.textContent).not.toContain('Current pipeline output')
    expect(container.textContent).toContain('Selected input tables')
    expect(container.querySelector('.connector-icon')).not.toBeNull()
    expect(
      container.querySelector(
        'button[aria-label="Remove Warehouse · archive_orders from Union inputs"]',
      ),
    ).not.toBeNull()

    const search = container.querySelector<HTMLInputElement>(
      'input[aria-label="Search Union inputs"]',
    )
    expect(search).not.toBeNull()
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    await act(async () => {
      setter?.call(search, 'CRM')
      search?.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(container.querySelectorAll('[data-union-input]')).toHaveLength(1)
    expect(container.querySelector('[data-union-input="crm.priority_orders"]')).not.toBeNull()

    const remove = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Remove Warehouse · archive_orders from Union inputs"]',
    )
    await act(async () => remove?.click())
    expect(onChange.mock.lastCall?.[0]?.[0]?.config.union?.from).toEqual([])
  })
})
