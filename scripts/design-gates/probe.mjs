#!/usr/bin/env node
// Headless-Chrome probe for the design gates G1-G12 (docs/design/home-page.md)
// plus C6.1 measurements. Probes a served URL, not a file.
// Usage: node probe.mjs <url> <outDir> [--expect-complete]
//
// Exit codes: 0 = every gate passed, was manual or was skipped (with
// --expect-complete: no skipped gate, no pending rule, no missing section and
// a survey present); 1 = the probe
// itself broke (Chrome launch, navigation); 2 = bad arguments; 4 = at least
// one gate failed or came back unknown, or the page is incomplete under
// --expect-complete.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { launchChrome } from './cdp.mjs'
import {
  classifyRequest,
  finalise,
  gateOutcome,
  incompleteRules,
  REFLOW_WIDTHS,
  VIEWPORTS,
} from './gates.mjs'
import { renderMarkdown } from './report.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
// VIEWPORTS and REFLOW_WIDTHS come from gates.mjs so the expected screenshot
// sets there can never drift from what this probe captures.
const PHONE_BREAKPOINT = 390
const DESKTOP_REFLOW_HEIGHT = 900
const PHONE_REFLOW_HEIGHT = 844
const CONTACT_STEP_PX = 50
const MAX_TAB_STOPS = 400
const DIALOG_TAB_PRESSES = 10
const EXPECT_COMPLETE_FLAG = '--expect-complete'
const MAX_SINGLE_SHOT_PX = 16000
const LOAD_TIMEOUT_MS = 60000
const MAP_TILES_TIMEOUT_MS = 20000
// A valid 1x1 PNG: the probe's stand-in for every OpenStreetMap tile.
const STUB_TILE_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
const KEYS = {
  Tab: { key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 },
  Escape: { key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 },
  Enter: { key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' },
  Space: { key: ' ', code: 'Space', windowsVirtualKeyCode: 32, text: ' ' },
  ArrowRight: {
    key: 'ArrowRight',
    code: 'ArrowRight',
    windowsVirtualKeyCode: 39,
  },
}

class Page {
  constructor(session, targetUrl, log) {
    this.session = session
    this.targetUrl = targetUrl
    this.pageOrigin = new URL(targetUrl).origin
    this.log = log
    this.phase = 'start'
    this.viewport = null
    // OpenStreetMap tiles pass the request gate only while this is true: from
    // the moment the probe presses "Show the map" until the next load.
    this.mapActive = false
  }

  send(method, params) {
    return this.session.send(method, params)
  }

  async init() {
    this.library = await readFile(path.join(HERE, 'inpage.js'), 'utf8')
    await Promise.all(
      ['Page.enable', 'Runtime.enable', 'Log.enable', 'Network.enable'].map(
        (method) => this.send(method),
      ),
    )
    this.session.on('Fetch.requestPaused', (params) => this.gateRequest(params))
    await this.send('Fetch.enable', { patterns: [{ urlPattern: '*' }] })
    this.session.on('Network.requestWillBeSent', (params) =>
      this.recordRequest(params.request.url, params.type),
    )
    this.session.on('Runtime.consoleAPICalled', (params) => {
      if (params.type !== 'error' && params.type !== 'assert') return
      const text = params.args
        .map((arg) => arg.value ?? arg.description ?? '')
        .join(' ')
      this.log.console.push({ phase: this.phase, type: params.type, text })
    })
    this.session.on('Runtime.exceptionThrown', (params) => {
      const details = params.exceptionDetails
      this.log.console.push({
        phase: this.phase,
        type: 'exception',
        text: details.exception?.description || details.text,
      })
    })
    this.session.on('Log.entryAdded', ({ entry }) => {
      // CSP violations arrive as source 'security' entries; level 'error' covers
      // the rest. Entries caused by the probe's own request blocking are dropped:
      // the blocked request is already recorded in log.requests.
      if (entry.level !== 'error' && entry.source !== 'security') return
      if (entry.text.includes('ERR_BLOCKED_BY_CLIENT')) return
      const csp =
        entry.source === 'security' &&
        /content security policy/i.test(entry.text)
      this.log.console.push({
        phase: this.phase,
        type: csp ? 'csp' : `log:${entry.source}`,
        text: entry.text,
        url: entry.url,
      })
    })
    await this.send('Emulation.setFocusEmulationEnabled', { enabled: true })
  }

  recordRequest(url, type) {
    if (url.startsWith('data:') || url === 'about:blank') return
    const verdict = classifyRequest(url, this.pageOrigin, {
      mapActive: this.mapActive,
    })
    this.log.requests.push({
      phase: this.phase,
      url: url.slice(0, 200),
      type,
      ...verdict,
    })
  }

  // Requests outside the G11 allow-list are refused, so the run stays offline
  // apart from the allow-listed origins; every refusal is on record. Stubbed
  // requests (map tiles) get a stand-in PNG and never leave the machine.
  async gateRequest({ requestId, request }) {
    const verdict = request.url.startsWith('data:')
      ? { allowed: true }
      : classifyRequest(request.url, this.pageOrigin, {
          mapActive: this.mapActive,
        })
    try {
      if (!verdict.allowed)
        await this.send('Fetch.failRequest', {
          requestId,
          errorReason: 'BlockedByClient',
        })
      else if (verdict.stubbed) {
        await this.send('Fetch.fulfillRequest', {
          requestId,
          responseCode: 200,
          responseHeaders: [{ name: 'Content-Type', value: 'image/png' }],
          body: STUB_TILE_PNG_BASE64,
        })
        this.log.answeredTiles.push(request.url.slice(0, 200))
      } else await this.send('Fetch.continueRequest', { requestId })
    } catch (error) {
      this.log.probeNotes.push(`request gate: ${error.message}`)
    }
  }

  async evaluate(expression) {
    const response = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
    })
    if (response.exceptionDetails) {
      const details = response.exceptionDetails
      throw new Error(details.exception?.description || details.text)
    }
    return response.result.value
  }

  call(name, ...args) {
    return this.evaluate(
      `window.__probe.${name}(${args.map((arg) => JSON.stringify(arg)).join(', ')})`,
    )
  }

  async load(viewport, options = {}) {
    this.viewport = viewport
    this.mapActive = false
    const { width, height, mobile } = viewport
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile,
      screenWidth: width,
      screenHeight: height,
    })
    await this.send(
      'Emulation.setTouchEmulationEnabled',
      mobile ? { enabled: true, maxTouchPoints: 5 } : { enabled: false },
    )
    await this.send('Emulation.setEmulatedMedia', {
      features: [
        {
          name: 'prefers-reduced-motion',
          value: options.reducedMotion ? 'reduce' : 'no-preference',
        },
      ],
    })
    const loaded = this.session.once('Page.loadEventFired', LOAD_TIMEOUT_MS)
    const navigation = await this.send('Page.navigate', { url: this.targetUrl })
    if (navigation.errorText)
      throw new Error(`navigation failed: ${navigation.errorText}`)
    await loaded
    await this.evaluate(this.library)
    await this.mouseAway()
    return this.call('ready')
  }

  async mouseAway() {
    await this.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: -10,
      y: -10,
    }).catch(() =>
      this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 0, y: 0 }),
    )
  }

  async press(name) {
    const key = KEYS[name]
    await this.send('Input.dispatchKeyEvent', {
      type: key.text ? 'keyDown' : 'rawKeyDown',
      ...key,
      unmodifiedText: key.text,
    })
    await this.send('Input.dispatchKeyEvent', { type: 'keyUp', ...key })
  }

  async click(point) {
    const { x, y } = point
    await this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y })
    await this.send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x,
      y,
      button: 'left',
      buttons: 1,
      clickCount: 1,
    })
    await this.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x,
      y,
      button: 'left',
      buttons: 0,
      clickCount: 1,
    })
  }

  async clickElement(id) {
    const point = await this.call('pointFor', id)
    if (point.error) throw new Error(point.error)
    await this.click(point)
    await this.call('settle', 900)
    return point
  }

  async capture(file, clip) {
    const params = { format: 'png' }
    if (clip)
      Object.assign(params, {
        clip: { ...clip, scale: 1 },
        captureBeyondViewport: true,
      })
    const { data } = await this.send('Page.captureScreenshot', params)
    const buffer = Buffer.from(data, 'base64')
    await writeFile(file, buffer)
    return {
      file: path.basename(file),
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    }
  }
}

