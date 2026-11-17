// Runs inside the probed page (evaluated by probe.mjs after every load). Defines window.__probe.
// Every exported function returns plain JSON so Runtime.evaluate can hand it back by value.
;(() => {
  if (window.__probe) return

  // Elements the page marks as probe scaffolding; nothing on the site uses this today.
  const IGNORE = '[data-probe-ignore]'
  const WHATSAPP_NUMBER = '27828781557'
  const BODY_TEXT_MIN = 4.5
  const LARGE_TEXT_MIN = 3
  const NON_TEXT_MIN = 3
  const RING_MIN_WIDTH = 2
  const RING_SAMPLES = [0.25, 0.5, 0.75]
  const MIN_MEASURED_RING_SIDES = 2
  const TARGET_MIN = 24
  const LARGE_TEXT_PX = 24
  const LARGE_BOLD_TEXT_PX = 18.66
  const BOLD_WEIGHT = 700
  const ICON_MAX_PX = 64
  const MAX_LINE_CHARS_SAMPLE = 3000
  const CONTROL_SELECTOR = [
    'a[href]',
    'button',
    'input:not([type=hidden])',
    'select',
    'textarea',
    'summary',
    '[role=button]',
    '[role=link]',
    '[role=tab]',
    '[role=checkbox]',
    '[role=radio]',
    '[role=switch]',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',')
  const CONTACT_SELECTOR =
    'a[href*="wa.me"], a[href*="api.whatsapp.com"], a[href^="tel:"]'
  const WHATSAPP_SELECTOR = 'a[href*="wa.me"], a[href*="api.whatsapp.com"]'
  const REPLACED = new Set([
    'img',
    'video',
    'canvas',
    'iframe',
    'object',
    'embed',
    'picture',
  ])
  const SKIP_TEXT_PARENTS = 'script, style, noscript, template, title, desc'
  const SHELL_WAIT_MS = 5000
  const SHELL_POLL_MS = 100
  const MAP_POLL_MS = 100

  // ---------- identity and description ----------
  const ids = new WeakMap()
  const byId = new Map()
  let nextId = 1
  function idOf(el) {
    if (!ids.has(el)) {
      ids.set(el, nextId)
      byId.set(nextId, el)
      nextId++
    }
    return ids.get(el)
  }
  const clean = (text) => (text || '').replace(/\s+/g, ' ').trim()
  const round = (value, places = 2) =>
    Math.round(value * 10 ** places) / 10 ** places

  function selectorOf(el) {
    if (!(el instanceof Element)) return ''
    const parts = []
    for (
      let node = el;
      node && node.nodeType === 1;
      node = node.parentElement
    ) {
      if (node.id) {
        parts.unshift(`#${CSS.escape(node.id)}`)
        break
      }
      if (node === document.body || node === document.documentElement) {
        parts.unshift(node.localName)
        break
      }
      let part =
        node.localName +
        [...node.classList]
          .slice(0, 2)
          .map((name) => `.${CSS.escape(name)}`)
          .join('')
      const parent = node.parentElement
      const sameTag = parent
        ? [...parent.children].filter(
            (child) => child.localName === node.localName,
          )
        : []
      if (sameTag.length > 1)
        part += `:nth-of-type(${sameTag.indexOf(node) + 1})`
      parts.unshift(part)
      if (parts.length >= 5) break
    }
    return parts.join(' > ')
  }

  function textOf(node) {
    if (node.nodeType === 3) return node.data
    if (node.nodeType !== 1) return ''
    if (node.getAttribute('aria-hidden') === 'true') return ''
    if (node.localName === 'img') return node.getAttribute('alt') || ''
    if (node.localName === 'svg') {
      const title = node.querySelector(':scope > title')
      return node.getAttribute('aria-label') || (title ? title.textContent : '')
    }
    if (getComputedStyle(node).display === 'none') return ''
    return [...node.childNodes].map(textOf).join(' ')
  }

  function nameInfo(el) {
    const labelledBy = el.getAttribute('aria-labelledby')
    if (labelledBy) {
      const text = clean(
        labelledBy
          .split(/\s+/)
          .map((id) => document.getElementById(id))
          .filter(Boolean)
          .map(textOf)
          .join(' '),
      )
      if (text) return { name: text, source: 'aria-labelledby' }
    }
    const ariaLabel = clean(el.getAttribute('aria-label'))
    if (ariaLabel) return { name: ariaLabel, source: 'aria-label' }
    if (el.labels && el.labels.length) {
      const text = clean([...el.labels].map(textOf).join(' '))
      if (text) return { name: text, source: 'label' }
    }
    if (el.localName === 'img') return { name: clean(el.alt), source: 'alt' }
    const content = clean(textOf(el))
    if (content) return { name: content, source: 'content' }
    const title = clean(el.getAttribute('title'))
    if (title) return { name: title, source: 'title' }
    const placeholder = clean(el.getAttribute('placeholder'))
    if (placeholder) return { name: placeholder, source: 'placeholder' }
    return { name: '', source: 'none' }
  }
  const nameOf = (el) => nameInfo(el).name
  const snippet = (el) =>
    (
      clean(el.getAttribute('aria-label')) ||
      clean(el.innerText) ||
      clean(el.textContent)
    ).slice(0, 80)
  const describe = (el) => ({
    id: idOf(el),
    selector: selectorOf(el),
    text: snippet(el),
  })

  // ---------- visibility ----------
  function isClippedAway(el) {
    let depth = 0
    for (
      let node = el;
      node && node !== document.body && depth < 6;
      node = node.parentElement, depth++
    ) {
      const style = getComputedStyle(node)
      const rect = node.getBoundingClientRect()
      const tiny = rect.width <= 2 || rect.height <= 2
      if (
        tiny &&
        (style.overflow !== 'visible' ||
          style.clip !== 'auto' ||
          style.clipPath !== 'none')
      )
        return true
      if (/inset\(\s*50%/.test(style.clipPath)) return true
    }
    return false
  }
  function isShown(el) {
    if (!el || !el.isConnected || el.closest(IGNORE)) return false
    if (
      !el.checkVisibility({
        opacityProperty: true,
        visibilityProperty: true,
        contentVisibilityAuto: true,
      })
    )
      return false
    const rect = el.getBoundingClientRect()
    if (rect.width < 1 || rect.height < 1) return false
    return !isClippedAway(el)
  }
  function opacityChain(el) {
    let opacity = 1
    for (let node = el; node; node = node.parentElement)
      opacity *= parseFloat(getComputedStyle(node).opacity)
    return opacity
  }
  function fixedContext(el) {
    for (let node = el; node; node = node.parentElement) {
      const position = getComputedStyle(node).position
      if (position === 'fixed' || position === 'sticky') return node
    }
    return null
  }
  const isFixed = (el) =>
    fixedContext(el) !== null || !!el.closest('dialog[open]')

  // ---------- colour ----------
  const colourCache = new Map()
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const paint = canvas.getContext('2d', { willReadFrequently: true })
  function parseColour(text) {
    if (!text) return null
    if (colourCache.has(text)) return colourCache.get(text)
    let colour
    const match = text.match(
      /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+)(%?))?\s*\)$/,
    )
    if (match) {
      const alpha =
        match[4] === undefined ? 1 : parseFloat(match[4]) / (match[5] ? 100 : 1)
      colour = { r: +match[1], g: +match[2], b: +match[3], a: alpha }
    } else if (text === 'transparent') {
      colour = { r: 0, g: 0, b: 0, a: 0 }
    } else {
      paint.clearRect(0, 0, 1, 1)
      paint.fillStyle = '#000'
      paint.fillStyle = text
      paint.fillRect(0, 0, 1, 1)
      const data = paint.getImageData(0, 0, 1, 1).data
      colour = { r: data[0], g: data[1], b: data[2], a: data[3] / 255 }
    }
    colourCache.set(text, colour)
    return colour
  }
  function blend(top, bottom) {
    const alpha = top.a + bottom.a * (1 - top.a)
    if (alpha === 0) return { r: 0, g: 0, b: 0, a: 0 }
    const channel = (key) =>
      (top[key] * top.a + bottom[key] * bottom.a * (1 - top.a)) / alpha
    return { r: channel('r'), g: channel('g'), b: channel('b'), a: alpha }
  }
  function luminance(colour) {
    const linear = (value) => {
      const v = value / 255
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
    }
    return (
      0.2126 * linear(colour.r) +
      0.7152 * linear(colour.g) +
      0.0722 * linear(colour.b)
    )
  }
  function contrast(a, b) {
    const la = luminance(a)
    const lb = luminance(b)
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
  }
  function hex(colour) {
    const part = (value) => Math.round(value).toString(16).padStart(2, '0')
    const alpha = colour.a < 0.999 ? part(colour.a * 255) : ''
    return `#${part(colour.r)}${part(colour.g)}${part(colour.b)}${alpha}`
  }
  const minContrastOver = (top, bases) =>
    Math.min(...bases.map((base) => contrast(blend(top, base), base)))

  // Paint layers under a point, top to bottom: covering ::after/::before backgrounds, then the element's own background.
  // A layer is a colour, gradient stops, or a reason a person has to inspect it. With options.estimate,
  // url() images are dropped so a reviewer gets a hint; an estimate never counts as a pass.
  const colourNeutralFilter = (value) =>
    !value ||
    value === 'none' ||
    !value.replace(/drop-shadow\((?:[^()]|\([^()]*\))*\)/g, '').trim()
  function backgroundLayer(style, label, options) {
    const base = parseColour(style.backgroundColor)
    let image = style.backgroundImage
    if (!image || image === 'none') return { base }
    if (/url\(/.test(image)) {
      if (!options.estimate) return { manual: `over background image${label}` }
      image = image.replace(/url\((?:[^()]|\([^()]*\))*\)/g, '')
    }
    const stops = (image.match(/rgba?\([^)]*\)|#[0-9a-f]{3,8}\b/gi) || []).map(
      parseColour,
    )
    if (!stops.length)
      return options.estimate
        ? { base }
        : { manual: `over unparsed background${label}` }
    return { base, stops }
  }
  // The box an absolutely positioned child of el is placed against (rotations are ignored; the page tilts by about 2deg at most).
  function containingBlock(el) {
    for (
      let node = el;
      node && node !== document.documentElement;
      node = node.parentElement
    ) {
      const style = getComputedStyle(node)
      if (
        style.position !== 'static' ||
        style.transform !== 'none' ||
        style.filter !== 'none' ||
        style.perspective !== 'none'
      )
        return node
    }
    return document.documentElement
  }
  function pseudoBox(el, style) {
    if (!['absolute', 'fixed'].includes(style.position)) return null
    const [left, top, width, height] = ['left', 'top', 'width', 'height'].map(
      (key) => parseFloat(style[key]),
    )
    if ([left, top, width, height].some(Number.isNaN)) return null
    const fullWidth =
      width + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
    const fullHeight =
      height + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
    if (style.position === 'fixed')
      return { left, top, right: left + fullWidth, bottom: top + fullHeight }
    const block = containingBlock(el)
    const host = getComputedStyle(block)
    const rect = block.getBoundingClientRect()
    const x = rect.left + parseFloat(host.borderLeftWidth) + left
    const y = rect.top + parseFloat(host.borderTopWidth) + top
    return { left: x, top: y, right: x + fullWidth, bottom: y + fullHeight }
  }
  function pseudoLayers(el, options) {
    const layers = []
    for (const which of ['::after', '::before']) {
      const style = getComputedStyle(el, which)
      if (
        !style.content ||
        ['none', 'normal'].includes(style.content) ||
        style.display === 'none'
      )
        continue
      if (
        parseColour(style.backgroundColor).a === 0 &&
        style.backgroundImage === 'none'
      )
        continue
      const box = pseudoBox(el, style)
      if (!box) {
        layers.push({ manual: `${which} background with unknown geometry` })
        continue
      }
      const { x, y } = options
      if (x < box.left || x > box.right || y < box.top || y > box.bottom)
        continue
      layers.push(backgroundLayer(style, ` (${which})`, options))
    }
    return layers
  }
  function layersFor(item, options) {
    if (item.isBackdrop) return [{ base: item.base }]
    const el = item
    if (REPLACED.has(el.localName))
      return [{ manual: `over <${el.localName}>` }]
    if (el instanceof SVGElement && el.localName !== 'svg')
      return [{ manual: 'over SVG graphic' }]
    const style = getComputedStyle(el)
    const paints =
      parseColour(style.backgroundColor).a > 0 ||
      style.backgroundImage !== 'none'
    const blended =
      style.mixBlendMode !== 'normal' ||
      style.backdropFilter !== 'none' ||
      !colourNeutralFilter(style.filter)
    if (paints && blended)
      return [{ manual: 'background under a filter or blend mode' }]
    return [...pseudoLayers(el, options), backgroundLayer(style, '', options)]
  }

  function composite(layers, options = {}) {
    const parsed = []
    outer: for (const item of layers) {
      for (const layer of layersFor(item, options)) {
        if (layer.manual)
          return {
            manual: layer.manual,
            at: item.isBackdrop ? '::backdrop' : selectorOf(item),
          }
        parsed.push(layer)
        const opaqueBase = layer.base && layer.base.a >= 0.999 && !layer.stops
        const opaqueStops =
          layer.stops && layer.stops.every((stop) => stop.a >= 0.999)
        if (opaqueBase || opaqueStops) break outer
      }
    }
    let colours = [{ r: 255, g: 255, b: 255, a: 1 }]
    for (let i = parsed.length - 1; i >= 0; i--) {
      const layer = parsed[i]
      if (layer.base && layer.base.a > 0)
        colours = colours.map((below) => blend(layer.base, below))
      if (layer.stops)
        colours = colours.flatMap((below) =>
          layer.stops.map((stop) => blend(stop, below)),
        )
      const unique = new Map(colours.map((colour) => [hex(colour), colour]))
      colours = [...unique.values()].slice(0, 24)
    }
    return { colours, gradient: parsed.some((layer) => layer.stops) }
  }
  // Contrast hint for a manual item: the same stack with url() images dropped.
  function estimateOver(top, layers, options) {
    const estimate = composite(layers, { ...options, estimate: true })
    return estimate.manual
      ? undefined
      : round(minContrastOver(top, estimate.colours))
  }

  function ancestorsOf(el) {
    const chain = []
    for (let node = el; node; node = node.parentElement) chain.push(node)
    return chain
  }
  // Inserts the modal dialog's ::backdrop between the dialog's own layers and the page below it.
  function withBackdrop(el, layers) {
    const modal = document.querySelector('dialog:modal')
    if (!modal || !modal.contains(el)) return layers
    const index = layers.findIndex((layer) => !modal.contains(layer))
    if (index < 0) return layers
    const backdrop = {
      isBackdrop: true,
      base: parseColour(getComputedStyle(modal, '::backdrop').backgroundColor),
    }
    return [...layers.slice(0, index), backdrop, ...layers.slice(index)]
  }
  // Layers at a point from `el` (or its nearest ancestor in the hit stack) downwards, plus what sits above it.
  function stackAt(el, x, y) {
    const stack = document
      .elementsFromPoint(x, y)
      .filter((node) => !node.closest(IGNORE))
    const index = stack.findIndex((node) => node === el || node.contains(el))
    if (index < 0)
      return { above: [], below: withBackdrop(el, ancestorsOf(el)) }
    return {
      above: stack.slice(0, index),
      below: withBackdrop(el, stack.slice(index)),
    }
  }
  function paintsOver(node, el) {
    if (el.contains(node) || node.contains(el) || isFixed(node)) return false
    if (REPLACED.has(node.localName)) return true
    if (node instanceof SVGElement && node.localName !== 'svg') return true
    const style = getComputedStyle(node)
    return (
      parseColour(style.backgroundColor).a > 0.5 ||
      style.backgroundImage !== 'none'
    )
  }

  // ---------- scrolling and settling ----------
  const frame = () =>
    new Promise((resolve) => {
      let done = false
      const finish = () => {
        if (done) return
        done = true
        resolve()
      }
      requestAnimationFrame(finish)
      setTimeout(finish, 100)
    })
  async function frames(count) {
    for (let i = 0; i < count; i++) await frame()
  }
  const finiteRunning = () =>
    document.getAnimations().some((animation) => {
      if (animation.playState !== 'running') return false
      return Number.isFinite(animation.effect?.getComputedTiming().endTime)
    })
  async function settle(maxMs = 800) {
    const start = performance.now()
    await frames(2)
    let lastY = scrollY
    let stable = 0
    while (performance.now() - start < maxMs) {
      await frame()
      if (scrollY === lastY && !finiteRunning()) {
        stable++
        if (stable >= 2) return
      } else {
        stable = 0
      }
      lastY = scrollY
    }
  }
  const jump = (top) =>
    window.scrollTo({ top: Math.max(0, top), left: 0, behavior: 'instant' })
  function centreInViewport(el) {
    const rect = el.getBoundingClientRect()
    jump(rect.top + scrollY - innerHeight / 2 + rect.height / 2)
  }

  async function ready() {
    jump(0)
    await document.fonts.ready
    const eager = [...document.images].filter(
      (img) => !img.complete && img.loading !== 'lazy',
    )
    const loads = eager.map(
      (img) =>
        new Promise((resolve) => {
          img.addEventListener('load', resolve, { once: true })
          img.addEventListener('error', resolve, { once: true })
        }),
    )
    await Promise.race([
      Promise.all(loads),
      new Promise((resolve) => setTimeout(resolve, 10000)),
    ])
    await settle(1000)
    return pageSize()
  }
  function pageSize() {
    const root = document.documentElement
    return {
      innerWidth,
      innerHeight,
      clientWidth: root.clientWidth,
      scrollHeight: Math.max(root.scrollHeight, document.body.scrollHeight),
      devicePixelRatio,
      fonts: [...document.fonts]
        .filter((face) => face.status === 'loaded')
        .map((face) => `${face.family} ${face.weight} ${face.style}`),
    }
  }
  async function scrollToY(top, maxMs = 900) {
    jump(top)
    await settle(maxMs)
    return scrollY
  }
  async function lazyImagesLoaded() {
    const pending = [...document.images].filter((img) => !img.complete)
    for (const img of pending) img.loading = 'eager'
    await Promise.race([
      Promise.all(pending.map((img) => img.decode().catch(() => {}))),
      new Promise((resolve) => setTimeout(resolve, 10000)),
    ])
    return {
      pending: pending.length,
      stillPending: [...document.images].filter((img) => !img.complete).length,
    }
  }

  // ---------- G1 text contrast ----------
  function textCarriers(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) =>
        node.data.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
    })
    const carriers = new Map()
    const svgText = new Map()
    const shown = new Map()
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const el = node.parentElement
      if (!el || el.closest(IGNORE) || el.closest(SKIP_TEXT_PARENTS)) continue
      if (!shown.has(el)) shown.set(el, isShown(el))
      if (!shown.get(el)) continue
      if (el instanceof SVGElement) {
        if (!svgText.has(el)) svgText.set(el, node)
        continue
      }
      if (!carriers.has(el)) carriers.set(el, node)
    }
    return { carriers, svgText }
  }
  function firstRect(node) {
    const range = document.createRange()
    range.selectNodeContents(node)
    return (
      [...range.getClientRects()].find(
        (rect) => rect.width > 0.5 && rect.height > 0.5,
      ) || null
    )
  }
  const isLargeText = (size, weight) =>
    size >= LARGE_TEXT_PX ||
    (size >= LARGE_BOLD_TEXT_PX && weight >= BOLD_WEIGHT)

  function measureText(el, node) {
    const style = getComputedStyle(el)
    const size = parseFloat(style.fontSize)
    const weight = parseInt(style.fontWeight, 10)
    const need = isLargeText(size, weight) ? LARGE_TEXT_MIN : BODY_TEXT_MIN
    const base = {
      ...describe(el),
      text: clean(node.data).slice(0, 80),
      size: round(size, 1),
      weight,
      need,
    }
    if (!isFixed(el)) centreInViewport(el)
    const rect = firstRect(node)
    if (!rect) return { ...base, status: 'manual', reason: 'no text box' }
    const x = Math.min(Math.max(rect.left + rect.width / 2, 0), innerWidth - 1)
    const y = Math.min(Math.max(rect.top + rect.height / 2, 0), innerHeight - 1)
    if (
      rect.bottom < 0 ||
      rect.top > innerHeight ||
      rect.right < 0 ||
      rect.left > innerWidth
    ) {
      return { ...base, status: 'manual', reason: 'text outside the viewport' }
    }
    const filtered = ancestorsOf(el).find(
      (node2) =>
        !colourNeutralFilter(getComputedStyle(node2).filter) ||
        getComputedStyle(node2).mixBlendMode !== 'normal',
    )
    if (filtered)
      return {
        ...base,
        status: 'manual',
        reason: `text under a filter or blend mode (${selectorOf(filtered)})`,
      }
    const { above, below } = stackAt(el, x, y)
    const fill = parseColour(style.webkitTextFillColor || style.color)
    const fg = { ...fill, a: fill.a * opacityChain(el) }
    const bg = composite(below, { x, y })
    if (bg.manual)
      return {
        ...base,
        fg: hex(fg),
        status: 'manual',
        reason: `${bg.manual} at ${bg.at}`,
        estimate: estimateOver(fg, below, { x, y }),
      }
    const ratio = minContrastOver(fg, bg.colours)
    const cover = above.find((node2) => paintsOver(node2, el))
    const result = {
      ...base,
      fg: hex(fg),
      bg: bg.colours.map(hex).join(' '),
      ratio: round(ratio),
      gradient: bg.gradient || undefined,
      status: ratio + 0.005 >= need ? 'pass' : 'fail',
    }
    if (cover)
      return {
        ...result,
        status: 'manual',
        reason: `text covered by ${selectorOf(cover)}`,
      }
    return result
  }

  // Fixed and sticky text is measured in a second pass, once the page has scrolled far enough to show it.
  function textContrast(options = {}) {
    const root = options.root
      ? document.querySelector(options.root)
      : document.body
    if (!root)
      return { items: [], svgText: [], error: `root ${options.root} not found` }
    const startY = scrollY
    const { carriers, svgText } = textCarriers(root)
    const items = []
    for (const [el, node] of carriers) {
      if (options.onlyFixed && !isFixed(el)) continue
      if (options.skipFixed && isFixed(el)) continue
      items.push(measureText(el, node))
    }
    jump(startY)
    const svg = [...svgText.keys()]
      .filter((el) => !options.onlyFixed || isFixed(el))
      .map((el) => ({
        ...describe(el),
        size: round(parseFloat(getComputedStyle(el).fontSize), 1),
        status: 'manual',
        reason: 'SVG drawing text: background is drawn shapes',
      }))
    return { items, svgText: svg }
  }

  // ---------- G2 non-text contrast ----------
  const FORM_FIELD =
    'input:not([type=button]):not([type=submit]):not([type=reset]):not([type=image]):not([type=checkbox]):not([type=radio]), select, textarea'
  function outerColours(el) {
    const rect = el.getBoundingClientRect()
    const x = Math.min(Math.max(rect.left + rect.width / 2, 0), innerWidth - 1)
    const y = Math.min(Math.max(rect.top + rect.height / 2, 0), innerHeight - 1)
    const stack = document
      .elementsFromPoint(x, y)
      .filter((node) => !node.closest(IGNORE))
    const index = stack.indexOf(el)
    const below =
      index >= 0 ? stack.slice(index + 1) : ancestorsOf(el.parentElement)
    const layers = withBackdrop(
      el,
      below.filter((node) => !el.contains(node)),
    )
    return { ...composite(layers, { x, y }), layers, point: { x, y } }
  }
  function iconColour(svg) {
    const shape =
      svg.querySelector(
        'path, circle, rect, polygon, polyline, line, ellipse',
      ) || svg
    const style = getComputedStyle(shape)
    if (style.fill && style.fill !== 'none' && !style.fill.startsWith('url'))
      return parseColour(style.fill)
    if (
      style.stroke &&
      style.stroke !== 'none' &&
      !style.stroke.startsWith('url')
    )
      return parseColour(style.stroke)
    return null
  }
  function measureControl(el) {
    if (!isFixed(el)) centreInViewport(el)
    const style = getComputedStyle(el)
    const base = describe(el)
    const outer = outerColours(el)
    if (outer.manual) {
      const fillColour = parseColour(style.backgroundColor)
      const estimate =
        fillColour.a > 0.01
          ? estimateOver(fillColour, outer.layers, outer.point)
          : undefined
      return {
        ...base,
        status: 'manual',
        reason: `${outer.manual} at ${outer.at}`,
        estimate,
      }
    }
    const fill = parseColour(style.backgroundColor)
    const hasImageFill = style.backgroundImage !== 'none'
    const sides = ['Top', 'Right', 'Bottom', 'Left'].map((side) => ({
      width:
        style[`border${side}Style`] === 'none'
          ? 0
          : parseFloat(style[`border${side}Width`]),
      colour: parseColour(style[`border${side}Color`]),
    }))
    const border = sides.reduce(
      (best, side) => (side.width > best.width ? side : best),
      { width: 0 },
    )
    const fillRatio =
      fill.a > 0.01 && !hasImageFill
        ? minContrastOver(fill, outer.colours)
        : null
    const borderRatio =
      border.width >= 1 && border.colour.a > 0.01
        ? minContrastOver(border.colour, outer.colours)
        : null
    const ownColours =
      fill.a > 0.01
        ? outer.colours.map((colour) => blend(fill, colour))
        : outer.colours
    const icons = [...el.querySelectorAll('svg')]
      .filter((svg) => {
        if (!isShown(svg)) return false
        const rect = svg.getBoundingClientRect()
        return rect.width <= ICON_MAX_PX && rect.height <= ICON_MAX_PX
      })
      .map((svg) => {
        const colour = iconColour(svg)
        if (!colour)
          return {
            selector: selectorOf(svg),
            status: 'manual',
            reason: 'icon colour not readable',
          }
        const ratio = minContrastOver(colour, ownColours)
        return {
          selector: selectorOf(svg),
          colour: hex(colour),
          ratio: round(ratio),
          status: ratio >= NON_TEXT_MIN ? 'pass' : 'fail',
        }
      })
    const formField = el.matches(FORM_FIELD)
    const hasImage =
      !!el.querySelector('img, picture, video') ||
      [...el.querySelectorAll('svg')].some(
        (svg) => svg.getBoundingClientRect().width > ICON_MAX_PX,
      )
    const hasText = clean(el.innerText).length > 0
    let kind = 'icon-only'
    if (formField) kind = 'form-field'
    else if (hasText) kind = 'text-control'
    else if (hasImage) kind = 'image-control'
    const best = Math.max(fillRatio || 0, borderRatio || 0)
    const measured = {
      ...base,
      kind,
      outer: outer.colours.map(hex).join(' '),
      fill: fill.a > 0.01 ? hex(fill) : null,
      fillRatio: fillRatio && round(fillRatio),
      border: border.width ? `${border.width}px ${hex(border.colour)}` : null,
      borderRatio: borderRatio && round(borderRatio),
      icons,
    }
    if (icons.some((icon) => icon.status === 'fail'))
      return { ...measured, status: 'fail', reason: 'icon below 3:1' }
    if (kind === 'form-field') {
      if (hasImageFill)
        return {
          ...measured,
          status: 'manual',
          reason: 'field background is an image or gradient',
        }
      return {
        ...measured,
        status: best >= NON_TEXT_MIN ? 'pass' : 'fail',
        reason: best >= NON_TEXT_MIN ? undefined : 'field boundary below 3:1',
      }
    }
    if (kind === 'icon-only') {
      const iconBest = Math.max(best, ...icons.map((icon) => icon.ratio || 0))
      return {
        ...measured,
        status: iconBest >= NON_TEXT_MIN ? 'pass' : 'fail',
        reason:
          iconBest >= NON_TEXT_MIN ? undefined : 'icon-only control below 3:1',
      }
    }
    return {
      ...measured,
      status: 'info',
      reason: `${kind}: identified by its text or image (WCAG 1.4.11 needs no boundary)`,
    }
  }
  function nonTextContrast(options = {}) {
    const root = options.root ? document.querySelector(options.root) : document
    const startY = scrollY
    const controls = [...root.querySelectorAll(CONTROL_SELECTOR)].filter(
      (el) => {
        if (!isShown(el)) return false
        if (options.onlyFixed) return isFixed(el)
        return !(options.skipFixed && isFixed(el))
      },
    )
    const items = controls.map(measureControl)
    const graphics = options.onlyFixed
      ? []
      : [...root.querySelectorAll('svg[role=img]')]
          .filter(isShown)
          .filter((svg) => !svg.closest(CONTROL_SELECTOR))
          .map((svg) => {
            const rect = svg.getBoundingClientRect()
            return {
              ...describe(svg),
              name: nameOf(svg),
              size: `${round(rect.width, 0)}x${round(rect.height, 0)}`,
              status: 'manual',
              reason:
                'meaningful graphic: inspect its strokes against the board',
            }
          })
    jump(startY)
    return { items, graphics }
  }

  // ---------- G3 / G4 keyboard and focus ----------
  const baselines = new WeakMap()
  function styleSnapshot(el) {
    const style = getComputedStyle(el)
    return [
      style.outlineStyle,
      style.outlineWidth,
      style.outlineColor,
      style.boxShadow,
      style.borderTopColor,
      style.borderBottomColor,
      style.backgroundColor,
      style.color,
      style.textDecorationLine,
    ].join('|')
  }
  function tabbables() {
    return [...document.querySelectorAll(CONTROL_SELECTOR)].filter((el) => {
      if (
        !isShown(el) ||
        el.tabIndex < 0 ||
        el.disabled ||
        el.closest('[inert]') ||
        el.closest('dialog:not([open])')
      )
        return false
      return true
    })
  }
  function captureBaselines() {
    const list = tabbables()
    for (const el of list) baselines.set(el, styleSnapshot(el))
    return list.map((el) => ({
      ...describe(el),
      name: nameOf(el),
      href: el.getAttribute('href'),
    }))
  }
  function activeInfo() {
    const el = document.activeElement
    if (!el || el === document.body || el === document.documentElement)
      return { isBody: true, hasFocus: document.hasFocus() }
    const rect = el.getBoundingClientRect()
    return {
      ...describe(el),
      name: nameOf(el),
      tag: el.localName,
      href: el.getAttribute('href'),
      docTop: round(rect.top + scrollY, 0),
      inDialog: !!el.closest('dialog[open]'),
      ignored: !!el.closest(IGNORE),
    }
  }

  function parseShadows(text) {
    if (!text || text === 'none') return []
    const parts = []
    let depth = 0
    let current = ''
    for (const char of text) {
      if (char === '(') depth++
      if (char === ')') depth--
      if (char === ',' && depth === 0) {
        parts.push(current)
        current = ''
        continue
      }
      current += char
    }
    parts.push(current)
    return parts.map((part) => {
      const colourMatch = part.match(
        /rgba?\([^)]*\)|#[0-9a-f]{3,8}|[a-z]+\([^)]*\)/i,
      )
      const lengths =
        part
          .replace(colourMatch ? colourMatch[0] : '', '')
          .match(/-?[\d.]+px/g) || []
      const [x, y, blur, spread] = lengths.map(parseFloat).concat([0, 0, 0, 0])
      return {
        colour: colourMatch ? parseColour(colourMatch[0]) : null,
        x,
        y,
        blur,
        spread,
        inset: /inset/.test(part),
      }
    })
  }
  function ringOf(el) {
    const style = getComputedStyle(el)
    if (style.outlineStyle === 'auto')
      return {
        type: 'outline-auto',
        width: parseFloat(style.outlineWidth),
        colour: parseColour(style.outlineColor),
        offset: parseFloat(style.outlineOffset),
      }
    if (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) {
      return {
        type: 'outline',
        width: parseFloat(style.outlineWidth),
        colour: parseColour(style.outlineColor),
        offset: parseFloat(style.outlineOffset),
      }
    }
    const shadow = parseShadows(style.boxShadow).find(
      (item) =>
        item.colour &&
        item.colour.a > 0.1 &&
        item.x === 0 &&
        item.y === 0 &&
        item.spread > 0,
    )
    if (shadow)
      return {
        type: shadow.inset ? 'box-shadow-inset' : 'box-shadow',
        width: shadow.spread + shadow.blur / 2,
        colour: shadow.colour,
        offset: shadow.inset ? -shadow.spread : 0,
        inset: shadow.inset,
      }
    return null
  }
  function overlayBetween(hit, el) {
    for (
      let node = hit;
      node && !node.contains(el);
      node = node.parentElement
    ) {
      const style = getComputedStyle(node)
      if (style.position === 'fixed' || style.position === 'sticky') return node
      if (style.position !== 'static' && style.zIndex !== 'auto') return node
    }
    return null
  }
  function clippingAncestor(el, x, y) {
    for (
      let node = el.parentElement;
      node && node !== document.body;
      node = node.parentElement
    ) {
      const style = getComputedStyle(node)
      if (
        style.overflowX === 'visible' &&
        style.overflowY === 'visible' &&
        style.clipPath === 'none'
      )
        continue
      const rect = node.getBoundingClientRect()
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom)
        return node
    }
    return null
  }
  function ringSide(el, ring, point) {
    const { x, y, side } = point
    if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight)
      return { side, state: 'offscreen' }
    const clipper =
      ring.inset || ring.offset < 0 ? null : clippingAncestor(el, x, y)
    if (clipper) return { side, state: 'clipped', by: selectorOf(clipper) }
    const hit = document.elementFromPoint(x, y)
    let state = 'visible'
    let by
    if (hit && hit !== el && !el.contains(hit) && !hit.contains(el)) {
      const overlay = overlayBetween(hit, el)
      if (overlay) {
        state = 'covered'
        by = selectorOf(overlay)
      }
    }
    const inside = ring.inset || ring.offset + ring.width / 2 <= 0
    const layers = inside
      ? stackAt(el, x, y).below
      : withBackdrop(
          el,
          document
            .elementsFromPoint(x, y)
            .filter(
              (node) =>
                !node.closest(IGNORE) && node !== el && !el.contains(node),
            ),
        )
    const adjacent = composite(layers, { x, y })
    if (adjacent.manual)
      return {
        side,
        state,
        by,
        adjacent: null,
        ratioNote: `${adjacent.manual} at ${adjacent.at}`,
        estimate: estimateOver(ring.colour, layers, { x, y }),
      }
    const ratio = minContrastOver(ring.colour, adjacent.colours)
    return {
      side,
      state,
      by,
      adjacent: adjacent.colours.map(hex).join(' '),
      ratio: round(ratio),
    }
  }
  // A side is covered when most of its samples are; its contrast is the median of its measurable samples.
  function summariseSide(side, samples) {
    const blocked = samples.filter(
      (sample) => sample.state === 'covered' || sample.state === 'clipped',
    )
    const offscreen = samples.filter((sample) => sample.state === 'offscreen')
    const ratios = samples
      .filter(
        (sample) => sample.ratio !== undefined && sample.state === 'visible',
      )
      .map((sample) => sample.ratio)
      .sort((a, b) => a - b)
    const estimates = samples
      .map((sample) => sample.estimate)
      .filter((value) => value !== undefined)
    let state = 'visible'
    if (blocked.length * 2 > samples.length) state = blocked[0].state
    else if (offscreen.length * 2 > samples.length) state = 'offscreen'
    return {
      side,
      state,
      by: blocked[0]?.by,
      ratio: ratios.length ? ratios[Math.floor(ratios.length / 2)] : undefined,
      sampleRatios: ratios,
      adjacent: samples.find((sample) => sample.adjacent)?.adjacent,
      estimate: estimates.length ? Math.min(...estimates) : undefined,
      note: samples.find((sample) => sample.ratioNote)?.ratioNote,
    }
  }
  async function focusRing() {
    await settle(900)
    const el = document.activeElement
    if (!el || el === document.body || el === document.documentElement)
      return { isBody: true, hasFocus: document.hasFocus() }
    const rect = el.getBoundingClientRect()
    const info = {
      ...activeInfo(),
      rect: {
        x: round(rect.x, 0),
        y: round(rect.y, 0),
        w: round(rect.width, 1),
        h: round(rect.height, 1),
      },
    }
    if (rect.width < 1 || rect.height < 1)
      return { ...info, status: 'fail', reason: 'focused element has no box' }
    const inViewport =
      rect.bottom > 0 &&
      rect.top < innerHeight &&
      rect.right > 0 &&
      rect.left < innerWidth
    if (!inViewport)
      return {
        ...info,
        status: 'fail',
        reason: 'focused element outside the viewport',
      }
    const ring = ringOf(el)
    const baseline = baselines.get(el)
    const changed = baseline ? baseline !== styleSnapshot(el) : null
    if (!ring) {
      if (changed)
        return {
          ...info,
          status: 'manual',
          reason:
            'no outline or ring shadow; focus shown by another style change',
        }
      return { ...info, status: 'fail', reason: 'no visible focus indicator' }
    }
    const ringInfo = {
      type: ring.type,
      width: round(ring.width, 2),
      colour: hex(ring.colour),
      offset: ring.offset,
    }
    if (ring.type === 'outline-auto')
      return {
        ...info,
        ring: ringInfo,
        status: 'manual',
        reason: 'browser default ring (outline-style: auto)',
      }
    const d = ring.inset ? -ring.width / 2 : ring.offset + ring.width / 2
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const along = (from, length) =>
      RING_SAMPLES.map((share) => from + length * share)
    const sampleSets = [
      {
        side: 'top',
        points: along(rect.left, rect.width).map((x) => ({
          x,
          y: rect.top - d,
        })),
      },
      {
        side: 'bottom',
        points: along(rect.left, rect.width).map((x) => ({
          x,
          y: rect.bottom + d,
        })),
      },
      {
        side: 'left',
        points: along(rect.top, rect.height).map((y) => ({
          x: rect.left - d,
          y,
        })),
      },
      {
        side: 'right',
        points: along(rect.top, rect.height).map((y) => ({
          x: rect.right + d,
          y,
        })),
      },
    ]
    const sides = sampleSets.map((set) =>
      summariseSide(
        set.side,
        set.points.map((point) =>
          ringSide(el, ring, { ...point, side: set.side }),
        ),
      ),
    )
    const centreHit = document.elementFromPoint(
      Math.min(Math.max(cx, 0), innerWidth - 1),
      Math.min(Math.max(cy, 0), innerHeight - 1),
    )
    const centreCover =
      centreHit &&
      centreHit !== el &&
      !el.contains(centreHit) &&
      !centreHit.contains(el)
        ? overlayBetween(centreHit, el)
        : null
    const ratios = sides
      .filter((side) => side.ratio !== undefined && side.state === 'visible')
      .map((side) => side.ratio)
    const minRatio = ratios.length ? Math.min(...ratios) : null
    const reasons = []
    if (ring.width < RING_MIN_WIDTH)
      reasons.push(`ring ${round(ring.width, 2)}px thick`)
    if (minRatio !== null && minRatio < NON_TEXT_MIN)
      reasons.push(`ring contrast ${minRatio}:1`)
    const covered = sides.filter(
      (side) => side.state === 'covered' || side.state === 'clipped',
    )
    if (covered.length)
      reasons.push(
        `ring ${covered.map((side) => `${side.side} ${side.state} by ${side.by}`).join('; ')}`,
      )
    if (centreCover)
      reasons.push(`element centre covered by ${selectorOf(centreCover)}`)
    const result = {
      ...info,
      ring: ringInfo,
      changed,
      sides,
      minRatio,
      centreCovered: centreCover ? selectorOf(centreCover) : null,
    }
    if (reasons.length)
      return { ...result, status: 'fail', reason: reasons.join('; ') }
    const estimates = sides
      .map((side) => side.estimate)
      .filter((value) => value !== undefined)
    if (ratios.length < MIN_MEASURED_RING_SIDES)
      return {
        ...result,
        status: 'manual',
        reason:
          'ring contrast not measurable (no visible side or background needs inspection)',
        estimate: estimates.length ? Math.min(...estimates) : undefined,
      }
    return { ...result, status: 'pass' }
  }

  // ---------- finding interactive pieces ----------
  function sectionByHeading(pattern) {
    const heading = [...document.querySelectorAll('h1, h2, h3')].find(
      (node) => pattern.test(node.textContent) && !node.closest(IGNORE),
    )
    return heading ? heading.closest('section') || heading.parentElement : null
  }
  function findTiles() {
    let tiles = [...document.querySelectorAll('.wz-tile')]
    if (!tiles.length) {
      const section = sectionByHeading(/what needs doing/i)
      tiles = section
        ? [...section.querySelectorAll('button[aria-pressed]')]
        : []
    }
    return tiles
      .filter(isShown)
      .map((el) => ({ ...describe(el), name: nameOf(el) }))
  }
  function findFilters() {
    let tags = [...document.querySelectorAll('.wz-tag')]
    if (!tags.length) {
      const section = sectionByHeading(/our work/i)
      tags = section
        ? [...section.querySelectorAll('button[aria-pressed]')]
        : []
    }
    return tags
      .filter(isShown)
      .map((el) => ({ ...describe(el), name: nameOf(el) }))
  }
  function findPhotoOpeners() {
    return [...document.querySelectorAll('button, a[href]')]
      .filter((el) => {
        if (
          !el.querySelector('img') ||
          el.closest('dialog') ||
          el.matches(CONTACT_SELECTOR)
        )
          return false
        return isShown(el)
      })
      .map((el) => ({
        ...describe(el),
        name: nameOf(el),
        caption: clean(
          el.closest('figure')?.querySelector('figcaption')?.textContent,
        ),
      }))
  }
  function findNavLinks() {
    return [...document.querySelectorAll('nav a[href^="#"]')]
      .filter(isShown)
      .map((el) => ({ ...describe(el), href: el.getAttribute('href') }))
  }
  // The map's activation control (#100): the button named "Show the map".
  function findMapControl() {
    const control = [...document.querySelectorAll('button')].find(
      (el) =>
        isShown(el) &&
        !el.closest(IGNORE) &&
        /^show the map\b/i.test(nameOf(el)),
    )
    return control ? { ...describe(control), name: nameOf(control) } : null
  }
  // Resolves with the number of loaded map tiles once none is pending, or
  // with whatever has loaded when the time runs out.
  async function waitForMapTiles(timeoutMs) {
    const deadline = performance.now() + timeoutMs
    let loaded = 0
    while (performance.now() < deadline) {
      loaded = document.querySelectorAll('img.leaflet-tile-loaded').length
      const pending = document.querySelector(
        'img.leaflet-tile:not(.leaflet-tile-loaded)',
      )
      if (loaded && !pending) return loaded
      await new Promise((resolve) => setTimeout(resolve, MAP_POLL_MS))
    }
    return loaded
  }
  async function pointFor(id) {
    const el = byId.get(id)
    if (!el || !el.isConnected) return { error: `element ${id} is gone` }
    if (!isFixed(el)) centreInViewport(el)
    await settle(900)
    const rect = el.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    const hit = document.elementFromPoint(x, y)
    return {
      x,
      y,
      hitOk: !!hit && (hit === el || el.contains(hit)),
      hit: hit ? selectorOf(hit) : null,
    }
  }
  function focusById(id) {
    const el = byId.get(id)
    el.focus()
    return document.activeElement === el
  }
  function openingWhatsapp() {
    const el = document.querySelector(
      `main ${WHATSAPP_SELECTOR.split(', ').join(', main ')}`,
    )
    return el ? { ...describe(el), name: nameOf(el) } : null
  }
  const pressedState = (id) => byId.get(id)?.getAttribute('aria-pressed')
  const isActive = (id) => document.activeElement === byId.get(id)

  function dialogState() {
    const open =
      document.querySelector('dialog[open]') ||
      [...document.querySelectorAll('[role=dialog], [aria-modal=true]')].find(
        isShown,
      )
    const shown = !!open && isShown(open)
    return {
      open: shown,
      selector: open ? selectorOf(open) : null,
      modal: open ? open.matches(':modal') : false,
      active: activeInfo(),
      activeInside: shown && open.contains(document.activeElement),
    }
  }
  function lightboxDetails() {
    const open = document.querySelector('dialog[open]')
    if (!open) return null
    // The innermost caption-like element, so wrappers that also hold the action links are skipped
    const captions = [
      ...open.querySelectorAll('figcaption, [id*=caption], [class*=caption]'),
    ]
      .map((node) => clean(node.textContent))
      .filter(Boolean)
    const caption = captions.sort((a, b) => a.length - b.length)[0] || ''
    return {
      selector: selectorOf(open),
      caption,
      whatsapp: whatsappLinks(open).filter((link) => link.shown),
    }
  }

  // ---------- G5 target size ----------
  function inlineInText(el) {
    if (getComputedStyle(el).display !== 'inline') return false
    let block = el.parentElement
    while (block && getComputedStyle(block).display.startsWith('inline'))
      block = block.parentElement
    if (!block) return false
    return clean(block.innerText).length - clean(el.innerText).length > 10
  }
  function contactKind(el) {
    const href = el.getAttribute('href') || ''
    if (/wa\.me|api\.whatsapp\.com/.test(href)) return 'whatsapp'
    if (href.startsWith('tel:')) return 'phone'
    return null
  }
  function targets(options = {}) {
    const root = options.root ? document.querySelector(options.root) : document
    if (!root) return []
    const els = [
      ...root.querySelectorAll(`${CONTROL_SELECTOR}, button`),
    ].filter((el) => isShown(el) && !el.disabled)
    const boxes = els.map((el) => ({ el, rect: el.getBoundingClientRect() }))
    const under = boxes.filter(
      ({ rect }) =>
        rect.width < TARGET_MIN - 0.01 || rect.height < TARGET_MIN - 0.01,
    )
    const centre = (rect) => ({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    })
    const distanceToRect = (point, rect) =>
      Math.hypot(
        Math.max(rect.left - point.x, 0, point.x - rect.right),
        Math.max(rect.top - point.y, 0, point.y - rect.bottom),
      )
    return boxes.map(({ el, rect }) => {
      const width = round(rect.width, 1)
      const height = round(rect.height, 1)
      const result = {
        ...describe(el),
        w: width,
        h: height,
        contact: contactKind(el),
        inline: inlineInText(el),
      }
      if (!under.some((item) => item.el === el))
        return { ...result, status: 'pass' }
      if (result.inline)
        return {
          ...result,
          status: 'pass-inline',
          reason: 'inline link in a sentence (WCAG exception)',
        }
      const c = centre(rect)
      const clashes = boxes
        .filter(
          (other) =>
            other.el !== el && !other.el.contains(el) && !el.contains(other.el),
        )
        .filter((other) => {
          if (distanceToRect(c, other.rect) < TARGET_MIN / 2) return true
          const otherUnder = under.some((item) => item.el === other.el)
          return (
            otherUnder &&
            Math.hypot(centre(other.rect).x - c.x, centre(other.rect).y - c.y) <
              TARGET_MIN
          )
        })
      if (!clashes.length)
        return {
          ...result,
          status: 'pass-spacing',
          reason: 'undersized but spaced (WCAG spacing exception)',
        }
      return {
        ...result,
        status: 'fail',
        reason: `undersized and within 12px of ${clashes
          .slice(0, 3)
          .map((other) => selectorOf(other.el))
          .join(', ')}`,
      }
    })
  }

  // ---------- G6 reflow ----------
  function reflow() {
    const root = document.documentElement
    const body = document.body
    const viewportOverflow =
      getComputedStyle(root).overflowX === 'visible'
        ? getComputedStyle(body).overflowX
        : getComputedStyle(root).overflowX
    const width = root.clientWidth
    const sideways =
      root.scrollWidth > width + 0.5 &&
      !['hidden', 'clip'].includes(viewportOverflow)
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) =>
        node.data.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
    })
    const styles = new Map()
    const styleOf = (el) => {
      if (!styles.has(el)) styles.set(el, getComputedStyle(el))
      return styles.get(el)
    }
    const shown = new Map()
    const clipped = new Map()
    const offscreen = new Map()
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const el = node.parentElement
      if (
        !el ||
        el.closest(IGNORE) ||
        el.closest(SKIP_TEXT_PARENTS) ||
        el.closest('svg')
      )
        continue
      if (!shown.has(el)) shown.set(el, isShown(el))
      if (!shown.get(el)) continue
      const range = document.createRange()
      range.selectNodeContents(node)
      const rects = [...range.getClientRects()].filter(
        (rect) => rect.width > 0.5,
      )
      for (const rect of rects) {
        if ((rect.right > width + 1 || rect.left < -1) && !offscreen.has(el)) {
          offscreen.set(el, {
            ...describe(el),
            left: round(rect.left, 0),
            right: round(rect.right, 0),
          })
        }
        for (let box = el; box && box !== body; box = box.parentElement) {
          const style = styleOf(box)
          const clipX = ['hidden', 'clip'].includes(style.overflowX)
          const clipY = ['hidden', 'clip'].includes(style.overflowY)
          if (!clipX && !clipY) continue
          const area = box.getBoundingClientRect()
          const outX =
            clipX && (rect.left < area.left - 2 || rect.right > area.right + 2)
          const outY =
            clipY && (rect.top < area.top - 2 || rect.bottom > area.bottom + 2)
          if ((outX || outY) && !clipped.has(el)) {
            clipped.set(el, {
              ...describe(el),
              clippedBy: selectorOf(box),
              axis: outX ? 'x' : 'y',
            })
          }
        }
      }
      if (
        styleOf(el).textOverflow === 'ellipsis' &&
        el.scrollWidth > el.clientWidth + 1 &&
        !clipped.has(el)
      ) {
        clipped.set(el, {
          ...describe(el),
          clippedBy: 'text-overflow: ellipsis',
          axis: 'x',
        })
      }
    }
    const wide = [...body.querySelectorAll('*')].filter((el) => {
      if (el.closest(IGNORE) || !isShown(el)) return false
      const rect = el.getBoundingClientRect()
      return rect.right > width + 1 || rect.left < -1
    })
    const outermost = wide.filter(
      (el) => !wide.some((other) => other !== el && other.contains(el)),
    )
    return {
      innerWidth,
      clientWidth: width,
      scrollWidth: root.scrollWidth,
      bodyScrollWidth: body.scrollWidth,
      viewportOverflowX: viewportOverflow,
      sideways,
      clipped: [...clipped.values()],
      offscreenText: [...offscreen.values()],
      widestOverflow: outermost.slice(0, 10).map((el) => {
        const rect = el.getBoundingClientRect()
        return {
          ...describe(el),
          left: round(rect.left, 0),
          right: round(rect.right, 0),
        }
      }),
    }
  }

  // ---------- G7 / G8 links ----------
  function whatsappLinks(root = document) {
    return [...root.querySelectorAll(WHATSAPP_SELECTOR)]
      .filter((el) => !el.closest(IGNORE))
      .map((el) => {
        const href = el.getAttribute('href')
        let url = null
        try {
          url = new URL(href, location.href)
        } catch {
          url = null
        }
        const number = url
          ? url.hostname === 'wa.me'
            ? url.pathname.replace(/\D/g, '')
            : (url.searchParams.get('phone') || '').replace(/\D/g, '')
          : ''
        const message = url ? url.searchParams.get('text') || '' : ''
        const rawQuery = url ? url.search : ''
        const problems = []
        if (!url || url.hostname !== 'wa.me')
          problems.push(`host ${url ? url.hostname : 'unparsable'}`)
        if (number !== WHATSAPP_NUMBER)
          problems.push(`number ${number || 'missing'}`)
        if (el.getAttribute('target') !== '_blank')
          problems.push(`target ${el.getAttribute('target') || 'missing'}`)
        if (!clean(message)) problems.push('no prefilled message')
        if (/\s/.test(rawQuery)) problems.push('message not URL-encoded')
        return {
          ...describe(el),
          name: nameOf(el),
          href,
          number,
          message,
          target: el.getAttribute('target'),
          rel: el.getAttribute('rel'),
          context: el.dataset.wzWa || null,
          shown: isShown(el),
          status: problems.length ? 'fail' : 'pass',
          problems,
        }
      })
  }
  const PHONE_PATTERN = /(?:\+\s?27|\b0)[\s\-().]*8\d(?:[\s\-().]*\d){7}\b/g
  const normalisePhone = (text) => {
    const digits = text.replace(/\D/g, '')
    return digits.startsWith('0') ? `27${digits.slice(1)}` : digits
  }
  function contactLinks() {
    const anchors = [
      ...document.querySelectorAll('a[href^="tel:"], a[href^="mailto:"]'),
    ].filter((el) => !el.closest(IGNORE))
    const links = anchors.map((el) => {
      const href = el.getAttribute('href')
      const base = {
        ...describe(el),
        href,
        name: nameOf(el),
        shown: isShown(el),
      }
      if (href.startsWith('tel:')) {
        const number = normalisePhone(href.slice(4))
        const ok =
          /^tel:\+?\d+$/.test(href.replace(/[\s-]/g, '')) &&
          number === WHATSAPP_NUMBER
        return {
          ...base,
          type: 'tel',
          number,
          status: ok ? 'pass' : 'fail',
          reason: ok ? undefined : `tel number ${number}`,
        }
      }
      const address = decodeURIComponent(href.slice(7).split('?')[0])
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(address)
      return {
        ...base,
        type: 'mailto',
        address,
        status: ok ? 'pass' : 'fail',
        reason: ok ? undefined : 'invalid address',
      }
    })
    const formats = new Map()
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
    )
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const el = node.parentElement
      if (
        !el ||
        el.closest(IGNORE) ||
        el.closest(SKIP_TEXT_PARENTS) ||
        !el.checkVisibility()
      )
        continue
      for (const match of node.data.matchAll(PHONE_PATTERN)) {
        if (normalisePhone(match[0]) !== WHATSAPP_NUMBER) continue
        const key = match[0].trim()
        if (!formats.has(key))
          formats.set(key, { format: key, count: 0, where: [] })
        const entry = formats.get(key)
        entry.count++
        if (entry.where.length < 6) entry.where.push(selectorOf(el))
      }
    }
    const attributes = [...document.querySelectorAll('[aria-label], [title]')]
      .filter((el) => !el.closest(IGNORE))
      .flatMap((el) => {
        const text = `${el.getAttribute('aria-label') || ''} ${el.getAttribute('title') || ''}`
        return [...text.matchAll(PHONE_PATTERN)]
          .filter((match) => normalisePhone(match[0]) === WHATSAPP_NUMBER)
          .map((match) => ({
            format: match[0].trim(),
            selector: selectorOf(el),
          }))
      })
    return {
      links,
      textFormats: [...formats.values()],
      attributeFormats: attributes,
    }
  }

  // ---------- G9 contact in reach ----------
  async function contactAt(top) {
    jump(top)
    await settle(900)
    const visible = []
    for (const el of document.querySelectorAll(CONTACT_SELECTOR)) {
      if (
        el.closest(IGNORE) ||
        !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })
      )
        continue
      if (opacityChain(el) < 0.5) continue
      const rect = el.getBoundingClientRect()
      const left = Math.max(rect.left, 0)
      const right = Math.min(rect.right, innerWidth)
      const topEdge = Math.max(rect.top, 0)
      const bottom = Math.min(rect.bottom, innerHeight)
      if (right <= left || bottom <= topEdge) continue
      if ((right - left) * (bottom - topEdge) < 0.5 * rect.width * rect.height)
        continue
      const cy = (topEdge + bottom) / 2
      const samples = [0.5, 0.25, 0.75].map((share) => [
        left + (right - left) * share,
        cy,
      ])
      const uncovered = samples.some(([x, y]) => {
        const hit = document.elementFromPoint(x, y)
        return hit && (hit === el || el.contains(hit))
      })
      if (uncovered) visible.push(`${contactKind(el)}: ${selectorOf(el)}`)
    }
    return { requested: top, y: scrollY, visible }
  }

  // ---------- G10 reduced motion ----------
  const motion = {
    armed: false,
    events: [],
    animations: new Map(),
    scrolls: [],
    startedAt: 0,
  }
  const maxDuration = (list) =>
    Math.max(
      0,
      ...list.split(',').map((part) => {
        const value = parseFloat(part)
        return part.trim().endsWith('ms') ? value : value * 1000
      }),
    )
  document.addEventListener(
    'transitionrun',
    (event) => {
      if (!motion.armed) return
      const style = getComputedStyle(event.target)
      motion.events.push({
        type: 'transition',
        selector: selectorOf(event.target),
        property: event.propertyName,
        durationMs: maxDuration(style.transitionDuration),
      })
    },
    true,
  )
  document.addEventListener(
    'animationstart',
    (event) => {
      if (!motion.armed) return
      const style = getComputedStyle(event.target)
      motion.events.push({
        type: 'animation',
        selector: selectorOf(event.target),
        name: event.animationName,
        durationMs: maxDuration(style.animationDuration),
      })
    },
    true,
  )
  function sampleAnimations() {
    for (const animation of document.getAnimations()) {
      if (animation.playState !== 'running') continue
      const timing = animation.effect?.getComputedTiming()
      const duration =
        typeof timing?.duration === 'number' ? timing.duration : 0
      const target = animation.effect?.target
      const label =
        animation.animationName ||
        animation.transitionProperty ||
        animation.id ||
        animation.constructor.name
      const key = `${label}|${target ? selectorOf(target) : ''}`
      if (!motion.animations.has(key)) {
        motion.animations.set(key, {
          type: animation.constructor.name,
          name: label,
          selector: target ? selectorOf(target) : null,
          durationMs: round(duration, 3),
          iterations: timing?.iterations,
        })
      }
    }
  }
  function armMotion() {
    motion.armed = true
    motion.events = []
    motion.animations = new Map()
    motion.scrolls = [scrollY]
    motion.startedAt = performance.now()
    const tick = () => {
      if (!motion.armed) return
      sampleAnimations()
      if (motion.scrolls[motion.scrolls.length - 1] !== scrollY)
        motion.scrolls.push(scrollY)
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
    return true
  }
  async function collectMotion(windowMs = 900) {
    const remaining = windowMs - (performance.now() - motion.startedAt)
    if (remaining > 0)
      await new Promise((resolve) => setTimeout(resolve, remaining))
    sampleAnimations()
    motion.armed = false
    return {
      events: motion.events,
      animations: [...motion.animations.values()],
      scrollSteps: motion.scrolls.map((y) => round(y, 0)),
    }
  }
  function motionAtRest() {
    sampleAnimations()
    const running = [...motion.animations.values()]
    motion.animations = new Map()
    return {
      running,
      scrollBehaviour: {
        html: getComputedStyle(document.documentElement).scrollBehavior,
        body: getComputedStyle(document.body).scrollBehavior,
      },
      reducedMatches: matchMedia('(prefers-reduced-motion: reduce)').matches,
    }
  }

  // ---------- G12 structure and form ----------
  function structure() {
    const all = [
      ...document.querySelectorAll('h1, h2, h3, h4, h5, h6, [role=heading]'),
    ].filter((el) => !el.closest(IGNORE))
    const levelOf = (el) =>
      el.getAttribute('role') === 'heading'
        ? Number(el.getAttribute('aria-level') || 2)
        : Number(el.localName[1])
    const headings = all.map((el) => ({
      ...describe(el),
      level: levelOf(el),
      shown:
        isShown(el) ||
        (el.checkVisibility() && el.getBoundingClientRect().height > 0),
    }))
    const shownHeadings = headings.filter((heading) => heading.shown)
    const skips = []
    shownHeadings.forEach((heading, index) => {
      if (index === 0) return
      const previous = shownHeadings[index - 1]
      if (heading.level > previous.level + 1)
        skips.push({
          from: `h${previous.level} ${previous.text}`,
          to: `h${heading.level} ${heading.text}`,
          selector: heading.selector,
        })
    })
    const firstH1 = shownHeadings.findIndex((heading) => heading.level === 1)
    const beforeH1 =
      firstH1 > 0
        ? shownHeadings
            .slice(0, firstH1)
            .map((heading) => `h${heading.level} ${heading.text}`)
        : []
    const sectioning = 'article, aside, main, nav, section'
    // A landmark's name comes from aria-labelledby or aria-label only; its
    // text content never names it.
    const landmarkName = (el) => {
      const info = nameInfo(el)
      return info.source === 'aria-labelledby' || info.source === 'aria-label'
        ? info.name
        : null
    }
    const landmark = (selector, role, topLevelOnly) =>
      [...document.querySelectorAll(`${selector}, [role=${role}]`)]
        .filter((el) => {
          if (el.closest(IGNORE)) return false
          if (el.getAttribute('role') === role) return true
          return !topLevelOnly || !el.parentElement.closest(sectioning)
        })
        .map((el) => ({ ...describe(el), label: landmarkName(el) }))
    const landmarks = {
      banner: landmark('header', 'banner', true),
      navigation: landmark('nav', 'navigation', false),
      main: landmark('main', 'main', false),
      contentinfo: landmark('footer', 'contentinfo', true),
    }
    const lang = document.documentElement.getAttribute('lang')
    const fields = [...document.querySelectorAll('input, select, textarea')]
      .filter(
        (el) =>
          !el.closest(IGNORE) &&
          !['hidden', 'submit', 'button', 'reset', 'image'].includes(el.type),
      )
      .map((el) => {
        const info = nameInfo(el)
        const labelled =
          !!info.name &&
          info.source !== 'placeholder' &&
          info.source !== 'content'
        return {
          ...describe(el),
          name: info.name,
          source: info.source,
          status: labelled ? 'pass' : 'fail',
        }
      })
    return {
      h1Count: headings.filter((heading) => heading.level === 1).length,
      headings,
      skips,
      beforeH1,
      landmarks,
      lang,
      langValid: !!lang && /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/.test(lang),
      fields,
    }
  }
  function visibleTexts(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) =>
        node.data.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
    })
    const texts = []
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.parentElement && isShown(node.parentElement))
        texts.push(clean(node.data))
    }
    return texts
  }
  function prepareForms() {
    return [...document.querySelectorAll('form')]
      .filter((form) => !form.closest(IGNORE) && isShown(form))
      .map((form) => {
        for (const field of form.querySelectorAll('input, textarea, select')) {
          if (
            [
              'hidden',
              'submit',
              'button',
              'reset',
              'image',
              'checkbox',
              'radio',
            ].includes(field.type)
          )
            continue
          field.value = ''
        }
        const submit = form.querySelector(
          'button:not([type=button]):not([type=reset]), input[type=submit]',
        )
        return {
          ...describe(form),
          submitId: submit ? idOf(submit) : null,
          noValidate: form.noValidate,
          before: visibleTexts(form),
          url: location.href,
        }
      })
  }
  function formResult(formId, before, url) {
    const form = byId.get(formId)
    if (!form || !form.isConnected)
      return {
        error: 'form gone (page navigated?)',
        urlChanged: location.href !== url,
      }
    const after = visibleTexts(form)
    const counts = new Map()
    for (const text of before) counts.set(text, (counts.get(text) || 0) + 1)
    const added = after.filter((text) => {
      const left = counts.get(text) || 0
      if (left > 0) {
        counts.set(text, left - 1)
        return false
      }
      return true
    })
    const invalid = [...form.querySelectorAll('[aria-invalid=true]')].map(
      (el) => {
        const describedBy = (el.getAttribute('aria-describedby') || '')
          .split(/\s+/)
          .map((id) => document.getElementById(id))
          .filter(Boolean)
        return {
          ...describe(el),
          name: nameOf(el),
          describedBy: clean(
            describedBy.map((node) => node.textContent).join(' '),
          ),
        }
      },
    )
    const nativeInvalid = form.noValidate
      ? []
      : [...form.querySelectorAll(':invalid')]
          .filter((el) => el !== form)
          .map((el) => ({ ...describe(el), message: el.validationMessage }))
    const alerts = [
      ...document.querySelectorAll('[role=alert], [role=status], [aria-live]'),
    ]
      .filter((el) => !el.closest(IGNORE) && clean(el.textContent))
      .map((el) => ({
        selector: selectorOf(el),
        text: clean(el.textContent).slice(0, 160),
      }))
    return {
      added,
      invalid,
      nativeInvalid,
      alerts,
      focused: activeInfo(),
      urlChanged: location.href !== url,
    }
  }

  // ---------- C6.1 type scale and line length ----------
  function lineStats(el) {
    const style = getComputedStyle(el)
    const lineHeight =
      parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    const range = document.createRange()
    const lines = []
    let lineTop = null
    let seen = 0
    for (
      let node = walker.nextNode();
      node && seen < MAX_LINE_CHARS_SAMPLE;
      node = walker.nextNode()
    ) {
      for (let i = 0; i < node.length && seen < MAX_LINE_CHARS_SAMPLE; i++) {
        range.setStart(node, i)
        range.setEnd(node, i + 1)
        const rect = range.getClientRects()[0]
        if (!rect) continue
        seen++
        if (lineTop === null || rect.top > lineTop + lineHeight * 0.5) {
          lines.push(0)
          lineTop = rect.top
        }
        lines[lines.length - 1]++
      }
    }
    const full = lines.length > 1 ? lines.slice(0, -1) : lines
    const sorted = [...full].sort((a, b) => a - b)
    return {
      lines: lines.length,
      maxChars: Math.max(0, ...full),
      medianChars: sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0,
    }
  }
  function typeScale() {
    const { carriers } = textCarriers(document.body)
    const sizes = new Map()
    const small = []
    let largest = { size: 0 }
    for (const el of carriers.keys()) {
      const style = getComputedStyle(el)
      const size = round(parseFloat(style.fontSize), 1)
      const chars = clean(el.textContent).length
      if (!sizes.has(size))
        sizes.set(size, { px: size, elements: 0, samples: [] })
      const entry = sizes.get(size)
      entry.elements++
      if (entry.samples.length < 3)
        entry.samples.push(`${selectorOf(el)} "${snippet(el).slice(0, 30)}"`)
      if (size > largest.size)
        largest = {
          size,
          selector: selectorOf(el),
          text: snippet(el).slice(0, 40),
        }
      if (size < 14 && chars > 0) small.push({ ...describe(el), size })
    }
    const h1 = document.querySelector('h1')
    const h1Size = h1
      ? round(parseFloat(getComputedStyle(h1).fontSize), 1)
      : null
    const bodyEls = [
      ...document.querySelectorAll('p, li, dd, blockquote'),
    ].filter((el) => {
      if (el.closest(IGNORE) || !isShown(el) || el.querySelector('p, li'))
        return false
      return clean(el.textContent).length >= 40
    })
    const body = bodyEls.map((el) => ({
      ...describe(el),
      text: snippet(el).slice(0, 50),
      size: round(parseFloat(getComputedStyle(el).fontSize), 1),
      ...lineStats(el),
    }))
    return {
      distinctSizes: [...sizes.values()].sort((a, b) => b.px - a.px),
      sizeCount: sizes.size,
      h1Size,
      largest,
      h1IsLargest: h1Size !== null && h1Size >= largest.size,
      under14: small,
      body,
    }
  }

  // What the page already has, so gates.mjs can skip gates whose subject is not
  // built yet instead of passing or failing them. designReady flips when the
  // opening WhatsApp action (#wz-hero-wa, design spec S2) lands on /next.
  // sections records which parts of the page exist, so G12 can judge only the
  // sections that landed. shell is false when the app shell (main + h1) never
  // rendered: the flag-off page or a survey taken before React committed. The
  // shell renders right after load, so wait briefly before calling it absent.
  async function contentSurvey() {
    const deadline = performance.now() + SHELL_WAIT_MS
    while (
      !(document.querySelector('main') && document.querySelector('h1')) &&
      performance.now() < deadline
    )
      await new Promise((resolve) => setTimeout(resolve, SHELL_POLL_MS))
    const section = (id) => !!document.getElementById(id)
    return {
      shell: !!(document.querySelector('main') && document.querySelector('h1')),
      designReady: section('wz-hero-wa'),
      sections: {
        hero: section('wz-hero-wa'),
        what: section('wz-what'),
        work: section('wz-work'),
        story: section('wz-story'),
        contact: section('wz-contact'),
        form: section('wz-form'),
      },
      controls: tabbables().length,
      whatsappLinks: document.querySelectorAll(WHATSAPP_SELECTOR).length,
      telLinks: document.querySelectorAll('a[href^="tel:"]').length,
      mailtoLinks: document.querySelectorAll('a[href^="mailto:"]').length,
      forms: [...document.querySelectorAll('form')].filter(isShown).length,
      photoOpeners: findPhotoOpeners().length,
    }
  }

  window.__probe = {
    ready,
    pageSize,
    scrollToY,
    settle,
    lazyImagesLoaded,
    textContrast,
    nonTextContrast,
    captureBaselines,
    tabbables: () => tabbables().map(describe),
    activeInfo,
    focusRing,
    openingWhatsapp,
    findTiles,
    findFilters,
    findPhotoOpeners,
    findNavLinks,
    findMapControl,
    waitForMapTiles,
    pointFor,
    focusById,
    pressedState,
    isActive,
    dialogState,
    lightboxDetails,
    targets,
    reflow,
    whatsappLinks: () => whatsappLinks(document),
    contactLinks,
    contactAt,
    armMotion,
    collectMotion,
    motionAtRest,
    structure,
    prepareForms,
    formResult,
    typeScale,
    contentSurvey,
  }
})()
