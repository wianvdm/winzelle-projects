import { describe, expect, it } from 'vitest'

// Throwaway W14 (#16) acceptance probe; never merged, closed at the end.
describe('w14 probe', () => {
  it('passes', () => {
    expect(1 + 1).toBe(3)
  })
})
