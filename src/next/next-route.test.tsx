// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'

const HOME_HEADING = 'We fix, maintain and build in Port Elizabeth.'

beforeEach(() => {
  vi.resetModules()
  vi.stubGlobal('scrollTo', vi.fn())
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

function routePaths(tree: { children?: unknown }): string[] {
  const children = Array.isArray(tree.children)
    ? tree.children
    : Object.values(tree.children ?? {})
  return children
    .map((child) => (child as { options?: { path?: string } }).options?.path)
    .filter((path): path is string => typeof path === 'string')
}

async function loadRouterAtPath(path: string) {
  const { getRouteTree, getRouter } = await import('../router')
  const history = createMemoryHistory({ initialEntries: [path] })
  const router = getRouter(history)
  await router.load()
  render(<RouterProvider router={router} />)
  return { getRouteTree, router }
}

describe('home page route', () => {
  it('renders the redesigned page at / without legacy chrome or a noindex meta', async () => {
    await loadRouterAtPath('/')

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: HOME_HEADING }),
      ).toBeDefined()
    })
    expect(document.querySelector('meta[name="robots"]')).toBeNull()
    expect(screen.queryByRole('link', { name: 'Get a Quote' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Chat on WhatsApp' })).toBeNull()
  })

  it.each(['/next', '/NEXT'])(
    'renders the not-found page, not the home page, at %s',
    async (path) => {
      await loadRouterAtPath(path)

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { level: 1, name: 'Page not found' }),
        ).toBeDefined()
      })
      expect(
        screen.getByRole('link', { name: 'Back to Home' }).getAttribute('href'),
      ).toBe('/')
      expect(
        screen.queryByRole('heading', { level: 1, name: HOME_HEADING }),
      ).toBeNull()
    },
  )

  it('registers the drawing kit preview at /drawings in dev', async () => {
    const { getRouteTree } = await loadRouterAtPath('/drawings')
    expect(routePaths(getRouteTree())).toContain('/drawings')

    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          level: 1,
          name: 'Surveyor drawing kit preview',
        }),
      ).toBeDefined()
    })
  })

  it('leaves the drawing kit preview out of builds and keeps getRouteTree stable', async () => {
    vi.stubEnv('DEV', false)

    const { getRouteTree } = await import('../router')
    const first = getRouteTree()
    expect(getRouteTree()).toBe(first)
    expect(routePaths(first)).toEqual(['/'])
  })
})

describe('redesign tokens and self-hosted fonts', () => {
  it('defines only wz- tokens in src/styles.css', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8')
    expect(css).toContain('--color-wz-field: #b9cddb;')
    expect(css).toContain('--color-wz-accent: #93533e;')
    expect(css).toContain('--font-wz-serif:')
    expect(css).toContain('--font-wz-voice:')
    expect(css).toContain('--wz-ink-line:')
    expect(css).toContain('--shadow-wz-sheet:')
    expect(css).not.toMatch(/--(?:color|font)-(?!wz-)[\w-]+:/)
  })

  it('keeps Tailwind from turning page, content and test words into utilities', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8')
    expect(css).toContain("@import 'tailwindcss' source('.');")
    expect(css).toContain("@source not './next';")
    expect(css).toContain("@source not './content/next';")
    expect(css).toContain("@source not './**/*.test.*';")
    // Unscanned, the redesign tokens ship only because they are static.
    expect(css).toContain('@theme static {')
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
    const urls = [...css.matchAll(/url\(([^)]*)\)/g)].map((match) => match[1])
    for (const url of urls) expect(url).toMatch(/^'\/fonts\//)
    expect(css).not.toContain('data:')
  })
})
