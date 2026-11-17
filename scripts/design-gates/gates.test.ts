import { describe, expect, it } from 'vitest'

import { classifyRequest, finalise, gateOutcome } from './gates.mjs'
import type { ProbeResult } from './gates.mjs'

type ProbeData = Parameters<typeof finalise>[0]

const ORIGIN = 'http://127.0.0.1:8787'
const PAGE = `${ORIGIN}/next`

// The /next shell: no controls, no contact links, no design content.
const SHELL_SURVEY = {
  designReady: false,
  controls: 0,
  whatsappLinks: 0,
  telLinks: 0,
  mailtoLinks: 0,
  forms: 0,
  photoOpeners: 0,
}

const READY_SURVEY = { ...SHELL_SURVEY, designReady: true }

function structure(overrides = {}) {
  return {
    h1Count: 1,
    headings: [],
    skips: [],
    beforeH1: [],
    landmarks: { banner: [], navigation: [], main: [{}], contentinfo: [] },
    lang: 'en',
    langValid: true,
    fields: [],
    ...overrides,
  }
}

function reflowRun(overrides = {}) {
  return {
    width: 390,
    innerWidth: 390,
    clientWidth: 390,
    scrollWidth: 390,
    bodyScrollWidth: 390,
    viewportOverflowX: 'visible',
    sideways: false,
    clipped: [],
    offscreenText: [],
    ...overrides,
  }
}

function probeData(overrides: Partial<ProbeData> = {}): ProbeData {
  return {
    page: PAGE,
    chrome: 'Chrome/test',
    startedAt: '2026-01-01T00:00:00.000Z',
    finishedAt: '2026-01-01T00:01:00.000Z',
    survey: SHELL_SURVEY,
    parts: {
      G1: { runs: [{ viewport: '1280', items: [], svgText: [] }] },
      G2: { runs: [{ viewport: '1280', items: [], graphics: [] }] },
      G3: { skippedNoControls: true },
      G5: { runs: [{ viewport: '1280', items: [] }] },
      G6: { runs: [reflowRun()] },
      G7: { links: [] },
      G8: { links: [], textFormats: [] },
      G9: {
        viewport: '1280x800',
        step: 50,
        maxScroll: 0,
        positions: [{ requested: 0, y: 0, visible: [] }],
      },
      G10: {
        atRest: { running: [], scrollBehaviour: {}, reducedMatches: true },
        interactions: [],
      },
      G12: { structure: structure(), forms: [] },
    },
    errors: {},
    log: { console: [], requests: [], probeNotes: [] },
    screenshots: [],
    ...overrides,
  }
}

function gate(result: ProbeResult, id: string) {
  const found = result.gates[id]
  if (!found) throw new Error(`gate ${id} missing`)
  return found
}

describe('classifyRequest', () => {
  it('allows same-origin and data: requests', () => {
    expect(classifyRequest(`${ORIGIN}/assets/app.js`, ORIGIN).allowed).toBe(
      true,
    )
    expect(
      classifyRequest(`${ORIGIN}/fonts/spectral-400.woff2`, ORIGIN).allowed,
    ).toBe(true)
    expect(classifyRequest('data:text/css,x', ORIGIN).allowed).toBe(true)
  })

  it('allows the Cloudflare beacon and Web3Forms', () => {
    expect(
      classifyRequest(
        'https://static.cloudflareinsights.com/beacon.min.js',
        ORIGIN,
      ).allowed,
    ).toBe(true)
    expect(
      classifyRequest('https://api.web3forms.com/submit', ORIGIN).allowed,
    ).toBe(true)
  })

  it('blocks OpenStreetMap tiles until map activation (#100)', () => {
    const verdict = classifyRequest(
      'https://a.tile.openstreetmap.org/1/2/3.png',
      ORIGIN,
    )
    expect(verdict.allowed).toBe(false)
    expect(verdict.reason).toContain('#100')
  })

  it('blocks everything else, including Google Fonts', () => {
    expect(
      classifyRequest('https://fonts.googleapis.com/css2?family=Inter', ORIGIN)
        .allowed,
    ).toBe(false)
    expect(
      classifyRequest('https://example.com/tracker.js', ORIGIN).allowed,
    ).toBe(false)
    expect(classifyRequest('not a url', ORIGIN).allowed).toBe(false)
  })
})