// ---------- probe steps ----------

async function screenshots(page, viewport, shotsDir) {
  const { width, height } = viewport
  const shots = []
  let size = await page.call('pageSize')
  const count = Math.ceil(size.scrollHeight / height)
  for (let i = 0; i < count; i++) {
    const top = Math.min(i * height, size.scrollHeight - height)
    const y = await page.call('scrollToY', top, 1200)
    const shot = await page.capture(
      path.join(shotsDir, `${width}-s${String(i + 1).padStart(2, '0')}.png`),
    )
    shots.push({ ...shot, scrollY: y })
  }
  await page.call('scrollToY', 0, 1200)
  await page.call('lazyImagesLoaded')
  size = await page.call('pageSize')
  if (size.scrollHeight <= MAX_SINGLE_SHOT_PX) {
    shots.push(
      await page.capture(path.join(shotsDir, `${width}-full.png`), {
        x: 0,
        y: 0,
        width,
        height: size.scrollHeight,
      }),
    )
  } else {
    for (
      let top = 0, part = 1;
      top < size.scrollHeight;
      top += MAX_SINGLE_SHOT_PX, part++
    ) {
      const clip = {
        x: 0,
        y: top,
        width,
        height: Math.min(MAX_SINGLE_SHOT_PX, size.scrollHeight - top),
      }
      shots.push(
        await page.capture(
          path.join(shotsDir, `${width}-full-${part}.png`),
          clip,
        ),
      )
    }
  }
  const wrongWidth = shots.filter((shot) => shot.width !== width)
  return {
    viewport: `${width}x${height}`,
    cssWidth: size.innerWidth,
    clientWidth: size.clientWidth,
    scrollHeight: size.scrollHeight,
    shots,
    widthVerified: wrongWidth.length === 0 && size.innerWidth === width,
  }
}

