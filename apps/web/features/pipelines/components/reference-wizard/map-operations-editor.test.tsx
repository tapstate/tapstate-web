import '@/i18n/index'
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { MapTransformConfig } from './TableTransformsManager'

import { MapOperationsEditor } from './map-operations-editor'
import { writeTransforms } from './wizard-adapter'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: Root | undefined
let host: HTMLDivElement
afterEach(async () => {
  await act(async () => root?.unmount())
  host?.remove()
  root = undefined
})
async function render(config: MapTransformConfig = { fields: [] }) {
  const changed = vi.fn()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  function Harness() {
    const [value, setValue] = useState(config)
    const [visible, setVisible] = useState(true)
    return (
      <>
        <button onClick={() => setVisible((current) => !current)}>Toggle map</button>
        {visible && (
          <MapOperationsEditor
            config={value}
            columns={['name', 'email', 'legacy_code']}
            onChange={(next) => {
              changed(next)
              setValue(next)
            }}
          />
        )}
      </>
    )
  }
  await act(async () => root?.render(<Harness />))
  return changed
}
function button(label: string, scope: ParentNode = host) {
  return [...scope.querySelectorAll<HTMLButtonElement>('button')].find(
    (item) => item.textContent?.trim() === label,
  )!
}
async function input(element: HTMLInputElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('Map operation first editing', () => {
  it('focuses the searchable source field as soon as Rename is chosen', async () => {
    await render()
    await act(async () => button('Rename fields').click())
    await act(async () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())))
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Source field')
  })
  it('preserves an unfinished row across folding while excluding it from Pipeline output', async () => {
    const changed = await render()
    await act(async () => button('Add fields').click())
    await input(
      host.querySelector<HTMLInputElement>('[data-map-operation="literal"] input')!,
      'channel',
    )
    await act(async () => button('Toggle map').click())
    await act(async () => button('Toggle map').click())
    expect(
      host.querySelector<HTMLInputElement>('[data-map-operation="literal"] input')?.value,
    ).toBe('channel')
    const saved = writeTransforms([
      { id: 'map', name: 'Map', type: 'map', config: { map: changed.mock.lastCall?.[0] } },
    ])
    expect(saved[0].fields).toEqual({})
  })
  it('opens the chosen operation directly and appends rows in the same block', async () => {
    const changed = await render()
    await act(async () => button('Add fields').click())
    const section = host.querySelector('[data-map-operation="literal"]')!
    expect(section.querySelectorAll('input')).toHaveLength(2)
    expect(changed.mock.lastCall?.[0].fields).toEqual([])
    await input(section.querySelectorAll('input')[0], 'channel')
    expect(changed.mock.lastCall?.[0].fields).toEqual([])
    await input(section.querySelectorAll('input')[1], 'web')
    expect(changed.mock.lastCall?.[0].fields).toMatchObject([
      { outputField: 'channel', value: 'web', ruleType: 'literal' },
    ])
    await act(async () => button('Add another', section).click())
    expect(host.querySelectorAll('[data-map-operation="literal"]')).toHaveLength(1)
    expect(section.querySelectorAll('input')).toHaveLength(4)
    expect(changed.mock.lastCall?.[0].fields).toHaveLength(1)
  })
  it('does not create another delete block when its toolbar action is used again', async () => {
    await render()
    await act(async () => button('Delete fields').click())
    await act(async () => button('Delete fields').click())
    expect(host.querySelectorAll('[data-map-operation="delete"]')).toHaveLength(1)
    expect(
      host.querySelector('[data-map-operation="delete"]')?.querySelector('input'),
    ).not.toBeNull()
    expect(host.querySelector('[data-map-operation="delete"]')?.textContent).not.toContain(
      'Add another',
    )
  })
  it('preserves existing mixed rules when starting another operation', async () => {
    const changed = await render({
      fields: [
        { id: 'drop', outputField: 'legacy_code', ruleType: 'delete', value: 'false' },
        { id: 'rename', outputField: 'customer_name', ruleType: 'rename', value: '$name' },
      ],
    })
    await act(async () => button('Compute fields').click())
    expect(host.querySelectorAll('[data-map-operation]')).toHaveLength(3)
    expect(changed.mock.lastCall?.[0].fields).toHaveLength(2)
    const inputs = host.querySelector('[data-map-operation="compute"]')!.querySelectorAll('input')
    await input(inputs[0], 'display_name')
    await input(inputs[1], 'after.name')
    expect(changed.mock.lastCall?.[0].fields).toMatchObject([
      { outputField: 'legacy_code', ruleType: 'delete' },
      { outputField: 'customer_name', value: '$name' },
      { outputField: 'display_name', value: '=after.name' },
    ])
  })

  it('selects and deselects multiple deletion fields in the same picker', async () => {
    const changed = await render()
    await act(async () => button('Delete fields').click())
    const open = host.querySelector<HTMLButtonElement>('[data-map-operation="delete"] input')!
    await act(async () =>
      open.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })),
    )
    const choose = async (name: string) => {
      const option = [...document.body.querySelectorAll<HTMLElement>('[role="option"]')].find(
        (item) => item.textContent === name,
      )!
      expect(option).toBeDefined()
      await act(async () => option.click())
    }
    await choose('email')
    await choose('legacy_code')
    expect(
      changed.mock.lastCall?.[0].fields.map((rule: { outputField: string }) => rule.outputField),
    ).toEqual(['email', 'legacy_code'])
    await act(async () =>
      host.querySelector<HTMLButtonElement>('[aria-label="Remove selected field email"]')?.click(),
    )
    expect(
      changed.mock.lastCall?.[0].fields.map((rule: { outputField: string }) => rule.outputField),
    ).toEqual(['legacy_code'])
  })
  it('blocks conflicting output names while preserving the last valid configuration', async () => {
    const changed = await render({
      fields: [{ id: 'existing', outputField: 'channel', ruleType: 'literal', value: 'web' }],
    })
    await act(async () =>
      button('Add another', host.querySelector('[data-map-operation="literal"]')!).click(),
    )
    const inputs = host.querySelector('[data-map-operation="literal"]')!.querySelectorAll('input')
    await input(inputs[2], 'channel')
    await input(inputs[3], 'mobile')
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('channel')
    expect(changed.mock.lastCall?.[0].fields).toHaveLength(1)
  })
})
