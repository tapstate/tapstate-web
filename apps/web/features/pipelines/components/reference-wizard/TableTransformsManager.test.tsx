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
