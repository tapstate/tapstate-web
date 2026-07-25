import { createRootRoute, createRoute, redirect } from '@tanstack/react-router'
import { RootRouteComponent } from './routes/__root'
import { AuthenticatedRouteComponent } from './routes/_authenticated'
import { ExplorationsRouteComponent } from './routes/_authenticated/explorations'
import { PipelinesRouteComponent } from './routes/_authenticated/pipelines'
import { SourcesRouteComponent } from './routes/_authenticated/sources'
import { IndexRouteComponent } from './routes/index'
import { LoginRouteComponent } from './routes/login'
import { NotFoundRouteComponent } from './routes/not-found'

const rootRoute = createRootRoute({
  component: RootRouteComponent,
  notFoundComponent: NotFoundRouteComponent,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/sources' })
  },
  component: IndexRouteComponent,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginRouteComponent,
})

const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_authenticated',
  component: AuthenticatedRouteComponent,
})

const sourcesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/sources',
  component: SourcesRouteComponent,
})

const pipelinesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/pipelines',
  component: PipelinesRouteComponent,
})

const explorationsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/explorations',
  component: ExplorationsRouteComponent,
})

export const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  authenticatedRoute.addChildren([sourcesRoute, pipelinesRoute, explorationsRoute]),
])
