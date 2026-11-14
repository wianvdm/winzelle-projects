// Read-only production smoke test for the Winzelle static site. Used by the
// release deploy workflow after `wrangler deploy` and by the rollback
// workflow after `wrangler rollback`: GET/HEAD requests only, never submits
// the quote form, never prints secrets or response bodies.

import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

export const PRODUCTION_ORIGIN = 'https://winzelle.co.za'
export const DEFAULT_ATTEMPTS = 6
export const DEFAULT_DELAY_MS = 10_000
export const REQUEST_TIMEOUT_MS = 15_000
export const PLACEHOLDER_ACCESS_KEY = 'your-web3forms-access-key'

// The key is wired into the Web3Forms payload as access_key, so only a UUID
// bound to that field counts; a stray UUID elsewhere in the bundle is not a
// form key. The first alternative mirrors the placeholder-as-key pattern
// below (`access_key: "<uuid>"`); the second covers the minified shape, where
// the literal sits in a helper and the payload passes a variable
// (`access_key:r` beside `function ae(){return `<uuid>`}`), so the UUID may
// sit a short distance before the access_key reference.
const UUID_SOURCE =
  '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const MAX_ACCESS_KEY_DISTANCE = 4096
const ACCESS_KEY_UUID = new RegExp(
  `access_key["']?\\s*[:=]\\s*["']${UUID_SOURCE}["']` +
    `|${UUID_SOURCE}[\\s\\S]{0,${MAX_ACCESS_KEY_DISTANCE}}?access_key`,
  'i',
)
// public-env.ts ships the placeholder as a guard constant in every build,
// so presence alone is not a leak; it fails only when wired in as the key.
const PLACEHOLDER_AS_KEY =
  /access_key["']?\s*[:=]\s*["']your-web3forms-access-key["']/
// Anchored to the scheme and host boundary: a bare substring match would
// also pass on lookalike hosts (CodeQL
// js/incomplete-url-substring-sanitization).
const FORM_ENDPOINT = /https:\/\/api\.web3forms\.com\//

function tagAttribute(tag, name) {
  // The lookbehind keeps `src` from matching `data-src` and friends.
  const pattern = new RegExp(`(?<![\\w-])${name}\\s*=\\s*["']([^"']+)["']`, 'i')
  return pattern.exec(tag)?.[1] ?? null
}