// One full-page shot at a reflow width, capped at the single-shot limit.
async function reflowShot(page, width, shotsDir) {
  const size = await page.call('pageSize')
  const height = Math.min(size.scrollHeight, MAX_SINGLE_SHOT_PX)
  const shot = await page.capture(
    path.join(shotsDir, `reflow-${width}-full.png`),
    { x: 0, y: 0, width, height },
  )
  return {
    viewport: `reflow-${width}`,
    cssWidth: size.innerWidth,
    clientWidth: size.clientWidth,
    scrollHeight: size.scrollHeight,
    shots: [shot],
    widthVerified: shot.width === width && size.innerWidth === width,
  }
}

// Fixed and sticky items need the page scrolled far enough that the sticky bar is showing.
async function twoPass(page, name, options, size) {
  const flowing = await page.call(name, { ...options, skipFixed: true })
  await page.call('scrollToY', Math.round(size.scrollHeight / 2), 1200)
  const fixed = await page.call(name, { ...options, onlyFixed: true })
  await page.call('scrollToY', 0)
  const merged = { ...flowing }
  for (const key of Object.keys(fixed)) {
    if (Array.isArray(fixed[key]))
      merged[key] = [...(flowing[key] || []), ...fixed[key]]
  }
  return merged
}

async function targetsTopAndMiddle(page, size) {
  const top = await page.call('targets')
  await page.call('scrollToY', Math.round(size.scrollHeight / 2), 1200)
  const middle = await page.call('targets')
  await page.call('scrollToY', 0)
  const byId = new Map(top.map((item) => [item.id, item]))
  for (const item of middle) if (!byId.has(item.id)) byId.set(item.id, item)
  return [...byId.values()]
}

