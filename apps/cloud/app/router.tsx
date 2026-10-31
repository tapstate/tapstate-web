import { createRouter } from '@tanstack/react-router'

import { routeTree } from './routeTree.gen'
import { StartupPending } from './startup-pending'

export const router = createRouter({
  defaultPreload: 'intent',
  defaultPendingComponent: StartupPending,
  defaultPendingMs: 0,
  defaultPendingMinMs: 0,
  routeTree,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
