import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

const routeState = vi.hoisted(() => ({
  navigate: vi.fn(),
  params: { sourceId: 'orders', tableName: 'orders' },
  search: { tab: 'columns' },
  props: null as Record<string, any> | null,
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => routeState.navigate,
  useParams: () => routeState.params,
  useSearch: () => routeState.search,
}))

vi.mock('./sources-page', () => ({
  SourcesPage: (props: Record<string, any>) => {
    routeState.props = props
    return null
  },
}))

import { SourceDetailPage } from './pages/source-detail-page'
import { SourceTableDetailPage } from './pages/source-table-detail-page'
import { SourcesCatalogPage } from './pages/sources-catalog-page'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let root: Root | undefined
let container: HTMLDivElement | undefined

afterEach(async () => {
  await act(async () => root?.unmount())
  container?.remove()
  root = undefined
  container = undefined
  routeState.navigate.mockReset()
  routeState.props = null
})

function renderRoute(component: ReactNode) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  act(() => root?.render(component))
}

describe('source route pages', () => {
  it('navigates from the catalog to a source detail route', () => {
    renderRoute(<SourcesCatalogPage />)

    act(() => routeState.props?.onNavigate({ sourceId: 'orders' }))

    expect(routeState.navigate).toHaveBeenCalledWith({
      to: '/sources/$sourceId',
      params: { sourceId: 'orders' },
    })
  })

  it('navigates between a source, table, and tab route', () => {
    renderRoute(<SourcesCatalogPage />)

    act(() => routeState.props?.onNavigate({ sourceId: 'orders', tableName: 'orders' }))
    expect(routeState.navigate).toHaveBeenCalledWith({
      to: '/sources/$sourceId/$tableName',
      params: { sourceId: 'orders', tableName: 'orders' },
      search: { tab: 'columns' },
    })

    act(() => routeState.props?.onNavigate({ sourceId: 'orders' }))
    expect(routeState.navigate).toHaveBeenLastCalledWith({
      to: '/sources/$sourceId',
      params: { sourceId: 'orders' },
    })

    act(() =>
      routeState.props?.onNavigate({
        sourceId: 'orders',
        tableName: 'orders',
        tab: 'lineage',
      }),
    )
    expect(routeState.navigate).toHaveBeenLastCalledWith({
      to: '/sources/$sourceId/$tableName',
      params: { sourceId: 'orders', tableName: 'orders' },
      search: { tab: 'lineage' },
    })
  })

  it('hydrates the table view from route params and search', () => {
    renderRoute(<SourceTableDetailPage />)

    expect(routeState.props?.route).toEqual({
      sourceId: 'orders',
      tableName: 'orders',
      tab: 'columns',
    })
  })

  it('hydrates the Source detail page from the route parameter', () => {
    renderRoute(<SourceDetailPage />)

    expect(routeState.props?.route).toEqual({ sourceId: 'orders' })
  })
})
