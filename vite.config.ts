import { defineConfig, loadEnv, type Plugin } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

import { tanstackRouter } from '@tanstack/router-plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const GOOGLE_FONTS_LINK_PATTERN =
  /[ \t]*<link\b[^>]*href=["']https:\/\/fonts\.g(?:oogleapis|static)\.com[^"']*["'][^>]*\/?>\r?\n?/gi

export function resolveHomeNext(
  command: 'build' | 'serve',
  mode: string,
): boolean {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const rawHomeNext = process.env.VITE_HOME_NEXT ?? env.VITE_HOME_NEXT
  return rawHomeNext !== undefined
    ? rawHomeNext === 'true'
    : command === 'serve'
}

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
