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

  it('warns when an existing wizard draft contains a Union step', async () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () =>
      root?.render(
        <TableTransformsManager
          tableName="orders"
          columns={[]}
          transforms={[
            { id: 'legacy-union', name: 'Union', type: 'union', config: { union: { from: [] } } },
          ]}
          onChange={vi.fn()}
        />,
      ),
    )

    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Union')
  })
})
