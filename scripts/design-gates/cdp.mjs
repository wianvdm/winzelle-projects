// Minimal Chrome DevTools Protocol client: launch headless Chrome, attach to one page, send commands.
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

const CHROME_PATH =
  process.env.CHROME_PATH ||
  (process.platform === 'win32'
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : process.platform === 'darwin'
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : 'google-chrome')
const LAUNCH_TIMEOUT_MS = 30000
const COMMAND_TIMEOUT_MS = 120000
const POLL_MS = 100

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function readActivePort(userDataDir, chrome) {
  const file = path.join(userDataDir, 'DevToolsActivePort')
  const deadline = Date.now() + LAUNCH_TIMEOUT_MS
  while (Date.now() < deadline) {
    if (chrome.exitCode !== null)
      throw new Error(`Chrome exited early with code ${chrome.exitCode}`)
    const text = await readFile(file, 'utf8').catch(() => '')
    const [port, browserPath] = text.split(/\r?\n/)
    if (port && browserPath) return { port: Number(port), browserPath }
    await delay(POLL_MS)
  }
  throw new Error('Timed out waiting for DevToolsActivePort')
}

class Connection {
  constructor(socket) {
    this.socket = socket
    this.nextId = 1
    this.pending = new Map()
    this.listeners = new Set()
    socket.addEventListener('message', (event) =>
      this.receive(JSON.parse(event.data)),
    )
    socket.addEventListener('close', () =>
      this.failAll(new Error('DevTools connection closed')),
    )
  }

  receive(message) {
    if (!message.id) {
      for (const listener of this.listeners) listener(message)
      return
    }
    const waiter = this.pending.get(message.id)
    if (!waiter) return
    this.pending.delete(message.id)
    clearTimeout(waiter.timer)
    if (message.error)
      waiter.reject(new Error(`${waiter.method}: ${message.error.message}`))
    else waiter.resolve(message.result)
  }

  failAll(error) {
    for (const waiter of this.pending.values()) {
      clearTimeout(waiter.timer)
      waiter.reject(error)
    }
    this.pending.clear()
  }

  send(method, params = {}, sessionId = undefined) {
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`${method}: timed out after ${COMMAND_TIMEOUT_MS} ms`))
      }, COMMAND_TIMEOUT_MS)
      this.pending.set(id, { resolve, reject, timer, method })
      this.socket.send(JSON.stringify({ id, method, params, sessionId }))
    })
  }
}

export class Session {
  constructor(connection, sessionId) {
    this.connection = connection
    this.sessionId = sessionId
  }

  send(method, params = {}) {
    return this.connection.send(method, params, this.sessionId)
  }

  on(method, handler) {
    const listener = (message) => {
      if (message.sessionId === this.sessionId && message.method === method)
        handler(message.params)
    }
    this.connection.listeners.add(listener)
    return () => this.connection.listeners.delete(listener)
  }

  once(method, timeoutMs) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        off()
        reject(new Error(`Timed out waiting for ${method}`))
      }, timeoutMs)
      const off = this.on(method, (params) => {
        clearTimeout(timer)
        off()
        resolve(params)
      })
    })
  }
}

export async function launchChrome() {
  const userDataDir = await mkdtemp(path.join(tmpdir(), 'probe-chrome-'))
  const args = [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-sync',
    '--disable-features=Translate,MediaRouter',
    '--hide-scrollbars',
    '--mute-audio',
    '--force-color-profile=srgb',
    '--window-size=1920,1200',
    'about:blank',
  ]
  const chrome = spawn(CHROME_PATH, args, { stdio: 'ignore' })
  const close = async () => {
    try {
      if (connection)
        await Promise.race([connection.send('Browser.close'), delay(3000)])
    } catch {
      // The browser may already be gone; the kill below covers it.
    }
    if (chrome.exitCode === null) chrome.kill()
    await delay(500)
    await rm(userDataDir, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 300,
    }).catch(() => {})
  }
  let connection = null
  try {
    const { port, browserPath } = await readActivePort(userDataDir, chrome)
    const socket = new WebSocket(`ws://127.0.0.1:${port}${browserPath}`)
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true })
      socket.addEventListener(
        'error',
        () => reject(new Error('Could not open DevTools WebSocket')),
        { once: true },
      )
    })
    connection = new Connection(socket)
    const version = await connection.send('Browser.getVersion')
    const { targetId } = await connection.send('Target.createTarget', {
      url: 'about:blank',
    })
    const { sessionId } = await connection.send('Target.attachToTarget', {
      targetId,
      flatten: true,
    })
    return {
      session: new Session(connection, sessionId),
      version: version.product,
      close,
    }
  } catch (error) {
    await close()
    throw error
  }
}
