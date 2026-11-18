// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  GridLayer,
  Map as LeafletMap,
  type TileRecord,
} from 'leaflet/dist/leaflet-src.esm.js'

import { ContactMap } from './ContactMap.tsx'
import {
  BAY_BOUNDS,
  CspSafeTileLayer,
  mapOptions,
  StillMap,
  TILE_URL,
  type LiveMapSettings,
} from './loadMap.ts'

const loader = vi.hoisted(() => ({
  createLiveMap: vi.fn(),
  failNext: false,
}))

vi.mock('./loadMap.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./loadMap.ts')>()
  return {
    ...actual,
    createLiveMap: (...args: Parameters<typeof actual.createLiveMap>) => {
      if (loader.failNext) {
        loader.failNext = false
        throw new Error('network down')
      }
      return loader.createLiveMap(...args)
    },
  }
})

const DIRECTIONS_URL =
  'https://www.openstreetmap.org/directions?to=-33.9616%2C25.4920'
const DIRECTIONS_LABEL =
  'Directions to 10 King Place, Ben Kamma, on OpenStreetMap (opens in a new tab)'
const REGION_LABEL =
  'Map around 10 King Place, Ben Kamma. Arrow keys move it; plus and minus zoom.'
const PIN_LABEL = 'Winzelle Projects, 10 King Place, Ben Kamma'
const SETTINGS: LiveMapSettings = {
  pin: { size: [28, 42], tip: [14, 40], offset: [0, 0] },
  reducedMotion: false,
  touchFirst: false,
}

afterEach(() => {
  loader.createLiveMap.mockReset()
  loader.failNext = false
  vi.restoreAllMocks()
})

function fakeLiveMap() {
  const markElement = document.createElement('div')
  const remove = vi.fn()
  loader.createLiveMap.mockImplementation((container: HTMLElement) => {
    // Leaflet makes its container focusable the same way.
    container.tabIndex = 0
    container.append(markElement)
    return { markElement, remove }
  })
  return { markElement, remove }
}

function directionsSummary(link: HTMLElement) {
  return [
    link.textContent,
    link.getAttribute('href'),
    link.getAttribute('target'),
    link.getAttribute('rel'),
  ]
}

describe('ContactMap before activation', () => {
  it('shows the still picture, the pin, the directions tag and the attribution', () => {
    const { container } = render(<ContactMap />)

    const preview = container.querySelector('img.wz-map-preview')
    expect(preview?.getAttribute('src')).toBe(
      '/content/images/map-ben-kamma.webp',
    )
    expect(preview?.getAttribute('alt')).toBe('')
    expect(container.querySelector('source')?.getAttribute('srcset')).toBe(
      '/content/images/map-ben-kamma.avif',
    )
    expect(
      container.querySelector('.wz-map-pin')?.getAttribute('aria-hidden'),
    ).toBe('true')

    expect(
      directionsSummary(screen.getByRole('link', { name: DIRECTIONS_LABEL })),
    ).toEqual([
      '10 King Place: get directions',
      DIRECTIONS_URL,
      '_blank',
      'noopener',
    ])
    expect(container.querySelector('figcaption')?.textContent).toBe(
      'Ben Kamma, near Walker Drive.© OpenStreetMap contributors',
    )
    expect(
      screen
        .getByRole('link', { name: '© OpenStreetMap contributors' })
        .getAttribute('href'),
    ).toBe('https://www.openstreetmap.org/copyright')
  })

  it('says at the control that the map loads from OpenStreetMap', () => {
    render(<ContactMap />)

    const button = screen.getByRole('button', { name: 'Show the map' })
    expect(button.getAttribute('aria-describedby')).toBe('wz-map-note')
    expect(document.getElementById('wz-map-note')?.textContent).toBe(
      'The map loads from OpenStreetMap.',
    )
  })

  it('builds no map until the visitor asks', () => {
    render(<ContactMap />)

    expect(loader.createLiveMap).not.toHaveBeenCalled()
    expect(screen.queryByRole('region')).toBeNull()
  })
})

