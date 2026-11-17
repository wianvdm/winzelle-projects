// Tiled roof at the ridge (spec S3): tiles on battens over the rafters, a
// ridge cap bedded in mortar at the top, and a gutter on the fascia at the
// eave. The problem view shows the cap loose on cracked mortar with one tile
// slipped; the fixed view re-beds and points it. Tile colour is the same in
// both views. Geometry ported from the prototype drawing.
import { getTrade } from '../../content/next/trades'
import {
  Drawing,
  type DrawingCrop,
  type DrawingPartProps,
  type DrawingView,
  type PartMarker,
} from './Drawing'
import { bricks, slope } from './fills'
import {
  CutEdge,
  CutFine,
  useGlowClass,
  Leader,
  Note,
  useDrawingKit,
  useFilterRef,
  useMaterialRef,
  Water,
} from './primitives'

const CROP_VIEW_BOX = '0 24 600 290'

const MARKERS: readonly PartMarker[] = [
  { key: 'a', x: 236, y: 36 },
  { key: 'b', x: 156, y: 80 },
  { key: 'c', x: 490, y: 92 },
  { key: 'd', x: 92, y: 320 },
]

const SLOPE_LENGTH = 300

/** One roof slope in local units, standing on the ridge at (0, 0). */
function RoofSlope({ slip }: { slip?: number }) {
  const timber = useMaterialRef('timber')
  const brickFilter = useFilterRef('brick')
  const data = slope({ length: SLOPE_LENGTH, slip })
  return (
    <>
      <path d={data.rafter} fill={timber} />
      <CutFine d={data.rafter} />
      {data.battens.map((x) => (
        <rect key={x} x={x} y={0} width={7} height={5} fill="#b48d5d" />
      ))}
      {data.tiles.map((tile) => (
        <polygon
          key={tile.points}
          points={tile.points}
          fill={tile.fill}
          filter={brickFilter}
          stroke="#3b2a24"
          strokeWidth={0.6}
          strokeLinejoin="round"
          className={tile.slipped ? 'wz-slip' : undefined}
        />
      ))}
    </>
  )
}

