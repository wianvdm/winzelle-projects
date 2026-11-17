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

const routeTree =
  import.meta.env.VITE_HOME_NEXT === 'true'
    ? generatedRouteTree.addChildren([
        ...baseChildren,
        createRoute({
          getParentRoute: () => rootRoute,
          path: '/next',
          component: lazyRouteComponent(() => import('./next/NextPage')),
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
