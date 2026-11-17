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
  /** Letter of the part currently highlighted, if any. */
  highlight: string | null
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

/** Glow shape class for a part, lit when the part is highlighted. */
export function glowClass(
  base: 'wz-glow' | 'wz-glow-area',
  active: boolean,
): string {
  return active ? `${base} wz-held` : base
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

/**
 * Italic surveyor's note. Lines sit 18 units apart from the first line's
 * baseline. `onFill` lays a solid paper label behind the note so it stays
 * readable over a textured fill; the label is measured from the drawn text.
 */
export function Note({
  x,
  y,
  lines,
  onFill,
}: {
  x: number
  y: number
  lines: string[]
  onFill?: boolean
}) {
  const groupRef = useRef<SVGGElement>(null)
  const [back, setBack] = useState<{
    x: number
    y: number
    width: number
    height: number
  } | null>(null)

  useLayoutEffect(() => {
    if (!onFill) return
    const group = groupRef.current
    // jsdom has no SVG layout; the paper label is cosmetic backing only.
    if (!group || typeof group.getBBox !== 'function') return
    const box = group.getBBox()
    if (!box.width) return
    setBack({
      x: box.x - NOTE_BACK_PADDING,
      y: box.y - NOTE_BACK_PADDING,
      width: box.width + 2 * NOTE_BACK_PADDING,
      height: box.height + 2 * NOTE_BACK_PADDING,
    })
  }, [onFill, x, y, lines])

  return (
    <g ref={groupRef}>
      {back && (
        <rect
          className="wz-note-back"
          x={back.x}
          y={back.y}
          width={back.width}
          height={back.height}
        />
      )}
      {lines.map((line, index) => (
        <text
          key={line}
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

/**
 * Lettered marker over the drawing. Presentational: the explorer's key
 * buttons (#97) drive interaction, and `held` mirrors the highlighted part.
 * SVG-native because the CSP forbids the inline styles the HTML overlay
 * version would need for positioning.
 */
export function Marker({
  x,
  y,
  letter,
  held,
}: {
  x: number
  y: number
  letter: string
  held: boolean
}) {
  return (
    <g
      className={held ? 'wz-marker wz-held' : 'wz-marker'}
      transform={`translate(${x} ${y})`}
      data-part={letter}
      aria-hidden="true"
    >
      <circle className="wz-marker-disc" r={21} />
      <text className="wz-marker-letter">{letter}</text>
    </g>
  )
}
