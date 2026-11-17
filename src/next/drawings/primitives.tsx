// Shared SVG primitives for the surveyor drawings (spec S3): the material
// library (filters, gradients, patterns, arrow markers), ink line weights,
// leaders with paper casings, notes and dimension labels, lettered markers
// and the highlight glow shapes. No inline styles anywhere: `public/_headers`
// allows no inline style, so all styling lives in drawings.css and SVG
// presentation attributes.
import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
} from 'react'

/** Per-instance ids so several drawings can share one page. */
export interface DrawingIds {
  concrete: string
  sand: string
  brick: string
  granule: string
  metal: string
  pipe: string
  downpipe: string
  timber: string
  timberV: string
  shadow: string
  rust: string
  brickFace: string
  tileWall: string
  tileFace: string
  arrow: string
  waterArrow: string
}

export interface DrawingKitContextValue {
  ids: DrawingIds
  /** Tile crops drop notes, leaders, dims, glows and texture filters. */
  tile: boolean
  /** Letter of the part held (pressed), if any. */
  highlight: string | null
  /** Letter of the part under the pointer or keyboard focus, if any. */
  hot: string | null
}

const DrawingKitContext = createContext<DrawingKitContextValue | null>(null)

export function useDrawingKit(): DrawingKitContextValue {
  const value = useContext(DrawingKitContext)
  if (!value)
    throw new Error('Drawing primitives must render inside <Drawing>.')
  return value
}

export const DrawingKitProvider = DrawingKitContext.Provider

/** `url(#id)` reference for a gradient or pattern fill. */
export function useMaterialRef(id: keyof DrawingIds): string {
  const { ids } = useDrawingKit()
  return `url(#${ids[id]})`
}

/** `url(#id)` for a texture filter, omitted in tile crops like the prototype. */
export function useFilterRef(
  id: 'concrete' | 'sand' | 'brick' | 'granule',
): string | undefined {
  const { ids, tile } = useDrawingKit()
  return tile ? undefined : `url(#${ids[id]})`
}

/** Class for a glow shape or marker: held wins over hot. */
function partClass(
  base: string,
  letter: string,
  { highlight, hot }: Pick<DrawingKitContextValue, 'highlight' | 'hot'>,
): string {
  if (highlight === letter) return `${base} wz-held`
  if (hot === letter) return `${base} wz-hot`
  return base
}

/** Glow shape class for a part, lit while the part is held or hot. */
export function useGlowClass(): (
  base: 'wz-glow' | 'wz-glow-area',
  letter: string,
) => string {
  const kit = useDrawingKit()
  return (base, letter) => partClass(base, letter, kit)
}

/**
 * Calls `onChange` whenever the media query flips. A no-op where matchMedia
 * is missing (jsdom).
 */
export function watchMedia(
  query: string,
  onChange: (matches: boolean) => void,
): () => void {
  if (typeof window.matchMedia !== 'function') return () => {}
  const list = window.matchMedia(query)
  const listener = () => onChange(list.matches)
  list.addEventListener('change', listener)
  return () => list.removeEventListener('change', listener)
}