describe('ContactMap after activation', () => {
  it('swaps the picture for the live map and names the pin', async () => {
    const { remove, markElement } = fakeLiveMap()
    const { container, unmount } = render(<ContactMap />)

    fireEvent.click(screen.getByRole('button', { name: 'Show the map' }))

    const region = await screen.findByRole('region', { name: REGION_LABEL })
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Show the map' })).toBeNull(),
    )
    expect(container.querySelector('img.wz-map-preview')).toBeNull()
    expect(loader.createLiveMap).toHaveBeenCalledTimes(1)
    expect(loader.createLiveMap.mock.calls[0]?.[0]).toBe(region)

    expect(
      within(markElement).getByRole('img', { name: PIN_LABEL }),
    ).toBeDefined()
    expect(
      directionsSummary(
        within(markElement).getByRole('link', { name: DIRECTIONS_LABEL }),
      ),
    ).toEqual([
      '10 King Place: get directions',
      DIRECTIONS_URL,
      '_blank',
      'noopener',
    ])
    expect(container.querySelector('figcaption a')?.textContent).toBe(
      '© OpenStreetMap contributors',
    )

    unmount()
    expect(remove).toHaveBeenCalledTimes(1)
  })

  it('keeps the pin where the picture had it and reads reduced motion and touch at activation', async () => {
    fakeLiveMap()
    // A 1000 by 560 frame with the pin's box at (666, 240): the tip sits
    // 180px right of the frame's centre and level with it.
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: Element) {
        const left = this.classList.contains('wz-map-mark') ? 666 : 0
        const top = this.classList.contains('wz-map-mark') ? 240 : 0
        return DOMRect.fromRect({ x: left, y: top, width: 1000, height: 560 })
      },
    )
    vi.stubGlobal(
      'matchMedia',
      (query: string) =>
        ({
          matches: query === '(prefers-reduced-motion: reduce)',
        }) as MediaQueryList,
    )
    render(<ContactMap />)

    fireEvent.click(screen.getByRole('button', { name: 'Show the map' }))
    await screen.findByRole('region', { name: REGION_LABEL })

    expect(loader.createLiveMap.mock.calls[0]?.[1]).toEqual({
      pin: { size: [28, 42], tip: [14, 40], offset: [180, 0] },
      reducedMotion: true,
      touchFirst: false,
    })
    vi.unstubAllGlobals()
  })

  it('moves keyboard focus into the map', async () => {
    fakeLiveMap()
    render(<ContactMap />)

    const button = screen.getByRole('button', { name: 'Show the map' })
    button.focus()
    fireEvent.click(button)

    const region = await screen.findByRole('region', { name: REGION_LABEL })
    await waitFor(() => expect(document.activeElement).toBe(region))
  })

  it('keeps the picture and offers a retry when the map fails to load', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    loader.failNext = true
    render(<ContactMap />)

    fireEvent.click(screen.getByRole('button', { name: 'Show the map' }))

    expect((await screen.findByRole('alert')).textContent).toBe(
      'The map did not load. Try again, or use the directions.',
    )
    expect(screen.queryByRole('region')).toBeNull()
    expect(console.error).toHaveBeenCalledTimes(1)

    fakeLiveMap()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Show the map' }))
    })
    expect(
      await screen.findByRole('region', { name: REGION_LABEL }),
    ).toBeDefined()
  })
})

describe('mapOptions', () => {
  it('never zooms on the scroll wheel and keeps the keyboard', () => {
    const options = mapOptions(SETTINGS)
    expect(options.scrollWheelZoom).toBe(false)
    expect(options.keyboard).toBe(true)
    expect(options.dragging).toBe(true)
    expect(options.attributionControl).toBe(false)
  })

  it('pans with two fingers on touch-first screens', () => {
    expect(mapOptions({ ...SETTINGS, touchFirst: true }).dragging).toBe(false)
  })

  it('keeps tile requests to the bay and to sensible zooms', () => {
    expect(mapOptions(SETTINGS)).toMatchObject({
      minZoom: 12,
      maxZoom: 18,
      maxBounds: BAY_BOUNDS,
      maxBoundsViscosity: 1,
    })
    expect(TILE_URL).toBe('https://tile.openstreetmap.org/{z}/{x}/{y}.png')
  })

  it('animates by default and stops every animation for reduced motion', () => {
    const animated = { zoomAnimation: true, fadeAnimation: true }
    expect(mapOptions(SETTINGS)).toMatchObject({
      ...animated,
      markerZoomAnimation: true,
      inertia: true,
    })
    expect(mapOptions({ ...SETTINGS, reducedMotion: true })).toMatchObject({
      zoomAnimation: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
      inertia: false,
    })
  })
})

