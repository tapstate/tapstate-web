import '@/i18n/index'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { controls, viewportState } = vi.hoisted(() => ({
  controls: {
    fitView: vi.fn(),
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    zoomTo: vi.fn(),
  },
  viewportState: { current: { x: 0, y: 0, zoom: 1 } },
}))

vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@xyflow/react')>()
  return {
    ...actual,
    useReactFlow: () => ({ ...controls, getViewport: () => viewportState.current }),
    useViewport: () => viewportState.current,
  }
})

import { PipelineCanvasViewportToolbar } from './pipeline-canvas-viewport-toolbar'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let root: Root | undefined
let container: HTMLDivElement | undefined

function menuItem(text: string) {
  return [...document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
    (item) => item.textContent?.trim() === text,
  )
}

beforeEach(() => {
  viewportState.current = { x: 0, y: 0, zoom: 1 }
  controls.zoomIn.mockImplementation(async () => {
    viewportState.current = { ...viewportState.current, zoom: 1.1 }
    return true
  })
  controls.zoomOut.mockImplementation(async () => {
    viewportState.current = { ...viewportState.current, zoom: 1 }
    return true
  })
  controls.zoomTo.mockImplementation(async (zoom: number) => {
    viewportState.current = { ...viewportState.current, zoom }
    return true
  })
  controls.fitView.mockImplementation(async () => {
    viewportState.current = { x: 10, y: 20, zoom: 0.8 }
    return true
  })
})

afterEach(async () => {
  await act(async () => root?.unmount())
  container?.remove()
  root = undefined
  container = undefined
  vi.clearAllMocks()
})

describe('PipelineCanvasViewportToolbar', () => {
  it('persists viewport changes from buttons and the zoom menu', async () => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const onViewportChange = vi.fn()

    await act(async () => {
      root?.render(<PipelineCanvasViewportToolbar onViewportChange={onViewportChange} />)
    })

    await act(async () => {
      document.querySelector<HTMLButtonElement>('[aria-label="Zoom in"]')?.click()
      await Promise.resolve()
    })
    expect(onViewportChange).toHaveBeenLastCalledWith({ x: 0, y: 0, zoom: 1.1 })

    await act(async () => {
      document.querySelector<HTMLButtonElement>('[aria-label="Zoom out"]')?.click()
      await Promise.resolve()
    })
    expect(onViewportChange).toHaveBeenLastCalledWith({ x: 0, y: 0, zoom: 1 })

    await act(async () => {
      document.querySelector<HTMLButtonElement>('[aria-label="Canvas zoom"]')?.click()
    })
    await act(async () => {
      menuItem('Fit Pipeline')?.click()
      await Promise.resolve()
    })
    expect(onViewportChange).toHaveBeenLastCalledWith({ x: 10, y: 20, zoom: 0.8 })

    await act(async () => {
      document.querySelector<HTMLButtonElement>('[aria-label="Canvas zoom"]')?.click()
    })
    await act(async () => {
      menuItem('75%')?.click()
      await Promise.resolve()
    })
    expect(onViewportChange).toHaveBeenLastCalledWith({ x: 10, y: 20, zoom: 0.75 })
  })
})