async function contactSweep(page, size, viewport) {
  const positions = []
  const maxScroll = Math.max(0, size.scrollHeight - viewport.height)
  for (let top = 0; top < maxScroll; top += CONTACT_STEP_PX)
    positions.push(await page.call('contactAt', top))
  positions.push(await page.call('contactAt', maxScroll))
  await page.call('scrollToY', 0)
  return {
    viewport: `${viewport.width}x${viewport.height}`,
    step: CONTACT_STEP_PX,
    maxScroll,
    positions,
  }
}

async function tabWalk(page) {
  const expected = await page.call('captureBaselines')
  const opening = await page.call('openingWhatsapp')
  const stops = []
  let trap = null
  let wrapped = false
  let bodyPresses = 0
  for (let i = 0; i < MAX_TAB_STOPS; i++) {
    await page.press('Tab')
    const stop = await page.call('focusRing')
    if (stop.isBody) {
      if (stops.length) {
        wrapped = true
        break
      }
      bodyPresses++
      continue
    }
    if (stops.length && stop.id === stops[0].id) {
      wrapped = true
      break
    }
    const previous = stops[stops.length - 1]
    if (previous && previous.id === stop.id) {
      trap = `focus stuck on ${stop.selector}`
      break
    }
    if (stops.some((seen) => seen.id === stop.id)) {
      trap = `focus cycled back to ${stop.selector} after ${stops.length} stops without reaching the end`
      break
    }
    stops.push({ index: stops.length + 1, ...stop })
  }
  if (!wrapped && !trap)
    trap = `focus never left the page after ${MAX_TAB_STOPS} Tab presses`
  const visited = new Set(stops.map((stop) => stop.id))
  const unreached = expected.filter((item) => !visited.has(item.id))
  const openingIndex = opening
    ? stops.findIndex((stop) => stop.id === opening.id) + 1
    : 0
  return {
    expectedCount: expected.length,
    stops,
    wrapped,
    trap,
    unreached,
    bodyPresses,
    opening,
    openingIndex,
  }
}

async function lightboxKeyboard(page, opener) {
  await page.call('focusById', opener.id)
  await page.press('Enter')
  await page.call('settle', 900)
  const opened = await page.call('dialogState')
  if (!opened.open) return { opened }
  const details = await page.call('lightboxDetails')
  const contrast = await page.call('textContrast', { root: 'dialog[open]' })
  const nonText = await page.call('nonTextContrast', { root: 'dialog[open]' })
  const targets = await page.call('targets', { root: 'dialog[open]' })
  const inside = []
  for (let i = 0; i < DIALOG_TAB_PRESSES; i++) {
    await page.press('Tab')
    await page.call('settle', 400)
    inside.push(await page.call('activeInfo'))
  }
  for (let i = 0; i < 3; i++) {
    const state = await page.call('dialogState')
    if (state.activeInside) break
    await page.press('Tab')
  }
  const beforeEscape = await page.call('dialogState')
  await page.press('Escape')
  await page.call('settle', 900)
  const closed = await page.call('dialogState')
  const focusReturned = await page.call('isActive', opener.id)
  return {
    opened,
    details,
    contrast,
    nonText,
    targets,
    inside,
    beforeEscape,
    closed,
    focusReturned,
    returnedTo: closed.active,
  }
}

