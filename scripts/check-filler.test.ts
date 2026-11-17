import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

// The guard is a build-step script, so the tests run it as a subprocess with
// controlled env, the same way npm run build does. Scan behaviour runs
// against a fixture directory, so these tests keep passing after #102
// removes every filler() call from src/.

const FIXTURE_DIR = join(process.cwd(), 'scripts', 'fixtures', 'filler')

const tempDirs: string[] = []

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

function runCheckFiller(env: Record<string, string>, scanDir?: string) {
  const childEnv = { ...process.env }
  delete childEnv.VITE_HOME_NEXT
  delete childEnv.VITE_ALLOW_FILLER
  Object.assign(childEnv, env)
  return spawnSync(
    process.execPath,
    ['scripts/check-filler.mjs', ...(scanDir ? [scanDir] : [])],
    {
      cwd: process.cwd(),
      env: childEnv,
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
  it('fails a flag-on production build while filler is flagged, naming only the flagged files', () => {
    const result = runCheckFiller({ VITE_HOME_NEXT: 'true' }, FIXTURE_DIR)
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
    const result = runCheckFiller({ VITE_HOME_NEXT: 'true' }, scanDir)
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('placeholder.ts')
    expect(result.stderr).not.toContain('confirmed.ts')
  })

  it('passes a flag-on production build when the scanned tree has no filler', () => {
    const scanDir = makeScanDir({
      'content/confirmed.ts': "export const value = 'Newton Park'\n",
    })
    const result = runCheckFiller({ VITE_HOME_NEXT: 'true' }, scanDir)
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('No flagged filler')
  })

  it('passes the same build with the VITE_ALLOW_FILLER=true opt-in', () => {
    const result = runCheckFiller(
      { VITE_HOME_NEXT: 'true', VITE_ALLOW_FILLER: 'true' },
      FIXTURE_DIR,
    )
    expect(result.status).toBe(0)
  })

  it('passes a production build with the flag unset (default off)', () => {
    const result = runCheckFiller({})
    expect(result.status).toBe(0)
  })

  it('passes a production build with VITE_HOME_NEXT=false', () => {
    const result = runCheckFiller({ VITE_HOME_NEXT: 'false' })
    expect(result.status).toBe(0)
  })
})
