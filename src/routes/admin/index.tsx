import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

const SanityStudio = lazy(() => import('../../components/SanityStudioWrapper'))

export const Route = createFileRoute('/admin/')({
  component: AdminPage,
})

function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-white">
          <p className="text-text-muted">Loading Sanity Studio...</p>
        </div>
      }
    >
      <SanityStudio />
    </Suspense>
  )
}