async function lightboxMouse(page, opener) {
  const point = await page.clickElement(opener.id)
  const opened = await page.call('dialogState')
  await page.press('Escape')
  await page.call('settle', 900)
  const closed = await page.call('dialogState')
  const focusReturned = await page.call('isActive', opener.id)
  return { point, opened, closed, focusReturned, returnedTo: closed.active }
}

async function keyboardOperation(page, item, key) {
  if (!item) return null
  const before = await page.call('pressedState', item.id)
  await page.call('focusById', item.id)
  await page.press(key)
  await page.call('settle', 900)
  const after = await page.call('pressedState', item.id)
  return {
    selector: item.selector,
    name: item.name,
    key,
    before,
    after,
    operated: before !== after || after === 'true',
  }
}

// The map phase (#100): before the probe presses "Show the map", every
// OpenStreetMap request fails G11; from the press on, tile requests to the one
// allow-listed host get the probe's stub. One press of zoom-in then swaps the
// tiles for the next level's, so Leaflet removes the old ones under the real
// CSP. Runs last, so no later load can meet a stray tile.
async function mapActivation(page) {
  const control = await page.call('findMapControl')
  if (!control) return { found: false, tilesLoaded: 0 }
  page.mapActive = true
  await page.clickElement(control.id)
  const shown = await page.call('waitForMapTiles', MAP_TILES_TIMEOUT_MS)
  return {
    found: true,
    control: control.name,
    tilesLoaded: shown.loaded,
    zoom: shown.zoom,
    zoomIn: await zoomInOnce(page, shown.zoom),
  }
}

async function zoomInOnce(page, fromZoom) {
  const control = await page.call('findMapZoomIn')
  if (!control) return { found: false }
  await page.clickElement(control.id)
  const zoomed = await page.call(
    'waitForMapTiles',
    MAP_TILES_TIMEOUT_MS,
    fromZoom,
  )
  return { found: true, tilesLoaded: zoomed.loaded, zoom: zoomed.zoom }
}

async function tilePicks(page) {
  const atLoad = await page.call('whatsappLinks')
  const loadMessages = new Map(atLoad.map((link) => [link.id, link.message]))
  const tiles = await page.call('findTiles')
  const picks = []
  for (const tile of tiles) {
    const point = await page.clickElement(tile.id)
    const pressed = await page.call('pressedState', tile.id)
    const links = await page.call('whatsappLinks')
    picks.push({
      tile: tile.name,
      selector: tile.selector,
      clickHitTile: point.hitOk,
      pressed,
      links: links.map((link) => ({
        selector: link.selector,
        context: link.context,
        message: link.message,
        changedFromLoad: loadMessages.get(link.id) !== link.message,
      })),
    })
  }
  return { tiles: tiles.map((tile) => tile.name), picks }
}

async function formCheck(page) {
  const forms = await page.call('prepareForms')
  const results = []
  for (const form of forms) {
    if (!form.submitId) {
      results.push({ selector: form.selector, error: 'no submit button' })
      continue
    }
    await page.clickElement(form.submitId)
    results.push({
      selector: form.selector,
      noValidate: form.noValidate,
      ...(await page.call('formResult', form.id, form.before, form.url)),
    })
  }
  return results
}

