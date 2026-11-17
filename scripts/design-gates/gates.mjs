// Turns the raw probe measurements into one verdict per gate, per the quality
// gates in docs/design/home-page.md (G1-G12). Status values:
// pass · fail · manual (nothing failed, but some items need a person to look)
// skipped (the page has none of the gate's subject yet while /next is built up;
// a skipped gate is never a pass) · unknown (the check could not run).
const TITLES = {
  G1: 'Text contrast',
  G2: 'Non-text contrast',
  G3: 'Keyboard',
  G4: 'Visible focus',
  G5: 'Target size',
  G6: 'Reflow',
  G7: 'WhatsApp links',
  G8: 'Phone and email',
  G9: 'Contact always in reach',
  G10: 'Reduced motion',
  G11: 'Clean page',
  G12: 'Structure',
}
const WHATSAPP_HOST_PATH = 'wa.me/27828781557'
const PHONE_ACTION_MIN_HEIGHT = 48
const PHONE_VIEWPORT = '390'
const NON_TEXT_MIN = 3
const INSTANT_MS = 1
const OPENING_WHATSAPP_MAX_STOP = 3
const STOP_WORDS = new Set([
  'and',
  'with',
  'work',
  'jobs',
  'small',
  'something',
  'else',
  'other',
  'your',
])

// The G11 network allow-list. Same-origin requests are always allowed; this
// list covers external origins. OpenStreetMap tiles pass only after the probe
// has pressed the map's "Show the map" control (#100), and only from the one
// tile host the CSP names; before that a tile request fails the gate. A
// stubbed entry never reaches its host: the probe answers it with a stand-in,
// because OSM's tile policy forbids fetching tiles nobody is viewing.
const EXTERNAL_ALLOWLIST = [
  {
    host: 'static.cloudflareinsights.com',
    name: 'Cloudflare Web Analytics beacon',
  },
  { host: 'api.web3forms.com', name: 'Web3Forms' },
  {
    host: 'tile.openstreetmap.org',
    name: 'OpenStreetMap tiles',
    exactHost: true,
    needsMapActive: true,
    stubbed: true,
    inactiveReason: 'map tiles are allowed only after map activation (#100)',
  },
]

function matchesHost(hostname, entry) {
  if (hostname === entry.host) return true
  return !entry.exactHost && hostname.endsWith(`.${entry.host}`)
}

// Classifies one request URL against the G11 allow-list. pageOrigin is the
// origin of the page under test; state.mapActive is true once the probe has
// activated the map. External hosts must use https:; an http response can be
// rewritten in transit, so the hostname alone is not enough.
export function classifyRequest(rawUrl, pageOrigin, state = {}) {
  if (rawUrl.startsWith('data:') || rawUrl === 'about:blank')
    return { allowed: true, kind: 'inline' }
  let url
  try {
    url = new URL(rawUrl)
  } catch {
    return {
      allowed: false,
      kind: 'unparsable URL',
      reason: 'URL could not be parsed',
    }
  }
  if (url.origin === pageOrigin) return { allowed: true, kind: 'same-origin' }
  const entry = EXTERNAL_ALLOWLIST.find((candidate) =>
    matchesHost(url.hostname, candidate),
  )
  if (!entry)
    return {
      allowed: false,
      kind: 'external',
      reason: 'not on the G11 allow-list',
    }
  if (url.protocol !== 'https:')
    return {
      allowed: false,
      kind: entry.name,
      reason: `external hosts must use https: (got ${url.protocol})`,
    }
  if (entry.needsMapActive && !state.mapActive)
    return { allowed: false, kind: entry.name, reason: entry.inactiveReason }
  if (entry.stubbed) return { allowed: true, kind: entry.name, stubbed: true }
  return { allowed: true, kind: entry.name }
}

const pick = (item, keys) =>
  Object.fromEntries(
    keys
      .filter((key) => item[key] !== undefined && item[key] !== null)
      .map((key) => [key, item[key]]),
  )
const failure = (item, extra = {}) => ({
  selector: item.selector,
  text: item.text,
  ...extra,
})
const skipped = (summary) => ({
  status: 'skipped',
  summary,
  failures: [],
  manual: [],
})

function verdict(failures, manual) {
  if (failures.length) return 'fail'
  if (manual.length) return 'manual'
  return 'pass'
}

function dedupe(items, keyOf, better) {
  const map = new Map()
  for (const item of items) {
    const key = keyOf(item)
    if (!map.has(key) || better(item, map.get(key))) map.set(key, item)
  }
  return [...map.values()]
}

