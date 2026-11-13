import { Outlet, createRootRoute } from '@tanstack/react-router'
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

function RootComponent() {
  return (
    <>
      <Navbar />
      <Outlet />
      <Footer />
      <WhatsAppButton />
    </>
  )
}
