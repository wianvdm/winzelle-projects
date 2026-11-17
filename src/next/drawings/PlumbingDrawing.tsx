// Basin and wall plug (spec S3): a tiled bathroom wall with a wall-hung
// basin and its tap, a trap under the basin holding water in its bend before
// the waste pipe enters the wall, and a double wall plug fed by a cable in
// the wall. The problem view drips the trap at its joint and cracks the plug's
// cover; the fixed view reseals and replaces them. No fault here is one the
// page refers to a registered electrician or plumber (#95), so no scorched
// plug. Geometry ported from the prototype drawing.
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
  Water,
} from './primitives'

const CROP_VIEW_BOX = '90 90 480 250'

const MARKERS: readonly PartMarker[] = [
  { key: 'a', x: 150, y: 92 },
  { key: 'b', x: 80, y: 196 },
  { key: 'c', x: 120, y: 268 },
  { key: 'd', x: 560, y: 150 },
]

const TRAP = 'M220 214V262Q220 276 234 276Q248 276 248 262V250H300'
const BASIN_BOWL = 'M112 156H328Q326 200 284 214H156Q114 200 112 156Z'
const PLUG_PLATE = { x: 440, y: 194, width: 100, height: 44, rx: 3 }

function PlumbingArt() {
  const { tile } = useDrawingKit()
  const glow = useGlowClass()
  const sand = useFilterRef('sand')
  const tileWall = useMaterialRef('tileWall')
  const metal = useMaterialRef('metal')

  return (
    <>
      <rect x={20} y={20} width={580} height={300} fill={tileWall} />
      <rect
        x={0}
        y={320}
        width={600}
        height={40}
        fill="#bdb6a8"
        filter={sand}
      />
      <CutFine d="M0 340H600 M60 320V360 M150 320V360 M240 320V360 M330 320V360 M420 320V360 M510 320V360" />
      <CutEdge d="M0 320H600 M20 20V320" />
      <CutFine d="M490 20V194" dash="6 4" />
      <rect x={104} y={144} width={232} height={12} rx={5} fill="#f6f8f8" />
      <path fill="#eef2f3" d={BASIN_BOWL} />
      <path
        fill="#d7dee2"
        d="M128 160H312Q306 194 278 204H162Q132 194 128 160Z"
        opacity={0.55}
      />
      <CutEdge d="M104 149Q104 144 109 144H331Q336 144 336 149V151Q336 156 331 156H109Q104 156 104 151Z M112 156Q114 200 156 214H284Q326 200 328 156" />
      <path
        fill={metal}
        stroke="#2b3238"
        strokeWidth={0.9}
        d="M210 144V128H230V144Z M214 128V112Q214 104 222 104H250V112H226Q222 112 222 118V128Z M204 98H236V104H204Z"
      />
      <path
        fill="none"
        stroke="#2b3238"
        strokeWidth={13}
        strokeLinecap="round"
        strokeLinejoin="round"
        d={TRAP}
      />
      <path
        fill="none"
        stroke="#c3ccd3"
        strokeWidth={10}
        strokeLinecap="round"
        strokeLinejoin="round"
        d={TRAP}
      />
      <path
        fill="none"
        stroke="#9cc4dc"
        strokeWidth={6}
        strokeLinecap="round"
        d="M220 258V262Q220 276 234 276Q248 276 248 262V258"
      />
      <circle
        cx={304}
        cy={250}
        r={11}
        fill={metal}
        stroke="#2b3238"
        strokeWidth={0.9}
      />
      <rect {...PLUG_PLATE} fill="#f7f7f5" stroke="#2b3238" strokeWidth={1.1} />
      <path
        fill="#3a4148"
        d="M463 204a3.6 3.6 0 1 0 0.01 0Z M455 220a2.4 2.4 0 1 0 0.01 0Z M471 220a2.4 2.4 0 1 0 0.01 0Z M507 204a3.6 3.6 0 1 0 0.01 0Z M499 220a2.4 2.4 0 1 0 0.01 0Z M515 220a2.4 2.4 0 1 0 0.01 0Z"
      />
      <CutFine d="M448 200h6v10h-6Z M492 200h6v10h-6Z" />
      {!tile && (
        <>
          <g className="wz-if-problem">
            <Water
              d="M234 284q-2 5 0 7q2-2 0-7z M234 300q-2 5 0 7q2-2 0-7z M248 120q-2 5 0 7q2-2 0-7z"
              fill="#1f5e8a"
            />
            <ellipse
              cx={236}
              cy={324}
              rx={26}
              ry={3}
              fill="#1f5e8a"
              fillOpacity={0.45}
            />
            <path
              fill="none"
              stroke="#1b1f23"
              strokeWidth={1.3}
              d="M520 194l-6 12 5 8-4 10 3 14"
            />
            <Note
              x={244}
              y={56}
              lines={[
                'the trap drips at its joint,',
                'and the plug is cracked',
              ]}
              onFill
            />
          </g>
          <g className="wz-if-fixed">
            <Note
              x={244}
              y={56}
              lines={['trap resealed, plug replaced']}
              onFill
            />
          </g>
          <Leader
            d="M168 100L216 118 M100 184L115 168 M142 266L215 262 M552 166L530 196"
            dots={[
              [216, 118],
              [115, 168],
              [215, 262],
              [530, 196],
            ]}
          />
          <path
            className={glow('wz-glow-area', 'a')}
            data-part="a"
            d="M204 98H236V104H230V128H250V112H230V144H210V104H204Z"
          />
          <path
            className={glow('wz-glow-area', 'b')}
            data-part="b"
            d="M104 144H336V156H328Q326 200 284 214H156Q114 200 112 156H104Z"
          />
          <path className={glow('wz-glow', 'c')} data-part="c" d={TRAP} />
          <rect
            className={glow('wz-glow-area', 'd')}
            data-part="d"
            {...PLUG_PLATE}
          />
        </>
      )}
    </>
  )
}

export function PlumbingDrawing({
  view,
  crop,
  ...parts
}: {
  view: DrawingView
  crop?: DrawingCrop
} & DrawingPartProps) {
  return (
    <Drawing
      drawing={getTrade('plumbing').drawing}
      markers={MARKERS}
      view={view}
      crop={crop}
      cropViewBox={CROP_VIEW_BOX}
      {...parts}
    >
      <PlumbingArt />
    </Drawing>
  )
}