function g1(parts, survey) {
  const runs = parts.G1?.runs || []
  if (!runs.length)
    return { status: 'unknown', summary: 'no contrast run completed' }
  if (survey && !survey.designReady)
    return skipped(
      'no design content on the page yet; the gate starts when the opening section lands',
    )
  const items = runs.flatMap((run) =>
    run.items.map((item) => ({ ...item, viewport: run.viewport })),
  )
  const fails = dedupe(
    items.filter((item) => item.status === 'fail'),
    (item) => item.selector,
    (a, b) => a.ratio < b.ratio,
  )
  const manual = dedupe(
    [
      ...items.filter((item) => item.status === 'manual'),
      ...runs.flatMap((run) =>
        (run.svgText || []).map((item) => ({
          ...item,
          viewport: run.viewport,
        })),
      ),
    ],
    (item) => item.selector,
    () => false,
  )
  const measuredItems = items.filter(
    (item) => item.ratio !== undefined && item.status !== 'manual',
  )
  const minRatio = measuredItems.length
    ? Math.min(...measuredItems.map((item) => item.ratio))
    : null
  return {
    status: verdict(fails, manual),
    summary: `${measuredItems.length} text checks over ${runs.map((run) => run.viewport).join(', ')}; ${fails.length} below threshold; min ${minRatio}:1; ${manual.length} need inspection`,
    measured: {
      checks: measuredItems.length,
      minRatio,
      perViewport: runs.map((run) => ({
        viewport: run.viewport,
        checked: run.items.length,
        svgText: (run.svgText || []).length,
      })),
    },
    failures: fails.map((item) =>
      failure(
        item,
        pick(item, ['viewport', 'fg', 'bg', 'ratio', 'need', 'size', 'weight']),
      ),
    ),
    manual: manual.map((item) =>
      failure(
        item,
        pick(item, ['viewport', 'reason', 'fg', 'size', 'estimate']),
      ),
    ),
    all: items.map((item) =>
      pick(item, [
        'viewport',
        'selector',
        'text',
        'fg',
        'bg',
        'ratio',
        'need',
        'size',
        'weight',
        'status',
        'reason',
        'estimate',
      ]),
    ),
  }
}

function g2(parts, survey) {
  const runs = parts.G2?.runs || []
  if (!runs.length)
    return { status: 'unknown', summary: 'no non-text contrast run completed' }
  if (survey && !survey.designReady)
    return skipped(
      'no design content on the page yet; the gate starts when the opening section lands',
    )
  const items = runs.flatMap((run) =>
    run.items.map((item) => ({ ...item, viewport: run.viewport })),
  )
  const graphics = runs.flatMap((run) =>
    (run.graphics || []).map((item) => ({ ...item, viewport: run.viewport })),
  )
  const rings = (parts.G3?.stops || []).filter(
    (stop) => stop.minRatio !== null && stop.minRatio !== undefined,
  )
  const ringFails = rings.filter((stop) => stop.minRatio < NON_TEXT_MIN)
  const fails = [
    ...dedupe(
      items.filter((item) => item.status === 'fail'),
      (item) => item.selector,
      () => false,
    ).map((item) =>
      failure(
        item,
        pick(item, [
          'viewport',
          'kind',
          'reason',
          'outer',
          'fill',
          'fillRatio',
          'border',
          'borderRatio',
          'icons',
        ]),
      ),
    ),
    ...ringFails.map((stop) =>
      failure(stop, {
        kind: 'focus ring',
        ratio: stop.minRatio,
        ring: stop.ring,
      }),
    ),
  ]
  const manual = dedupe(
    [...items.filter((item) => item.status === 'manual'), ...graphics],
    (item) => item.selector,
    () => false,
  )
  const counted = (status) =>
    items.filter((item) => item.status === status).length
  const minRing = rings.length
    ? Math.min(...rings.map((stop) => stop.minRatio))
    : null
  return {
    status: verdict(fails, manual),
    summary: `${items.length} controls (${counted('pass')} pass, ${counted('fail')} fail, ${counted('info')} text/image-identified); focus rings min ${minRing}:1; ${manual.length} need inspection`,
    measured: {
      controls: items.length,
      byKind: Object.fromEntries(
        ['form-field', 'icon-only', 'text-control', 'image-control'].map(
          (kind) => [kind, items.filter((item) => item.kind === kind).length],
        ),
      ),
      focusRingMin: minRing,
    },
    failures: fails,
    manual: manual.map((item) =>
      failure(
        item,
        pick(item, ['viewport', 'reason', 'name', 'size', 'estimate']),
      ),
    ),
    all: items.map((item) =>
      pick(item, [
        'viewport',
        'selector',
        'text',
        'kind',
        'status',
        'outer',
        'fill',
        'fillRatio',
        'border',
        'borderRatio',
        'icons',
      ]),
    ),
  }
}

