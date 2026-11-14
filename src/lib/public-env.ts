export const PLACEHOLDER_WEB3FORMS_ACCESS_KEY = 'your-web3forms-access-key'

export function getWeb3FormsAccessKey(): string | undefined {
  const value = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY
  if (value === undefined) return undefined
  const trimmed = value.trim()
  if (trimmed === '' || trimmed === PLACEHOLDER_WEB3FORMS_ACCESS_KEY) {
    return undefined
  }
  return value
}
