// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { getRouteTree, getRouter } from '../router'

beforeEach(() => {
  vi.stubGlobal('scrollTo', vi.fn())
})

afterEach(() => {
  cleanup()
  document.head.querySelectorAll('meta[name="robots"]').forEach((el) => {
    el.remove()
  })
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

function routePaths(tree: ReturnType<typeof getRouteTree>): string[] {
  const children = Array.isArray(tree.children)
    ? tree.children
    : Object.values(tree.children ?? {})
  return children
    .map((child) => (child as { options?: { path?: string } }).options?.path)
    .filter((path): path is string => typeof path === 'string')
}

async function renderAtPath(path: string) {
  const history = createMemoryHistory({ initialEntries: [path] })
  const router = getRouter(history)
  await router.load()
  render(<RouterProvider router={router} />)
  return router
}

describe('/next route gating', () => {
  it('omits /next from the route tree and renders NotFound when VITE_HOME_NEXT is unset', async () => {
    vi.stubEnv('VITE_HOME_NEXT', undefined)

    const paths = routePaths(getRouteTree())
    expect(paths).toContain('/')
    expect(paths).not.toContain('/next')

    await renderAtPath('/next')

    await waitFor(() => {
      expect(screen.getByText('Page not found')).toBeDefined()
    })
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull()
    expect(screen.queryByRole('link', { name: 'Get a Quote' })).not.toBeNull()
  })

  it('omits /next when VITE_HOME_NEXT is false', () => {
    vi.stubEnv('VITE_HOME_NEXT', 'false')

    const paths = routePaths(getRouteTree())
    expect(paths).not.toContain('/next')
  })

  it('registers /next with noindex and without legacy chrome when VITE_HOME_NEXT is true', async () => {
    vi.stubEnv('VITE_HOME_NEXT', 'true')

    const paths = routePaths(getRouteTree())
    expect(paths).toContain('/')
    expect(paths).toContain('/next')

    await renderAtPath('/next')

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: 'Winzelle Projects' }),
      ).toBeDefined()
    })

    const robots = document.head.querySelector('meta[name="robots"]')
    expect(robots?.getAttribute('content')).toBe('noindex')
    expect(screen.queryByRole('link', { name: 'Get a Quote' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Chat on WhatsApp' })).toBeNull()
  })

  it('keeps the legacy / route and chrome unchanged when VITE_HOME_NEXT is true', async () => {
    vi.stubEnv('VITE_HOME_NEXT', 'true')

    await renderAtPath('/')

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Get a Quote' })).toBeDefined()
    })

    expect(screen.getByRole('link', { name: 'Chat on WhatsApp' })).toBeDefined()
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull()
  })
})

describe('redesign tokens and self-hosted fonts', () => {
  it('defines wz- tokens alongside existing tokens in src/styles.css', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8')
    expect(css).toContain('--color-primary:')
    expect(css).toContain('--color-wz-field: #b9cddb;')
    expect(css).toContain('--color-wz-accent: #93533e;')
    expect(css).toContain('--font-wz-serif:')
    expect(css).toContain('--font-wz-voice:')
    expect(css).toContain('--wz-ink-line:')
    expect(css).toContain('--shadow-wz-sheet:')
  })

  it('uses only local /fonts/ files in src/next/next.css with no data: URLs', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'src/next/next.css'),
      'utf8',
    )
    expect(css).toContain("url('/fonts/spectral-400.woff2')")
    expect(css).toContain("url('/fonts/spectral-400-italic.woff2')")
    expect(css).toContain("url('/fonts/spectral-600.woff2')")
    expect(css).toContain("url('/fonts/spectral-sc-500.woff2')")
    expect(css).not.toContain('fonts.googleapis.com')
    expect(css).not.toContain('fonts.gstatic.com')
    expect(css).not.toContain('data:')
  })
})