function g3(parts, survey) {
  const data = parts.G3
  if (!data) return { status: 'unknown', summary: 'Tab walk did not run' }
  if (data.skippedNoControls || survey?.controls === 0)
    return skipped('no focusable controls on the page yet')
  if (!data.stops) return { status: 'unknown', summary: 'Tab walk did not run' }
  const fails = []
  if (!data.opening) {
    // No WhatsApp link anywhere yet: the opening-action rule starts when the first one lands.
    if (!survey || survey.whatsappLinks > 0) {
      fails.push({
        selector: null,
        text: 'no WhatsApp link inside <main> to act as the opening action',
      })
    }
  } else if (!data.openingIndex) {
    fails.push(
      failure(data.opening, {
        reason: 'opening WhatsApp action never received focus',
      }),
    )
  } else if (data.openingIndex > OPENING_WHATSAPP_MAX_STOP) {
    fails.push(
      failure(data.opening, {
        reason: `opening WhatsApp action is Tab stop ${data.openingIndex}`,
      }),
    )
  }
  if (data.trap)
    fails.push({ selector: null, text: data.trap, reason: 'keyboard trap' })
  for (const item of data.unreached || [])
    fails.push(
      failure(item, { reason: 'visible control never reached by Tab' }),
    )
  const keyboard = data.lightboxKeyboard
  if (keyboard) {
    if (!keyboard.opened?.open)
      fails.push({
        selector: null,
        text: 'lightbox did not open with Enter on a photo',
      })
    else {
      if (keyboard.closed?.open)
        fails.push({
          selector: keyboard.closed.selector,
          text: 'Esc did not close the lightbox',
        })
      if (!keyboard.focusReturned)
        fails.push({
          selector: keyboard.returnedTo?.selector || null,
          text: 'focus did not return to the photo after Esc (keyboard open)',
        })
    }
  }
  const mouse = data.lightboxMouse
  if (mouse) {
    if (!mouse.opened?.open)
      fails.push({
        selector: null,
        text: 'lightbox did not open on a photo click',
      })
    else {
      if (mouse.closed?.open)
        fails.push({
          selector: mouse.closed.selector,
          text: 'Esc did not close the lightbox (mouse open)',
        })
      if (!mouse.focusReturned)
        fails.push({
          selector: mouse.returnedTo?.selector || null,
          text: 'focus did not return to the photo after Esc (mouse open)',
        })
    }
  }
  for (const op of data.keyboardOperation || [])
    if (!op.operated)
      fails.push({
        selector: op.selector,
        text: op.name,
        reason: `${op.key} did not toggle aria-pressed`,
      })
  const manual =
    keyboard || mouse
      ? []
      : [
          {
            selector: null,
            text: 'lightbox not tested',
            reason: 'no photo opener found',
          },
        ]
  const jumps = []
  data.stops.forEach((stop, index) => {
    const previous = data.stops[index - 1]
    if (previous && !stop.inDialog && stop.docTop < previous.docTop - 300)
      jumps.push(
        `${previous.index}→${stop.index}: ${previous.selector} (y ${previous.docTop}) → ${stop.selector} (y ${stop.docTop})`,
      )
  })
  return {
    status: verdict(fails, manual),
    summary: `${data.stops.length} Tab stops (${data.expectedCount} visible at load), wrapped: ${data.wrapped}; opening WhatsApp = stop ${data.openingIndex || 'none'}; lightbox Esc close/return: ${keyboard ? `${!keyboard.closed?.open}/${keyboard.focusReturned}` : 'n/a'} (keys), ${mouse ? `${!mouse.closed?.open}/${mouse.focusReturned}` : 'n/a'} (mouse)`,
    measured: {
      tabOrder: data.stops.map(
        (stop) =>
          `${stop.index}. ${stop.name || '(no name)'} · ${stop.selector}`,
      ),
      openingWhatsapp: data.opening
        ? { selector: data.opening.selector, stop: data.openingIndex }
        : null,
      wrapped: data.wrapped,
      trap: data.trap,
      upwardJumpsForReview: jumps,
      lightboxKeyboard: keyboard && {
        opened: keyboard.opened,
        focusOnOpen: keyboard.opened?.active?.name,
        tabInside: (keyboard.inside || []).map((item) =>
          item.isBody
            ? '(left page)'
            : `${item.name} · inDialog ${item.inDialog}`,
        ),
        closed: !keyboard.closed?.open,
        focusReturned: keyboard.focusReturned,
        returnedTo: keyboard.returnedTo?.selector,
      },
      lightboxMouse: mouse && {
        opened: mouse.opened?.open,
        closed: !mouse.closed?.open,
        focusReturned: mouse.focusReturned,
        returnedTo: mouse.returnedTo?.selector,
      },
      keyboardOperation: data.keyboardOperation,
    },
    failures: fails,
    manual,
  }
}

function g4(parts, survey) {
  const stops = parts.G3?.stops || []
  if (!stops.length) {
    if (parts.G3?.skippedNoControls || survey?.controls === 0)
      return skipped('no focusable controls on the page yet')
    return { status: 'unknown', summary: 'no Tab stops measured' }
  }
  const fails = stops.filter((stop) => stop.status === 'fail')
  const manual = stops.filter((stop) => stop.status === 'manual')
  const widths = stops
    .map((stop) => stop.ring?.width)
    .filter((width) => width !== undefined)
  return {
    status: verdict(fails, manual),
    summary: `${stops.length} stops: ${stops.length - fails.length - manual.length} pass, ${fails.length} fail, ${manual.length} manual; ring width ${widths.length ? `${Math.min(...widths)}–${Math.max(...widths)}px` : 'n/a'}`,
    measured: {
      stops: stops.map((stop) =>
        pick(stop, [
          'index',
          'selector',
          'name',
          'status',
          'reason',
          'ring',
          'minRatio',
          'centreCovered',
          'rect',
        ]),
      ),
    },
    failures: fails.map((stop) =>
      failure(
        { ...stop, text: stop.name },
        {
          stop: stop.index,
          reason: stop.reason,
          ring: stop.ring,
          minRatio: stop.minRatio,
        },
      ),
    ),
    manual: manual.map((stop) =>
      failure(
        { ...stop, text: stop.name },
        { stop: stop.index, reason: stop.reason, estimate: stop.estimate },
      ),
    ),
  }
}

