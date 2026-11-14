import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getWeb3FormsAccessKey,
  PLACEHOLDER_WEB3FORMS_ACCESS_KEY,
} from './public-env'

describe('getWeb3FormsAccessKey', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns the key when a valid value is set', () => {
    vi.stubEnv('VITE_WEB3FORMS_ACCESS_KEY', 'real-key-123')
    expect(getWeb3FormsAccessKey()).toBe('real-key-123')
  })

  it('returns undefined when the key is missing', () => {
    vi.stubEnv('VITE_WEB3FORMS_ACCESS_KEY', undefined)
    expect(getWeb3FormsAccessKey()).toBeUndefined()
  })

  it('returns undefined when the key is empty or whitespace', () => {
    vi.stubEnv('VITE_WEB3FORMS_ACCESS_KEY', '')
    expect(getWeb3FormsAccessKey()).toBeUndefined()

    vi.stubEnv('VITE_WEB3FORMS_ACCESS_KEY', '   ')
    expect(getWeb3FormsAccessKey()).toBeUndefined()
  })

  it('returns undefined when the key is the .env.example placeholder', () => {
    vi.stubEnv('VITE_WEB3FORMS_ACCESS_KEY', PLACEHOLDER_WEB3FORMS_ACCESS_KEY)
    expect(getWeb3FormsAccessKey()).toBeUndefined()
    expect(PLACEHOLDER_WEB3FORMS_ACCESS_KEY).toBe('your-web3forms-access-key')
  })
})
