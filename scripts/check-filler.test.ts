import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

// The guard is a build-step script, so the tests run it as a subprocess, the
// same way npm run build does. Scan behaviour runs against fixture
// directories, because src/ holds no filler() call since #102.

const FIXTURE_DIR = join(process.cwd(), 'scripts', 'fixtures', 'filler')

const tempDirs: string[] = []

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

function runCheckFiller(scanDir?: string) {
  return spawnSync(
    process.execPath,
    ['scripts/check-filler.mjs', ...(scanDir ? [scanDir] : [])],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  )
}

function makeScanDir(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'check-filler-'))
  tempDirs.push(dir)
  for (const [name, content] of Object.entries(files)) {
    const path = join(dir, name)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, content)
  }
  return dir
}

describe('check-filler build guard', () => {
  it('fails while filler is flagged, naming only the flagged files', () => {
    const result = runCheckFiller(FIXTURE_DIR)
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('check-filler')
    expect(result.stderr).toContain('flagged.ts')
    expect(result.stderr).not.toContain('clean.ts')
  })

  it('flags filler in nested subdirectories of the scanned tree', () => {
    const scanDir = makeScanDir({
      'nested/deep/placeholder.ts':
        "export const value = filler('Placeholder suburb')\n",
      'nested/confirmed.ts': "export const value = 'Newton Park'\n",
    })
    const result = runCheckFiller(scanDir)
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('placeholder.ts')
    expect(result.stderr).not.toContain('confirmed.ts')
  })

  it('passes when the scanned tree has no filler', () => {
    const scanDir = makeScanDir({
      'content/confirmed.ts': "export const value = 'Newton Park'\n",
    })
    const result = runCheckFiller(scanDir)
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('No flagged filler')
  })

  it('passes on the real src/ tree', () => {
    const result = runCheckFiller()
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('No flagged filler in src')
  })
})