/** The shared material library, scoped to one drawing instance. */
export function MaterialDefs({ ids }: { ids: DrawingIds }) {
  return (
    <defs>
      <filter
        id={ids.concrete}
        x="0"
        y="0"
        width="100%"
        height="100%"
        colorInterpolationFilters="sRGB"
      >
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.65"
          numOctaves="4"
          seed="4"
          result="n"
        />
        <feDiffuseLighting
          in="n"
          surfaceScale="0.7"
          diffuseConstant="1.18"
          lightingColor="#fff"
          result="l"
        >
          <feDistantLight azimuth="225" elevation="56" />
        </feDiffuseLighting>
        <feComposite
          in="SourceGraphic"
          in2="l"
          operator="arithmetic"
          k1="1"
          k2="0"
          k3="0"
          k4="0"
        />
      </filter>
      <filter
        id={ids.sand}
        x="0"
        y="0"
        width="100%"
        height="100%"
        colorInterpolationFilters="sRGB"
      >
        <feTurbulence
          type="fractalNoise"
          baseFrequency="1.15"
          numOctaves="3"
          seed="12"
          result="n"
        />
        <feDiffuseLighting
          in="n"
          surfaceScale="0.95"
          diffuseConstant="1.18"
          lightingColor="#fff"
          result="l"
        >
          <feDistantLight azimuth="225" elevation="58" />
        </feDiffuseLighting>
        <feComposite
          in="SourceGraphic"
          in2="l"
          operator="arithmetic"
          k1="1"
          k2="0"
          k3="0"
          k4="0"
        />
      </filter>
      <filter
        id={ids.brick}
        x="0"
        y="0"
        width="100%"
        height="100%"
        colorInterpolationFilters="sRGB"
      >
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.55 0.85"
          numOctaves="4"
          seed="21"
          result="n"
        />
        <feDiffuseLighting
          in="n"
          surfaceScale="1.1"
          diffuseConstant="1.2"
          lightingColor="#fff"
          result="l"
        >
          <feDistantLight azimuth="225" elevation="55" />
        </feDiffuseLighting>
        <feComposite
          in="SourceGraphic"
          in2="l"
          operator="arithmetic"
          k1="1"
          k2="0"
          k3="0"
          k4="0"
        />
      </filter>
      <filter
        id={ids.granule}
        x="-5%"
        y="-30%"
        width="110%"
        height="160%"
        colorInterpolationFilters="sRGB"
      >
        <feTurbulence
          type="fractalNoise"
          baseFrequency="1.35"
          numOctaves="2"
          seed="8"
          result="n"
        />
        <feDiffuseLighting
          in="n"
          surfaceScale="2.25"
          diffuseConstant="1.25"
          lightingColor="#fff"
          result="l"
        >
          <feDistantLight azimuth="225" elevation="52" />
        </feDiffuseLighting>
        <feComposite
          in="SourceGraphic"
          in2="l"
          operator="arithmetic"
          k1="1"
          k2="0"
          k3="0"
          k4="0"
        />
      </filter>
      <linearGradient id={ids.metal} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#f2f5f7" />
        <stop offset="35%" stopColor="#b9c4cd" />
        <stop offset="65%" stopColor="#e4eaee" />
        <stop offset="100%" stopColor="#8b97a2" />
      </linearGradient>
      <linearGradient id={ids.pipe} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#3a434b" />
        <stop offset="35%" stopColor="#6c7782" />
        <stop offset="75%" stopColor="#48535c" />
        <stop offset="100%" stopColor="#272e34" />
      </linearGradient>
      <linearGradient id={ids.downpipe} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#cfd6db" />
        <stop offset="40%" stopColor="#f4f6f7" />
        <stop offset="100%" stopColor="#a9b3ba" />
      </linearGradient>
      <linearGradient id={ids.timber} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#c9a77a" />
        <stop offset="50%" stopColor="#b48d5d" />
        <stop offset="100%" stopColor="#c29d6c" />
      </linearGradient>
      <linearGradient id={ids.timberV} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#bf9b6b" />
        <stop offset="50%" stopColor="#ad8657" />
        <stop offset="100%" stopColor="#c29d6c" />
      </linearGradient>
      <linearGradient id={ids.shadow} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#0b1824" stopOpacity="0.32" />
        <stop offset="100%" stopColor="#0b1824" stopOpacity="0" />
      </linearGradient>
      <linearGradient id={ids.rust} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#7d5a3f" stopOpacity="0.6" />
        <stop offset="100%" stopColor="#7d5a3f" stopOpacity="0" />
      </linearGradient>
      {/* Brick face in stretcher bond: brick 40 x 11.5, joints 2.2. */}
      <pattern
        id={ids.brickFace}
        x="10"
        y="10"
        width="84.4"
        height="27.4"
        patternUnits="userSpaceOnUse"
      >
        <rect width="84.4" height="27.4" fill="#c5bfb2" />
        <rect x="0" y="0" width="40" height="11.5" fill="#955d4c" />
        <rect x="42.2" y="0" width="40" height="11.5" fill="#864f3f" />
        <rect x="-21.1" y="13.7" width="40" height="11.5" fill="#a26a57" />
        <rect x="21.1" y="13.7" width="40" height="11.5" fill="#7d4c3e" />
        <rect x="63.3" y="13.7" width="40" height="11.5" fill="#8f5747" />
      </pattern>
      {/* Glazed wall tiles, 40 square, for the bathroom elevation. */}
      <pattern
        id={ids.tileWall}
        x="20"
        y="20"
        width="40"
        height="40"
        patternUnits="userSpaceOnUse"
      >
        <rect width="40" height="40" fill="#ebe8e1" />
        <path d="M0 0.5H40 M0.5 0V40" stroke="#b9b3a7" strokeWidth="1" />
        <path d="M3 3L14 3" stroke="#ffffff" strokeWidth="1.2" opacity="0.7" />
      </pattern>
      {/* Roof tiles seen end-on, for the painting elevation. */}
      <pattern
        id={ids.tileFace}
        x="0"
        y="20"
        width="36"
        height="15"
        patternUnits="userSpaceOnUse"
      >
        <rect width="36" height="15" fill="#7f5245" />
        <path d="M0 13.5Q9 6 18 13.5T36 13.5V15H0Z" fill="#5f3d33" />
        <path d="M0 3H36" stroke="#9a6a5b" strokeWidth="1.2" />
      </pattern>
      <marker
        id={ids.arrow}
        viewBox="0 0 10 10"
        refX="9"
        refY="5"
        markerWidth="7"
        markerHeight="7"
        orient="auto-start-reverse"
      >
        <path
          d="M0 1 L9 5 L0 9"
          fill="none"
          stroke="#102e44"
          strokeWidth="1.2"
        />
      </marker>
      <marker
        id={ids.waterArrow}
        viewBox="0 0 10 10"
        refX="9"
        refY="5"
        markerWidth="7"
        markerHeight="7"
        orient="auto-start-reverse"
      >
        <path
          d="M0 1 L9 5 L0 9"
          fill="none"
          stroke="#1f5e8a"
          strokeWidth="1.3"
        />
      </marker>
    </defs>
  )
}

