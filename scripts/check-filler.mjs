// Fails a production build while any source file still contains a flagged
// filler() call (suburbs, months, the service-area line; replaced with
// confirmed facts in #102). Runs before vite build in npm run build.
//
// Scans src/ recursively so a placeholder in a subfolder cannot slip past.
// Tests pass a fixture directory as the first argument.

import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const MARKER = 'filler('
// filler.ts defines the marker itself; test files reference call sites in
// fixtures and assertions rather than holding placeholder values.
const EXCLUDED_NAMES = new Set(['filler.ts'])

const scanRoot = process.argv[2]
  ? resolve(process.argv[2])
  : join(process.cwd(), 'src')

function isScannable(name) {
  return (
    (name.endsWith('.ts') || name.endsWith('.tsx')) &&
    !name.includes('.test.') &&
    !EXCLUDED_NAMES.has(name)
  )
}

function collectSourceFiles(dir) {
  const files = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(path))
    } else if (isScannable(entry.name)) {
      files.push(path)
    }
  }
  return files
}

const flaggedFiles = collectSourceFiles(scanRoot)
  .filter((path) => readFileSync(path, 'utf8').includes(MARKER))
  .map((path) => relative(scanRoot, path))

if (flaggedFiles.length === 0) {
  console.log(
    `[check-filler] No flagged filler in ${relative(process.cwd(), scanRoot)}.`,
  )
  process.exit(0)
}

console.error(
  `[check-filler] Production build still contains flagged filler in: ${flaggedFiles.join(', ')}. ` +
    'Replace the filler() values with confirmed facts.',
)
process.exit(1)
