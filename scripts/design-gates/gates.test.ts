import { describe, expect, it } from 'vitest'

import { classifyRequest, finalise, gateOutcome } from './gates.mjs'
import type { ProbeResult } from './gates.mjs'

type ProbeData = Parameters<typeof finalise>[0]

const ORIGIN = 'http://127.0.0.1:8787'
const PAGE = `${ORIGIN}/next`

// The /next shell: no controls, no contact links, no design content.
const SHELL_SURVEY = {
  shell: true,
  designReady: false,
  sections: {
    hero: false,
    what: false,
    work: false,
    story: false,
    contact: false,
  },
  controls: 0,
  whatsappLinks: 0,
  telLinks: 0,
  mailtoLinks: 0,
  forms: 0,
  photoOpeners: 0,
}

// The opening section (hero, header, nav) has landed; the rest has not.
const READY_SURVEY = {
  ...SHELL_SURVEY,
  designReady: true,
  sections: { ...SHELL_SURVEY.sections, hero: true },
}

// The screenshot sets probe.mjs captures on a full run.
const SCREENSHOT_SETS = [
  '1280x800',
  '1440x900',
  '390x844',
  'reflow-320',
  'reflow-390',
  'reflow-768',
  'reflow-1280',
  'reflow-1440',
  'reflow-1920',
].map((viewport) => ({ viewport, shots: [{}], widthVerified: true }))

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
    screenshots: SCREENSHOT_SETS.map((set) => ({ ...set })),
    ...overrides,
  }
}

function gate(result: ProbeResult, id: string) {
  const found = result.gates[id]
  if (!found) throw new Error(`gate ${id} missing`)
  return found
}

const texts = (items: unknown[]) =>
  (items as { text: string }[]).map((item) => item.text)

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

  it('refuses http for allow-listed external hosts', () => {
    const web3forms = classifyRequest('http://api.web3forms.com/submit', ORIGIN)
    expect(web3forms.allowed).toBe(false)
    expect(web3forms.reason).toContain('https:')
    expect(
      classifyRequest(
        'http://static.cloudflareinsights.com/beacon.min.js',
        ORIGIN,
      ).allowed,
    ).toBe(false)
    expect(
      classifyRequest('ftp://api.web3forms.com/submit', ORIGIN).allowed,
    ).toBe(false)
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

  it('turns skips into unknowns when the /next shell did not render', () => {
    const result = finalise(
      probeData({ survey: { ...SHELL_SURVEY, shell: false } }),
    )
    for (const id of ['G1', 'G2', 'G3', 'G4', 'G5', 'G7', 'G8', 'G9', 'G10'])
      expect(gate(result, id).status, id).toBe('unknown')
    expect(gateOutcome(result).ok).toBe(false)
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

describe('finalise on a partly built page', () => {
  it('passes G12 when every landed section is complete and the rest is pending', () => {
    const data = probeData({ survey: READY_SURVEY })
    data.parts.G12 = {
      structure: structure({
        landmarks: {
          banner: [{}],
          navigation: [{}],
          main: [{}],
          contentinfo: [],
        },
      }),
      forms: [],
    }
    const g12 = gate(finalise(data), 'G12')
    expect(g12.status).toBe('pass')
    expect(texts(g12.pending ?? [])).toEqual([
      'no contentinfo landmark',
      'no form on the page',
    ])
  })

  it('fails G12 for a missing header landmark once the hero has landed', () => {
    const result = finalise(probeData({ survey: READY_SURVEY }))
    const g12 = gate(result, 'G12')
    expect(g12.status).toBe('fail')
    expect(texts(g12.failures)).toContain('no banner landmark')
    expect(texts(g12.pending ?? [])).toEqual([
      'no contentinfo landmark',
      'no form on the page',
    ])
  })

  it('requires the footer and form once the contact section lands', () => {
    const data = probeData({
      survey: {
        ...READY_SURVEY,
        sections: { ...READY_SURVEY.sections, story: true, contact: true },
      },
    })
    data.parts.G12 = {
      structure: structure({
        landmarks: {
          banner: [{}],
          navigation: [{}],
          main: [{}],
          contentinfo: [],
        },
      }),
      forms: [],
    }
    const g12 = gate(finalise(data), 'G12')
    expect(g12.status).toBe('fail')
    expect(texts(g12.failures)).toEqual(
      expect.arrayContaining([
        'no contentinfo landmark',
        'no form on the page',
      ]),
    )
    expect(g12.pending).toEqual([])
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

  it('marks G11 unknown when the request gate errored', () => {
    const data = probeData()
    data.log.probeNotes = ['request gate: boom']
    const result = finalise(data)
    expect(gate(result, 'G11').status).toBe('unknown')
    expect(gateOutcome(result).ok).toBe(false)
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

  it('fails the run when a screenshot set is missing', () => {
    const data = probeData()
    data.screenshots = (data.screenshots as { viewport: string }[]).filter(
      (set) => set.viewport !== '390x844',
    )
    const outcome = gateOutcome(finalise(data))
    expect(outcome.ok).toBe(false)
    expect(outcome.screenshots).toEqual(['no screenshot set for 390x844'])
  })

  it('fails the run when a screenshot step errored', () => {
    const data = probeData()
    data.errors = { screenshots: ['390: boom'] }
    const outcome = gateOutcome(finalise(data))
    expect(outcome.ok).toBe(false)
    expect(outcome.screenshots).toEqual(['390: boom'])
  })
})
