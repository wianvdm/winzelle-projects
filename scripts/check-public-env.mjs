import { loadEnv } from 'vite'

const PLACEHOLDER_WEB3FORMS_ACCESS_KEY = 'your-web3forms-access-key'
const KEY = 'VITE_WEB3FORMS_ACCESS_KEY'

// Merge env the way Vite does for a production build: .env files for the
// production mode on top of process.env.
const fileEnv = loadEnv('production', process.cwd(), 'VITE_')
const value = fileEnv[KEY] ?? process.env[KEY]

const isValid =
  value !== undefined &&
  value.trim() !== '' &&
  value.trim() !== PLACEHOLDER_WEB3FORMS_ACCESS_KEY

if (isValid) {
  console.log(`[check-public-env] ${KEY} is set.`)
  process.exit(0)
}

const message =
  `${KEY} is missing, empty, or still set to the ` +
  `.env.example placeholder "${PLACEHOLDER_WEB3FORMS_ACCESS_KEY}". ` +
  'Set a real Web3Forms access key before building.'

if (process.env.CI || process.env.WORKERS_CI) {
  console.error(`[check-public-env] ${message}`)
  process.exit(1)
}

console.warn(`[check-public-env] Warning: ${message}`)
process.exit(0)