/** Primary cut outline. */
export function CutEdge({ d }: { d: string }) {
  return <path className="wz-cut-edge" d={d} />
}

/** Fine internal line; `arrow` adds the navy arrowhead at the path end. */
export function CutFine({ d, arrow }: { d: string; arrow?: boolean }) {
  const { ids } = useDrawingKit()
  return (
    <path
      className="wz-cut-fine"
      d={d}
      markerEnd={arrow ? `url(#${ids.arrow})` : undefined}
    />
  )
}

/** Water stroke; `arrow` adds the river-blue arrowhead at the path end. */
export function Water({
  d,
  arrow,
  fill,
}: {
  d: string
  arrow?: boolean
  fill?: string
}) {
  const { ids } = useDrawingKit()
  return (
    <path
      className="wz-water"
      d={d}
      fill={fill}
      markerEnd={arrow ? `url(#${ids.waterArrow})` : undefined}
    />
  )
}

/** Leader lines on a paper casing, each leg ending in a dot. */
export function Leader({
  d,
  dots,
}: {
  d: string
  dots: readonly (readonly [cx: number, cy: number])[]
}) {
  return (
    <>
      <path className="wz-leader-casing" d={d} />
      <path className="wz-leader" d={d} />
      {dots.map(([cx, cy]) => (
        <circle key={`${cx},${cy}`} className="wz-dot" cx={cx} cy={cy} r={2} />
      ))}
    </>
  )
}

const NOTE_LINE_HEIGHT = 18
const NOTE_BACK_PADDING = 4
/** In-drawing notes show from here up; drawings.css hides them below. */
const NOTES_SHOWN_QUERY = '(min-width: 1220px)'

interface Box {
  x: number
  y: number
  width: number
  height: number
}

/** One padded paper label per drawn line; null where a line has no layout. */
function measureNoteBacks(group: SVGGElement): (Box | null)[] {
  return [...group.querySelectorAll<SVGGraphicsElement>('.wz-note')].map(
    (line) => {
      // jsdom has no SVG layout; the paper label is cosmetic backing only.
      if (typeof line.getBBox !== 'function') return null
      const box = line.getBBox()
      // Hidden notes (below 1220px) measure zero wide.
      if (!box.width) return null
      return {
        x: box.x - NOTE_BACK_PADDING,
        y: box.y - NOTE_BACK_PADDING,
        width: box.width + 2 * NOTE_BACK_PADDING,
        height: box.height + 2 * NOTE_BACK_PADDING,
      }
    },
  )
}

function sameBacks(
  previous: readonly (Box | null)[],
  next: readonly (Box | null)[],
): boolean {
  return (
    previous.length === next.length &&
    previous.every(
      (box, index) => JSON.stringify(box) === JSON.stringify(next[index]),
    )
  )
}

/**
 * Measures the note's text lines (never the labels) and measures again when
 * the notes come back into view above 1220px and when webfonts finish
 * loading, since both change the drawn text's size.
 */
function useNoteBacks(enabled: boolean, layoutKey: string) {
  const groupRef = useRef<SVGGElement>(null)
  const [backs, setBacks] = useState<(Box | null)[]>([])

  useLayoutEffect(() => {
    const group = groupRef.current
    if (!enabled || !group) return
    let live = true
    const measure = () => {
      if (!live) return
      const next = measureNoteBacks(group)
      setBacks((previous) => (sameBacks(previous, next) ? previous : next))
    }
    measure()
    const stopWatching = watchMedia(NOTES_SHOWN_QUERY, measure)
    const fonts = 'fonts' in document ? document.fonts : undefined
    void fonts?.ready.then(measure)
    fonts?.addEventListener('loadingdone', measure)
    return () => {
      live = false
      stopWatching()
      fonts?.removeEventListener('loadingdone', measure)
    }
  }, [enabled, layoutKey])

  return { groupRef, backs: enabled ? backs : [] }
}

