// Single source of truth for the VITE_HOME_NEXT flag, shared by
// vite.config.ts and scripts/check-filler.mjs so the build-time filler guard
// can never drift from the bundler's own resolution. Default: on in dev and
// in every build, production included, so the soak release (#104) serves
// /next. An explicit VITE_HOME_NEXT env value always wins: anything but
// 'true' turns /next off.

import { loadEnv } from 'vite'

export function resolveHomeNext(mode) {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const rawHomeNext = process.env.VITE_HOME_NEXT ?? env.VITE_HOME_NEXT
  return rawHomeNext === undefined || rawHomeNext === 'true'
}
