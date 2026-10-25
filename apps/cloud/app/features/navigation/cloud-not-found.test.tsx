import '../../i18n'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it } from 'vitest'

import { Route } from '../../routes/__root'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
it.each([
  ['/missing-cloud-page', '/'],
  ['/missing-cloud-page?organizationId=org-B', '/?organizationId=org-B'],
])('gives unknown Cloud route %s a route back to Overview', async (path, expectedHref) => {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const router = createRouter({
    routeTree: Route,
    history: createMemoryHistory({ initialEntries: [path] }),
  })
  try {
    await router.load()
    await act(async () => root.render(<RouterProvider router={router} />))
    expect(container.querySelector('h1')?.textContent).toBe('404')
    expect(container.textContent).toContain('This page is not available.')
    expect(container.querySelector('a')?.getAttribute('href')).toBe(expectedHref)
    expect(container.querySelector('a')?.textContent).toContain('Overview')
  } finally {
    await act(async () => root.unmount())
    container.remove()
  }
})
