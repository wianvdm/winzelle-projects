import { describe, expect, it } from 'vitest'

import {
  classifyRequest,
  finalise,
  gateOutcome,
  incompleteRules,
} from './gates.mjs'
import type { ProbeResult } from './gates.mjs'
// @ts-expect-error the script ships no type declarations
import { headersFor, parseHeadersFile } from './serve.mjs'

type ProbeData = Parameters<typeof finalise>[0]

const ORIGIN = 'http://127.0.0.1:8787'
const PAGE = `${ORIGIN}/`

// The page shell: no controls, no contact links, no design content.
const SHELL_SURVEY = {
  shell: true,
  designReady: false,
  sections: {
    hero: false,
    what: false,
    work: false,
    story: false,
    contact: false,
    form: false,
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

// The contact section, which holds the map (#100), is on the page.
const CONTACT_SURVEY = {
  ...SHELL_SURVEY,
  sections: { ...SHELL_SURVEY.sections, contact: true },
}

const OSM_TILE = 'https://tile.openstreetmap.org/16/37407/39347.png'

// What the probe's map phase records when everything works.
const ACTIVE_MAP = {
  found: true,
  control: 'Show the map',
  tilesLoaded: 12,
  zoom: 15,
  zoomIn: { found: true, tilesLoaded: 9, zoom: 16 },
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
    log: { console: [], requests: [], answeredTiles: [], probeNotes: [] },
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
    const verdict = classifyRequest(OSM_TILE, ORIGIN)
    expect(verdict.allowed).toBe(false)
    expect(verdict.reason).toContain('#100')
    expect(
      classifyRequest(OSM_TILE, ORIGIN, { mapActive: false }).allowed,
    ).toBe(false)
  })

  it('allows OpenStreetMap tiles once the map is active, stubbed', () => {
    expect(classifyRequest(OSM_TILE, ORIGIN, { mapActive: true })).toEqual({
      allowed: true,
      kind: 'OpenStreetMap tiles',
      stubbed: true,
    })
  })

  it('stubs no other allow-listed host', () => {
    for (const url of [
      `${ORIGIN}/`,
      'https://api.web3forms.com/submit',
      'https://static.cloudflareinsights.com/beacon.min.js',
    ])
      expect(
        classifyRequest(url, ORIGIN, { mapActive: true }).stubbed,
        url,
      ).toBeUndefined()
  })

  it('allows only https from the one tile host after activation', () => {
    const active = { mapActive: true }
    const http = classifyRequest(
      'http://tile.openstreetmap.org/16/1/2.png',
      ORIGIN,
      active,
    )
    expect(http.allowed).toBe(false)
    expect(http.reason).toContain('https:')
    for (const url of [
      'https://a.tile.openstreetmap.org/16/1/2.png',
      'https://www.openstreetmap.org/directions',
      'https://nominatim.openstreetmap.org/search?q=x',
    ])
      expect(classifyRequest(url, ORIGIN, active).allowed, url).toBe(false)
  })

  it('leaves the other allow-list entries alone when the map is active', () => {
    const active = { mapActive: true }
    expect(
      classifyRequest('https://api.web3forms.com/submit', ORIGIN, active)
        .allowed,
    ).toBe(true)
    expect(
      classifyRequest('https://example.com/tracker.js', ORIGIN, active).allowed,
    ).toBe(false)
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

  it('refuses a non-default port for the tile host and the other external hosts', () => {
    const active = { mapActive: true }
    const tile = classifyRequest(
      'https://tile.openstreetmap.org:8443/16/1/2.png',
      ORIGIN,
      active,
    )
    expect(tile.allowed).toBe(false)
    expect(tile.reason).toBe(
      'external hosts must use the default https port (got 8443)',
    )
    expect(
      classifyRequest('https://api.web3forms.com:8080/submit', ORIGIN).allowed,
    ).toBe(false)
    expect(
      classifyRequest(
        'https://tile.openstreetmap.org:443/16/1/2.png',
        ORIGIN,
        active,
      ),
    ).toMatchObject({ allowed: true, stubbed: true })
  })

  it('blocks everything else, including hosted web fonts', () => {
    expect(
      classifyRequest('https://fonts.example.com/css2?family=Serif', ORIGIN)
        .allowed,
    ).toBe(false)
    expect(
      classifyRequest('https://example.com/tracker.js', ORIGIN).allowed,
    ).toBe(false)
    expect(classifyRequest('not a url', ORIGIN).allowed).toBe(false)
  })
})

describe('finalise on the empty page shell', () => {
  it('skips the content gates and never passes them', () => {
    const result = finalise(probeData())
    for (const id of ['G1', 'G2', 'G3', 'G4', 'G5', 'G7', 'G8', 'G9', 'G10']) {
      expect(gate(result, id).status, id).toBe('skipped')
      expect(gate(result, id).summary.length, id).toBeGreaterThan(0)
    }
  })

  it('turns skips into unknowns when the page shell did not render', () => {
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

  it('requires the footer once the contact section lands', () => {
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
    expect(texts(g12.failures)).toEqual(['no contentinfo landmark'])
    expect(texts(g12.pending ?? [])).toEqual(['no form on the page'])
  })

  // The contact card lands in #99 but the form (#wz-form) only in #101, so
  // the form rule stays pending while #wz-form is absent even with the
  // contact section on the page.
  it('passes G12 when the contact section has landed but #wz-form has not', () => {
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
          contentinfo: [{}],
        },
      }),
      forms: [],
    }
    const g12 = gate(finalise(data), 'G12')
    expect(g12.status).toBe('pass')
    expect(texts(g12.pending ?? [])).toEqual(['no form on the page'])
  })

  // #96 puts tel: links in the header and opening screen, but the email
  // address only arrives with the contact card in #99 (#wz-contact).
  it('keeps the G8 mailto rule pending while #wz-contact has not landed', () => {
    const data = probeData({ survey: READY_SURVEY })
    data.parts.G8 = {
      links: [{ type: 'tel', href: 'tel:+27287281557', status: 'pass' }],
      textFormats: [{ format: '028 728 1557', count: 1 }],
    }
    const g8 = gate(finalise(data), 'G8')
    expect(g8.status).toBe('pass')
    expect(texts(g8.pending ?? [])).toEqual(['no mailto: link'])
    expect(g8.failures).toEqual([])
  })

  it('fails G8 for a missing mailto once #wz-contact has landed', () => {
    const data = probeData({
      survey: {
        ...READY_SURVEY,
        sections: { ...READY_SURVEY.sections, story: true, contact: true },
      },
    })
    data.parts.G8 = {
      links: [{ type: 'tel', href: 'tel:+27287281557', status: 'pass' }],
      textFormats: [{ format: '028 728 1557', count: 1 }],
    }
    const g8 = gate(finalise(data), 'G8')
    expect(g8.status).toBe('fail')
    expect(texts(g8.failures)).toEqual(['no mailto: link'])
    expect(g8.pending).toEqual([])
  })

  it('fails G12 for a missing form once #wz-form has landed', () => {
    const data = probeData({
      survey: {
        ...READY_SURVEY,
        sections: {
          ...READY_SURVEY.sections,
          story: true,
          contact: true,
          form: true,
        },
      },
    })
    data.parts.G12 = {
      structure: structure({
        landmarks: {
          banner: [{}],
          navigation: [{}],
          main: [{}],
          contentinfo: [{}],
        },
      }),
      forms: [],
    }
    const g12 = gate(finalise(data), 'G12')
    expect(g12.status).toBe('fail')
    expect(texts(g12.failures)).toContain('no form on the page')
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

  describe('G12 with more than one navigation landmark', () => {
    const HEADER_NAV = {
      selector: 'nav.wz-nav',
      text: 'Sections',
      label: 'Sections',
    }
    const FOOTER_NAV = {
      selector: 'footer nav',
      text: 'On this page',
      label: 'On this page',
    }

    function withNavigation(navigation: unknown[]) {
      const data = probeData()
      data.parts.G12 = {
        structure: structure({
          landmarks: {
            banner: [{}],
            navigation,
            main: [{}],
            contentinfo: [{}],
          },
        }),
        forms: [],
      }
      return gate(finalise(data), 'G12')
    }

    it('passes when each one has its own name', () => {
      const g12 = withNavigation([HEADER_NAV, FOOTER_NAV])
      expect(g12.failures).toEqual([])
    })

    it('fails an unnamed one', () => {
      const unnamed = { selector: 'footer nav', text: 'Our work', label: null }
      const g12 = withNavigation([HEADER_NAV, unnamed])
      expect(g12.status).toBe('fail')
      expect(g12.failures).toEqual([
        {
          selector: 'footer nav',
          text: 'Our work',
          reason: 'one of several navigation landmarks has no name',
        },
      ])
    })

    it('fails two that share a name', () => {
      const g12 = withNavigation([
        HEADER_NAV,
        { ...FOOTER_NAV, label: 'Sections' },
      ])
      expect(g12.status).toBe('fail')
      expect(texts(g12.failures)).toEqual([
        '2 navigation landmarks named "Sections"',
      ])
    })

    it('still fails a second banner landmark', () => {
      const data = probeData()
      data.parts.G12 = {
        structure: structure({
          landmarks: {
            banner: [{}, {}],
            navigation: [HEADER_NAV],
            main: [{}],
            contentinfo: [{}],
          },
        }),
        forms: [],
      }
      const g12 = gate(finalise(data), 'G12')
      expect(texts(g12.failures)).toEqual(['2 banner landmarks'])
    })
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

  describe('G6 cascade-order check on the footer base row', () => {
    function g6At(width: number, footerBaseRowHeight: number | null) {
      const data = probeData()
      data.parts.G6 = {
        runs: [
          reflowRun({
            width,
            innerWidth: width,
            clientWidth: width,
            scrollWidth: width,
            bodyScrollWidth: width,
            footerBaseRowHeight,
          }),
        ],
      }
      return gate(finalise(data), 'G6')
    }

    it('passes a padded row at 1280, 1440 and 1920', () => {
      for (const width of [1280, 1440, 1920])
        expect(g6At(width, 44.5).status, String(width)).toBe('pass')
    })

    it('fails a row that lost its padding at 1200px and up', () => {
      for (const width of [1200, 1280, 1440]) {
        const g6 = g6At(width, 24)
        expect(g6.status, String(width)).toBe('fail')
        expect(texts(g6.failures)).toEqual([
          'footer base row 24px tall, under 40px: its padding lost to a later rule',
        ])
      }
    })

    it('fails when the row is missing at 1200px and up', () => {
      expect(texts(g6At(1280, null).failures)).toEqual([
        'footer base row not found, so the cascade-order check did not run',
      ])
    })

    it('leaves narrower widths alone, where the footer stacks', () => {
      expect(g6At(1199, 24).status).toBe('pass')
      expect(g6At(390, null).status).toBe('pass')
    })
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

  it('fails G11 on a tile request made before map activation', () => {
    const data = probeData()
    data.log.requests = [
      { phase: '1280', url: OSM_TILE, ...classifyRequest(OSM_TILE, ORIGIN) },
    ] as unknown[]
    expect(gate(finalise(data), 'G11').status).toBe('fail')
  })

  it('passes G11 when the activated map loaded tiles and zoomed in', () => {
    const data = probeData({ survey: CONTACT_SURVEY })
    data.parts.map = { ...ACTIVE_MAP }
    data.log.requests = [
      {
        phase: '1280-map',
        url: OSM_TILE,
        ...classifyRequest(OSM_TILE, ORIGIN, { mapActive: true }),
      },
    ] as unknown[]
    data.log.answeredTiles = [OSM_TILE]
    const g11 = gate(finalise(data), 'G11')
    expect(g11.status).toBe('pass')
    expect(g11.summary).toContain(
      "map activated, 12 tiles loaded at zoom 15, then 9 at zoom 16; 1 tile requests answered by the probe's stub",
    )
  })

  it('counts only answered tiles in the G11 summary, not ones the CSP refused', () => {
    const data = probeData({ survey: CONTACT_SURVEY })
    data.parts.map = { ...ACTIVE_MAP }
    const blockedTile = 'https://tile.openstreetmap.org/16/37408/39347.png'
    // Both requests pass the allow-list, so both are logged as stubbed;
    // the CSP refused the second before it reached the probe.
    data.log.requests = [OSM_TILE, blockedTile].map((url) => ({
      phase: '1280-map',
      url,
      ...classifyRequest(url, ORIGIN, { mapActive: true }),
    })) as unknown[]
    data.log.answeredTiles = [OSM_TILE]
    const g11 = gate(finalise(data), 'G11')
    expect(g11.summary).toContain(
      "; 1 tile requests answered by the probe's stub",
    )
    expect(g11.measured).toMatchObject({ answeredTiles: [OSM_TILE] })
  })

  it('fails G11 when the activated map loaded no tile', () => {
    const data = probeData({ survey: CONTACT_SURVEY })
    data.parts.map = { ...ACTIVE_MAP, tilesLoaded: 0 }
    const g11 = gate(finalise(data), 'G11')
    expect(g11.status).toBe('fail')
    expect(texts(g11.failures)).toEqual([
      'map activated but no OpenStreetMap tile loaded',
    ])
  })

  it('fails G11 when the live map has no zoom-in control', () => {
    const data = probeData({ survey: CONTACT_SURVEY })
    data.parts.map = { ...ACTIVE_MAP, zoomIn: { found: false } }
    const g11 = gate(finalise(data), 'G11')
    expect(texts(g11.failures)).toEqual([
      'the live map has no zoom-in control, so tile removal was not exercised',
    ])
  })

  it('fails G11 when zoom-in does not settle on the next level', () => {
    const data = probeData({ survey: CONTACT_SURVEY })
    data.parts.map = {
      ...ACTIVE_MAP,
      zoomIn: { found: true, tilesLoaded: 14, zoom: null },
    }
    const g11 = gate(finalise(data), 'G11')
    expect(g11.status).toBe('fail')
    expect(texts(g11.failures)).toEqual([
      "zoom-in did not settle on the next level's tiles (zoom 15 to mixed)",
    ])
  })

  it('fails G11 when the contact section has no map control', () => {
    const data = probeData({ survey: CONTACT_SURVEY })
    data.parts.map = { found: false, tilesLoaded: 0 }
    expect(gate(finalise(data), 'G11').status).toBe('fail')
  })

  it('does not ask for a map before the contact section lands', () => {
    const data = probeData()
    data.parts.map = { found: false, tilesLoaded: 0 }
    expect(gate(finalise(data), 'G11').status).toBe('pass')
  })

  it('marks G11 unknown when the map activation step crashed', () => {
    const data = probeData({ survey: CONTACT_SURVEY })
    data.errors = { G11: ['map activation: boom'] }
    expect(gate(finalise(data), 'G11').status).toBe('unknown')
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

describe('incompleteRules (--expect-complete)', () => {
  function wholePage(): ProbeResult {
    const ids = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10']
    const gates = Object.fromEntries(
      [...ids, 'G11', 'G12'].map((id) => [
        id,
        {
          id,
          title: id,
          status: 'pass',
          summary: '',
          failures: [],
          manual: [],
        },
      ]),
    ) as ProbeResult['gates']
    return { page: PAGE, gates }
  }

  it('finds nothing on a page with no skipped gate and no pending rule', () => {
    expect(incompleteRules(wholePage())).toEqual([])
  })

  it('reports every skipped gate and the pending G12 structure rules', () => {
    const result = finalise(probeData())
    const incomplete = incompleteRules(result)
    expect(gateOutcome(result).ok).toBe(true)
    expect(incomplete).toContain('G1 Text contrast: skipped')
    expect(
      incomplete.some((entry) => entry.startsWith('G12 Structure: pending')),
    ).toBe(true)
  })

  it('reports a still-pending G8 mailto rule that a normal run lets pass', () => {
    const data = probeData({ survey: READY_SURVEY })
    data.parts.G8 = {
      links: [{ type: 'tel', href: 'tel:+27287281557', status: 'pass' }],
      textFormats: [{ format: '028 728 1557', count: 1 }],
    }
    const result = finalise(data)
    expect(gate(result, 'G8').status).toBe('pass')
    expect(incompleteRules(result)).toContain(
      'G8 Phone and email: pending no mailto: link',
    )
  })

  it('reports a pending rule on an otherwise passing gate', () => {
    const result = wholePage()
    result.gates['G12']!.pending = [{ text: 'no form on the page' }]
    expect(incompleteRules(result)).toEqual([
      'G12 G12: pending no form on the page',
    ])
  })
})

describe('serve.mjs _headers matching', () => {
  const HEADERS_FILE = [
    '# Comment lines are skipped.',
    '/*',
    "  Content-Security-Policy: default-src 'self'",
    '  X-Robots-Tag: nosnippet',
    '',
    '/assets/*',
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
    '/next',
    '  X-Robots-Tag: noindex',
    '',
  ].join('\n')
  const blocks = parseHeadersFile(HEADERS_FILE)
  const headersAt = (pathname: string) =>
    Object.fromEntries(headersFor(blocks, pathname))

  it('merges every matching block like Cloudflare, joining repeated headers with a comma', () => {
    expect(headersAt('/next')).toEqual({
      'content-security-policy': "default-src 'self'",
      'x-robots-tag': 'nosnippet, noindex',
    })
  })

  it('applies only the blocks whose pattern matches the path', () => {
    expect(headersAt('/')).toEqual({
      'content-security-policy': "default-src 'self'",
      'x-robots-tag': 'nosnippet',
    })
    expect(headersAt('/assets/index-abc.js')).toEqual({
      'content-security-policy': "default-src 'self'",
      'x-robots-tag': 'nosnippet',
      'cache-control': 'public, max-age=31536000, immutable',
    })
    expect(headersAt('/next/x')).toEqual(headersAt('/'))
  })

  it('treats comment lines as comments, not path patterns', () => {
    expect(blocks.map(({ pattern }: { pattern: string }) => pattern)).toEqual([
      '/*',
      '/assets/*',
      '/next',
    ])
  })
})