/**
 * Italic surveyor's note. Lines sit 18 units apart from the first line's
 * baseline. `onFill` lays a solid paper label behind each line so it stays
 * readable over a textured fill; the labels are measured from the drawn text.
 */
export function Note({
  x,
  y,
  lines,
  onFill = false,
}: {
  x: number
  y: number
  lines: string[]
  onFill?: boolean
}) {
  const { groupRef, backs } = useNoteBacks(
    onFill,
    `${x},${y},${lines.join('\n')}`,
  )

  return (
    <g ref={groupRef}>
      {/* Labels first, so a second line's label never covers the first line. */}
      {backs.map(
        (box, index) =>
          box && (
            <rect
              // One label per line, in the note's fixed line order.
              key={index}
              className="wz-note-back"
              x={box.x}
              y={box.y}
              width={box.width}
              height={box.height}
            />
          ),
      )}
      {lines.map((line, index) => (
        <text
          // Lines of one note may repeat; their order never changes.
          key={index}
          className="wz-note"
          x={x}
          y={y + index * NOTE_LINE_HEIGHT}
        >
          {line}
        </text>
      ))}
    </g>
  )
}

/** Small-caps dimension or area label. */
export function Dim({
  x,
  y,
  children,
}: {
  x: number
  y: number
  children: string
}) {
  return (
    <text className="wz-dim" x={x} y={y}>
      {children}
    </text>
  )
}

/** On-screen marker size in CSS px, as the prototype's marker buttons. */
export interface MarkerSize {
  /** Outer diameter including the ring. */
  diameter: number
  /** Least distance from the marker centre to the frame edge. */
  inset: number
}

export const MARKER_SIZE_WIDE: MarkerSize = { diameter: 44, inset: 24 }
export const MARKER_SIZE_NARROW: MarkerSize = { diameter: 30, inset: 17 }
const MARKER_RING_WIDTH = 1.5
/** The drawings' shared 600x360 viewBox. */
export const VIEW_WIDTH = 600
const VIEW_HEIGHT = 360

export interface PartHandlers {
  /** The pointer entered a part's marker (its letter) or left it (null). */
  onPartHover?: (letter: string | null) => void
  /** A part's marker was clicked or tapped. */
  onPartPress?: (letter: string) => void
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high)
}

/**
 * Lettered marker over the drawing: a pointer target that mirrors the
 * explorer's key buttons (#97), which carry keyboard access, so it is
 * aria-hidden. It is drawn in CSS px: scaling by 1 / `pixelsPerUnit` (drawing
 * width / 600) keeps the prototype's 44px (30px narrow) marker at any drawing
 * width, and its centre is clamped so the disc stays inside the frame.
 * Without a measurement (server, jsdom) it draws at one unit per px.
 */
export function Marker({
  x,
  y,
  letter,
  size,
  pixelsPerUnit,
  onPartHover,
  onPartPress,
}: {
  x: number
  y: number
  letter: string
  size: MarkerSize
  pixelsPerUnit: number | null
} & PartHandlers) {
  const kit = useDrawingKit()
  const unitsPerPixel = pixelsPerUnit ? 1 / pixelsPerUnit : 1
  const inset = size.inset * unitsPerPixel
  const cx = clamp(x, inset, VIEW_WIDTH - inset)
  const cy = clamp(y, inset, VIEW_HEIGHT - inset)
  const base = onPartPress ? 'wz-marker wz-marker-live' : 'wz-marker'
  // Touch has no pointer leave, so only a mouse lights a part on hover.
  const hover = (event: PointerEvent, letterOrNull: string | null) => {
    if (event.pointerType === 'mouse') onPartHover?.(letterOrNull)
  }

  return (
    <g
      className={partClass(base, letter, kit)}
      transform={`translate(${cx} ${cy}) scale(${unitsPerPixel})`}
      data-part={letter}
      aria-hidden="true"
      onPointerEnter={(event) => hover(event, letter)}
      onPointerLeave={(event) => hover(event, null)}
      onClick={onPartPress ? () => onPartPress(letter) : undefined}
    >
      <circle
        className="wz-marker-disc"
        r={size.diameter / 2 - MARKER_RING_WIDTH / 2}
      />
      <text className="wz-marker-letter">{letter}</text>
    </g>
  )
}
