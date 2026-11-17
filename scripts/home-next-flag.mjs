// Single source of truth for the VITE_HOME_NEXT flag, shared by
// vite.config.ts and scripts/check-filler.mjs so the build-time filler guard
// can never drift from the bundler's own resolution. Default: on in
// `vite dev` (command 'serve'), off in `vite build` (command 'build'); an
// explicit VITE_HOME_NEXT env value always wins.

import { loadEnv } from 'vite'

export function resolveHomeNext(command, mode) {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const rawHomeNext = process.env.VITE_HOME_NEXT ?? env.VITE_HOME_NEXT
  return rawHomeNext !== undefined
    ? rawHomeNext === 'true'
    : command === 'serve'
}
