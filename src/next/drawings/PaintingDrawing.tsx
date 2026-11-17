// House face at the eaves (spec S3): roof tiles over a painted fascia with a
// gutter, a downpipe on brackets down a plastered and painted wall, and a
// timber window over a sill. The problem view flakes the paint, rusts the wall
// under a gutter joint, fades the window frame, cracks the plaster under the
// sill and lets the downpipe swing off its brackets; the fixed view puts it
// right. Geometry ported from the prototype drawing.
import { getTrade } from '../../content/next/trades'
import {
  Drawing,
  type DrawingCrop,
  type DrawingPartProps,
  type DrawingView,
  type PartMarker,
} from './Drawing'
import {
  CutEdge,
  CutFine,
  Leader,
  Note,
  useDrawingKit,
  useFilterRef,
  useGlowClass,
  useMaterialRef,
} from './primitives'

const CROP_VIEW_BOX = '20 20 580 320'

const MARKERS: readonly PartMarker[] = [
  { key: 'a', x: 250, y: 134 },
  { key: 'b', x: 210, y: 252 },
  { key: 'c', x: 522, y: 210 },
  { key: 'd', x: 134, y: 214 },
]

const WINDOW = 'M300 150H460V270H300Z'
const SILL = 'M292 270H468L472 280H288Z'
const BRACKET_FILL = '#9aa5ad'

/** The downpipe and its upper brackets; the problem view swings them loose. */
function Downpipe() {
  const downpipe = useMaterialRef('downpipe')
  return (
    <g className="wz-loose">
      <rect x={90} y={98} width={14} height={242} fill={downpipe} />
      <CutFine d="M90 98V340 M104 98V340" />
      <path fill={BRACKET_FILL} d="M86 150h22v6H86Z M86 240h22v6H86Z" />
    </g>
  )
}

function PaintingArt() {
  const { tile } = useDrawingKit()
  const glow = useGlowClass()
  const sand = useFilterRef('sand')
  const concrete = useFilterRef('concrete')
  const tileFace = useMaterialRef('tileFace')
  const metal = useMaterialRef('metal')
  const timberV = useMaterialRef('timberV')
  const rust = useMaterialRef('rust')

  return (
    <>
      <rect x={20} y={20} width={580} height={44} fill={tileFace} />
      <rect
        x={20}
        y={64}
        width={580}
        height={18}
        fill="#eef0ee"
        filter={sand}
      />
      <rect
        x={20}
        y={96}
        width={580}
        height={244}
        fill="#e7e2d8"
        filter={sand}
      />
      <path
        fill={metal}
        stroke="#2b3238"
        strokeWidth={0.9}
        d="M20 82H600V92Q600 98 594 98H26Q20 98 20 92Z"
      />
      <rect x={300} y={150} width={160} height={120} fill={timberV} />
      <rect x={310} y={160} width={65} height={100} fill="#dbe9f2" />
      <rect x={385} y={160} width={65} height={100} fill="#dbe9f2" />
      <CutFine d={`${WINDOW} M310 160H375V260H310Z M385 160H450V260H385Z`} />
      <path fill="#b4b6b2" filter={concrete} d={SILL} />
      <CutFine d={SILL} />
      <rect
        x={0}
        y={340}
        width={600}
        height={20}
        fill="#a8916d"
        filter={sand}
      />
      <CutEdge d="M20 20H600 M20 64H600 M20 82H600 M0 340H600 M20 20V340" />
      <Downpipe />
      <path fill={BRACKET_FILL} d="M86 316h22v6H86Z" />
      {!tile && (
        <>
          <g className="wz-if-problem">
            <rect x={226} y={96} width={12} height={90} fill={rust} />
            <path
              fill="#cbbfa9"
              stroke="#a89b84"
              strokeWidth={0.8}
              d="M150 230l18-6 14 8 6 16-12 10-20-2-8-12Z M480 120l22-4 10 12-6 18-20 2-8-14Z M520 296l16-4 12 10-4 14-18 2Z"
            />
            <path fill="#d4c39f" fillOpacity={0.6} d={WINDOW} />
            <path
              fill="#c9b9a0"
              d="M60 66h30l-4 12h-22Z M410 68h24l-2 10h-20Z"
            />
            <path
              fill="none"
              stroke="#1b1f23"
              strokeWidth={1.2}
              d="M460 270l10 14 -4 10 12 16"
            />
            <Note
              x={296}
              y={128}
              lines={['loose paint, rust under the gutter joint']}
              onFill
            />
          </g>
          <g className="wz-if-fixed">
            <Note
              x={296}
              y={128}
              lines={['scraped, filled, primed and painted']}
              onFill
            />
          </g>
          {/* d's dot sits on the downpipe both fixed and swung loose. */}
          <Leader
            d="M250 112L250 92 M232 252L280 240 M500 210L458 210 M120 214L98 214"
            dots={[
              [250, 92],
              [280, 240],
              [458, 210],
              [98, 214],
            ]}
          />
          <rect
            className={glow('wz-glow-area', 'a')}
            data-part="a"
            x={20}
            y={64}
            width={580}
            height={34}
          />
          <rect
            className={glow('wz-glow-area', 'b')}
            data-part="b"
            x={120}
            y={100}
            width={170}
            height={236}
          />
          <path
            className={glow('wz-glow-area', 'c')}
            data-part="c"
            d={WINDOW}
          />
          <g className="wz-loose">
            <rect
              className={glow('wz-glow-area', 'd')}
              data-part="d"
              x={90}
              y={98}
              width={14}
              height={242}
            />
          </g>
        </>
      )}
    </>
  )
}

export function PaintingDrawing({
  view,
  crop,
  ...parts
}: {
  view: DrawingView
  crop?: DrawingCrop
} & DrawingPartProps) {
  return (
    <Drawing
      drawing={getTrade('painting').drawing}
      markers={MARKERS}
      view={view}
      crop={crop}
      cropViewBox={CROP_VIEW_BOX}
      {...parts}
    >
      <PaintingArt />
    </Drawing>
  )
}