async function motionCheck(page) {
  const atRest = await page.call('motionAtRest')
  const tiles = await page.call('findTiles')
  const filters = await page.call('findFilters')
  const openers = await page.call('findPhotoOpeners')
  const navLinks = await page.call('findNavLinks')
  const interactions = []
  const watch = async (name, prepare, act) => {
    const target = prepare ? await prepare() : null
    await page.call('armMotion')
    await act(target)
    interactions.push({ name, ...(await page.call('collectMotion', 900)) })
  }
  const pick = (list, index) => list[Math.min(index, list.length - 1)]
  if (openers.length) {
    await watch(
      'hover a photo',
      () => page.call('pointFor', pick(openers, 1).id),
      (point) =>
        page.send('Input.dispatchMouseEvent', {
          type: 'mouseMoved',
          x: point.x,
          y: point.y,
        }),
    )
  }
  if (tiles.length)
    await watch(
      `tile pick: ${pick(tiles, 2).name}`,
      () => page.call('pointFor', pick(tiles, 2).id),
      (point) => page.click(point),
    )
  if (filters.length)
    await watch(
      `filter: ${pick(filters, 1).name}`,
      () => page.call('pointFor', pick(filters, 1).id),
      (point) => page.click(point),
    )
  if (openers.length) {
    await watch(
      'lightbox open',
      () => page.call('pointFor', openers[0].id),
      (point) => page.click(point),
    )
    await watch('lightbox next photo', null, () => page.press('ArrowRight'))
    await watch('lightbox close (Esc)', null, () => page.press('Escape'))
  }
  if (navLinks.length) {
    await page.call('scrollToY', 0)
    await watch(
      `nav jump ${navLinks[0].href}`,
      () => page.call('pointFor', navLinks[0].id),
      (point) => page.click(point),
    )
  }
  return { atRest, interactions }
}

// ---------- run ----------

