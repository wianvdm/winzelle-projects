// The shared drawing shell (spec S3 "Surveyor drawing"): one 600x360 figure
// with a caption strip ("{name}, {view}, not to scale"), problem/fixed state
// switching via data-state, lettered markers, and a tile crop that renders the
// fixed state as an aria-hidden thumbnail. One component serves both sizes;
// the trade components supply only the artwork.
import {
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'

import type { TradeDrawing } from '../../content/next/trades'
import {
  DrawingKitProvider,
  MARKER_SIZE_NARROW,
  MARKER_SIZE_WIDE,
  Marker,
  MaterialDefs,
  VIEW_WIDTH,
  watchMedia,
  type DrawingIds,
  type PartHandlers,
} from './primitives'
import './drawings.css'

export type DrawingView = 'problem' | 'fixed'
export type DrawingCrop = 'full' | 'tile'

export interface PartMarker {
  key: string
  x: number
  y: number
}

/** Which lettered part is lit, and the marker callbacks for the explorer. */
export interface DrawingPartProps extends PartHandlers {
  /** Letter of the held (pressed) part: glows, navy marker, strip note. */
  highlight?: string | null
  /** Letter of the part under the pointer or keyboard focus: a lighter glow. */
  hot?: string | null
}

export interface DrawingProps extends DrawingPartProps {
  drawing: TradeDrawing
  /** Marker positions in viewBox units, one per lettered part. */
  markers: readonly PartMarker[]
  view: DrawingView
  crop?: DrawingCrop
  /** viewBox for the tile crop, for example "0 150 600 210". */
  cropViewBox?: string
  children: ReactNode
}

/** Below this the prototype's markers shrink to their phone size. */
const NARROW_QUERY = '(max-width: 1099px)'

function useDrawingIds(): { ids: DrawingIds; titleId: string } {
  const raw = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  return useMemo(() => {
    const id = (name: keyof DrawingIds) => `wzd-${raw}-${name}`
    return {
      ids: {
        concrete: id('concrete'),
        sand: id('sand'),
        brick: id('brick'),
        granule: id('granule'),
        metal: id('metal'),
        pipe: id('pipe'),
        downpipe: id('downpipe'),
        timber: id('timber'),
        timberV: id('timberV'),
        shadow: id('shadow'),
        rust: id('rust'),
        brickFace: id('brickFace'),
        tileWall: id('tileWall'),
        tileFace: id('tileFace'),
        arrow: id('arrow'),
        waterArrow: id('waterArrow'),
      },
      titleId: `wzd-${raw}-title`,
    }
  }, [raw])
}

function matchesNow(query: string): boolean {
  return typeof window.matchMedia === 'function'
    ? window.matchMedia(query).matches
    : false
}

/**
 * The drawing's on-screen scale and the marker size for the window, so the
 * markers keep the prototype's pixel size however wide the drawing is.
 */
function useMarkerLayout(svgRef: RefObject<SVGSVGElement | null>) {
  const [pixelsPerUnit, setPixelsPerUnit] = useState<number | null>(null)
  const [narrow, setNarrow] = useState(false)

  useLayoutEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    setNarrow(matchesNow(NARROW_QUERY))
    const stopWatching = watchMedia(NARROW_QUERY, setNarrow)
    // jsdom has no ResizeObserver; markers then draw at one unit per px.
    if (typeof ResizeObserver !== 'function') return stopWatching
    const measure = () => {
      const width = svg.getBoundingClientRect().width
      setPixelsPerUnit(width ? width / VIEW_WIDTH : null)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(svg)
    return () => {
      stopWatching()
      observer.disconnect()
    }
  }, [svgRef])

  return {
    pixelsPerUnit,
    size: narrow ? MARKER_SIZE_NARROW : MARKER_SIZE_WIDE,
  }
}

function TileDrawing({
  cropViewBox,
  children,
}: Pick<DrawingProps, 'cropViewBox' | 'children'>) {
  const { ids } = useDrawingIds()
  if (!cropViewBox) throw new Error('Drawing crop="tile" requires cropViewBox.')
  return (
    <svg
      className="wz-drawing-tile"
      viewBox={cropViewBox}
      data-state="fixed"
      aria-hidden="true"
      focusable="false"
    >
      <MaterialDefs ids={ids} />
      <DrawingKitProvider
        value={{ ids, tile: true, highlight: null, hot: null }}
      >
        {children}
      </DrawingKitProvider>
    </svg>
  )
}

/**
 * Below 1220px the in-drawing notes hide and the strip carries the state's
 * note, or the held part's name and note while a part is held.
 */
function StripNote({
  drawing,
  view,
  highlight,
}: Pick<DrawingProps, 'drawing' | 'view' | 'highlight'>) {
  const heldPart = drawing.parts.find((part) => part.key === highlight)
  if (heldPart) {
    return (
      <span className="wz-drawing-note">
        <strong>{heldPart.name}: </strong>
        {heldPart.note}
      </span>
    )
  }
  return (
    <span className="wz-drawing-note">
      {view === 'problem' ? drawing.problemNote : drawing.fixedNote}
    </span>
  )
}

function FullDrawing({
  drawing,
  markers,
  view,
  highlight = null,
  hot = null,
  onPartHover,
  onPartPress,
  children,
}: DrawingProps) {
  const { ids, titleId } = useDrawingIds()
  const svgRef = useRef<SVGSVGElement>(null)
  const { pixelsPerUnit, size } = useMarkerLayout(svgRef)

  return (
    <figure className="wz-drawing">
      <div className="wz-canvas">
        <svg
          ref={svgRef}
          viewBox="0 0 600 360"
          role="img"
          aria-labelledby={titleId}
          data-state={view}
        >
          <title id={titleId}>{drawing.title}</title>
          <MaterialDefs ids={ids} />
          <DrawingKitProvider value={{ ids, tile: false, highlight, hot }}>
            {children}
            {markers.map((marker) => (
              <Marker
                key={marker.key}
                x={marker.x}
                y={marker.y}
                letter={marker.key}
                size={size}
                pixelsPerUnit={pixelsPerUnit}
                onPartHover={onPartHover}
                onPartPress={onPartPress}
              />
            ))}
          </DrawingKitProvider>
        </svg>
      </div>
      <figcaption className="wz-drawing-strip">
        <span>{drawing.name}</span>
        <span className="wz-drawing-view">{drawing.view}, not to scale</span>
        <StripNote drawing={drawing} view={view} highlight={highlight} />
      </figcaption>
    </figure>
  )
}

export function Drawing({ crop = 'full', ...props }: DrawingProps) {
  if (crop === 'tile') {
    return (
      <TileDrawing cropViewBox={props.cropViewBox}>
        {props.children}
      </TileDrawing>
    )
  }
  return <FullDrawing {...props} />
}
