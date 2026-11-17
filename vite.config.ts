import { defineConfig, type Plugin } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

import { tanstackRouter } from '@tanstack/router-plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { resolveHomeNext } from './scripts/home-next-flag.mjs'

const GOOGLE_FONTS_LINK_PATTERN =
  /[ \t]*<link\b[^>]*href=["']https:\/\/fonts\.g(?:oogleapis|static)\.com[^"']*["'][^>]*\/?>\r?\n?/gi

// Re-exported so tests and callers keep one import site; the implementation
// lives in scripts/home-next-flag.mjs, shared with scripts/check-filler.mjs.
export { resolveHomeNext }

export function stripGoogleFontsPlugin(): Plugin {
  return {
    name: 'strip-google-fonts',
    transformIndexHtml(html) {
      return html.replace(GOOGLE_FONTS_LINK_PATTERN, '')
    },
  }
}

export default defineConfig(({ command, mode }) => {
  const homeNext = resolveHomeNext(command, mode)

  return {
    define: {
      'import.meta.env.VITE_HOME_NEXT': JSON.stringify(
        homeNext ? 'true' : 'false',
      ),
    },
    plugins: [
      ...(homeNext ? [stripGoogleFontsPlugin()] : []),
      tsconfigPaths({ projects: ['./tsconfig.json'] }),
      tailwindcss(),
      tanstackRouter({ target: 'react', autoCodeSplitting: true }),
      viteReact(),
    ],
  }
})
