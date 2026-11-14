import { execFile } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'
// @ts-expect-error the script ships no type declarations
import * as smoke from './smoke.mjs'

const {
  DEFAULT_ATTEMPTS,
  DEFAULT_DELAY_MS,
  PLACEHOLDER_ACCESS_KEY,
  PRODUCTION_ORIGIN,
  extractChunkReferences,
  extractLocalStylesheet,
  extractMainModuleScript,
  readExpectedScript,
  runSmoke,
} = smoke

const BASE_URL = 'https://preview.example.com'
const MODULE_SCRIPT = '/assets/index-abc123.js'
const CHUNK_SCRIPT = '/assets/routes-quote.js'
const STYLESHEET = '/assets/index-abc123.css'
const ACCESS_KEY = '550e8400-e29b-41d4-a716-446655440000'
const CANONICAL_TAG = `<link rel="canonical" href="${PRODUCTION_ORIGIN}/" />`

function homeHtml(overrides: Record<string, unknown> = {}) {
  const {
    canonical = CANONICAL_TAG,
    script = `<script type="module" crossorigin src="${MODULE_SCRIPT}"></script>`,
    css = `<link rel="stylesheet" crossorigin href="${STYLESHEET}">`,
  } = overrides
  return [
    '<!doctype html><html><head>',
    canonical,
    '<link href="https://fonts.googleapis.com/css2?family=Inter" rel="stylesheet" />',
    script,
    css,
    '</head><body><div id="app"></div></body></html>',
  ].join('')
}

// The main entry lazy-loads the quote form chunk the way TanStack Router
// code splitting emits it.
function mainScriptBody() {
  return `import("./routes-quote.js");`
}

function chunkBody(overrides: Record<string, unknown> = {}) {
  const { endpoint = 'https://api.web3forms.com/submit', key = ACCESS_KEY } =
    overrides
  return `const endpoint = '${endpoint}'; const access_key = '${key}';`
}

type StubResponse = {
  status?: number
  contentType?: string
  body?: string
}

type StubRequest = { url: string; method: string | undefined }

function stubFetch(handler: (url: string) => StubResponse) {
  const requests: StubRequest[] = []
  const fetchImpl = async (url: string, init?: { method?: string }) => {
    requests.push({ url, method: init?.method })
    const { status = 200, contentType = 'text/html', body = '' } = handler(url)
    return {
      status,
      ok: status >= 200 && status < 300,
      headers: {
        get: (name: string) =>
          name.toLowerCase() === 'content-type' ? contentType : null,
      },
      text: async () => body,
    }
  }
  return { requests, fetchImpl }
}

function serveRoutes(routes: Record<string, StubResponse>) {
  return stubFetch((url) => {
    const response = routes[url]
    if (!response) throw new Error(`unexpected fetch: ${url}`)
    return response
  })
}

function passingRoutes(
  overrides: Record<string, StubResponse> = {},
): Record<string, StubResponse> {
  return {
    [`${BASE_URL}/`]: { contentType: 'text/html', body: homeHtml() },
    [`${BASE_URL}${MODULE_SCRIPT}`]: {
      contentType: 'application/javascript',
      body: mainScriptBody(),
    },
    [`${BASE_URL}${CHUNK_SCRIPT}`]: {
      contentType: 'application/javascript',
      body: chunkBody(),
    },
    [`${BASE_URL}${STYLESHEET}`]: { contentType: 'text/css', body: 'body{}' },
    [`${BASE_URL}/smoke-test-missing-page`]: {
      contentType: 'text/html',
      body: homeHtml(),
    },
    [`${BASE_URL}/content/images/winzelle-logo.jpg`]: {
      contentType: 'image/jpeg',
      body: 'fake-jpeg',
    },
    ...overrides,
  }
}

