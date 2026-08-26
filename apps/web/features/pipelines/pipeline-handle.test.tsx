import '@/i18n/index'
import { ReactFlowProvider } from '@xyflow/react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'

import { PipelineHandle } from './pipeline-handle'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let root: Root | undefined
let container: HTMLDivElement | undefined

afterEach(async () => {
  await act(async () => root?.unmount())
  container?.remove()
  root = undefined
  container = undefined
})

function renderHandle(direction: 'input' | 'output') {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  act(() =>
    root?.render(
      <ReactFlowProvider>
        <PipelineHandle direction={direction} nodeLabel="orders" />
      </ReactFlowProvider>,
    ),
  )
  return container
}

describe('PipelineHandle', () => {
  it('keeps the visible port and hit target as separate stable layers', () => {
    const host = renderHandle('input')
    const handle = host.querySelector('[data-handle-role="input"]')

    expect(handle?.classList.contains('pipeline-canvas__handle--input')).toBe(true)
    expect(handle?.getAttribute('data-handle-direction')).toBe('input')
    expect(handle?.getAttribute('data-handle-connected')).toBe('false')
    expect(handle?.getAttribute('data-handle-connectable')).toBe('true')
    expect(handle?.querySelector('.pipeline-canvas__handle-hitbox')).toBeTruthy()
    expect(handle?.querySelector('[data-handle-anchor="header"]')).toBeTruthy()
    expect(handle?.querySelector('.pipeline-canvas__port')).toBeTruthy()
  })

  it('uses the output role for source handles without changing geometry', () => {
    const host = renderHandle('output')
    const handle = host.querySelector('[data-handle-role="output"]')

    expect(handle?.classList.contains('pipeline-canvas__handle--output')).toBe(true)
    expect(handle?.getAttribute('data-handle-direction')).toBe('output')
    expect(handle?.querySelector('.pipeline-canvas__port')).toBeTruthy()
  })

  it('exposes connection state without changing the handle structure', () => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    act(() =>
      root?.render(
        <ReactFlowProvider>
          <PipelineHandle direction="output" nodeLabel="orders" connected />
        </ReactFlowProvider>,
      ),
    )

    expect(container.querySelector('[data-handle-connected="true"]')).not.toBeNull()
    expect(
      container.querySelector('.pipeline-canvas__handle-hitbox .pipeline-canvas__port'),
    ).not.toBeNull()
  })
})
