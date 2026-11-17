#!/usr/bin/env node
// Serves dist/ with the pinned wrangler in local dev mode (no Cloudflare login,
// no secrets), confirms public/_headers applies by asserting the
// Content-Security-Policy response header on the target page, then runs the
// design-gate probe against it and forwards the probe's exit code.
//
// Usage: node serve.mjs [--url http://127.0.0.1:8787/next] [--out <dir>]
//
// Exit codes: probe exit codes pass through; 2 = bad arguments or missing
// dist/; 3 = wrangler dev did not apply _headers (BLOCKED: do not switch
// servers, fix the serving setup); 1 = serving failed.
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
)
const READY_TIMEOUT_MS = 90000
const READY_POLL_MS = 500

function parseArgs(argv) {
  const args = { url: 'http://127.0.0.1:8787/next', out: 'design-gate-report' }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--url') args.url = argv[++i]
    else if (argv[i] === '--out') args.out = argv[++i]
    else {
      console.error(`Unknown argument: ${argv[i]}`)
      process.exit(2)
    }
  }
  if (!args.url || !args.out) {
    console.error(
      'Usage: node serve.mjs [--url http://127.0.0.1:8787/next] [--out <dir>]',
    )
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
  const { url, out } = parseArgs(process.argv.slice(2))
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
    if (!csp) {
      console.error(
        `BLOCKED: ${url} is served without a Content-Security-Policy header, so this wrangler dev ` +
          'does not apply dist/_headers. The design gate needs the real CSP; fix the serving setup ' +
          'rather than switching servers.',
      )
      process.exitCode = 3
      return
    }
    console.log(
      `[serve] ${url} answers 200 with Content-Security-Policy: ${csp.slice(0, 60)}...`,
    )
    const probe = spawn(
      process.execPath,
      [path.join(ROOT, 'scripts', 'design-gates', 'probe.mjs'), url, out],
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

main()