function g5(parts, survey) {
  const runs = parts.G5?.runs || []
  if (!runs.length)
    return { status: 'unknown', summary: 'no target run completed' }
  const items = runs.flatMap((run) =>
    run.items.map((item) => ({ ...item, viewport: run.viewport })),
  )
  if (!items.length && survey && survey.controls === 0)
    return skipped('no interactive targets on the page yet')
  const sizeFails = items.filter((item) => item.status === 'fail')
  const contactFails = items
    .filter(
      (item) =>
        item.viewport.startsWith(PHONE_VIEWPORT) &&
        item.contact &&
        item.h < PHONE_ACTION_MIN_HEIGHT,
    )
    .map((item) => ({
      ...item,
      reason: `${item.contact} action ${item.h}px tall at 390 (needs ${PHONE_ACTION_MIN_HEIGHT})`,
    }))
  const fails = dedupe(
    [...sizeFails, ...contactFails],
    (item) => `${item.viewport}|${item.selector}|${item.reason}`,
    () => false,
  )
  const smallest = items.reduce(
    (min, item) =>
      Math.min(item.w, item.h) < Math.min(min.w, min.h) ? item : min,
    items[0],
  )
  const phoneContacts = items.filter(
    (item) => item.viewport === PHONE_VIEWPORT && item.contact,
  )
  return {
    status: verdict(fails, []),
    summary: `${items.length} targets over ${runs.map((run) => run.viewport).join(', ')}; ${sizeFails.length} under 24px without exception; ${contactFails.length} phone WhatsApp/tel actions under 48px; smallest ${smallest ? `${smallest.w}×${smallest.h} ${smallest.selector}` : 'n/a'}`,
    measured: {
      exceptions: items
        .filter((item) => item.status.startsWith('pass-'))
        .map((item) =>
          pick(item, ['viewport', 'selector', 'w', 'h', 'status']),
        ),
      phoneContactHeights: phoneContacts.map(
        (item) => `${item.contact} ${item.h}px · ${item.selector}`,
      ),
    },
    failures: fails.map((item) =>
      failure(item, pick(item, ['viewport', 'w', 'h', 'reason'])),
    ),
    all: items.map((item) =>
      pick(item, [
        'viewport',
        'selector',
        'text',
        'w',
        'h',
        'contact',
        'inline',
        'status',
      ]),
    ),
  }
}

function g6(parts) {
  const runs = parts.G6?.runs || []
  if (!runs.length)
    return { status: 'unknown', summary: 'no reflow run completed' }
  const fails = runs.flatMap((run) => [
    ...(run.sideways
      ? [
          {
            selector: 'html',
            text: `scrollWidth ${run.scrollWidth} > ${run.clientWidth}`,
            width: run.width,
          },
        ]
      : []),
    ...run.clipped.map((item) =>
      failure(item, {
        width: run.width,
        reason: `text clipped (${item.axis}) by ${item.clippedBy}`,
      }),
    ),
    ...run.offscreenText.map((item) =>
      failure(item, {
        width: run.width,
        reason: `text outside the viewport (${item.left}–${item.right}px)`,
      }),
    ),
  ])
  return {
    status: verdict(fails, []),
    summary: runs
      .map(
        (run) =>
          `${run.width}: sw ${run.scrollWidth}/${run.clientWidth}${run.clipped.length ? `, ${run.clipped.length} clipped` : ''}${run.offscreenText.length ? `, ${run.offscreenText.length} offscreen` : ''}`,
      )
      .join('; '),
    measured: {
      runs: runs.map((run) =>
        pick(run, [
          'width',
          'innerWidth',
          'clientWidth',
          'scrollWidth',
          'bodyScrollWidth',
          'viewportOverflowX',
          'sideways',
          'widestOverflow',
        ]),
      ),
    },
    failures: fails,
  }
}

function stemsOf(label) {
  return label
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((word) => word.length >= 4 && !STOP_WORDS.has(word))
    .map((word) => word.slice(0, Math.max(4, word.length - 2)))
}

