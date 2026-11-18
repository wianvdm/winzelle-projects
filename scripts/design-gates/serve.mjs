#!/usr/bin/env node
// Serves dist/ with the pinned wrangler in local dev mode (no Cloudflare login,
// no secrets), confirms public/_headers applies by comparing the
// Content-Security-Policy response header on the target page against the value
// in dist/_headers, then runs the design-gate probe against it and forwards
// the probe's exit code.
//
// Usage: node serve.mjs [--url http://127.0.0.1:8787/] [--out <dir>]
//                       [--expect-complete]
// --expect-complete passes through to the probe: skipped gates, pending
// rules, missing sections and a missing survey fail the run.
//
// Exit codes: probe exit codes pass through; 2 = bad arguments or missing
// dist/; 3 = wrangler dev did not apply _headers or served a different CSP
// (BLOCKED: do not switch servers, fix the serving setup); 1 = serving failed.
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
)
const READY_TIMEOUT_MS = 90000
const READY_POLL_MS = 500
const EXPECT_COMPLETE_FLAG = '--expect-complete'
const USAGE = `Usage: node serve.mjs [--url http://127.0.0.1:8787/] [--out <dir>] [${EXPECT_COMPLETE_FLAG}]`

function parseArgs(argv) {
  const args = {
    url: 'http://127.0.0.1:8787/',
    out: 'design-gate-report',
    expectComplete: false,
  }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--url') args.url = argv[++i]
    else if (argv[i] === '--out') args.out = argv[++i]
    else if (argv[i] === EXPECT_COMPLETE_FLAG) args.expectComplete = true
    else {
      console.error(`Unknown argument: ${argv[i]}`)
      process.exit(2)
    }
  }
  if (!args.url || !args.out) {
    console.error(USAGE)
    process.exit(2)
  }
  return args
}

function wranglerBin() {
  // Spawn wrangler.js with node directly: the .bin/.cmd shims need a shell on
  // Windows, and this stays cross-platform without one.
  const bin = path.join(ROOT, 'node_modules', 'wrangler', 'bin', 'wrangler.js')
  if (!existsSync(bin)) {
    console.error('wrangler is not installed; run npm ci first.')
    process.exit(2)
  }
  return bin
}

async function waitForServer(url) {
  const deadline = Date.now() + READY_TIMEOUT_MS
  let lastError = 'no attempt made'
  while (Date.now() < deadline) {
    try {
      await fetch(url, { method: 'HEAD' })
      return
    } catch (error) {
      lastError = error.message
      await new Promise((resolve) => setTimeout(resolve, READY_POLL_MS))
    }
  }
  throw new Error(
    `server did not answer at ${url} within ${READY_TIMEOUT_MS / 1000}s (${lastError})`,
  )
}

// Parses a Cloudflare _headers file into blocks of { pattern, headers }.
// A block starts with an unindented path pattern; header lines are indented;
// `#` starts a comment line.
export function parseHeadersFile(text) {
  const blocks = []
  let current = null
  for (const line of text.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue
    if (!/^\s/.test(line)) {
      current = { pattern: line.trim(), headers: [] }
      blocks.push(current)
      continue
    }
    const match = line.trim().match(/^([^:]+):\s*(.*)$/)
    if (current && match)
      current.headers.push([match[1].toLowerCase(), match[2].trim()])
  }
  return blocks
}

// The headers for one URL path, merged the way Cloudflare does: every block
// whose pattern matches applies, in file order, and a header set by more
// than one block joins its values with a comma. `*` is a wildcard.
// https://developers.cloudflare.com/workers/static-assets/headers/
export function headersFor(blocks, pathname) {
  const toRegex = (pattern) =>
    new RegExp(
      `^${pattern
        .split('*')
        .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('.*')}$`,
    )
  const merged = new Map()
  for (const { pattern, headers } of blocks) {
    if (!toRegex(pattern).test(pathname)) continue
    for (const [name, value] of headers) {
      merged.set(
        name,
        merged.has(name) ? `${merged.get(name)}, ${value}` : value,
      )
    }
  }
  return [...merged]
}

// The CSP the page must carry: the value dist/_headers declares for it.
async function expectedCsp(url) {
  const file = path.join(ROOT, 'dist', '_headers')
  if (!existsSync(file))
    throw new Error('dist/_headers is missing; build first (npm run build).')
  const blocks = parseHeadersFile(await readFile(file, 'utf8'))
  const headers = headersFor(blocks, new URL(url).pathname)
  return headers.find(([name]) => name === 'content-security-policy')?.[1]
}

function stopServer(child) {
  return new Promise((resolve) => {
    if (child.exitCode !== null) return resolve()
    child.once('exit', () => resolve())
    if (process.platform === 'win32') {
      // wrangler spawns workerd as a child; only taskkill /t reaches it.
      spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
        stdio: 'ignore',
      }).once('exit', () => resolve())
    } else {
      child.kill('SIGINT')
      setTimeout(() => {
        if (child.exitCode === null) child.kill('SIGKILL')
      }, 5000).unref()
    }
    setTimeout(resolve, 10000).unref()
  })
}

async function main() {
  const { url, out, expectComplete } = parseArgs(process.argv.slice(2))
  if (!existsSync(path.join(ROOT, 'dist', 'index.html'))) {
    console.error('dist/index.html is missing; build first (npm run build).')
    process.exit(2)
  }
  const port = new URL(url).port || '8787'
  const server = spawn(
    process.execPath,
    [wranglerBin(), 'dev', '--port', port, '--ip', '127.0.0.1'],
    {
      cwd: ROOT,
      env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )
  server.stdout.on('data', (chunk) =>
    process.stdout.write(`[wrangler] ${chunk}`),
  )
  server.stderr.on('data', (chunk) =>
    process.stderr.write(`[wrangler] ${chunk}`),
  )
  try {
    await waitForServer(url)
    const response = await fetch(url)
    if (response.status !== 200)
      throw new Error(`${url} answered ${response.status}, expected 200`)
    const csp = response.headers.get('content-security-policy')
    const expected = await expectedCsp(url)
    if (!csp || csp.trim() !== (expected || '').trim()) {
      console.error(
        `BLOCKED: ${url} is served without the Content-Security-Policy from dist/_headers ` +
          `(served: ${csp ? `"${csp.slice(0, 80)}..."` : 'none'}; expected: ${expected ? `"${expected.slice(0, 80)}..."` : 'none declared'}), ` +
          'so this wrangler dev does not apply dist/_headers. The design gate needs the real CSP; ' +
          'fix the serving setup rather than switching servers.',
      )
      process.exitCode = 3
      return
    }
    console.log(
      `[serve] ${url} answers 200 with the Content-Security-Policy from dist/_headers`,
    )
    const probe = spawn(
      process.execPath,
      [
        path.join(ROOT, 'scripts', 'design-gates', 'probe.mjs'),
        url,
        out,
        ...(expectComplete ? [EXPECT_COMPLETE_FLAG] : []),
      ],
      {
        cwd: ROOT,
        stdio: 'inherit',
      },
    )
    const code = await new Promise((resolve) => probe.once('exit', resolve))
    process.exitCode = code ?? 1
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  } finally {
    await stopServer(server)
  }
}

// Runs only as a script, so tests can import the _headers helpers.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main()
}
