// Read-only production smoke test for the Winzelle static site. Used by the
// release deploy workflow after `wrangler deploy`, by the rollback workflow
// after `wrangler rollback` and by the Production smoke workflow: GET/HEAD
// requests only, never submits the quote form, never prints secrets or
// response bodies.

import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

export const PRODUCTION_ORIGIN = 'https://winzelle.co.za'
const WWW_ORIGIN = 'https://www.winzelle.co.za'
const WWW_PROBE_PATH = '/smoke-www-check?probe=1'
export const DEFAULT_ATTEMPTS = 6
export const DEFAULT_DELAY_MS = 10_000
export const REQUEST_TIMEOUT_MS = 15_000
export const PLACEHOLDER_ACCESS_KEY = 'your-web3forms-access-key'

// The key is wired into the Web3Forms payload as access_key, so only a UUID
// bound to that field counts; a stray UUID elsewhere in the bundle is not a
// form key. Each chunk is checked on its own. The first alternative mirrors
// the placeholder-as-key pattern below (`access_key: "<uuid>"`); the second
// covers the minified shape, where the literal sits in a helper and the
// payload passes a variable (`access_key:r` beside
// `function ae(){return `<uuid>`}`), so the UUID may sit a short distance
// before the access_key reference.
const UUID_SOURCE =
  '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const MAX_ACCESS_KEY_DISTANCE = 4096