describe('createLiveMap', () => {
  // The module mock above stands in for ContactMap's loader; these tests
  // need the real one.
  const realLoader = () =>
    vi.importActual<typeof import('./loadMap.ts')>('./loadMap.ts')

  it('builds a focusable map with zoom buttons and the pin, and no attribution control', async () => {
    const { createLiveMap } = await realLoader()
    const container = document.createElement('div')
    document.body.append(container)

    const live = createLiveMap(container, SETTINGS)

    expect(container.classList.contains('leaflet-container')).toBe(true)
    expect(container.getAttribute('tabindex')).toBe('0')
    expect(
      [...container.querySelectorAll('.leaflet-control-zoom a')].map((link) =>
        link.getAttribute('aria-label'),
      ),
    ).toEqual(['Zoom in', 'Zoom out'])
    expect(container.querySelector('.leaflet-control-attribution')).toBeNull()
    expect(live.markElement.classList.contains('wz-map-marker')).toBe(true)
    expect(live.markElement.hasAttribute('tabindex')).toBe(false)

    live.remove()
    expect(container.querySelector('.leaflet-pane')).toBeNull()
    container.remove()
  })

  it('writes no inline style attribute through markup', async () => {
    const { createLiveMap } = await realLoader()
    const container = document.createElement('div')
    document.body.append(container)
    const setAttribute = vi.spyOn(Element.prototype, 'setAttribute')

    const live = createLiveMap(container, SETTINGS)

    expect(
      setAttribute.mock.calls.filter(([name]) => name === 'style'),
    ).toEqual([])
    expect(container.innerHTML).not.toMatch(/data:/)
    live.remove()
    container.remove()
  })
})

describe('zooming the live map', () => {
  const FRAME: [number, number] = [1000, 560]
  // Near the frame's bottom-right corner, where a centre zoom loses the pin.
  const OFFSET: [number, number] = [420, 220]
  const PIN_AT = { x: FRAME[0] / 2 + OFFSET[0], y: FRAME[1] / 2 + OFFSET[1] }
  // Leaflet rounds the view to whole pixels at each level.
  const ROUNDING_PX = 2
  const ZOOM_IN_KEY = 187
  const ZOOM_OUT_KEY = 189
  const ARROW_RIGHT_KEY = 39

  type Positioned = HTMLElement & { _leaflet_pos: { x: number; y: number } }

  async function liveMapInFrame(overrides: Partial<typeof SETTINGS> = {}) {
    const { createLiveMap } =
      await vi.importActual<typeof import('./loadMap.ts')>('./loadMap.ts')
    const container = document.createElement('div')
    Object.defineProperty(container, 'clientWidth', { value: FRAME[0] })
    Object.defineProperty(container, 'clientHeight', { value: FRAME[1] })
    document.body.append(container)
    const live = createLiveMap(container, {
      ...SETTINGS,
      ...overrides,
      pin: { ...SETTINGS.pin, offset: OFFSET },
    })
    return { container, live }
  }

  /** How far the pin's tip is from where the preview had it, in frame pixels. */
  function pinDrift(container: HTMLElement, markElement: HTMLElement) {
    // Leaflet places the marker element at the pin's anchor point.
    const pane = container.querySelector('.leaflet-map-pane') as Positioned
    const marker = markElement as Positioned
    return Math.max(
      Math.abs(marker._leaflet_pos.x + pane._leaflet_pos.x - PIN_AT.x),
      Math.abs(marker._leaflet_pos.y + pane._leaflet_pos.y - PIN_AT.y),
    )
  }

  it('keeps the pin where it was at every level, with the buttons and the keys', async () => {
    const { container, live } = await liveMapInFrame()
    const zoomIn = container.querySelector('.leaflet-control-zoom-in')!
    const zoomOut = container.querySelector('.leaflet-control-zoom-out')!
    const press = (keyCode: number, shiftKey = false) =>
      fireEvent.keyDown(document, { keyCode, shiftKey })
    container.focus()
    const steps: [string, () => void][] = [
      ['button in', () => fireEvent.click(zoomIn)],
      ['button in', () => fireEvent.click(zoomIn)],
      ['button in', () => fireEvent.click(zoomIn)],
      ['button in at the top', () => fireEvent.click(zoomIn)],
      ['key in at the top', () => press(ZOOM_IN_KEY)],
      ['key out', () => press(ZOOM_OUT_KEY)],
      ['shift key out', () => press(ZOOM_OUT_KEY, true)],
      ['button out', () => fireEvent.click(zoomOut)],
      ['shift key out past the bottom', () => press(ZOOM_OUT_KEY, true)],
      ['shift key in', () => press(ZOOM_IN_KEY, true)],
    ]

    expect(pinDrift(container, live.markElement)).toBeLessThanOrEqual(
      ROUNDING_PX,
    )
    for (const [step, act] of steps) {
      act()
      expect(pinDrift(container, live.markElement), step).toBeLessThanOrEqual(
        ROUNDING_PX,
      )
    }
    live.remove()
    container.remove()
  })

  it('zooms about the frame centre once the pin has been dragged out of the frame', async () => {
    const setZoomAround = vi.spyOn(LeafletMap.prototype, 'setZoomAround')
    const { container, live } = await liveMapInFrame({ reducedMotion: true })
    const zoomIn = container.querySelector('.leaflet-control-zoom-in')!
    const zoomOut = container.querySelector('.leaflet-control-zoom-out')!
    container.focus()

    fireEvent.click(zoomOut)
    expect(setZoomAround).toHaveBeenCalledTimes(1)

    // Each arrow press jumps 80px, so 20 presses carry the pin past the edge.
    for (let press = 0; press < 20; press++) {
      fireEvent.keyDown(document, { keyCode: ARROW_RIGHT_KEY })
    }
    expect(pinDrift(container, live.markElement)).toBeGreaterThan(FRAME[0])
    fireEvent.click(zoomIn)
    fireEvent.click(zoomOut)

    expect(setZoomAround).toHaveBeenCalledTimes(1)
    live.remove()
    container.remove()
  })

  it('takes a zoom before the map has a view', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const map = new StillMap(container)

    expect(() => map.setZoom(14)).not.toThrow()
    expect(map.getZoom()).toBe(14)
    map.remove()
    container.remove()
  })
})