function g7(parts) {
  const data = parts.G7
  if (!data?.links)
    return { status: 'unknown', summary: 'WhatsApp links not read' }
  if (!data.links.length) return skipped('no WhatsApp links on the page yet')
  const fails = data.links
    .filter((link) => link.status === 'fail')
    .map((link) =>
      failure(link, { reason: link.problems.join('; '), href: link.href }),
    )
  const manual = []
  const tileResults = (data.tiles?.picks || []).map((pickResult) => {
    const stems = stemsOf(pickResult.tile)
    const naming = pickResult.links.filter((link) =>
      stems.some((stem) => link.message.toLowerCase().includes(stem)),
    )
    const changed = pickResult.links.filter((link) => link.changedFromLoad)
    const ok = stems.length ? naming.length > 0 : changed.length > 0
    return {
      tile: pickResult.tile,
      pressed: pickResult.pressed,
      clickHitTile: pickResult.clickHitTile,
      ok,
      namingLinks: naming.map((link) => link.context || link.selector),
      changedLinks: changed.length,
      messages: [...new Set(changed.map((link) => link.message))],
    }
  })
  for (const tile of tileResults)
    if (!tile.ok)
      fails.push({
        selector: null,
        text: tile.tile,
        reason: 'no WhatsApp message names this trade after picking it',
      })
  if (!data.tiles || !data.tiles.tiles.length)
    manual.push({
      selector: null,
      text: 'no trade tiles found; the tile-to-message check did not run',
    })
  const box = data.lightbox
  let lightbox = null
  if (box) {
    const message = box.whatsapp?.[0]?.message || ''
    const namesPhoto = !!box.caption && message.includes(box.caption)
    lightbox = { caption: box.caption, message, namesPhoto }
    if (!box.whatsapp?.length)
      fails.push({
        selector: box.selector,
        text: 'lightbox has no WhatsApp action',
      })
    else if (!box.caption)
      manual.push({
        selector: box.selector,
        text: 'lightbox caption not found; check its message by hand',
      })
    else if (!namesPhoto)
      fails.push({
        selector: box.selector,
        text: box.caption,
        reason: 'lightbox WhatsApp message does not name the photo viewed',
      })
  }
  const duplicates = Object.entries(
    data.links.reduce(
      (acc, link) => ({ ...acc, [link.message]: (acc[link.message] || 0) + 1 }),
      {},
    ),
  ).filter(([, count]) => count > 1)
  return {
    status: verdict(fails, manual),
    summary: `${data.links.length} WhatsApp links, ${data.links.filter((link) => link.status === 'pass').length} open ${WHATSAPP_HOST_PATH} in a new tab with a message; tiles naming their trade: ${tileResults.filter((tile) => tile.ok).length}/${tileResults.length}; lightbox names photo: ${lightbox ? lightbox.namesPhoto : 'n/a'}`,
    measured: {
      links: data.links.map((link) => ({
        context: link.context,
        selector: link.selector,
        name: link.name,
        message: link.message,
        target: link.target,
        shown: link.shown,
        status: link.status,
      })),
      sameMessageOnSeveralLinks: duplicates.map(([message, count]) => ({
        count,
        message,
      })),
      tiles: tileResults,
      lightbox,
    },
    failures: fails,
    manual,
  }
}

function g8(parts, survey) {
  const data = parts.G8
  if (!data) return { status: 'unknown', summary: 'contact links not read' }
  if (!data.links.length)
    return skipped('no tel: or mailto: links on the page yet')
  // #96 adds tel: links in the header and opening screen, but the email
  // address belongs to the contact card that only lands in #99 (#wz-contact).
  // The mailto rule stays pending until that section exists, like G12's
  // per-section rules; the tel: and one-format rules always run.
  const sections = survey?.sections || {}
  const ready = (section) => !survey || !!sections[section]
  const fails = data.links
    .filter((link) => link.status === 'fail')
    .map((link) => failure(link, { href: link.href, reason: link.reason }))
  if (data.textFormats.length > 1)
    fails.push({
      selector: null,
      text: data.textFormats
        .map((entry) => `"${entry.format}" ×${entry.count}`)
        .join(', '),
      reason: 'phone number shown in more than one format',
    })
  if (!data.links.some((link) => link.type === 'tel'))
    fails.push({ selector: null, text: 'no tel: link' })
  const pending = []
  if (!data.links.some((link) => link.type === 'mailto')) {
    ;(ready('contact') ? fails : pending).push({
      selector: null,
      text: 'no mailto: link',
    })
  }
  const tel = data.links.filter((link) => link.type === 'tel')
  const mail = data.links.filter((link) => link.type === 'mailto')
  const summary = `${tel.length} tel: (${[...new Set(tel.map((link) => link.href))].join(', ')}), ${mail.length} mailto: (${[...new Set(mail.map((link) => link.address))].join(', ')}); text formats: ${data.textFormats.map((entry) => `"${entry.format}" ×${entry.count}`).join(', ') || 'none'}`
  return {
    status: verdict(fails, []),
    summary: pending.length
      ? `${summary}; pending until #wz-contact lands: ${pending.map((item) => item.text).join(', ')}`
      : summary,
    pending,
    measured: data,
    failures: fails,
  }
}

function g9(parts, survey) {
  const data = parts.G9
  if (!data?.positions)
    return { status: 'unknown', summary: 'contact sweep did not run' }
  if (survey && survey.whatsappLinks + survey.telLinks === 0)
    return skipped('no WhatsApp or phone actions on the page yet')
  const gaps = data.positions.filter((position) => !position.visible.length)
  return {
    status: verdict(gaps, []),
    summary: `${data.positions.length} positions at ${data.viewport} every ${data.step}px; ${gaps.length} with no WhatsApp or tel action in view${gaps.length ? ` (y ${gaps.map((gap) => gap.y).join(', ')})` : ''}`,
    measured: {
      viewport: data.viewport,
      maxScroll: data.maxScroll,
      positions: data.positions.map((position) => ({
        y: position.y,
        visible: position.visible.length,
        first: position.visible[0],
      })),
    },
    failures: gaps.map((gap) => ({
      selector: null,
      text: `scrollY ${gap.y}: no contact action visible`,
    })),
  }
}