function names(results: { name: string; ok: boolean }[]) {
  return results.map((entry) => entry.name)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('exported constants', () => {
  it('exposes the contract defaults and production origin', () => {
    expect(DEFAULT_ATTEMPTS).toBe(6)
    expect(DEFAULT_DELAY_MS).toBe(10_000)
    expect(PRODUCTION_ORIGIN).toBe('https://winzelle.co.za')
    expect(PLACEHOLDER_ACCESS_KEY).toBe('your-web3forms-access-key')
  })
})

describe('extractMainModuleScript', () => {
  it('extracts the local module script src', () => {
    expect(extractMainModuleScript(homeHtml())).toBe(MODULE_SCRIPT)
  })

  it('ignores non-module scripts', () => {
    const html =
      '<script src="/analytics.js"></script>' +
      `<script type="module" src="${MODULE_SCRIPT}"></script>`
    expect(extractMainModuleScript(html)).toBe(MODULE_SCRIPT)
  })

  it('ignores module scripts with remote or missing src', () => {
    expect(
      extractMainModuleScript(
        '<script type="module" src="https://cdn.example.com/app.js"></script>',
      ),
    ).toBeNull()
    expect(
      extractMainModuleScript('<script type="module"></script>'),
    ).toBeNull()
  })

  it('ignores data-src, which is not the script source', () => {
    expect(
      extractMainModuleScript(
        '<script type="module" data-src="/assets/fake.js"></script>',
      ),
    ).toBeNull()
  })

  it('returns null when no module script exists', () => {
    expect(extractMainModuleScript('<html><body></body></html>')).toBeNull()
  })
})

describe('extractChunkReferences', () => {
  it('collects relative chunk paths from dynamic imports', () => {
    const body =
      'const a=()=>import("./routes-quote.js");const b=()=>import("./routes-about.js");'
    expect(extractChunkReferences(body)).toEqual([
      './routes-quote.js',
      './routes-about.js',
    ])
  })

  it('collects chunk paths written as template literals', () => {
    const body = 'const a=()=>import(`./routes-wf8ct1rM.js`),[]'
    expect(extractChunkReferences(body)).toEqual(['./routes-wf8ct1rM.js'])
  })

  it('deduplicates references and ignores remote URLs', () => {
    const body =
      'import("./routes-quote.js");import("./routes-quote.js");import("https://cdn.example.com/x.js");'
    expect(extractChunkReferences(body)).toEqual(['./routes-quote.js'])
  })

  it('returns an empty list when nothing is referenced', () => {
    expect(extractChunkReferences('const a = 1')).toEqual([])
  })
})

describe('extractLocalStylesheet', () => {
  it('skips remote stylesheets such as Google Fonts', () => {
    expect(extractLocalStylesheet(homeHtml())).toBe(STYLESHEET)
  })

  it('returns null when no local stylesheet exists', () => {
    expect(
      extractLocalStylesheet(
        '<link href="https://fonts.googleapis.com/css2?family=Inter" rel="stylesheet" />',
      ),
    ).toBeNull()
  })
})

describe('readExpectedScript', () => {
  it('extracts the module script from a built dist directory', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'smoke-test-'))
    try {
      await writeFile(join(dir, 'index.html'), homeHtml())
      await expect(readExpectedScript(dir)).resolves.toBe(MODULE_SCRIPT)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})

describe('runSmoke', () => {
  it('passes when every check passes and only uses GET', async () => {
    const { requests, fetchImpl } = serveRoutes(passingRoutes())
    const { ok, results } = await runSmoke({
      baseUrl: BASE_URL,
      fetch: fetchImpl,
      attempts: 1,
      delayMs: 0,
    })
    expect(ok).toBe(true)
    expect(results.every((entry: { ok: boolean }) => entry.ok)).toBe(true)
    expect(names(results)).toEqual([
      'homepage',
      'canonical',
      'module-script',
      'form-endpoint',
      'form-access-key',
      'stylesheet',
      'spa-fallback',
      'media-logo',
    ])
    for (const request of requests) {
      expect(request.method).toBe('GET')
    }
  })

  it('compares the canonical href to production, not to baseUrl', async () => {
    const { fetchImpl } = serveRoutes(
      passingRoutes({
        [`${BASE_URL}/`]: {
          contentType: 'text/html',
          body: homeHtml({
            canonical:
              '<link rel="canonical" href="https://preview.example.com/" />',
          }),
        },
      }),
    )
    const { results } = await runSmoke({
      baseUrl: BASE_URL,
      fetch: fetchImpl,
      attempts: 1,
      delayMs: 0,
    })
    const canonical = results.find(
      (entry: { name: string }) => entry.name === 'canonical',
    )
    expect(canonical.ok).toBe(false)
    expect(canonical.reason).toMatch(/winzelle\.co\.za/)
  })

  it('fails the homepage check on a non-200 status', async () => {
    const { fetchImpl } = serveRoutes(
      passingRoutes({ [`${BASE_URL}/`]: { status: 503 } }),
    )
    const { ok, results } = await runSmoke({
      baseUrl: BASE_URL,
      fetch: fetchImpl,
      attempts: 1,
      delayMs: 0,
    })
    expect(ok).toBe(false)
    expect(
      results.find((entry: { name: string }) => entry.name === 'homepage'),
    ).toMatchObject({
      ok: false,
      reason: 'GET / returned 503',
    })
  })

  it('fails the homepage check on a non-HTML content type', async () => {
    const { fetchImpl } = serveRoutes(
      passingRoutes({ [`${BASE_URL}/`]: { contentType: 'text/plain' } }),
    )
    const { results } = await runSmoke({
      baseUrl: BASE_URL,
      fetch: fetchImpl,
      attempts: 1,
      delayMs: 0,
    })
    expect(
      results.find((entry: { name: string }) => entry.name === 'homepage'),
    ).toMatchObject({ ok: false, reason: 'content-type is text/plain' })
  })

  it('fails the canonical check when the tag is missing', async () => {
    const { fetchImpl } = serveRoutes(
      passingRoutes({
        [`${BASE_URL}/`]: {
          contentType: 'text/html',
          body: homeHtml({ canonical: '' }),
        },
      }),
    )
    const { results } = await runSmoke({
      baseUrl: BASE_URL,
      fetch: fetchImpl,
      attempts: 1,
      delayMs: 0,
    })
    expect(
      results.find((entry: { name: string }) => entry.name === 'canonical'),
    ).toMatchObject({ ok: false })
  })

  it('fails the module-script check on a 404', async () => {
    const { fetchImpl } = serveRoutes(
      passingRoutes({ [`${BASE_URL}${MODULE_SCRIPT}`]: { status: 404 } }),
    )
    const { results } = await runSmoke({
      baseUrl: BASE_URL,
      fetch: fetchImpl,
      attempts: 1,
      delayMs: 0,
    })
    expect(
      results.find((entry: { name: string }) => entry.name === 'module-script'),
    ).toMatchObject({
      ok: false,
      reason: `GET ${MODULE_SCRIPT} returned 404`,
    })
  })

  it('fails the module-script check on a non-JavaScript content type', async () => {
    const { fetchImpl } = serveRoutes(
      passingRoutes({
        [`${BASE_URL}${MODULE_SCRIPT}`]: { contentType: 'text/html' },
      }),
    )
    const { results } = await runSmoke({
      baseUrl: BASE_URL,
      fetch: fetchImpl,
      attempts: 1,
      delayMs: 0,
    })
    expect(
      results.find((entry: { name: string }) => entry.name === 'module-script'),
    ).toMatchObject({ ok: false, reason: 'content-type is text/html' })
  })

  it('fails the form-endpoint check when api.web3forms.com is absent', async () => {
    const { fetchImpl } = serveRoutes(
      passingRoutes({
        [`${BASE_URL}${CHUNK_SCRIPT}`]: {
          contentType: 'application/javascript',
          body: chunkBody({ endpoint: 'https://example.com/submit' }),
        },
      }),
    )
    const { results } = await runSmoke({
      baseUrl: BASE_URL,
      fetch: fetchImpl,
      attempts: 1,
      delayMs: 0,
    })
    expect(
      results.find((entry: { name: string }) => entry.name === 'form-endpoint'),
    ).toMatchObject({ ok: false })
  })

  it('fails the form-endpoint check when the host appears only as a substring', async () => {
    const { fetchImpl } = serveRoutes(
      passingRoutes({
        [`${BASE_URL}${CHUNK_SCRIPT}`]: {
          contentType: 'application/javascript',
          body: chunkBody({
            endpoint: 'https://example.com/mirror/api.web3forms.com/submit',
          }),
        },
      }),
    )
    const { results } = await runSmoke({
      baseUrl: BASE_URL,
      fetch: fetchImpl,
      attempts: 1,
      delayMs: 0,
    })
    expect(
      results.find((entry: { name: string }) => entry.name === 'form-endpoint'),
    ).toMatchObject({ ok: false })
  })

  it('fails the form-access-key check when the placeholder is wired in as the key', async () => {
    const { fetchImpl } = serveRoutes(
      passingRoutes({
        [`${BASE_URL}${CHUNK_SCRIPT}`]: {
          contentType: 'application/javascript',
          body: `JSON.stringify({ access_key: '${PLACEHOLDER_ACCESS_KEY}' })`,
        },
      }),
    )
    const { results } = await runSmoke({
      baseUrl: BASE_URL,
      fetch: fetchImpl,
      attempts: 1,
      delayMs: 0,
    })
    expect(
      results.find(
        (entry: { name: string }) => entry.name === 'form-access-key',
      ),
    ).toMatchObject({ ok: false, reason: 'placeholder used as access key' })
  })

  it('passes when the placeholder only appears as the guard constant', async () => {
    const { fetchImpl } = serveRoutes(
      passingRoutes({
        [`${BASE_URL}${CHUNK_SCRIPT}`]: {
          contentType: 'application/javascript',
          // Mirrors the real minified public-env guard next to a real key.
          body:
            `const endpoint='https://api.web3forms.com/submit';` +
            `const guard="${PLACEHOLDER_ACCESS_KEY}";` +
            `const access_key='${ACCESS_KEY}';if(access_key.trim()===guard);`,
        },
      }),
    )
    const { ok, results } = await runSmoke({
      baseUrl: BASE_URL,
      fetch: fetchImpl,
      attempts: 1,
      delayMs: 0,
    })
    expect(ok).toBe(true)
    expect(
      results.find(
        (entry: { name: string }) => entry.name === 'form-access-key',
      ),
    ).toMatchObject({ ok: true, reason: 'key present' })
  })

  it('fails the form-access-key check when no UUID-shaped key exists', async () => {
    const { fetchImpl } = serveRoutes(
      passingRoutes({
        [`${BASE_URL}${CHUNK_SCRIPT}`]: {
          contentType: 'application/javascript',
          body: chunkBody({ key: 'not-a-uuid' }),
        },
      }),
    )
    const { results } = await runSmoke({
      baseUrl: BASE_URL,
      fetch: fetchImpl,
      attempts: 1,
      delayMs: 0,
    })
    expect(
      results.find(
        (entry: { name: string }) => entry.name === 'form-access-key',
      ),
    ).toMatchObject({ ok: false, reason: 'key missing' })
  })

  it('fails the form-access-key check when a UUID is not bound to access_key', async () => {
    const { fetchImpl } = serveRoutes(
      passingRoutes({
        [`${BASE_URL}${CHUNK_SCRIPT}`]: {
          contentType: 'application/javascript',
          body: `const endpoint='https://api.web3forms.com/submit';const buildId='${ACCESS_KEY}';`,
        },
      }),
    )
    const { results } = await runSmoke({
      baseUrl: BASE_URL,
      fetch: fetchImpl,
      attempts: 1,
      delayMs: 0,
    })
    expect(
      results.find(
        (entry: { name: string }) => entry.name === 'form-access-key',
      ),
    ).toMatchObject({ ok: false, reason: 'key missing' })
  })

  it('fails the form checks when a lazy chunk is missing', async () => {
    const { fetchImpl } = serveRoutes(
      passingRoutes({ [`${BASE_URL}${CHUNK_SCRIPT}`]: { status: 404 } }),
    )
    const { results } = await runSmoke({
      baseUrl: BASE_URL,
      fetch: fetchImpl,
      attempts: 1,
      delayMs: 0,
    })
    const endpoint = results.find(
      (entry: { name: string }) => entry.name === 'form-endpoint',
    )
    expect(endpoint).toMatchObject({ ok: false })
    expect(endpoint.reason).toMatch(
      /chunk \/assets\/routes-quote\.js returned 404/,
    )
  })

  it('fails the stylesheet check on a 404', async () => {
    const { fetchImpl } = serveRoutes(
      passingRoutes({ [`${BASE_URL}${STYLESHEET}`]: { status: 404 } }),
    )
    const { results } = await runSmoke({
      baseUrl: BASE_URL,
      fetch: fetchImpl,
      attempts: 1,
      delayMs: 0,
    })
    expect(
      results.find((entry: { name: string }) => entry.name === 'stylesheet'),
    ).toMatchObject({
      ok: false,
      reason: `GET ${STYLESHEET} returned 404`,
    })
  })

  it('fails the stylesheet check on a non-CSS content type', async () => {
    const { fetchImpl } = serveRoutes(
      passingRoutes({
        [`${BASE_URL}${STYLESHEET}`]: { contentType: 'text/html' },
      }),
    )
    const { results } = await runSmoke({
      baseUrl: BASE_URL,
      fetch: fetchImpl,
      attempts: 1,
      delayMs: 0,
    })
    expect(
      results.find((entry: { name: string }) => entry.name === 'stylesheet'),
    ).toMatchObject({ ok: false, reason: 'content-type is text/html' })
  })

  it('fails the spa-fallback check when the route 404s', async () => {
    const { fetchImpl } = serveRoutes(
      passingRoutes({
        [`${BASE_URL}/smoke-test-missing-page`]: { status: 404 },
      }),
    )
    const { results } = await runSmoke({
      baseUrl: BASE_URL,
      fetch: fetchImpl,
      attempts: 1,
      delayMs: 0,
    })
    expect(
      results.find((entry: { name: string }) => entry.name === 'spa-fallback'),
    ).toMatchObject({
      ok: false,
      reason: 'GET /smoke-test-missing-page returned 404',
    })
  })

  it('fails the spa-fallback check when the shell lacks the module script', async () => {
    const { fetchImpl } = serveRoutes(
      passingRoutes({
        [`${BASE_URL}/smoke-test-missing-page`]: {
          contentType: 'text/html',
          body: '<html><body>not found</body></html>',
        },
      }),
    )
    const { results } = await runSmoke({
      baseUrl: BASE_URL,
      fetch: fetchImpl,
      attempts: 1,
      delayMs: 0,
    })
    expect(
      results.find((entry: { name: string }) => entry.name === 'spa-fallback'),
    ).toMatchObject({ ok: false, reason: 'module script reference missing' })
  })

  it('fails the media-logo check on a non-image content type', async () => {
    const { fetchImpl } = serveRoutes(
      passingRoutes({
        [`${BASE_URL}/content/images/winzelle-logo.jpg`]: {
          contentType: 'text/html',
        },
      }),
    )
    const { results } = await runSmoke({
      baseUrl: BASE_URL,
      fetch: fetchImpl,
      attempts: 1,
      delayMs: 0,
    })
    expect(
      results.find((entry: { name: string }) => entry.name === 'media-logo'),
    ).toMatchObject({ ok: false, reason: 'content-type is text/html' })
  })

  it('fails the media-logo check on a 404', async () => {
    const { fetchImpl } = serveRoutes(
      passingRoutes({
        [`${BASE_URL}/content/images/winzelle-logo.jpg`]: { status: 404 },
      }),
    )
    const { results } = await runSmoke({
      baseUrl: BASE_URL,
      fetch: fetchImpl,
      attempts: 1,
      delayMs: 0,
    })
    expect(
      results.find((entry: { name: string }) => entry.name === 'media-logo'),
    ).toMatchObject({ ok: false, reason: 'GET logo returned 404' })
  })

  it('passes the expected-script check when the build matches', async () => {
    const { fetchImpl } = serveRoutes(passingRoutes())
    const { ok, results } = await runSmoke({
      baseUrl: BASE_URL,
      expectedScript: MODULE_SCRIPT,
      fetch: fetchImpl,
      attempts: 1,
      delayMs: 0,
    })
    expect(ok).toBe(true)
    expect(
      results.find(
        (entry: { name: string }) => entry.name === 'expected-script',
      ),
    ).toMatchObject({ ok: true })
  })

  it('fails the expected-script check when the served build differs', async () => {
    const { fetchImpl } = serveRoutes(passingRoutes())
    const { ok, results } = await runSmoke({
      baseUrl: BASE_URL,
      expectedScript: '/assets/index-newbuild.js',
      fetch: fetchImpl,
      attempts: 1,
      delayMs: 0,
    })
    expect(ok).toBe(false)
    expect(
      results.find(
        (entry: { name: string }) => entry.name === 'expected-script',
      ),
    ).toMatchObject({ ok: false })
  })

  it('retries a failing attempt and passes once propagation completes', async () => {
    let homeCalls = 0
    const { requests, fetchImpl } = stubFetch((url) => {
      if (url === `${BASE_URL}/`) {
        homeCalls += 1
        if (homeCalls === 1) return { status: 503 }
        return { contentType: 'text/html', body: homeHtml() }
      }
      const response = passingRoutes()[url]
      if (!response) throw new Error(`unexpected fetch: ${url}`)
      return response
    })
    const { ok, results } = await runSmoke({
      baseUrl: BASE_URL,
      fetch: fetchImpl,
      attempts: 3,
      delayMs: 0,
    })
    expect(ok).toBe(true)
    expect(homeCalls).toBe(2)
    // Attempt 1 fetches /, the fallback and the logo (3); a passing attempt
    // fetches all 6 routes, including the lazy chunk.
    expect(requests).toHaveLength(9)
    expect(results.every((entry: { ok: boolean }) => entry.ok)).toBe(true)
  })

  it('returns the final attempt failures when all attempts fail', async () => {
    const attempts = 3
    const { requests, fetchImpl } = serveRoutes(
      passingRoutes({ [`${BASE_URL}/`]: { status: 503 } }),
    )
    const { ok, results } = await runSmoke({
      baseUrl: BASE_URL,
      fetch: fetchImpl,
      attempts,
      delayMs: 0,
    })
    expect(ok).toBe(false)
    expect(
      results.find((entry: { name: string }) => entry.name === 'homepage'),
    ).toMatchObject({
      ok: false,
      reason: 'GET / returned 503',
    })
    // A failed homepage skips the asset fetches, leaving 3 requests per
    // attempt: /, the fallback and the logo.
    expect(requests).toHaveLength(attempts * 3)
  })

  it('uses the injected sleep between attempts', async () => {
    const sleep = vi.fn(async () => {})
    const { fetchImpl } = serveRoutes(
      passingRoutes({ [`${BASE_URL}/`]: { status: 503 } }),
    )
    await runSmoke({
      baseUrl: BASE_URL,
      fetch: fetchImpl,
      attempts: 2,
      delayMs: 5_000,
      sleep,
    })
    expect(sleep).toHaveBeenCalledTimes(1)
    expect(sleep).toHaveBeenCalledWith(5_000)
  })
})

const execFileAsync = promisify(execFile)
const SMOKE_SCRIPT = fileURLToPath(new URL('./smoke.mjs', import.meta.url))

function passingPaths(): Record<string, StubResponse> {
  return {
    '/': { contentType: 'text/html', body: homeHtml() },
    [MODULE_SCRIPT]: {
      contentType: 'application/javascript',
      body: mainScriptBody(),
    },
    [CHUNK_SCRIPT]: {
      contentType: 'application/javascript',
      body: chunkBody(),
    },
    [STYLESHEET]: { contentType: 'text/css', body: 'body{}' },
    '/smoke-test-missing-page': { contentType: 'text/html', body: homeHtml() },
    '/content/images/winzelle-logo.jpg': {
      contentType: 'image/jpeg',
      body: 'fake-jpeg',
    },
  }
}

async function serveSite(routes: Record<string, StubResponse>) {
  const server = createServer((request, response) => {
    const route = routes[request.url ?? '/']
    if (!route) {
      response.writeHead(404, { 'content-type': 'text/plain' })
      response.end('not found')
      return
    }
    response.writeHead(route.status ?? 200, {
      'content-type': route.contentType ?? 'text/html',
    })
    response.end(route.body ?? '')
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  }
}

// Attempts stay at 1 so the spawned CLI does not sleep between retries.
function runCli(args: string[]) {
  return execFileAsync(process.execPath, [SMOKE_SCRIPT, ...args], {
    env: { ...process.env, SMOKE_ATTEMPTS: '1', SMOKE_DELAY_MS: '1' },
  })
}

describe('CLI', () => {
  it('exits 0 when every check passes', async () => {
    const site = await serveSite(passingPaths())
    try {
      const { stdout } = await runCli([site.url])
      expect(stdout).toContain('Smoke test passed')
    } finally {
      await site.close()
    }
  })

  it('exits 1 when a check fails', async () => {
    const site = await serveSite({ ...passingPaths(), '/': { status: 503 } })
    try {
      await expect(runCli([site.url])).rejects.toMatchObject({ code: 1 })
    } finally {
      await site.close()
    }
  })

  it('exits 1 when --expect-dist has no value', async () => {
    await expect(
      runCli(['https://winzelle.co.za', '--expect-dist']),
    ).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining(
        '--expect-dist requires a directory value',
      ),
    })
  })

  it('exits 1 when the dist directory is unreadable', async () => {
    await expect(
      runCli(['https://winzelle.co.za', '--expect-dist', 'no-such-dist']),
    ).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining('cannot read build manifest'),
    })
  })

  it('exits 1 on an unknown option', async () => {
    await expect(
      runCli(['https://winzelle.co.za', '--bogus']),
    ).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining('unknown option: --bogus'),
    })
  })
})