describe('StillMap', () => {
  it('turns every pan into a jump', () => {
    const panBy = vi
      .spyOn(LeafletMap.prototype, 'panBy')
      .mockImplementation(function (this: LeafletMap) {
        return this
      })
    const container = document.createElement('div')
    document.body.append(container)
    const map = new StillMap(container)

    map.panBy([80, 0])
    map.panBy([0, 80], { duration: 1 })

    expect(panBy.mock.calls).toEqual([
      [[80, 0], { animate: false }],
      [[0, 80], { duration: 1, animate: false }],
    ])
    map.remove()
    container.remove()
  })
})

describe('CspSafeTileLayer', () => {
  function tileLayerWith(tiles: Record<string, TileRecord>, tileZoom: number) {
    const layer = new CspSafeTileLayer(TILE_URL)
    layer._tiles = tiles
    layer._tileZoom = tileZoom
    return layer
  }

  function loadingTile(z: number): TileRecord {
    const el = document.createElement('img')
    el.setAttribute('src', `https://tile.openstreetmap.org/${z}/1/2.png`)
    document.body.append(el)
    return { el, coords: { x: 1, y: 2, z } }
  }

  it('drops a removed tile without pointing it at a data: URL', () => {
    const tile = loadingTile(15)
    const layer = tileLayerWith({ '1:2:15': tile }, 15)
    const gridRemove = vi.spyOn(GridLayer.prototype, '_removeTile')

    layer._removeTile('1:2:15')

    expect(tile.el.hasAttribute('src')).toBe(false)
    expect(gridRemove).toHaveBeenCalledWith('1:2:15')
    expect(layer._tiles).toEqual({})
  })

  it('aborts tiles of an old zoom without a data: URL and keeps the current ones', () => {
    const old = loadingTile(14)
    const current = loadingTile(15)
    Object.defineProperty(old.el, 'complete', { value: false })
    const layer = tileLayerWith({ '1:2:14': old, '1:2:15': current }, 15)
    const aborted = vi.fn()
    ;(layer as unknown as { on(type: string, fn: () => void): void }).on(
      'tileabort',
      aborted,
    )

    layer._abortLoading()

    expect(old.el.hasAttribute('src')).toBe(false)
    expect(old.el.isConnected).toBe(false)
    expect(Object.keys(layer._tiles)).toEqual(['1:2:15'])
    expect(current.el.getAttribute('src')).toBe(
      'https://tile.openstreetmap.org/15/1/2.png',
    )
    expect(aborted).toHaveBeenCalledTimes(1)
  })
})

describe('what loads when', () => {
  const read = (path: string) =>
    readFileSync(resolve(process.cwd(), path), 'utf8')

  it('imports Leaflet only through the dynamically imported loadMap.ts', () => {
    const contactMap = read('src/next/map/ContactMap.tsx')
    expect(contactMap).not.toMatch(/from 'leaflet/)
    expect(contactMap).not.toMatch(/import \{[^}]*\} from '\.\/loadMap\.ts'/)
    expect(contactMap).toContain(
      "import type { LiveMap, PinGeometry } from './loadMap.ts'",
    )
    expect(contactMap).toContain("await import('./loadMap.ts')")
  })

  it('ships its own Leaflet styles with no data: URLs and no CDN', () => {
    const css = read('src/next/map/map.css')
    expect(css).not.toMatch(/data:/)
    expect(css).not.toMatch(/url\(/)
    expect(read('src/next/map/loadMap.ts')).toContain("import './map.css'")
  })

  it('lets images come only from the site and the OSM tile host', () => {
    const csp = read('public/_headers')
      .split('\n')
      .find((line) => line.trim().startsWith('Content-Security-Policy:'))
    const imgSrc = csp
      ?.split(';')
      .map((directive) => directive.trim())
      .find((directive) => directive.startsWith('img-src'))
    expect(imgSrc).toBe("img-src 'self' https://tile.openstreetmap.org")
  })
})