function RoofsArt() {
  const { tile } = useDrawingKit()
  const glow = useGlowClass()
  const sand = useFilterRef('sand')
  const brickFilter = useFilterRef('brick')
  const timber = useMaterialRef('timber')
  const timberV = useMaterialRef('timberV')
  const metal = useMaterialRef('metal')

  const leftBricks = bricks({ box: [84, 250, 34, 112], pitch: 13.7, seed: 5 })
  const rightBricks = bricks({ box: [482, 250, 34, 112], pitch: 13.7, seed: 9 })

  return (
    <>
      <rect x={70} y={236} width={460} height={14} fill={timber} />
      <CutFine d="M70 236H530V250H70Z" />
      <rect
        x={84}
        y={250}
        width={34}
        height={110}
        fill="#c5bfb2"
        filter={sand}
      />
      <g filter={brickFilter}>
        {leftBricks.map((brick) => (
          <rect
            key={`${brick.x},${brick.y}`}
            x={brick.x}
            y={brick.y}
            width={brick.width}
            height={brick.height}
            rx={0.5}
            fill={brick.fill}
          />
        ))}
      </g>
      <rect
        x={482}
        y={250}
        width={34}
        height={110}
        fill="#c5bfb2"
        filter={sand}
      />
      <g filter={brickFilter}>
        {rightBricks.map((brick) => (
          <rect
            key={`${brick.x},${brick.y}`}
            x={brick.x}
            y={brick.y}
            width={brick.width}
            height={brick.height}
            rx={0.5}
            fill={brick.fill}
          />
        ))}
      </g>
      <CutEdge d="M84 250V360 M118 250V360 M482 250V360 M516 250V360" />
      <g transform="translate(300 70) rotate(145.3)">
        <RoofSlope />
      </g>
      <g transform="translate(300 70) rotate(34.7) scale(1 -1)">
        <RoofSlope slip={5} />
      </g>
      {/* Mortar bed under the half-round ridge cap: fills the gap between the
          top courses up to the cap's inside. */}
      <path
        fill="#c6c0b2"
        filter={sand}
        d="M282.1 66.35L293.74 60.96L297.15 65.89H302.85L306.26 60.96L317.9 66.35A18 18 0 0 0 282.1 66.35Z"
      />
      <CutFine d="M282.1 66.35L293.74 60.96L297.15 65.89H302.85L306.26 60.96L317.9 66.35A18 18 0 0 0 282.1 66.35Z" />
      <g className="wz-if-fixed">
        <path
          fill="#7f5245"
          stroke="#2b3238"
          strokeWidth={1}
          strokeLinejoin="round"
          d="M278 68.24A22 22 0 0 1 322 68.24L317.9 66.35A18 18 0 0 0 282.1 66.35Z"
        />
        <path
          fill="#c6c0b2"
          stroke="#2b3238"
          strokeWidth={0.6}
          d="M278.47 63.74L272 71.02L278 68.24Z M321.53 63.74L328 71.02L322 68.24Z"
        />
        {!tile && (
          <Note x={340} y={34} lines={['ridge cap re-bedded and pointed']} />
        )}
      </g>
      {!tile && (
        <g className="wz-if-problem">
          <path
            fill="#7f5245"
            stroke="#2b3238"
            strokeWidth={1}
            strokeLinejoin="round"
            d="M278 68.24A22 22 0 0 1 322 68.24L317.9 66.35A18 18 0 0 0 282.1 66.35Z"
            transform="translate(0 -6) rotate(-6 300 68.2)"
          />
          <path
            fill="none"
            stroke="#1b1f23"
            strokeWidth={1.4}
            d="M287 61l4-4 4 3 5-5 5 4 4-3 4 4"
          />
          <Water
            d="M292 70q-2 5 0 7q2-2 0-7z M306 82q-2 5 0 7q2-2 0-7z"
            fill="#1f5e8a"
          />
          <Note x={340} y={34} lines={['mortar cracked, cap loose']} />
        </g>
      )}
      <rect x={45} y={240} width={8} height={28} fill={timberV} />
      <CutFine d="M45 240H53V268H45Z" />
      <path
        fill={metal}
        stroke="#2b3238"
        strokeWidth={0.9}
        d="M45 246H41A14 14 0 0 1 13 246H9A18 18 0 0 0 45 246Z"
      />
      <Water d="M27 268V292" arrow />
      {!tile && (
        <>
          <Leader
            d="M260 40L292 50 M178 100L190 150 M468 108L430 168 M70 312L30 262"
            dots={[
              [292, 50],
              [190, 150],
              [430, 168],
              [30, 262],
            ]}
          />
          <path
            className={glow('wz-glow-area', 'a')}
            data-part="a"
            d="M272 71.02L278 68.24A22 22 0 0 1 322 68.24L328 71.02Z"
          />
          <path
            className={glow('wz-glow', 'b')}
            data-part="b"
            d="M286 86L60 242"
          />
          <path
            className={glow('wz-glow', 'c')}
            data-part="c"
            d="M314 86L540 242"
          />
          <path
            className={glow('wz-glow-area', 'd')}
            data-part="d"
            d="M45 246H41A14 14 0 0 1 13 246H9A18 18 0 0 0 45 246Z M45 240H53V268H45Z"
          />
        </>
      )}
    </>
  )
}

export function RoofsDrawing({
  view,
  crop,
  ...parts
}: {
  view: DrawingView
  crop?: DrawingCrop
} & DrawingPartProps) {
  return (
    <Drawing
      drawing={getTrade('roofs').drawing}
      markers={MARKERS}
      view={view}
      crop={crop}
      cropViewBox={CROP_VIEW_BOX}
      {...parts}
    >
      <RoofsArt />
    </Drawing>
  )
}