async function run(targetUrl, outDir) {
  const shotsDir = path.join(outDir, 'shots')
  await mkdir(shotsDir, { recursive: true })
  const log = { console: [], requests: [], answeredTiles: [], probeNotes: [] }
  const data = {
    page: targetUrl,
    startedAt: new Date().toISOString(),
    chrome: null,
    survey: null,
    parts: {},
    errors: {},
    screenshots: [],
    log,
  }
  const parts = data.parts
  const step = async (gate, label, fn) => {
    try {
      return await fn()
    } catch (error) {
      ;(data.errors[gate] ||= []).push(
        `${label}: ${error.message.split('\n')[0]}`,
      )
      return null
    }
  }
  const browser = await launchChrome()
  data.chrome = browser.version
  try {
    const page = new Page(browser.session, targetUrl, log)
    await page.init()

    // 1280×800: screenshots, static checks, contact sweep, keyboard, lightbox, tiles, form
    const desktop = VIEWPORTS[1280]
    page.phase = '1280'
    let size = await page.load(desktop)
    data.survey = await page.call('contentSurvey')
    const shots1280 = await step('screenshots', '1280', () =>
      screenshots(page, desktop, shotsDir),
    )
    if (shots1280) data.screenshots.push(shots1280)
    size = await page.load(desktop)
    parts.G12 = {
      structure: await step('G12', 'structure', () => page.call('structure')),
    }
    parts.G1 = { runs: [] }
    parts.G2 = { runs: [] }
    parts.G5 = { runs: [] }
    parts.C61 = {}
    const g1 = await step('G1', 'text contrast 1280', () =>
      twoPass(page, 'textContrast', {}, size),
    )
    if (g1) parts.G1.runs.push({ viewport: '1280', ...g1 })
    const g2 = await step('G2', 'non-text contrast 1280', () =>
      twoPass(page, 'nonTextContrast', {}, size),
    )
    if (g2) parts.G2.runs.push({ viewport: '1280', ...g2 })
    parts.G8 = await step('G8', 'contact links', () =>
      page.call('contactLinks'),
    )
    parts.G7 = {
      links: await step('G7', 'WhatsApp links', () =>
        page.call('whatsappLinks'),
      ),
    }
    const g5 = await step('G5', 'targets 1280', () =>
      targetsTopAndMiddle(page, size),
    )
    if (g5) parts.G5.runs.push({ viewport: '1280', items: g5 })
    parts.C61[1280] = await step('C61', 'type scale 1280', () =>
      page.call('typeScale'),
    )
    parts.G9 = await step('G9', 'contact sweep', () =>
      contactSweep(page, size, desktop),
    )

    page.phase = '1280-keyboard'
    size = await page.load(desktop)
    if (data.survey.controls === 0) {
      // Nothing to focus yet; G3 and G4 report skipped from this marker.
      parts.G3 = { skippedNoControls: true }
    } else {
      parts.G3 = (await step('G3', 'Tab walk', () => tabWalk(page))) || {}
      const openers =
        (await step('G3', 'find photo openers', () =>
          page.call('findPhotoOpeners'),
        )) || []
      if (openers.length) {
        parts.G3.lightboxKeyboard = await step(
          'G3',
          'lightbox by keyboard',
          () => lightboxKeyboard(page, openers[0]),
        )
        parts.G3.lightboxMouse = await step('G3', 'lightbox by mouse', () =>
          lightboxMouse(page, openers[0]),
        )
        const box = parts.G3.lightboxKeyboard
        if (box?.contrast)
          parts.G1.runs.push({ viewport: '1280 lightbox', ...box.contrast })
        if (box?.nonText)
          parts.G2.runs.push({ viewport: '1280 lightbox', ...box.nonText })
        if (box?.targets)
          parts.G5.runs.push({ viewport: '1280 lightbox', items: box.targets })
        parts.G7.lightbox = box?.details || null
      }
      const tiles =
        (await step('G3', 'find tiles', () => page.call('findTiles'))) || []
      const filters =
        (await step('G3', 'find filters', () => page.call('findFilters'))) || []
      parts.G3.keyboardOperation = [
        await step('G3', 'tile by keyboard', () =>
          keyboardOperation(page, tiles[1] || tiles[0], 'Enter'),
        ),
        await step('G3', 'filter by keyboard', () =>
          keyboardOperation(page, filters[1] || filters[0], 'Space'),
        ),
      ].filter(Boolean)
    }

    page.phase = '1280-tiles'
    await page.load(desktop)
    parts.G7.tiles = await step('G7', 'tile picks', () => tilePicks(page))
    parts.G12.forms = await step('G12', 'form submit', () => formCheck(page))

    // 1440×900
    const wide = VIEWPORTS[1440]
    page.phase = '1440'
    await page.load(wide)
    const shots1440 = await step('screenshots', '1440', () =>
      screenshots(page, wide, shotsDir),
    )
    if (shots1440) data.screenshots.push(shots1440)
    size = await page.load(wide)
    const g5Wide = await step('G5', 'targets 1440', () =>
      targetsTopAndMiddle(page, size),
    )
    if (g5Wide) parts.G5.runs.push({ viewport: '1440', items: g5Wide })
    parts.C61[1440] = await step('C61', 'type scale 1440', () =>
      page.call('typeScale'),
    )

    // 390×844 phone
    const phone = VIEWPORTS[390]
    page.phase = '390'
    await page.load(phone)
    const shots390 = await step('screenshots', '390', () =>
      screenshots(page, phone, shotsDir),
    )
    if (shots390) data.screenshots.push(shots390)
    size = await page.load(phone)
    const g1Phone = await step('G1', 'text contrast 390', () =>
      twoPass(page, 'textContrast', {}, size),
    )
    if (g1Phone) parts.G1.runs.push({ viewport: '390', ...g1Phone })
    const g2Phone = await step('G2', 'non-text contrast 390', () =>
      twoPass(page, 'nonTextContrast', {}, size),
    )
    if (g2Phone) parts.G2.runs.push({ viewport: '390', ...g2Phone })
    const g5Phone = await step('G5', 'targets 390', () =>
      targetsTopAndMiddle(page, size),
    )
    if (g5Phone) parts.G5.runs.push({ viewport: '390', items: g5Phone })
    parts.C61[390] = await step('C61', 'type scale 390', () =>
      page.call('typeScale'),
    )
    const phoneOpeners =
      (await step('G5', 'find photo openers 390', () =>
        page.call('findPhotoOpeners'),
      )) || []
    if (phoneOpeners.length) {
      const lightbox = await step('G5', 'lightbox targets 390', async () => {
        await page.clickElement(phoneOpeners[0].id)
        const items = await page.call('targets', { root: 'dialog[open]' })
        await page.press('Escape')
        return items
      })
      if (lightbox)
        parts.G5.runs.push({ viewport: '390 lightbox', items: lightbox })
    }

    // Reflow at six widths, with a full-page shot at each
    parts.G6 = { runs: [] }
    for (const width of REFLOW_WIDTHS) {
      page.phase = `reflow-${width}`
      const mobile = width <= PHONE_BREAKPOINT
      const result = await step('G6', `reflow ${width}`, async () => {
        await page.load({
          width,
          height: mobile ? PHONE_REFLOW_HEIGHT : DESKTOP_REFLOW_HEIGHT,
          mobile,
        })
        return page.call('reflow')
      })
      if (result) parts.G6.runs.push({ width, ...result })
      const shot = await step('screenshots', `reflow ${width}`, () =>
        reflowShot(page, width, shotsDir),
      )
      if (shot) data.screenshots.push(shot)
    }

    // Reduced motion at 1280
    page.phase = '1280-reduced-motion'
    await page.load(desktop, { reducedMotion: true })
    parts.G10 = await step('G10', 'reduced motion', () => motionCheck(page))

    // Map activation at 1280, last (see mapActivation)
    page.phase = '1280-map'
    await page.load(desktop)
    parts.map = await step('G11', 'map activation', () => mapActivation(page))
  } finally {
    await browser.close()
  }
  data.finishedAt = new Date().toISOString()
  return data
}