function g10(parts, survey) {
  const data = parts.G10
  if (!data?.atRest)
    return { status: 'unknown', summary: 'reduced-motion check did not run' }
  if (!data.atRest.reducedMatches)
    return {
      status: 'unknown',
      summary: 'prefers-reduced-motion emulation did not take effect',
    }
  if (survey && !survey.designReady)
    return skipped(
      'no design content on the page yet; the gate starts when the opening section lands',
    )
  const fails = []
  for (const animation of data.atRest.running)
    if (animation.durationMs > INSTANT_MS)
      fails.push({
        selector: animation.selector,
        text: `${animation.name} running at load (${animation.durationMs}ms)`,
      })
  for (const [element, behaviour] of Object.entries(
    data.atRest.scrollBehaviour,
  ))
    if (behaviour === 'smooth')
      fails.push({
        selector: element,
        text: 'scroll-behavior: smooth under reduced motion',
      })
  const rows = data.interactions.map((interaction) => {
    const moving = [
      ...interaction.animations
        .filter((animation) => animation.durationMs > INSTANT_MS)
        .map(
          (animation) =>
            `${animation.type} ${animation.name} ${animation.durationMs}ms on ${animation.selector}`,
        ),
      ...interaction.events
        .filter((event) => event.durationMs > INSTANT_MS)
        .map(
          (event) =>
            `${event.type} ${event.property || event.name} ${event.durationMs}ms on ${event.selector}`,
        ),
    ]
    const smoothScroll = interaction.scrollSteps.length > 2
    if (smoothScroll)
      moving.push(
        `scroll moved through ${interaction.scrollSteps.length} positions (${interaction.scrollSteps.slice(0, 5).join(', ')}…)`,
      )
    return {
      name: interaction.name,
      moving: [...new Set(moving)],
      scrollSteps: interaction.scrollSteps.length,
    }
  })
  for (const row of rows)
    for (const move of row.moving)
      fails.push({ selector: null, text: `${row.name}: ${move}` })
  return {
    status: verdict(fails, []),
    summary: `${rows.length} interactions under reduced motion (${rows.map((row) => row.name).join(', ')}); ${fails.length} motions with nonzero duration`,
    measured: {
      scrollBehaviour: data.atRest.scrollBehaviour,
      runningAtLoad: data.atRest.running,
      interactions: rows,
    },
    failures: fails,
  }
}

// The map phase (#100). Once the contact section is on the page, its map
// must offer "Show the map", pressing it must load at least one tile, and one
// press of zoom-in must replace those tiles with the next level's, which runs
// the tile-removal path under the real CSP.
function mapActivationFailures(map, survey) {
  if (!survey?.sections?.contact || !map) return []
  if (!map.found)
    return [
      'the contact section has no "Show the map" control, so map activation was not exercised',
    ]
  if (!map.tilesLoaded)
    return ['map activated but no OpenStreetMap tile loaded']
  if (!map.zoomIn?.found)
    return [
      'the live map has no zoom-in control, so tile removal was not exercised',
    ]
  if (!map.zoomIn.tilesLoaded || map.zoomIn.zoom !== map.zoom + 1)
    return [
      `zoom-in did not settle on the next level's tiles (zoom ${map.zoom} to ${map.zoomIn.zoom ?? 'mixed'})`,
    ]
  return []
}

function mapSummary(map, requests) {
  if (!map?.found) return ''
  const stubbed = requests.filter((request) => request.stubbed).length
  const zoomIn = map.zoomIn?.found
    ? `, then ${map.zoomIn.tilesLoaded} at zoom ${map.zoomIn.zoom}`
    : ''
  return `; map activated, ${map.tilesLoaded} tiles loaded at zoom ${map.zoom}${zoomIn}; ${stubbed} tile requests answered by the probe's stub`
}

function g11(log, map, survey) {
  const disallowed = dedupe(
    log.requests.filter((request) => !request.allowed),
    (request) => request.url,
    () => false,
  )
  const fails = [
    ...log.console.map((entry) => ({
      selector: null,
      text: `${entry.type} [${entry.phase}]: ${entry.text}`.slice(0, 300),
    })),
    ...disallowed.map((request) => ({
      selector: null,
      text: `request ${request.url} (${request.kind || 'unknown'}: ${request.reason || 'not allowed'})`,
    })),
    ...mapActivationFailures(map, survey).map((text) => ({
      selector: null,
      text,
    })),
  ]
  // A request-gate error means the probe could not vet that request, so the
  // network rule was not fully measured: unknown, never pass.
  const gateErrors = (log.probeNotes || []).filter((note) =>
    note.startsWith('request gate:'),
  )
  const status = fails.length ? 'fail' : gateErrors.length ? 'unknown' : 'pass'
  return {
    status,
    summary: `${log.console.length} console errors or CSP violations, ${disallowed.length} requests outside the allow-list (blocked by the probe)${mapSummary(map, log.requests)}${gateErrors.length ? `; ${gateErrors.length} request-gate errors, so not every request was vetted` : ''}`,
    measured: {
      console: log.console,
      requests: log.requests,
      requestGateErrors: gateErrors,
      map: map || null,
    },
    failures: fails,
  }
}

// The page may carry more than one navigation landmark (the header's
// section links and the footer's "On this page" list) when each has its own
// name, so a screen reader's landmark list tells them apart (WCAG 1.3.1,
// ARIA landmark naming). An unnamed one, or two sharing a name, fails.
function navigationNameFailures(list) {
  const fails = list
    .filter((nav) => !nav.label)
    .map((nav) =>
      failure(nav, {
        reason: 'one of several navigation landmarks has no name',
      }),
    )
  const named = list.filter((nav) => nav.label)
  for (const label of new Set(named.map((nav) => nav.label))) {
    const sharing = named.filter((nav) => nav.label === label)
    if (sharing.length > 1)
      fails.push({
        selector: 'navigation',
        text: `${sharing.length} navigation landmarks named "${label}"`,
        reason: 'navigation landmarks share a name',
      })
  }
  return fails
}

