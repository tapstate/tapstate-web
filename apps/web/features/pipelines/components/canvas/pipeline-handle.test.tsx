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
    onRequestAdd?: (
      direction: 'input' | 'output',
      position: { x: number; y: number },
    ) => void
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
    expect(pipelineCanvasStyles.match(/transform: none !important;/g)).toHaveLength(3)
    expect(pipelineCanvasStyles).toContain(
      '-0.5 * var(--pipeline-handle-hit-size-inline) - var(--pipeline-node-border-width)',
    )
    expect(pipelineCanvasStyles).toContain(
      '-0.5 * var(--pipeline-handle-hit-size-inline) - var(--pipeline-node-border-width)',
    )
    expect(pipelineCanvasStyles).toContain('.pipeline-canvas .pipeline-canvas__handle::after')
    expect(pipelineCanvasStyles).toContain('left: 6px;')
    expect(pipelineCanvasStyles).toContain('right: 6px;')
    expect(pipelineCanvasStyles).toContain('.pipeline-canvas__handle-add')
    expect(pipelineCanvasStyles).toContain('display: block !important;')
    expect(pipelineCanvasStyles).toContain(
      'transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1) !important;',
    )
    expect(pipelineCanvasStyles).toContain('transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);')
    expect(pipelineCanvasStyles).toContain('cursor: grab !important;')
    expect(pipelineCanvasStyles).toContain('z-index: 1 !important;')
    expect(pipelineCanvasStyles).not.toContain('pipeline-canvas__port')
    expect(pipelineCanvasStyles).not.toContain('translate3d(-50%, -50%, 0) !important')
    expect(pipelineCanvasStyles).not.toContain('translate3d(50%, -50%, 0) !important')
  })

  it('uses the handle as the stable hit target and visual anchor', () => {
    const host = renderHandle('input')
    const handle = host.querySelector('[data-handle-role="input"]')

    expect(handle?.classList.contains('pipeline-canvas__handle--input')).toBe(true)
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
    expect(handle?.getAttribute('data-handle-direction')).toBe('output')
    expect(handle?.querySelector('.pipeline-canvas__port')).toBeNull()
  })

  it('uses the unconnected source handle add trigger', () => {
    const onRequestAdd = vi.fn()
    const host = renderHandle('output', { onRequestAdd })
    const handle = host.querySelector<HTMLElement>('[data-handle-role="output"]')

    expect(handle?.dataset.pipelineAdd).toBe('true')
    expect(handle?.querySelector('.pipeline-canvas__handle-add')).not.toBeNull()

    const addButton = handle?.querySelector<HTMLButtonElement>('.pipeline-canvas__handle-add')
    act(() =>
      addButton?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, clientX: 324, clientY: 178 }),
      ),
    )

    expect(onRequestAdd).toHaveBeenCalledWith('output', { x: 324, y: 178 })
  })

  it('does not turn a connected output into an add-node trigger', () => {
    const host = renderHandle('output', { connected: true, onRequestAdd: vi.fn() })
    const handle = host.querySelector<HTMLElement>('[data-handle-role="output"]')

    expect(handle?.dataset.pipelineAdd).toBeUndefined()
    expect(handle?.querySelector('.pipeline-canvas__handle-add')).toBeNull()
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