async function main() {
  const args = process.argv.slice(2)
  const expectComplete = args.includes(EXPECT_COMPLETE_FLAG)
  const [urlArg, outArg, ...extra] = args.filter(
    (arg) => arg !== EXPECT_COMPLETE_FLAG,
  )
  if (!urlArg || !outArg || extra.length) {
    console.error(
      `Usage: node probe.mjs <url> <outDir> [${EXPECT_COMPLETE_FLAG}]`,
    )
    process.exit(2)
  }
  let targetUrl
  try {
    targetUrl = new URL(urlArg)
  } catch {
    console.error(`Bad URL: ${urlArg}`)
    process.exit(2)
  }
  if (targetUrl.protocol !== 'http:' && targetUrl.protocol !== 'https:') {
    console.error(`Only http(s) URLs can be probed: ${urlArg}`)
    process.exit(2)
  }
  const outDir = path.resolve(outArg)
  const data = await run(targetUrl.href, outDir)
  const result = finalise(data)
  await writeFile(
    path.join(outDir, 'probe.json'),
    JSON.stringify(result, null, 2),
  )
  await writeFile(path.join(outDir, 'probe.md'), renderMarkdown(result))
  for (const gate of Object.values(result.gates))
    console.log(`${gate.id} ${gate.status.toUpperCase()} ${gate.summary}`)
  const outcome = gateOutcome(result)
  const incomplete = expectComplete ? incompleteRules(result) : []
  console.log(`Wrote ${path.join(outDir, 'probe.json')} and probe.md`)
  if (!outcome.ok || incomplete.length) {
    const parts = []
    if (outcome.failed.length)
      parts.push(`failed: ${outcome.failed.join(', ')}`)
    if (outcome.unknown.length)
      parts.push(`unknown: ${outcome.unknown.join(', ')}`)
    if (outcome.screenshots.length)
      parts.push(`screenshots: ${outcome.screenshots.join('; ')}`)
    if (incomplete.length)
      parts.push(`incomplete page: ${incomplete.join('; ')}`)
    console.error(`Design gate FAILED (${parts.join('; ')})`)
    process.exit(4)
  }
  console.log(
    `Design gate OK (${outcome.skipped.length} skipped: ${outcome.skipped.join(', ') || 'none'})`,
  )
}

main().catch((error) => {
  console.error(error.stack || error.message)
  process.exit(1)
})