function g12(parts, survey) {
  const data = parts.G12?.structure
  if (!data) return { status: 'unknown', summary: 'structure not read' }
  // Without a survey (unit tests) every rule applies. On the page, rules about
  // markup that exists always run; rules about pieces the redesign has not
  // built yet stay pending until their own section lands, so a partly built
  // page is judged only on what exists. The h1, header and nav arrive with
  // the opening screen (#96); the footer arrives with story and contact
  // (#99, #wz-contact); the form arrives with #101 (#wz-form). main is part
  // of the /next shell itself, so it is always required.
  const sections = survey?.sections || {}
  const ready = (section) => !survey || !!sections[section]
  const LANDMARK_SECTION = {
    banner: 'hero',
    navigation: 'hero',
    contentinfo: 'contact',
  }
  const fails = []
  const pending = []
  if (!data.langValid)
    fails.push({
      selector: 'html',
      text: `lang="${data.lang ?? ''}"`,
      reason: 'html lang missing or invalid',
    })
  if (data.h1Count > 1)
    fails.push({ selector: 'h1', text: `${data.h1Count} h1 elements` })
  else if (data.h1Count === 0) {
    ;(ready('hero') ? fails : pending).push({
      selector: 'h1',
      text: 'no h1',
      reason: 'exactly one h1 required',
    })
  }
  for (const skip of data.skips)
    fails.push({
      selector: skip.selector,
      text: `${skip.from} → ${skip.to}`,
      reason: 'skipped heading level',
    })
  if (data.beforeH1.length)
    fails.push({
      selector: null,
      text: data.beforeH1.join(' | '),
      reason: 'headings before the h1',
    })
  for (const [name, list] of Object.entries(data.landmarks)) {
    if (name === 'navigation' && list.length > 1)
      fails.push(...navigationNameFailures(list))
    else if (list.length > 1)
      fails.push({ selector: name, text: `${list.length} ${name} landmarks` })
    else if (!list.length) {
      const section = LANDMARK_SECTION[name]
      ;(section && !ready(section) ? pending : fails).push({
        selector: null,
        text: `no ${name} landmark`,
        reason: 'landmark not on the page yet',
      })
    }
  }
  for (const field of data.fields.filter((item) => item.status === 'fail'))
    fails.push(
      failure(field, {
        reason: `field has no label (name source: ${field.source})`,
      }),
    )
  const forms = parts.G12.forms
  if (!forms || !forms.length) {
    ;(ready('form') ? fails : pending).push({
      selector: null,
      text: 'no form on the page',
      reason: 'empty-submit error text not checked',
    })
  }
  const formRows = (forms || []).map((form) => {
    if (form.error) return { selector: form.selector, error: form.error }
    const errorText = [
      ...new Set([
        ...form.added,
        ...form.invalid.map((item) => item.describedBy).filter(Boolean),
      ]),
    ]
    const browserOnly = !errorText.length && form.nativeInvalid.length > 0
    if (form.urlChanged)
      fails.push({
        selector: form.selector,
        text: 'empty submit navigated away',
      })
    if (!errorText.length)
      fails.push({
        selector: form.selector,
        text: browserOnly
          ? 'errors shown only by the browser bubble'
          : 'empty submit showed no error text',
        reason: 'form errors not in text',
      })
    return {
      selector: form.selector,
      errorText,
      invalidFields: form.invalid.map(
        (item) =>
          `${item.name}: ${item.describedBy || '(no describedby text)'}`,
      ),
      focusedAfter: form.focused?.name,
      browserOnly,
    }
  })
  const formErrors = formRows.filter((row) => row.error)
  const manual = formErrors.map((form) => ({
    selector: form.selector,
    text: form.error,
  }))
  const summary = `h1 ×${data.h1Count}; ${data.skips.length} level skips; landmarks ${Object.entries(
    data.landmarks,
  )
    .map(([name, list]) => `${name} ${list.length}`)
    .join(
      ', ',
    )}; lang="${data.lang ?? ''}"; ${data.fields.length} fields, ${data.fields.filter((field) => field.status === 'fail').length} unlabelled; form errors in text: ${formRows.length ? formRows.every((row) => row.errorText?.length) : 'n/a'}`
  return {
    status: verdict(fails, manual),
    summary: pending.length
      ? `${summary}; pending until their section lands: ${pending.map((item) => item.text).join(', ')}`
      : summary,
    pending,
    measured: {
      headings: data.headings
        .filter((heading) => heading.shown)
        .map((heading) => `h${heading.level} ${heading.text}`),
      hiddenHeadings: data.headings
        .filter((heading) => !heading.shown)
        .map((heading) => `h${heading.level} ${heading.text}`),
      landmarks: data.landmarks,
      lang: data.lang,
      fields: data.fields.map(
        (field) => `${field.selector}: "${field.name}" (${field.source})`,
      ),
      forms: formRows,
    },
    failures: fails,
    manual,
  }
}

function median(values) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

