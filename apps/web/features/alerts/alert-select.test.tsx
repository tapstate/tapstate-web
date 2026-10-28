import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it } from 'vitest'

import { AlertSelect } from './alert-select'
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
it('shows readable labels for closed single, multiple and empty-value choices', async () => {
  const node = document.createElement('div')
  document.body.append(node)
  const root = createRoot(node)
  try {
    await act(async () =>
      root.render(
        <>
          <AlertSelect value="email">
            <option value="email">Email delivery</option>
          </AlertSelect>
          <AlertSelect multiple value={['receiver-opaque-id']}>
            <option value="receiver-opaque-id">Operations mailbox</option>
          </AlertSelect>
          <AlertSelect value="">
            <option value="">All severities</option>
            <option value="MAJOR">Major</option>
          </AlertSelect>
        </>,
      ),
    )
    const labels = [...node.querySelectorAll('[role="combobox"]')].map((el) => el.textContent)
    expect(labels[0]).toContain('Email delivery')
    expect(labels[1]).toContain('Operations mailbox')
    expect(labels[2]).toContain('All severities')
    expect(node.textContent).not.toContain('receiver-opaque-id')
  } finally {
    act(() => root.unmount())
    node.remove()
  }
})