const ACCESS_KEY_UUID = new RegExp(
  `access_key["']?\\s*[:=]\\s*["']${UUID_SOURCE}["']` +
    `|${UUID_SOURCE}[\\s\\S]{0,${MAX_ACCESS_KEY_DISTANCE}}?access_key`,
  'i',
)
// When two chunks share the key helper, the bundler moves it into its own
// chunk (`function e(){return `<uuid>`}export{e as t};`) and the payload
// chunks import it statically, directly or through another chunk. The key
// then counts only when a chunk that sets access_key holds a helper that
// returns the UUID (in any order, at any distance) or reaches one through
// static imports.
const ACCESS_KEY_FIELD = /access_key["']?\s*[:=]/
const KEY_HELPER = new RegExp(`return\\s*["'\`]${UUID_SOURCE}["'\`]`, 'i')
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
// src="/assets/index-XXXX.js">`; a remote stylesheet link (older releases
// load web fonts that way) also carries rel="stylesheet", so only local
// (path-absolute) references qualify.
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
// chunk, and that chunk can import the Web3Forms key from yet another one,
// so the form checks follow chunk references transitively. The production
// minifier emits template literals (import(`./routes-x.js`)), so backticks
// count too.
const CHUNK_REFERENCE =
  /(?:import|from)\s*\(?\s*["'`](\.\.?\/[a-zA-Z0-9._-]+\.js)["'`]\s*\)?/g
const STATIC_IMPORT = /from\s*["'`](\.\.?\/[a-zA-Z0-9._-]+\.js)["'`]/g
// Counts the main script. Chunks past the bound go unchecked, so a runaway
// chunk graph cannot stall the deploy.
export const MAX_BUNDLE_CHUNKS = 20

function uniqueMatches(scriptBody, pattern) {
  return [
    ...new Set([...scriptBody.matchAll(pattern)].map((match) => match[1])),
  ]
}

export function extractChunkReferences(scriptBody) {
  return uniqueMatches(scriptBody, CHUNK_REFERENCE)
}

export function extractStaticImports(scriptBody) {
  return uniqueMatches(scriptBody, STATIC_IMPORT)
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

async function safeFetch(fetchImpl, url, init = {}) {
  try {
    return {
      response: await fetchImpl(url, {
        method: 'GET',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        ...init,
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

// Header checks read only 200 responses, so an error page reports through
// the check that owns the URL instead of as a misleading header failure.
function okHeaders(fetched) {
  return fetched.response?.status === 200 ? fetched.response.headers : null
}

// Chunk references are relative to the referencing chunk; only the path is
// kept, so any base host works.
const CHUNK_PATH_BASE = 'http://chunk.invalid'

function chunkPaths(fromPath, references) {
  return references.map(
    (ref) => new URL(ref, `${CHUNK_PATH_BASE}${fromPath}`).pathname,
  )
}

// The SPA fallback answers a missing /assets/*.js with 200 text/html, so only
// a JavaScript content type proves the chunk was served.
const JAVASCRIPT_TYPES = new Set(['text/javascript', 'application/javascript'])

async function fetchChunk(fetchImpl, url) {
  const chunk = await safeFetch(fetchImpl, url)
  if (chunk.error) return { error: `failed: ${chunk.error}` }
  if (chunk.response.status !== 200) {
    return { error: `returned ${chunk.response.status}` }
  }
  const type = mediaType(chunk.response.headers.get('content-type'))
  if (!JAVASCRIPT_TYPES.has(type.toLowerCase())) {
    return { error: `returned ${type || 'no content type'}, not JavaScript` }
  }
  return { text: (await tryText(chunk.response)) ?? '' }
}

// Breadth-first from the main script, each chunk fetched once, so the form
// checks cover code-split routes; a missing chunk means a broken deploy.
async function fetchBundle({ fetchImpl, origin, moduleScript, moduleBody }) {
  const chunks = new Map([[moduleScript, moduleBody]])
  const pending = chunkPaths(moduleScript, extractChunkReferences(moduleBody))
  while (pending.length > 0 && chunks.size < MAX_BUNDLE_CHUNKS) {
    const path = pending.shift()
    if (chunks.has(path)) continue
    const chunk = await fetchChunk(fetchImpl, `${origin}${path}`)
    if (chunk.error) return { error: `chunk ${path} ${chunk.error}` }
    chunks.set(path, chunk.text)
    pending.push(...chunkPaths(path, extractChunkReferences(chunk.text)))
  }
  return { chunks }
}

// Every chunk reachable from path through static imports, each once, so an
// import cycle cannot loop.
function staticDependencies(chunks, path) {
  const reached = new Set([path])
  const pending = [path]
  while (pending.length > 0) {
    const current = pending.pop()
    const imports = chunkPaths(
      current,
      extractStaticImports(chunks.get(current) ?? ''),
    ).filter((dependency) => !reached.has(dependency))
    for (const dependency of imports) reached.add(dependency)
    pending.push(...imports)
  }
  reached.delete(path)
  return [...reached]
}

function reachesKeyHelper(chunks, path) {
  if (!ACCESS_KEY_FIELD.test(chunks.get(path))) return false
  return [path, ...staticDependencies(chunks, path)].some((dependency) =>
    KEY_HELPER.test(chunks.get(dependency) ?? ''),
  )
}

function checkAccessKey(chunks) {
  const texts = [...chunks.values()]
  if (texts.some((text) => PLACEHOLDER_AS_KEY.test(text))) {
    return result('form-access-key', false, 'placeholder used as access key')
  }
  const keyBound = [...chunks].some(
    ([path, text]) =>
      ACCESS_KEY_UUID.test(text) || reachesKeyHelper(chunks, path),
  )
  return keyBound
    ? result('form-access-key', true, 'key present')
    : result('form-access-key', false, 'key missing')
}

const MIN_HSTS_MAX_AGE_SECONDS = 31_536_000
const MIN_ASSET_MAX_AGE_SECONDS = 31_536_000
const MAX_AGE_DIRECTIVE = /(?:^|[,\s])max-age=(\d+)/gi
const IMMUTABLE_DIRECTIVE = /(?:^|[,\s])immutable(?:$|[,\s])/i

function maxAgeValues(headerValue) {
  return [...headerValue.matchAll(MAX_AGE_DIRECTIVE)].map((match) =>
    Number.parseInt(match[1], 10),
  )
}

function isNosniff(headers) {
  return headers.get('x-content-type-options')?.toLowerCase() === 'nosniff'
}

function checkSecurityHeaders(homeHeaders, fallbackHeaders) {
  if (homeHeaders === null) {
    return result('security-headers', false, 'homepage unavailable')
  }
  const problems = []
  const csp = homeHeaders.get('content-security-policy') ?? ''
  if (!csp.includes("default-src 'self'")) {
    problems.push("content-security-policy lacks default-src 'self'")
  }
  if (!csp.includes("frame-ancestors 'none'")) {
    problems.push("content-security-policy lacks frame-ancestors 'none'")
  }
  if (!isNosniff(homeHeaders)) {
    problems.push('x-content-type-options is not nosniff')
  }
  if (
    homeHeaders.get('referrer-policy') !== 'strict-origin-when-cross-origin'
  ) {
    problems.push('referrer-policy is not strict-origin-when-cross-origin')
  }
  const [hstsMaxAge] = maxAgeValues(
    homeHeaders.get('strict-transport-security') ?? '',
  )
  if ((hstsMaxAge ?? 0) < MIN_HSTS_MAX_AGE_SECONDS) {
    problems.push(
      `strict-transport-security max-age is below ${MIN_HSTS_MAX_AGE_SECONDS}`,
    )
  }
  if (fallbackHeaders === null) {
    problems.push('spa fallback unavailable')
  } else {
    if (!fallbackHeaders.get('content-security-policy')) {
      problems.push('spa fallback lacks content-security-policy')
    }
    if (!isNosniff(fallbackHeaders)) {
      problems.push('spa fallback x-content-type-options is not nosniff')
    }
  }
  if (problems.length > 0) {
    return result('security-headers', false, problems.join('; '))
  }
  return result('security-headers', true, 'security headers present')
}

// Duplicate max-age directives are ambiguous (RFC 9111 section 4.2.1 lets a
// cache keep the first or treat the response as stale), so exactly one counts.
function checkAssetCache(scriptHeaders) {
  if (scriptHeaders === null) {
    return result('asset-cache', false, 'module script unavailable')
  }
  const cacheControl = scriptHeaders.get('cache-control') ?? ''
  const maxAges = maxAgeValues(cacheControl)
  if (maxAges.length !== 1) {
    return result(
      'asset-cache',
      false,
      `cache-control has ${maxAges.length} max-age directives, expected 1`,
    )
  }
  if (maxAges[0] < MIN_ASSET_MAX_AGE_SECONDS) {
    return result(
      'asset-cache',
      false,
      `cache-control max-age is ${maxAges[0]}, expected at least ${MIN_ASSET_MAX_AGE_SECONDS}`,
    )
  }
  if (!IMMUTABLE_DIRECTIVE.test(cacheControl)) {
    return result('asset-cache', false, 'cache-control lacks immutable')
  }
  return result('asset-cache', true, 'module script is immutable and cached')
}

// The zone Redirect Rule from #43 sends www to the apex with a 301, so 302,
// 307 and 308 fail on purpose. redirect: 'manual' keeps fetch from following
// the redirect and hiding the status.
async function checkWwwRedirect(fetchImpl) {
  const expectedLocation = `${PRODUCTION_ORIGIN}${WWW_PROBE_PATH}`
  const www = await safeFetch(fetchImpl, `${WWW_ORIGIN}${WWW_PROBE_PATH}`, {
    redirect: 'manual',
  })
  if (www.error) {
    return result('www-redirect', false, `request failed: ${www.error}`)
  }
  const { status } = www.response
  const location = www.response.headers.get('location')
  if (status !== 301) {
    return result('www-redirect', false, `status ${status}, expected 301`)
  }
  if (location !== expectedLocation) {
    return result(
      'www-redirect',
      false,
      `location is ${location ?? 'missing'}, expected ${expectedLocation}`,
    )
  }
  return result('www-redirect', true, `301 to ${expectedLocation}`)
}

async function runAttempt({
  baseUrl,
  expectedScript,
  expectHeaders,
  expectWwwRedirect,
  fetchImpl,
}) {
  const origin = baseUrl.replace(/\/+$/, '')
  const results = []
  let homepageHtml = null
  let moduleScript = null
  let stylesheet = null
  let moduleBody = null
  let scriptHeaders = null

  const home = await safeFetch(fetchImpl, `${origin}/`)
  const homeHeaders = okHeaders(home)
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
    scriptHeaders = okHeaders(script)
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
      const bundle = await fetchBundle({
        fetchImpl,
        origin,
        moduleScript,
        moduleBody,
      })
      if (bundle.error) {
        results.push(result('form-endpoint', false, bundle.error))
        results.push(result('form-access-key', false, bundle.error))
      } else {
        const endpointFound = [...bundle.chunks.values()].some((text) =>
          FORM_ENDPOINT.test(text),
        )
        results.push(
          result(
            'form-endpoint',
            endpointFound,
            endpointFound
              ? 'references api.web3forms.com'
              : 'does not reference api.web3forms.com',
          ),
        )
        results.push(checkAccessKey(bundle.chunks))
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
  const fallbackHeaders = okHeaders(fallback)
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

  if (expectHeaders) {
    results.push(checkSecurityHeaders(homeHeaders, fallbackHeaders))
    results.push(checkAssetCache(scriptHeaders))
  }

  // Only production has the www rule; other origins skip the check.
  if (expectWwwRedirect && origin === PRODUCTION_ORIGIN) {
    results.push(await checkWwwRedirect(fetchImpl))
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
  expectHeaders = false,
  expectWwwRedirect = false,
  fetch: fetchImpl = globalThis.fetch,
  attempts = DEFAULT_ATTEMPTS,
  delayMs = DEFAULT_DELAY_MS,
  sleep = defaultSleep,
}) {
  let results = []
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    results = await runAttempt({
      baseUrl,
      expectedScript,
      expectHeaders,
      expectWwwRedirect,
      fetchImpl,
    })
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
  let expectHeaders = false
  let expectWwwRedirect = false
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--expect-dist') {
      const value = argv[index + 1]
      if (value === undefined || value.startsWith('--')) {
        throw new Error('--expect-dist requires a directory value')
      }
      expectDist = value
      index += 1
    } else if (arg === '--expect-headers') {
      expectHeaders = true
    } else if (arg === '--expect-www-redirect') {
      expectWwwRedirect = true
    } else if (arg.startsWith('--')) {
      throw new Error(`unknown option: ${arg}`)
    } else {
      positional.push(arg)
    }
  }
  if (positional.length !== 1) {
    throw new Error(
      'usage: node scripts/smoke.mjs <baseUrl> [--expect-dist <dir>] [--expect-headers] [--expect-www-redirect]',
    )
  }
  return {
    baseUrl: positional[0],
    expectDist,
    expectHeaders,
    expectWwwRedirect,
  }
}

async function main() {
  let baseUrl
  let expectDist
  let expectHeaders
  let expectWwwRedirect
  try {
    ;({ baseUrl, expectDist, expectHeaders, expectWwwRedirect } = parseArgs(
      process.argv.slice(2),
    ))
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
    expectHeaders,
    expectWwwRedirect,
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
