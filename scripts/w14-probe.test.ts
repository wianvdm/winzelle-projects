import { describe, expect, it } from 'vitest'

// Throwaway W14 (#16) acceptance probe; this PR is never merged.
describe('w14 probe', () => {
  it('passes', () => {
    expect(1 + 1).toBe(2)
  })
})
