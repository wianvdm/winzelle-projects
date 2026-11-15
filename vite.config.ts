import { defineConfig, loadEnv } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

import { tanstackRouter } from '@tanstack/router-plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const rawHomeNext = process.env.VITE_HOME_NEXT ?? env.VITE_HOME_NEXT
  const homeNext =
    rawHomeNext !== undefined ? rawHomeNext === 'true' : command === 'serve'

  if (process.env.VITE_HOME_NEXT === undefined && !process.env.VITEST) {
    process.env.VITE_HOME_NEXT = homeNext ? 'true' : 'false'
  }

  return {
    plugins: [
      tsconfigPaths({ projects: ['./tsconfig.json'] }),
      tailwindcss(),
      tanstackRouter({ target: 'react', autoCodeSplitting: true }),
      viteReact(),
    ],
  }
})
