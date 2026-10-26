import '@/i18n/index'
import { ReactFlowProvider } from '@xyflow/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PipelineHandle } from './pipeline-handle'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const pipelineCanvasStyles = readFileSync(
  resolve(process.cwd(), 'styles/pipelines/pipeline-canvas.css'),
  'utf8',
)

let root: Root | undefined
let container: HTMLDivElement | undefined

afterEach(async () => {
  await act(async () => root?.unmount())
  container?.remove()
  root = undefined
  container = undefined
})

function renderHandle(
  direction: 'input' | 'output',
  options: {
    connected?: boolean
    canAdd?: boolean
    onRequestAdd?: (direction: 'input' | 'output', position: { x: number; y: number }) => void
  } = {},
) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  act(() =>
    root?.render(
      <ReactFlowProvider>
        <PipelineHandle direction={direction} nodeLabel="orders" {...options} />
      </ReactFlowProvider>,
    ),
  )
  return container
}

describe('PipelineHandle', () => {
  it('keeps handle geometry aligned with React Flow edge endpoints', () => {
    expect(pipelineCanvasStyles).not.toContain('.pipeline-canvas__handle')
    expect(pipelineCanvasStyles).not.toContain('transform: none !important;')
    expect(pipelineCanvasStyles).not.toContain('pipeline-canvas__port')
  })

  it('uses the handle as the stable hit target and visual anchor', () => {
    const host = renderHandle('input')
    const handle = host.querySelector('[data-handle-role="input"]')

    expect(handle?.classList.contains('pipeline-canvas__handle--input')).toBe(true)
    expect(handle?.classList.contains('react-flow__handle-left')).toBe(true)
    expect(handle?.classList.contains('top-4!')).toBe(true)
    expect(handle?.classList.contains('-left-[9px]!')).toBe(true)
    expect(handle?.classList.contains('translate-y-0!')).toBe(true)
    expect(handle?.classList.contains('size-4!')).toBe(true)
    expect(handle?.classList.contains('border-none!')).toBe(true)
    expect(handle?.classList.contains('bg-transparent!')).toBe(true)
    expect(handle?.classList.contains('transform-none!')).toBe(true)
    expect(handle?.classList.contains('nodrag')).toBe(true)
    expect(handle?.classList.contains('nopan')).toBe(true)
    expect(handle?.getAttribute('data-handle-direction')).toBe('input')
    expect(handle?.getAttribute('data-handle-connected')).toBe('false')
    expect(handle?.getAttribute('data-handle-connectable')).toBe('true')
    expect(handle?.querySelector('.pipeline-canvas__handle-hitbox')).toBeNull()
    expect(handle?.querySelector('.pipeline-canvas__port')).toBeNull()
  })

  it('uses the output role for source handles without changing geometry', () => {
    const host = renderHandle('output')
    const handle = host.querySelector('[data-handle-role="output"]')

    expect(handle?.classList.contains('pipeline-canvas__handle--output')).toBe(true)
    expect(handle?.classList.contains('react-flow__handle-right')).toBe(true)
    expect(handle?.classList.contains('top-4!')).toBe(true)
    expect(handle?.classList.contains('-right-[9px]!')).toBe(true)
    expect(handle?.classList.contains('translate-y-0!')).toBe(true)
    expect(handle?.getAttribute('data-handle-direction')).toBe('output')
    expect(handle?.querySelector('.pipeline-canvas__port')).toBeNull()
  })

  it('uses the unconnected source handle add trigger', () => {
    const onRequestAdd = vi.fn()
    const host = renderHandle('output', { onRequestAdd })
    const handle = host.querySelector<HTMLElement>('[data-handle-role="output"]')

    expect(handle?.dataset.pipelineAdd).toBe('true')
    expect(handle?.querySelector('[data-handle-add="true"]')).not.toBeNull()
    expect(handle?.querySelector('[data-handle-add="true"]')?.className).toContain(
      'group-hover:opacity-100',
    )
    expect(handle?.textContent).toContain('Click')
    expect(handle?.textContent).toContain('Drag')

    const tooltip = handle?.querySelector('[data-pipeline-handle-tooltip="true"]')
    expect(tooltip?.className).toContain('border-components-panel-border')
    expect(tooltip?.className).toContain('bg-components-tooltip-bg')
    expect(tooltip?.className).toContain('border-[0.5px]')

    const addButton = handle?.querySelector<HTMLButtonElement>('[data-handle-add="true"]')
    expect(addButton?.tagName).toBe('BUTTON')
    expect(addButton?.tabIndex).toBe(0)
    expect(addButton?.classList.contains('size-4')).toBe(true)
    expect(addButton?.classList.contains('z-10')).toBe(true)
    act(() =>
      addButton?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, clientX: 324, clientY: 178 }),
      ),
    )

    expect(onRequestAdd).toHaveBeenCalledWith('output', { x: 324, y: 178 })
  })

  it('opens the node selector when the keyboard-available add button is activated', () => {
    const onRequestAdd = vi.fn()
    const host = renderHandle('input', { onRequestAdd })
    const addButton = host.querySelector<HTMLButtonElement>('[data-handle-add="true"]')
    expect(addButton?.tabIndex).toBe(0)

    act(() => addButton?.click())

    expect(onRequestAdd).toHaveBeenCalledWith(
      'input',
      expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
    )
  })

  it('keeps a connected handle connectable while hiding its insert trigger', () => {
    const onRequestAdd = vi.fn()
    const host = renderHandle('output', { connected: true, onRequestAdd })
    const handle = host.querySelector<HTMLElement>('[data-handle-role="output"]')

    expect(handle?.dataset.pipelineAdd).toBeUndefined()
    expect(handle?.dataset.handleConnectable).toBe('true')
    expect(handle?.querySelector('[data-handle-add="true"]')).toBeNull()
  })

  it('shows both the insert trigger and blue bar for an addable connected source', () => {
    const host = renderHandle('output', { connected: true, canAdd: true, onRequestAdd: vi.fn() })
    const handle = host.querySelector<HTMLElement>('[data-handle-role="output"]')

    expect(handle?.dataset.pipelineAdd).toBe('true')
    expect(handle?.classList.contains('after:opacity-100')).toBe(true)
    expect(handle?.querySelector('[data-handle-add="true"]')).not.toBeNull()
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
    expect(container.querySelector('[data-handle-role="output"]')).not.toBeNull()
  })
})
