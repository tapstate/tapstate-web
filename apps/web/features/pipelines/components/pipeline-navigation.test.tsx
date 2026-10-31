import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'

import { i18n } from '@/i18n/index'

import { PipelineLifecycleMenu } from './pipeline-lifecycle-menu'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: Root | undefined
let host: HTMLDivElement | undefined
let queries: QueryClient | undefined
afterEach(async () => {
  await act(async () => root?.unmount())
  queries?.clear()
  host?.remove()
  await i18n.changeLanguage('en')
})

it.each(['inline', 'menu'] as const)(
  'opens %s Edit through the router while retaining the selected interface language',
  async (entry) => {
    await i18n.changeLanguage('zh-CN')
    const rootRoute = createRootRoute({ component: Outlet })
    const catalog = createRoute({
      getParentRoute: () => rootRoute,
      path: 'pipelines',
      component: () => (
        <PipelineLifecycleMenu
          pipelineId="flow"
          status="COMPLETED"
          apiFetch={async () => new Response(null, { status: 204 })}
          contentHash="hash"
        />
      ),
    })
    const editor = createRoute({
      getParentRoute: () => rootRoute,
      path: 'pipelines/$pipelineId/edit',
      component: () => <h1>{i18n.language}</h1>,
    })
    const router = createRouter({
      routeTree: rootRoute.addChildren([catalog, editor]),
      history: createMemoryHistory({ initialEntries: ['/pipelines'] }),
    })
    queries = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    await act(async () =>
      root!.render(
        <QueryClientProvider client={queries!}>
          <RouterProvider router={router} />
        </QueryClientProvider>,
      ),
    )
    const label = i18n.t('pipelines.actions.editPipeline', { id: 'flow' })
    await vi.waitFor(() =>
      expect(document.querySelector(`a[aria-label="${label}"]`)).not.toBeNull(),
    )
    if (entry === 'menu') {
      const more = i18n.t('pipelines.actions.morePipeline', { id: 'flow' })
      await act(async () =>
        document.querySelector<HTMLButtonElement>(`button[aria-label="${more}"]`)!.click(),
      )
      await vi.waitFor(() =>
        expect(
          document.querySelector('[role="menuitem"][href="/pipelines/flow/edit"]'),
        ).not.toBeNull(),
      )
    }
    const link = document.querySelector<HTMLAnchorElement>(
      entry === 'inline'
        ? `a[aria-label="${label}"]`
        : '[role="menuitem"][href="/pipelines/flow/edit"]',
    )!
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })
    await act(async () => {
      link.dispatchEvent(click)
    })
    expect(click.defaultPrevented).toBe(true)
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/pipelines/flow/edit'))
    expect(document.querySelector('h1')?.textContent).toBe('zh-CN')
  },
)
