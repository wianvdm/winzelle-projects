import { defineConfig, type Plugin } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

import { tanstackRouter } from '@tanstack/router-plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { resolveHomeNext } from './scripts/home-next-flag.mjs'

const NEXT_PATH = '/next'
// Dev request URLs are path-only; URL() needs some origin to parse them.
const DEV_URL_BASE = 'http://localhost'
const NEXT_HTML_FILE = 'next.html'
const INDEX_HTML_FILE = 'index.html'
const CHARSET_META = '<meta charset="UTF-8" />'
const ROBOTS_NOINDEX_META = '<meta name="robots" content="noindex" />'
const GOOGLE_FONTS_LINK_PATTERN =
  /[ \t]*<link\b[^>]*href=["']https:\/\/fonts\.g(?:oogleapis|static)\.com[^"']*["'][^>]*\/?>\r?\n?/gi
// A noindex page whose canonical points at / mixes signals about /.
const CANONICAL_LINK_PATTERN = /[ \t]*<link rel="canonical"[^>]*>\r?\n?/g

// Re-exported so tests and callers keep one import site; the implementation
// lives in scripts/home-next-flag.mjs, shared with scripts/check-filler.mjs.
export { resolveHomeNext }

function replaceRequired(html: string, pattern: RegExp, replacement: string) {
  if (!html.match(pattern)) {
    throw new Error(`next.html: index.html no longer contains ${pattern}`)
  }
  return html.replace(pattern, replacement)
}

// /next's HTML: index.html without the Google Fonts tags and the canonical
// link, plus a static noindex. Fails the build if index.html drifts so far
// that a tag cannot be found.
export function toNextHtml(indexHtml: string): string {
  const withoutFonts = replaceRequired(indexHtml, GOOGLE_FONTS_LINK_PATTERN, '')
  const withoutCanonical = replaceRequired(
    withoutFonts,
    CANONICAL_LINK_PATTERN,
    '',
  )
  return replaceRequired(
    withoutCanonical,
    new RegExp(CHARSET_META),
    `${CHARSET_META}\n    ${ROBOTS_NOINDEX_META}`,
  )
}

// Emits dist/next.html from the built index.html instead of adding a second
// HTML entry: a second entry splits the shared chunks and changes the script
// tags in index.html, and / must ship byte for byte as the flag-off build
// (#104). Cloudflare assets answer /next with next.html before the SPA
// fallback; in dev the same transform runs for /next.
export function nextHtmlPlugin(): Plugin {
  return {
    name: 'next-html',
    enforce: 'post',
    transformIndexHtml(html, context) {
      if (!context.server) return undefined
      const { pathname } = new URL(context.originalUrl ?? '/', DEV_URL_BASE)
      return pathname === NEXT_PATH ? toNextHtml(html) : undefined
    },
    generateBundle(_options, bundle) {
      const index = bundle[INDEX_HTML_FILE]
      if (index?.type !== 'asset' || typeof index.source !== 'string') {
        throw new Error(`next.html: no ${INDEX_HTML_FILE} in the bundle`)
      }
      this.emitFile({
        type: 'asset',
        fileName: NEXT_HTML_FILE,
        source: toNextHtml(index.source),
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const homeNext = resolveHomeNext(mode)

  return {
    define: {
      'import.meta.env.VITE_HOME_NEXT': JSON.stringify(
        homeNext ? 'true' : 'false',
      ),
    },
    plugins: [
      tsconfigPaths({ projects: ['./tsconfig.json'] }),
      tailwindcss(),
      tanstackRouter({ target: 'react', autoCodeSplitting: true }),
      viteReact(),
      ...(homeNext ? [nextHtmlPlugin()] : []),
    ],
  }
})