// Vite emits the bundle references as `<script type="module" crossorigin
// src="/assets/index-XXXX.js">`; the Google Fonts link also carries
// rel="stylesheet", so only local (path-absolute) references qualify.
export function extractMainModuleScript(html) {
  for (const match of html.matchAll(/<script\b[^>]*>/gi)) {
    const tag = match[0]
    if (!/\btype\s*=\s*["']module["']/i.test(tag)) continue
    const src = tagAttribute(tag, 'src')
    if (src !== null && src.startsWith('/')) return src
  }
  return null
}

export function extractLocalStylesheet(html) {
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0]
    if (!/\brel\s*=\s*["']stylesheet["']/i.test(tag)) continue
    const href = tagAttribute(tag, 'href')
    if (href !== null && href.startsWith('/')) return href
  }
  return null
}

// TanStack Router code splitting lazy-loads the quote form from a separate
// chunk, so the Web3Forms config lives in the chunks the main script
// references, not always in the main script itself. The production minifier
// emits template literals (import(`./routes-x.js`)), so backticks count too.
const CHUNK_REFERENCE =
  /(?:import|from)\s*\(?\s*["'`](\.\.?\/[a-zA-Z0-9._-]+\.js)["'`]\s*\)?/g
const MAX_CHUNKS = 10

export function extractChunkReferences(scriptBody) {
  const refs = new Set()
  for (const match of scriptBody.matchAll(CHUNK_REFERENCE)) {
    refs.add(match[1])
  }
  return [...refs].slice(0, MAX_CHUNKS)
}

function extractCanonicalHref(html) {
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0]
    if (/\brel\s*=\s*["']canonical["']/i.test(tag)) {
      return tagAttribute(tag, 'href')
    }
  }
  return null
}

// Reads <distDir>/index.html from the freshly built bundle and returns the
// main module script path the deploy must serve once live.
export async function readExpectedScript(distDir) {
  const html = await readFile(`${distDir}/index.html`, 'utf8')
  return extractMainModuleScript(html)
}

function result(name, ok, reason) {
  return { name, ok, reason }
}

function mediaType(contentType) {
  return (contentType ?? '').split(';')[0].trim()
}

async function safeFetch(fetchImpl, url) {
  try {
    return {
      response: await fetchImpl(url, {
        method: 'GET',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      }),
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) }
  }
}

async function tryText(response) {
  try {
    return await response.text()
  } catch {
    return null
  }
}

async function runAttempt({ baseUrl, expectedScript, fetchImpl }) {
  const origin = baseUrl.replace(/\/+$/, '')
  const results = []
  let homepageHtml = null
  let moduleScript = null
  let stylesheet = null
  let moduleBody = null

  const home = await safeFetch(fetchImpl, `${origin}/`)
  if (home.error) {
    results.push(result('homepage', false, `request failed: ${home.error}`))
  } else if (home.response.status !== 200) {
    results.push(
      result('homepage', false, `GET / returned ${home.response.status}`),
    )
  } else if (
    mediaType(home.response.headers.get('content-type')) !== 'text/html'
  ) {
    results.push(
      result(
        'homepage',
        false,
        `content-type is ${mediaType(home.response.headers.get('content-type')) || 'missing'}`,
      ),
    )
  } else {
    homepageHtml = await tryText(home.response)
    if (homepageHtml === null) {
      results.push(result('homepage', false, 'response body unreadable'))
    } else {
      results.push(result('homepage', true, '200 text/html'))
    }
  }

  // Previews serve the same HTML as production, so the canonical href is
  // always compared to the production origin, not to baseUrl.
  const canonicalHref = homepageHtml ? extractCanonicalHref(homepageHtml) : null
  if (homepageHtml === null) {
    results.push(result('canonical', false, 'homepage unavailable'))
  } else if (canonicalHref !== `${PRODUCTION_ORIGIN}/`) {
    results.push(
      result(
        'canonical',
        false,
        `canonical href is ${canonicalHref ?? 'missing'}, expected ${PRODUCTION_ORIGIN}/`,
      ),
    )
  } else {
    results.push(
      result('canonical', true, `canonical href matches ${PRODUCTION_ORIGIN}/`),
    )
  }

  if (homepageHtml !== null) {
    moduleScript = extractMainModuleScript(homepageHtml)
    stylesheet = extractLocalStylesheet(homepageHtml)
  }

  if (moduleScript === null) {
    results.push(
      result('module-script', false, 'homepage has no local module script'),
    )
    results.push(result('form-endpoint', false, 'module script unavailable'))
    results.push(result('form-access-key', false, 'module script unavailable'))
  } else {
    const script = await safeFetch(fetchImpl, `${origin}${moduleScript}`)
    if (script.error) {
      results.push(
        result('module-script', false, `request failed: ${script.error}`),
      )
    } else if (script.response.status !== 200) {
      results.push(
        result(
          'module-script',
          false,
          `GET ${moduleScript} returned ${script.response.status}`,
        ),
      )
    } else {
      const type = mediaType(script.response.headers.get('content-type'))
      if (!type.includes('javascript')) {
        results.push(
          result(
            'module-script',
            false,
            `content-type is ${type || 'missing'}`,
          ),
        )
      } else {
        results.push(
          result('module-script', true, `200 ${type} at ${moduleScript}`),
        )
      }
      moduleBody = await tryText(script.response)
    }
    if (moduleBody === null) {
      results.push(
        result('form-endpoint', false, 'module script body unavailable'),
      )
      results.push(
        result('form-access-key', false, 'module script body unavailable'),
      )
    } else {
      // Follow the chunks the main script loads so the form checks cover
      // code-split routes; a missing chunk means a broken deploy.
      const bundleParts = [moduleBody]
      let chunkError = null
      for (const ref of extractChunkReferences(moduleBody)) {
        const chunkUrl = new URL(ref, `${origin}${moduleScript}`).pathname
        const chunk = await safeFetch(fetchImpl, `${origin}${chunkUrl}`)
        if (chunk.error) {
          chunkError = `chunk ${chunkUrl} failed: ${chunk.error}`
          break
        }
        if (chunk.response.status !== 200) {
          chunkError = `chunk ${chunkUrl} returned ${chunk.response.status}`
          break
        }
        bundleParts.push(await tryText(chunk.response))
      }
      const bundle = bundleParts.filter((part) => part !== null).join('\n')
      if (chunkError !== null) {
        results.push(result('form-endpoint', false, chunkError))
        results.push(result('form-access-key', false, chunkError))
      } else {
        const endpointFound = FORM_ENDPOINT.test(bundle)
        results.push(
          result(
            'form-endpoint',
            endpointFound,
            endpointFound
              ? 'references api.web3forms.com'
              : 'does not reference api.web3forms.com',
          ),
        )
        const placeholderAsKey = PLACEHOLDER_AS_KEY.test(bundle)
        const keyPresent = ACCESS_KEY_UUID.test(bundle)
        if (placeholderAsKey) {
          results.push(
            result('form-access-key', false, 'placeholder used as access key'),
          )
        } else if (!keyPresent) {
          results.push(result('form-access-key', false, 'key missing'))
        } else {
          results.push(result('form-access-key', true, 'key present'))
        }
      }
    }
  }

  if (stylesheet === null) {
    results.push(
      result('stylesheet', false, 'homepage has no local stylesheet'),
    )
  } else {
    const css = await safeFetch(fetchImpl, `${origin}${stylesheet}`)
    if (css.error) {
      results.push(result('stylesheet', false, `request failed: ${css.error}`))
    } else if (css.response.status !== 200) {
      results.push(
        result(
          'stylesheet',
          false,
          `GET ${stylesheet} returned ${css.response.status}`,
        ),
      )
    } else {
      const type = mediaType(css.response.headers.get('content-type'))
      results.push(
        result(
          'stylesheet',
          type.includes('css'),
          type.includes('css')
            ? `200 ${type} at ${stylesheet}`
            : `content-type is ${type || 'missing'}`,
        ),
      )
    }
  }

  const fallback = await safeFetch(
    fetchImpl,
    `${origin}/smoke-test-missing-page`,
  )
  if (fallback.error) {
    results.push(
      result('spa-fallback', false, `request failed: ${fallback.error}`),
    )
  } else if (fallback.response.status !== 200) {
    results.push(
      result(
        'spa-fallback',
        false,
        `GET /smoke-test-missing-page returned ${fallback.response.status}`,
      ),
    )
  } else if (
    mediaType(fallback.response.headers.get('content-type')) !== 'text/html'
  ) {
    results.push(
      result(
        'spa-fallback',
        false,
        `content-type is ${mediaType(fallback.response.headers.get('content-type')) || 'missing'}`,
      ),
    )
  } else {
    const fallbackHtml = await tryText(fallback.response)
    const fallbackScript = fallbackHtml
      ? extractMainModuleScript(fallbackHtml)
      : null
    if (moduleScript === null || fallbackScript === null) {
      results.push(
        result('spa-fallback', false, 'module script reference missing'),
      )
    } else if (fallbackScript !== moduleScript) {
      results.push(
        result(
          'spa-fallback',
          false,
          'fallback serves a different module script',
        ),
      )
    } else {
      results.push(
        result('spa-fallback', true, 'serves the app shell for unknown routes'),
      )
    }
  }

  const logo = await safeFetch(
    fetchImpl,
    `${origin}/content/images/winzelle-logo.jpg`,
  )
  if (logo.error) {
    results.push(result('media-logo', false, `request failed: ${logo.error}`))
  } else if (logo.response.status !== 200) {
    results.push(
      result('media-logo', false, `GET logo returned ${logo.response.status}`),
    )
  } else {
    const type = mediaType(logo.response.headers.get('content-type'))
    results.push(
      result(
        'media-logo',
        type.startsWith('image/'),
        type.startsWith('image/')
          ? `200 ${type}`
          : `content-type is ${type || 'missing'}`,
      ),
    )
  }

  if (expectedScript !== null) {
    results.push(
      result(
        'expected-script',
        moduleScript === expectedScript,
        moduleScript === expectedScript
          ? `serves expected build ${expectedScript}`
          : `serves ${moduleScript ?? 'no module script'}, expected ${expectedScript}`,
      ),
    )
  }

  return results
}

function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Runs the full check set, retrying while Cloudflare propagates the new
// deployment. Only the final attempt's results are returned.
export async function runSmoke({
  baseUrl,
  expectedScript = null,
  fetch: fetchImpl = globalThis.fetch,
  attempts = DEFAULT_ATTEMPTS,
  delayMs = DEFAULT_DELAY_MS,
  sleep = defaultSleep,
}) {
  let results = []
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    results = await runAttempt({ baseUrl, expectedScript, fetchImpl })
    const failed = results.filter((entry) => !entry.ok).length
    if (failed === 0) return { ok: true, results }
    if (attempt < attempts && delayMs > 0) await sleep(delayMs)
  }
  return { ok: false, results }
}

function positiveInt(value) {
  if (value === undefined) return null
  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function parseArgs(argv) {
  const positional = []
  let expectDist = null
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--expect-dist') {
      const value = argv[index + 1]
      if (value === undefined || value.startsWith('--')) {
        throw new Error('--expect-dist requires a directory value')
      }
      expectDist = value
      index += 1
    } else if (arg.startsWith('--')) {
      throw new Error(`unknown option: ${arg}`)
    } else {
      positional.push(arg)
    }
  }
  if (positional.length !== 1) {
    throw new Error(
      'usage: node scripts/smoke.mjs <baseUrl> [--expect-dist <dir>]',
    )
  }
  return { baseUrl: positional[0], expectDist }
}