describe('finalise on the empty /next shell', () => {
  it('skips the content gates and never passes them', () => {
    const result = finalise(probeData())
    for (const id of ['G1', 'G2', 'G3', 'G4', 'G5', 'G7', 'G8', 'G9', 'G10']) {
      expect(gate(result, id).status, id).toBe('skipped')
      expect(gate(result, id).summary.length, id).toBeGreaterThan(0)
    }
  })

  it('runs the structural gates', () => {
    const result = finalise(probeData())
    expect(gate(result, 'G6').status).toBe('pass')
    expect(gate(result, 'G11').status).toBe('pass')
    expect(gate(result, 'G12').status).toBe('pass')
  })

  it('keeps missing landmarks and the form as pending, not failures', () => {
    const result = finalise(probeData())
    const g12 = gate(result, 'G12')
    expect(g12.pending?.length).toBeGreaterThan(0)
    expect(g12.failures).toEqual([])
    expect(gateOutcome(result).ok).toBe(true)
  })
})

describe('finalise verdicts', () => {
  it('fails G12 on a missing or invalid lang', () => {
    const data = probeData()
    data.parts.G12 = {
      structure: structure({ lang: null, langValid: false }),
      forms: [],
    }
    const result = finalise(data)
    expect(gate(result, 'G12').status).toBe('fail')
    expect(gateOutcome(result).ok).toBe(false)
  })

  it('fails G12 for a missing landmark once the design content has landed', () => {
    const result = finalise(probeData({ survey: READY_SURVEY }))
    expect(gate(result, 'G12').status).toBe('fail')
  })

  it('fails G6 on sideways scroll', () => {
    const data = probeData()
    data.parts.G6 = { runs: [reflowRun({ scrollWidth: 400, sideways: true })] }
    expect(gate(finalise(data), 'G6').status).toBe('fail')
  })

  it('fails G11 on a disallowed request', () => {
    const data = probeData()
    data.log.requests = [
      {
        phase: '1280',
        url: 'https://example.com/x.js',
        ...classifyRequest('https://example.com/x.js', ORIGIN),
      },
    ] as unknown[]
    expect(gate(finalise(data), 'G11').status).toBe('fail')
  })

  it('fails G11 on a CSP violation log entry', () => {
    const data = probeData()
    data.log.console = [
      {
        phase: '1280',
        type: 'csp',
        text: 'Refused to load the script because it violates the Content Security Policy',
      },
    ] as unknown[]
    expect(gate(finalise(data), 'G11').status).toBe('fail')
  })

  it('fails G7 on a malformed WhatsApp link once links exist', () => {
    const data = probeData()
    data.parts.G7 = {
      links: [
        {
          id: 1,
          selector: 'a',
          text: 'WhatsApp us',
          href: 'https://wa.me/123?text=',
          status: 'fail',
          problems: ['number 123'],
          message: '',
        },
      ] as unknown,
      tiles: { tiles: ['Paving'], picks: [] },
    }
    expect(gate(finalise(data), 'G7').status).toBe('fail')
  })

  it('marks a gate unknown when its probe step crashed', () => {
    const data = probeData()
    data.parts.G6 = { runs: [] }
    data.errors = { G6: ['reflow 320: boom'] }
    const result = finalise(data)
    expect(gate(result, 'G6').status).toBe('unknown')
    expect(gateOutcome(result).ok).toBe(false)
  })

  it('keeps a skipped gate skipped even when its step errored', () => {
    const data = probeData()
    data.errors = { G7: ['WhatsApp links: boom'] }
    expect(gate(finalise(data), 'G7').status).toBe('skipped')
  })
})

describe('gateOutcome', () => {
  it('passes with only pass, manual and skipped gates', () => {
    const result = finalise(probeData())
    const outcome = gateOutcome(result)
    expect(outcome.ok).toBe(true)
    expect(outcome.failed).toEqual([])
    expect(outcome.unknown).toEqual([])
    expect(outcome.skipped.length).toBeGreaterThan(0)
  })
})
