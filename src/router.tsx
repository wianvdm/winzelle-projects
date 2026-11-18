import {
  createRoute,
  createRouter as createTanStackRouter,
  lazyRouteComponent,
  type RouterHistory,
} from '@tanstack/react-router'
import { Route as rootRoute } from './routes/__root'
import { routeTree as generatedRouteTree } from './routeTree.gen'

const baseChildren = Array.isArray(generatedRouteTree.children)
  ? [...generatedRouteTree.children]
  : []

// Dev-only preview of the drawing kit (#94): import.meta.env.DEV is
// statically false in every build, so the route and its chunk never ship.
const routeTree = import.meta.env.DEV
  ? generatedRouteTree.addChildren([
      ...baseChildren,
      createRoute({
        getParentRoute: () => rootRoute,
        path: '/drawings',
        component: lazyRouteComponent(
          () => import('./next/drawings/DrawingsPreview'),
        ),
      }),
    ])
  : generatedRouteTree

export function getRouteTree() {
  return routeTree
}

export function getRouter(history?: RouterHistory) {
  const router = createTanStackRouter({
    routeTree: getRouteTree(),
    history,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
