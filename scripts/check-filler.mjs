// Fails a production build that enables /next while the new page's content
// still contains flagged filler() values (suburbs, months, the service-area
// line; replaced with confirmed facts in #102). Runs before vite build in
// npm run build. VITE_HOME_NEXT resolution mirrors resolveHomeNext in
// vite.config.ts for command 'build': default off, opt in with 'true'.
// VITE_ALLOW_FILLER=true is the explicit opt-in for builds that knowingly
// ship placeholders, such as the design-gate workflow's flag-on build.

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadEnv } from 'vite'

const CONTENT_DIR = join(process.cwd(), 'src/content/next')
const MARKER = 'filler('

const fileEnv = loadEnv('production', process.cwd(), 'VITE_')
const rawHomeNext = process.env.VITE_HOME_NEXT ?? fileEnv.VITE_HOME_NEXT

if (rawHomeNext !== 'true') {
  console.log('[check-filler] /next is off in this build; filler allowed.')
  process.exit(0)
}

if (process.env.VITE_ALLOW_FILLER === 'true') {
  console.log('[check-filler] VITE_ALLOW_FILLER=true: flagged filler allowed.')
  process.exit(0)
}

const flaggedFiles = readdirSync(CONTENT_DIR)
  .filter(
    (name) =>
      name.endsWith('.ts') &&
      !name.endsWith('.test.ts') &&
      name !== 'filler.ts',
  )
  .filter((name) =>
    readFileSync(join(CONTENT_DIR, name), 'utf8').includes(MARKER),
  )

if (flaggedFiles.length === 0) {
  console.log('[check-filler] No flagged filler in src/content/next/.')
  process.exit(0)
}

console.error(
  `[check-filler] Production build with VITE_HOME_NEXT=true still contains flagged filler in: ${flaggedFiles.join(', ')}. ` +
    'Replace the filler() values (#102), or set VITE_ALLOW_FILLER=true for a build that knowingly ships placeholders.',
)
process.exit(1)
