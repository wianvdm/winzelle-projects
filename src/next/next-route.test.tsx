// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'

beforeEach(() => {
  vi.resetModules()
  vi.stubGlobal('scrollTo', vi.fn())
})

afterEach(() => {
  cleanup()
  document.head
    .querySelectorAll('meta[name="robots"], link[href*="fonts.g"]')
    .forEach((el) => {
      el.remove()
    })
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

describe('/next route gating', () => {
  it('omits /next from the route tree and renders NotFound when VITE_HOME_NEXT is unset', async () => {
    vi.stubEnv('VITE_HOME_NEXT', undefined)

    const { getRouteTree } = await loadRouterAtPath('/next')
    const paths = routePaths(getRouteTree())
    expect(paths).toContain('/')
    expect(paths).not.toContain('/next')

    await waitFor(() => {
      expect(screen.getByText('Page not found')).toBeDefined()
    })
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull()
    expect(screen.queryByRole('link', { name: 'Get a Quote' })).not.toBeNull()
  })

  it('omits /next when VITE_HOME_NEXT is false and keeps getRouteTree stable across calls', async () => {
    vi.stubEnv('VITE_HOME_NEXT', 'false')

    const { getRouteTree } = await import('../router')
    const first = getRouteTree()
    const second = getRouteTree()
    expect(second).toBe(first)
    expect(routePaths(first)).not.toContain('/next')
  })

  it('registers /next with noindex, without legacy chrome, and without Google Fonts links when VITE_HOME_NEXT is true', async () => {
    vi.stubEnv('VITE_HOME_NEXT', 'true')

    const { getRouteTree } = await loadRouterAtPath('/next')
    const paths = routePaths(getRouteTree())
    expect(paths).toContain('/')
    expect(paths).toContain('/next')

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: 'Winzelle Projects' }),
      ).toBeDefined()
    })

    const robots = document.head.querySelector('meta[name="robots"]')
    expect(robots?.getAttribute('content')).toBe('noindex')
    expect(screen.queryByRole('link', { name: 'Get a Quote' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Chat on WhatsApp' })).toBeNull()
    expect(
      document.head.querySelector('link[href*="fonts.googleapis.com"]'),
    ).toBeNull()
    expect(
      document.head.querySelector('link[href*="fonts.gstatic.com"]'),
    ).toBeNull()
  })

  it('keeps the legacy / route, chrome, and Google Fonts links when VITE_HOME_NEXT is true', async () => {
    vi.stubEnv('VITE_HOME_NEXT', 'true')

    await loadRouterAtPath('/')

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Get a Quote' })).toBeDefined()
    })

    expect(screen.getByRole('link', { name: 'Chat on WhatsApp' })).toBeDefined()
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull()
    expect(
      document.head.querySelector(
        'link[rel="stylesheet"][href*="fonts.googleapis.com"]',
      ),
    ).not.toBeNull()
    expect(
      document.head.querySelector(
        'link[rel="preconnect"][href="https://fonts.gstatic.com"]',
      ),
    ).not.toBeNull()
  })

  it('does not inject duplicate LegacyFonts links on / when VITE_HOME_NEXT is unset', async () => {
    vi.stubEnv('VITE_HOME_NEXT', undefined)

    await loadRouterAtPath('/')

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Get a Quote' })).toBeDefined()
    })

    expect(
      document.head.querySelector('link[href*="fonts.googleapis.com"]'),
    ).toBeNull()
    expect(
      document.head.querySelector('link[href*="fonts.gstatic.com"]'),
    ).toBeNull()
  })
})

describe('redesign tokens and self-hosted fonts', () => {
  it('keeps Google Fonts tags in flag-off builds and strips them via transformIndexHtml when flag-on', async () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')
    const {
      default: viteConfig,
      resolveHomeNext,
      stripGoogleFontsPlugin,
    } = await import('../../vite.config')

    vi.stubEnv('VITE_HOME_NEXT', undefined)
    expect(resolveHomeNext('build', 'production')).toBe(false)
    expect(resolveHomeNext('serve', 'development')).toBe(true)

    const offConfig = await (
      viteConfig as unknown as (env: {
        command: 'build' | 'serve'
        mode: string
      }) => Promise<{
        define?: Record<string, string>
        plugins?: Array<{ name?: string }>
      }>
    )({ command: 'build', mode: 'production' })

    expect(offConfig.define?.['import.meta.env.VITE_HOME_NEXT']).toBe('"false"')
    expect(
      offConfig.plugins?.some(
        (plugin) => plugin?.name === 'strip-google-fonts',
      ),
    ).toBe(false)
    expect(html).toContain('fonts.googleapis.com')
    expect(html).toContain('fonts.gstatic.com')

    vi.stubEnv('VITE_HOME_NEXT', 'true')
    expect(resolveHomeNext('build', 'production')).toBe(true)

    const onConfig = await (
      viteConfig as unknown as (env: {
        command: 'build' | 'serve'
        mode: string
      }) => Promise<{
        define?: Record<string, string>
        plugins?: Array<{ name?: string }>
      }>
    )({ command: 'build', mode: 'production' })

    expect(onConfig.define?.['import.meta.env.VITE_HOME_NEXT']).toBe('"true"')
    expect(
      onConfig.plugins?.some((plugin) => plugin?.name === 'strip-google-fonts'),
    ).toBe(true)

    const plugin = stripGoogleFontsPlugin()
    const transform = plugin.transformIndexHtml as (
      input: string,
    ) => string | undefined
    const transformed = transform(html)
    expect(transformed).toBeDefined()
    expect(transformed).not.toContain('fonts.googleapis.com')
    expect(transformed).not.toContain('fonts.gstatic.com')
    expect(transformed).toContain('<div id="app"></div>')
  })

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
