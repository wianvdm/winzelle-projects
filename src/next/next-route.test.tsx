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
        screen.getByRole('heading', {
          level: 1,
          name: 'We fix, maintain and build in Port Elizabeth.',
        }),
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

  it('keeps the legacy / route and chrome without injecting head tags when VITE_HOME_NEXT is true', async () => {
    vi.stubEnv('VITE_HOME_NEXT', 'true')

    await loadRouterAtPath('/')

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Get a Quote' })).toBeDefined()
    })

    expect(screen.getByRole('link', { name: 'Chat on WhatsApp' })).toBeDefined()
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull()
    // / gets its Google Fonts from the static tags in index.html.
    expect(document.head.querySelector('link[href*="fonts.g"]')).toBeNull()
  })

  it('registers the dev-only /next/drawings preview without legacy chrome when the flag is on', async () => {
    vi.stubEnv('VITE_HOME_NEXT', 'true')

    const { getRouteTree } = await loadRouterAtPath('/next/drawings')
    expect(routePaths(getRouteTree())).toContain('/next/drawings')

    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          level: 1,
          name: 'Surveyor drawing kit preview',
        }),
      ).toBeDefined()
    })
    expect(screen.queryByRole('link', { name: 'Get a Quote' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Chat on WhatsApp' })).toBeNull()
  })

  it('omits /next/drawings when the flag is off', async () => {
    vi.stubEnv('VITE_HOME_NEXT', 'false')

    const { getRouteTree } = await import('../router')
    expect(routePaths(getRouteTree())).not.toContain('/next/drawings')
  })
})

describe('redesign tokens and self-hosted fonts', () => {
  it('turns the flag on by default in every build and off with an explicit value', async () => {
    const { resolveHomeNext } = await import('../../vite.config')

    vi.stubEnv('VITE_HOME_NEXT', undefined)
    expect(resolveHomeNext('production')).toBe(true)
    expect(resolveHomeNext('development')).toBe(true)

    vi.stubEnv('VITE_HOME_NEXT', 'false')
    expect(resolveHomeNext('production')).toBe(false)
  })

  it('adds the next.html plugin only when the flag is on', async () => {
    const { default: viteConfig } = await import('../../vite.config')
    const resolveConfig = viteConfig as unknown as (env: {
      command: 'build' | 'serve'
      mode: string
    }) => Promise<{
      define?: Record<string, string>
      plugins?: Array<{ name?: string }>
    }>
    const pluginNames = (config: { plugins?: Array<{ name?: string }> }) =>
      config.plugins?.map((plugin) => plugin?.name)

    vi.stubEnv('VITE_HOME_NEXT', undefined)
    const onConfig = await resolveConfig({
      command: 'build',
      mode: 'production',
    })
    expect(onConfig.define?.['import.meta.env.VITE_HOME_NEXT']).toBe('"true"')
    expect(pluginNames(onConfig)).toContain('next-html')

    vi.stubEnv('VITE_HOME_NEXT', 'false')
    const offConfig = await resolveConfig({
      command: 'build',
      mode: 'production',
    })
    expect(offConfig.define?.['import.meta.env.VITE_HOME_NEXT']).toBe('"false"')
    expect(pluginNames(offConfig)).not.toContain('next-html')
  })

  it('derives next.html from index.html without Google Fonts or the canonical link, with a static noindex', async () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')
    const { toNextHtml } = await import('../../vite.config')

    expect(html).toContain('fonts.googleapis.com')
    expect(html).toContain('rel="canonical"')
    expect(html).not.toContain('name="robots"')

    const nextHtml = toNextHtml(html)
    expect(nextHtml).not.toContain('fonts.googleapis.com')
    expect(nextHtml).not.toContain('fonts.gstatic.com')
    expect(nextHtml).not.toContain('rel="canonical"')
    expect(
      nextHtml.match(/<meta name="robots" content="noindex" \/>/g),
    ).toHaveLength(1)
    expect(nextHtml).toContain('<div id="app"></div>')
    expect(nextHtml).toContain('<script type="module" src="/src/main.tsx">')
  })

  it('fails instead of emitting next.html when index.html drifts', async () => {
    const { toNextHtml } = await import('../../vite.config')

    expect(() => toNextHtml('<html><head></head></html>')).toThrow(
      /index\.html no longer contains/,
    )
  })

  it('emits next.html beside the built index.html and rewrites only /next in dev', async () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')
    const { nextHtmlPlugin, toNextHtml } = await import('../../vite.config')
    const plugin = nextHtmlPlugin()

    const emitFile = vi.fn()
    const generateBundle = plugin.generateBundle as unknown as (
      this: { emitFile: typeof emitFile },
      options: unknown,
      bundle: Record<string, unknown>,
    ) => void
    generateBundle.call(
      { emitFile },
      {},
      {
        'index.html': { type: 'asset', source: html },
      },
    )
    expect(emitFile).toHaveBeenCalledWith({
      type: 'asset',
      fileName: 'next.html',
      source: toNextHtml(html),
    })

    const transform = plugin.transformIndexHtml as (
      input: string,
      context: { server?: object; originalUrl?: string },
    ) => string | undefined
    expect(transform(html, { server: {}, originalUrl: '/next?x=1' })).toBe(
      toNextHtml(html),
    )
    expect(transform(html, { server: {}, originalUrl: '/' })).toBeUndefined()
    expect(transform(html, {})).toBeUndefined()
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

  it('keeps Tailwind from turning /next, content and test words into utilities', () => {
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
    expect(css).not.toContain('fonts.googleapis.com')
    expect(css).not.toContain('fonts.gstatic.com')
    expect(css).not.toContain('data:')
  })
})
