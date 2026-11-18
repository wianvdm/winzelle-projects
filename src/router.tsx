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

const nextChildren =
  import.meta.env.VITE_HOME_NEXT === 'true'
    ? [
        createRoute({
          getParentRoute: () => rootRoute,
          path: '/next',
          // Only the exact path matches next.html (noindex, no Google
          // Fonts); a case variant falls back to index.html and must not
          // render the page.
          caseSensitive: true,
          component: lazyRouteComponent(() => import('./next/NextPage')),
        }),
        // Dev-only preview of the drawing kit (#94): import.meta.env.DEV is
        // statically false in every build, so the route and its chunk never
        // ship.
        ...(import.meta.env.DEV
          ? [
              createRoute({
                getParentRoute: () => rootRoute,
                path: '/next/drawings',
                component: lazyRouteComponent(
                  () => import('./next/drawings/DrawingsPreview'),
                ),
              }),
            ]
          : []),
      ]
    : []

const routeTree =
  nextChildren.length > 0
    ? generatedRouteTree.addChildren([...baseChildren, ...nextChildren])
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
