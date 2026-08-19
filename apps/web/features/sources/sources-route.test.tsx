import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-router', () => ({
  Outlet: () => <div data-testid="source-detail-route">source detail route</div>,
  createFileRoute: () => () => ({}),
}))

import { SourcesRouteComponent } from '@/app/routes/_authenticated.sources'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let root: Root | undefined
let container: HTMLDivElement | undefined

afterEach(async () => {
  await act(async () => root?.unmount())
  container?.remove()
  root = undefined
  container = undefined
})

describe('sources route', () => {
  it('renders its child route outlet', async () => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    await act(async () => {
      root?.render(<SourcesRouteComponent />)
    })

    expect(container.querySelector('[data-testid="source-detail-route"]')).not.toBeNull()
  })
})
