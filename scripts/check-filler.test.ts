import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

// The guard is a build-step script, so the tests run it as a subprocess with
// controlled env, the same way npm run build does.

function runCheckFiller(env: Record<string, string>) {
  const childEnv = { ...process.env }
  delete childEnv.VITE_HOME_NEXT
  delete childEnv.VITE_ALLOW_FILLER
  Object.assign(childEnv, env)
  return spawnSync(process.execPath, ['scripts/check-filler.mjs'], {
    cwd: process.cwd(),
    env: childEnv,
    encoding: 'utf8',
  })
}

describe('check-filler build guard', () => {
  it('fails a production build with VITE_HOME_NEXT=true while filler is flagged', () => {
    const result = runCheckFiller({ VITE_HOME_NEXT: 'true' })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('check-filler')
    expect(result.stderr).toContain('photos.ts')
    expect(result.stderr).toContain('contact.ts')
  })

  it('passes the same build with the VITE_ALLOW_FILLER=true opt-in', () => {
    const result = runCheckFiller({
      VITE_HOME_NEXT: 'true',
      VITE_ALLOW_FILLER: 'true',
    })
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