function c61(parts) {
  const out = {}
  for (const [viewport, data] of Object.entries(parts.C61 || {})) {
    if (!data) continue
    const multiLine = data.body.filter((item) => item.lines > 1)
    out[viewport] = {
      distinctSizes: data.sizeCount,
      sizes: data.distinctSizes.map(
        (entry) => `${entry.px}px ×${entry.elements}`,
      ),
      h1Size: data.h1Size,
      largest: data.largest,
      h1IsLargest: data.h1IsLargest,
      bodyText: {
        elements: data.body.length,
        fontSizeMin: Math.min(...data.body.map((item) => item.size)),
        fontSizeMedian: median(data.body.map((item) => item.size)),
        lineCharsMax: Math.max(0, ...multiLine.map((item) => item.maxChars)),
        lineCharsMedian: median(multiLine.map((item) => item.medianChars)),
        over75: multiLine
          .filter((item) => item.maxChars > 75)
          .map(
            (item) =>
              `${item.maxChars} ch · ${item.size}px · ${item.selector} "${item.text}"`,
          ),
        under45: multiLine
          .filter((item) => item.lines > 2 && item.medianChars < 45)
          .map(
            (item) =>
              `${item.medianChars} ch · ${item.size}px · ${item.selector} "${item.text}"`,
          ),
      },
      under14px: data.under14.map(
        (item) => `${item.size}px · ${item.selector} "${item.text}"`,
      ),
      body: data.body,
    }
  }
  return out
}

// Screenshot capture is not a gate, so its step errors land in probeErrors
// under 'screenshots' and a failed capture would otherwise leave the job
// green with files missing. The run fails on those errors and when an
// expected set is absent. The expected sets derive from the shared lists
// below, which probe.mjs imports for its run order and captures.
export const VIEWPORTS = {
  1440: { width: 1440, height: 900, mobile: false },
  1280: { width: 1280, height: 800, mobile: false },
  390: { width: 390, height: 844, mobile: true },
}
export const REFLOW_WIDTHS = [320, 390, 768, 1280, 1440, 1920]
const EXPECTED_SCREENSHOTS = [
  ...Object.values(VIEWPORTS).map(
    (viewport) => `${viewport.width}x${viewport.height}`,
  ),
  ...REFLOW_WIDTHS.map((width) => `reflow-${width}`),
]

// The job outcome: the design gate fails the run on a failed gate, on an
// unknown verdict (a probe crash), or on missing or errored screenshots.
// manual and skipped never fail the run.
export function gateOutcome(result) {
  const gates = Object.values(result.gates)
  const byStatus = (status) =>
    gates
      .filter((gate) => gate.status === status)
      .map((gate) => `${gate.id} ${gate.title}`)
  const failed = byStatus('fail')
  const unknown = byStatus('unknown')
  const captured = new Set(
    (result.screenshots || []).map((set) => set.viewport),
  )
  const screenshots = [
    ...(result.probeErrors?.screenshots || []),
    ...EXPECTED_SCREENSHOTS.filter((viewport) => !captured.has(viewport)).map(
      (viewport) => `no screenshot set for ${viewport}`,
    ),
  ]
  return {
    ok: failed.length === 0 && unknown.length === 0 && screenshots.length === 0,
    failed,
    unknown,
    skipped: byStatus('skipped'),
    manual: byStatus('manual'),
    screenshots,
  }
}

export function finalise(data) {
  const { parts, errors, log, survey } = data
  const gates = {
    G1: g1(parts, survey),
    G2: g2(parts, survey),
    G3: g3(parts, survey),
    G4: g4(parts, survey),
    G5: g5(parts, survey),
    G6: g6(parts),
    G7: g7(parts),
    G8: g8(parts, survey),
    G9: g9(parts, survey),
    G10: g10(parts, survey),
    G11: g11(log, parts.map, survey),
    G12: g12(parts, survey),
  }
  // A missing shell (no main or h1 at survey time) means the flag-off page
  // rendered or the survey ran before React committed. A skip then measured
  // nothing, so every skipped gate becomes unknown and fails the run.
  if (survey && survey.shell === false)
    for (const gate of Object.values(gates)) {
      if (gate.status !== 'skipped') continue
      gate.status = 'unknown'
      gate.summary = `${gate.summary} · the /next shell (main and h1) is absent, so this skip is not trusted`
    }
  for (const [id, gate] of Object.entries(gates)) {
    gate.id = id
    gate.title = TITLES[id]
    gate.failures ||= []
    gate.manual ||= []
    const tabWalkErrors = (errors.G3 || []).filter((message) =>
      message.startsWith('Tab walk'),
    )
    const gateErrors = [
      ...(errors[id] || []),
      ...(id === 'G4' ? tabWalkErrors : []),
    ]
    if (gateErrors.length && gate.status !== 'skipped') {
      gate.probeErrors = gateErrors
      if (gate.status !== 'fail') {
        gate.status = 'unknown'
        gate.summary = `${gate.summary} · probe error: ${gateErrors.join('; ')}`
      }
    }
  }
  return {
    page: data.page,
    chrome: data.chrome,
    startedAt: data.startedAt,
    finishedAt: data.finishedAt,
    survey: survey || null,
    gates: Object.fromEntries(
      Object.entries(gates).map(([id, gate]) => [
        id,
        {
          id,
          title: gate.title,
          status: gate.status,
          summary: gate.summary,
          ...gate,
        },
      ]),
    ),
    c61: c61(parts),
    screenshots: data.screenshots,
    probeErrors: errors,
    probeNotes: log.probeNotes,
  }
}
