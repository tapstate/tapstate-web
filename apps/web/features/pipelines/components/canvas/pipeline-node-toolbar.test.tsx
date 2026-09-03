import '@/i18n/index'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PipelineNodeToolbar } from './pipeline-node-toolbar'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const pipelineCanvasStyles = readFileSync(
  resolve(process.cwd(), 'styles/pipelines/pipeline-canvas.css'),
  'utf8',
)
const pipelineNodeToolbarSource = readFileSync(
  resolve(process.cwd(), 'features/pipelines/components/canvas/pipeline-node-toolbar.tsx'),
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

function renderToolbar(
  options: {
    onRequestDelete?: () => void
    onParentClick?: () => void
    visible?: boolean
  } = {},
) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  act(() =>
    root?.render(
      <div onClick={options.onParentClick}>
        <PipelineNodeToolbar
          nodeLabel="Player"
          visible={options.visible ?? true}
          onRequestDelete={options.onRequestDelete}
        />
      </div>,
    ),
  )
  return container
}

describe('PipelineNodeToolbar', () => {
  it('keeps the action bar hidden until the node is selected', () => {
    const host = renderToolbar({ visible: false })
    const toolbar = host.querySelector<HTMLElement>('.pipeline-canvas__node-toolbar')

    expect(toolbar?.classList.contains('invisible')).toBe(true)
    expect(toolbar?.classList.contains('visible')).toBe(false)
  })

  it('exposes the Dify-style more button and keeps menu clicks inside the interaction island', async () => {
    const onRequestDelete = vi.fn()
    const parentClick = vi.fn()
    const host = renderToolbar({ onRequestDelete, onParentClick: parentClick })
    const toolbar = host.querySelector<HTMLElement>('[role="toolbar"]')
    const moreButton = host.querySelector<HTMLButtonElement>('[data-toolbar-action="more"]')
    const wrapper = host.querySelector<HTMLElement>('.pipeline-canvas__node-toolbar')
    expect(wrapper?.classList.contains('visible')).toBe(true)
    expect(toolbar?.classList.contains('nodrag')).toBe(true)
    expect(toolbar?.classList.contains('nopan')).toBe(true)
    expect(toolbar?.classList.contains('nowheel')).toBe(true)
    expect(moreButton?.classList.contains('w-5!')).toBe(true)
    expect(moreButton?.classList.contains('h-5!')).toBe(true)
    expect(moreButton?.classList.contains('border-0')).toBe(true)
    expect(moreButton?.classList.contains('p-0')).toBe(true)

    await act(async () => moreButton?.click())
    const deleteButton = document.body.querySelector<HTMLButtonElement>(
      '[data-toolbar-action="delete"]',
    )
    expect(deleteButton).not.toBeNull()
    expect(deleteButton?.textContent).toContain('⌫')
    const shortcut = deleteButton?.querySelector('[data-slot="dropdown-menu-shortcut"]')
    expect(shortcut?.tagName).toBe('KBD')
    expect(shortcut?.className).toContain('rounded-sm')
    await act(async () => deleteButton?.click())

    expect(onRequestDelete).toHaveBeenCalledTimes(1)
    expect(parentClick).not.toHaveBeenCalled()
  })

  it('renders the more action as enabled when the node can be managed', () => {
    const host = renderToolbar({ onRequestDelete: vi.fn() })

    expect(host.querySelector('[data-toolbar-action="more"]')).toHaveProperty('disabled', false)
  })

  it('keeps Dify action-bar hover styling in Tailwind utilities', () => {
    expect(pipelineCanvasStyles).not.toContain('.pipeline-canvas__node-toolbar-button:hover')
    expect(pipelineNodeToolbarSource).toContain('hover:bg-pipeline-actionbar-bg-accent')
    expect(pipelineNodeToolbarSource).toContain('hover:text-[var(--pipeline-text)]')
    expect(pipelineNodeToolbarSource).toContain('focus-visible:ring-[var(--pipeline-selection)]')
  })
})
