import { useLayoutEffect } from 'react'
import { Outlet, createRootRoute, useRouterState } from '@tanstack/react-router'
import '../styles.css'
import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'
import { WhatsAppButton } from '../components/WhatsAppButton'

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFound,
})

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
      <h1 className="font-heading text-4xl font-bold text-primary mb-3">
        Page not found
      </h1>
      <p className="text-text-muted mb-6">
        The page you're looking for doesn't exist.
      </p>
      <a
        href="/"
        className="rounded-full bg-light px-6 py-2.5 text-sm font-semibold text-primary no-underline hover:bg-accent hover:text-white transition-colors"
      >
        Back to Home
      </a>
    </div>
  )
}

const LEGACY_FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Montserrat:wght@600;700;800&display=swap'

function LegacyFonts() {
  useLayoutEffect(() => {
    const links = [
      Object.assign(document.createElement('link'), {
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com',
      }),
      Object.assign(document.createElement('link'), {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      }),
      Object.assign(document.createElement('link'), {
        rel: 'stylesheet',
        href: LEGACY_FONTS_HREF,
      }),
    ]
    document.head.append(...links)
    return () => {
      for (const link of links) link.remove()
    }
  }, [])

  return null
}

function RootComponent() {
  const homeNextEnabled = import.meta.env.VITE_HOME_NEXT === 'true'
  const isNextRoute = useRouterState({
    select: (state) =>
      homeNextEnabled &&
      state.matches.some(
        (match) =>
          match.routeId === '/next' ||
          // Dev-only kit preview (#94); the literal drops out of builds.
          (import.meta.env.DEV && match.routeId === '/next/drawings'),
      ),
  })

  if (isNextRoute) {
    return <Outlet />
  }

  return (
    <>
      {homeNextEnabled && <LegacyFonts />}
      <Navbar />
      <Outlet />
      <Footer />
      <WhatsAppButton />
    </>
  )
}
