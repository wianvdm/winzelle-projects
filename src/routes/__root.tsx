import { createRootRoute } from '@tanstack/react-router'
import '../styles.css'
// In the root stylesheet so the not-found page gets the board and the
// self-hosted fonts without loading the home page chunk.
import '../next/next.css'

export const Route = createRootRoute({
  notFoundComponent: NotFound,
})

function NotFound() {
  return (
    <main className="wz-page">
      <div className="wz-not-found-sheet">
        <h1 className="wz-shell-title">Page not found</h1>
        <p>The page you're looking for doesn't exist.</p>
        <a href="/" className="wz-not-found-link">
          Back to Home
        </a>
      </div>
    </main>
  )
}