async function main() {
  let baseUrl
  let expectDist
  try {
    ;({ baseUrl, expectDist } = parseArgs(process.argv.slice(2)))
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
  if (!/^https?:\/\//.test(baseUrl)) {
    console.error(`baseUrl must start with http:// or https://, got ${baseUrl}`)
    process.exit(1)
  }

  let expectedScript = null
  if (expectDist !== null) {
    try {
      expectedScript = await readExpectedScript(expectDist)
    } catch (error) {
      console.error(
        `--expect-dist: cannot read build manifest: ${error.message}`,
      )
      process.exit(1)
    }
    if (expectedScript === null) {
      console.error(
        `--expect-dist: no module script found in ${expectDist}/index.html`,
      )
      process.exit(1)
    }
  }

  const attempts = positiveInt(process.env.SMOKE_ATTEMPTS) ?? DEFAULT_ATTEMPTS
  const delayMs = positiveInt(process.env.SMOKE_DELAY_MS) ?? DEFAULT_DELAY_MS
  const { ok, results } = await runSmoke({
    baseUrl,
    expectedScript,
    attempts,
    delayMs,
  })
  for (const entry of results) {
    console.log(`${entry.ok ? 'PASS' : 'FAIL'} ${entry.name}: ${entry.reason}`)
  }
  const failed = results.filter((entry) => !entry.ok).length
  console.log(
    ok
      ? `Smoke test passed (${results.length} checks).`
      : `Smoke test failed with ${failed} failing check(s).`,
  )
  process.exit(ok ? 0 : 1)
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error(error.message)
    process.exit(1)
  })
}
