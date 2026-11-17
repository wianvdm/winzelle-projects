// Types for the part of Leaflet 1.9 that src/next/map/loadMap.ts uses.
// @types/leaflet is not a dependency, so this covers only those calls,
// including the underscore members the CSP-safe tile layer overrides.
declare module 'leaflet/dist/leaflet-src.esm.js' {
  export type LatLngTuple = [number, number]
  export type PointTuple = [number, number]
  export type BoundsTuple = [LatLngTuple, LatLngTuple]

  export class LatLng {
    lat: number
    lng: number
  }

  export class Point {
    x: number
    y: number
    subtract(other: Point | PointTuple): Point
  }

  export interface MapOptions {
    attributionControl?: boolean
    zoomControl?: boolean
    scrollWheelZoom?: boolean
    dragging?: boolean
    keyboard?: boolean
    minZoom?: number
    maxZoom?: number
    maxBounds?: BoundsTuple
    maxBoundsViscosity?: number
    zoomAnimation?: boolean
    fadeAnimation?: boolean
    markerZoomAnimation?: boolean
    inertia?: boolean
  }

  export interface PanOptions {
    animate?: boolean
    duration?: number
  }

  export class Map {
    constructor(element: HTMLElement, options?: MapOptions)
    setView(center: LatLng | LatLngTuple, zoom: number): this
    panBy(offset: Point | PointTuple, options?: PanOptions): this
    project(latlng: LatLng | LatLngTuple, zoom: number): Point
    unproject(point: Point | PointTuple, zoom: number): LatLng
    remove(): this
  }

  export interface TileLayerOptions {
    minZoom?: number
    maxZoom?: number
    bounds?: BoundsTuple
  }

  export interface TileRecord {
    el: HTMLImageElement
    coords: { x: number; y: number; z: number }
  }

  export class GridLayer {
    _tiles: Record<string, TileRecord>
    _tileZoom: number
    _removeTile(key: string): void
    fire(type: string, data?: object): this
    addTo(map: Map): this
  }

  export class TileLayer extends GridLayer {
    constructor(urlTemplate: string, options?: TileLayerOptions)
    _abortLoading(): void
  }

  export interface DivIconOptions {
    className?: string
    iconSize?: PointTuple
    iconAnchor?: PointTuple
  }

  export class DivIcon {
    constructor(options?: DivIconOptions)
  }

  export interface MarkerOptions {
    icon?: DivIcon
    keyboard?: boolean
    interactive?: boolean
  }

  export class Marker {
    constructor(latlng: LatLngTuple, options?: MarkerOptions)
    addTo(map: Map): this
    getElement(): HTMLElement | undefined
  }

  export const Control: {
    Zoom: new (options?: {
      position?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright'
    }) => { addTo(map: Map): unknown }
  }

  export const DomEvent: {
    disableClickPropagation(element: HTMLElement): void
  }
}
