// The live map. ContactMap imports this module with import() when the
// visitor presses "Show the map", so Leaflet, its styles and every tile
// request stay off the page until then.
import {
  Control,
  DivIcon,
  DomEvent,
  GridLayer,
  Map as LeafletMap,
  Marker,
  TileLayer,
  type BoundsTuple,
  type LatLngTuple,
  type MapOptions,
  type PanOptions,
  type Point,
  type PointTuple,
  type ZoomOptions,
} from 'leaflet/dist/leaflet-src.esm.js'

import { mapPin } from '../../content/next/index.ts'
import './map.css'

// OpenStreetMap's standard tiles. The browser sends its normal referrer and
// caches tiles as the server says; nothing here preloads beyond the view.
export const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const START_ZOOM = 15
export const MIN_ZOOM = 12
export const MAX_ZOOM = 18
// Nelson Mandela Bay with a margin: no tile outside it is ever requested.
export const BAY_BOUNDS: BoundsTuple = [
  [-34.1, 25.15],
  [-33.55, 26.0],
]

const PIN: LatLngTuple = [mapPin.latitude, mapPin.longitude]

export interface PinGeometry {
  size: PointTuple
  tip: PointTuple
  /** Where the tip sat in the preview, from the frame's centre, in px. */
  offset: PointTuple
}

export interface LiveMapSettings {
  pin: PinGeometry
  reducedMotion: boolean
  /** Touch-first screens pan with two fingers so one finger scrolls the page. */
  touchFirst: boolean
}

export interface LiveMap {
  /** The pin's element inside the map, for ContactMap to render into. */
  markElement: HTMLElement
  remove(): void
}

/**
 * Leaflet clears a removed or aborted tile by pointing its src at a data:
 * GIF, which the CSP's img-src refuses and logs as a violation. Removing
 * the attribute cancels the request the same way without one.
 */
export class CspSafeTileLayer extends TileLayer {
  override _removeTile(key: string): void {
    const tile = this._tiles[key]
    if (!tile) return
    tile.el.removeAttribute('src')
    GridLayer.prototype._removeTile.call(this, key)
  }

  override _abortLoading(): void {
    for (const [key, tile] of Object.entries(this._tiles)) {
      if (tile.coords.z === this._tileZoom) continue
      tile.el.onload = null
      tile.el.onerror = null
      if (tile.el.complete) continue
      tile.el.removeAttribute('src')
      tile.el.remove()
      Reflect.deleteProperty(this._tiles, key)
      this.fire('tileabort', { tile: tile.el, coords: tile.coords })
    }
  }
}

/**
 * The zoom buttons and the + and - keys zoom about the pin while it is in
 * the frame. It sits off centre where the preview had it, so zooming about
 * the frame's centre would push it out of the frame at the closest levels.
 * Once the visitor drags the pin out of the frame, zooming about it would
 * throw the place they are looking at out of view, so the frame's centre
 * takes over.
 */
class PinnedMap extends LeafletMap {
  override setZoom(zoom: number, options?: ZoomOptions): this {
    // Before the first setView there is no frame to measure; Leaflet only
    // stores the zoom then.
    if (this.getZoom() === undefined || !this.pinIsInFrame()) {
      return super.setZoom(zoom, options)
    }
    // Shift with + or - asks for three levels and can pass a limit.
    // setZoomAround places the pin for the zoom it gets, so an unclamped
    // zoom moves the pin once setView limits it.
    const clampedZoom = Math.min(
      Math.max(zoom, this.getMinZoom()),
      this.getMaxZoom(),
    )
    return this.setZoomAround(PIN, clampedZoom, options)
  }

  private pinIsInFrame(): boolean {
    const point = this.latLngToContainerPoint(PIN)
    const size = this.getSize()
    return (
      point.x >= 0 && point.x <= size.x && point.y >= 0 && point.y <= size.y
    )
  }
}

/** Keyboard pans jump instead of gliding when reduced motion is set. */
export class StillMap extends PinnedMap {
  override panBy(offset: Point | PointTuple, options?: PanOptions): this {
    return super.panBy(offset, { ...options, animate: false })
  }
}

export function mapOptions(settings: Omit<LiveMapSettings, 'pin'>): MapOptions {
  const animate = !settings.reducedMotion
  return {
    // The print's caption carries the attribution, linked to OSM's
    // copyright page, before and after the map loads.
    attributionControl: false,
    zoomControl: false,
    scrollWheelZoom: false,
    dragging: !settings.touchFirst,
    keyboard: true,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    maxBounds: BAY_BOUNDS,
    maxBoundsViscosity: 1,
    zoomAnimation: animate,
    fadeAnimation: animate,
    markerZoomAnimation: animate,
    inertia: animate,
  }
}

/** Builds the map in `container` with the pin where the preview had it. */
export function createLiveMap(
  container: HTMLElement,
  settings: LiveMapSettings,
): LiveMap {
  const MapClass = settings.reducedMotion ? StillMap : PinnedMap
  const map = new MapClass(container, mapOptions(settings))
  new Control.Zoom({ position: 'topright' }).addTo(map)

  const pinPoint = map.project(PIN, START_ZOOM)
  map.setView(
    map.unproject(pinPoint.subtract(settings.pin.offset), START_ZOOM),
    START_ZOOM,
  )
  new CspSafeTileLayer(TILE_URL, {
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    bounds: BAY_BOUNDS,
  }).addTo(map)

  const marker = new Marker(PIN, {
    icon: new DivIcon({
      className: 'wz-map-marker',
      iconSize: settings.pin.size,
      iconAnchor: settings.pin.tip,
    }),
    keyboard: false,
    interactive: false,
  }).addTo(map)
  const markElement = marker.getElement()
  if (!markElement) throw new Error('Leaflet did not create the pin element')
  // Clicks on the directions tag must not start a drag or a double-click zoom.
  DomEvent.disableClickPropagation(markElement)

  return { markElement, remove: () => map.remove() }
}
