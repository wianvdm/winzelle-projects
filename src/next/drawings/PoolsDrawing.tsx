// Pool edge (spec S3): a concrete shell, walls and floor in one, with a
// smooth lining inside, a coping over the edge and paving on a sand bed
// around the pool. The problem view drops the water below its old line, with
// the lining cracked and water leaving through the shell; the fixed view holds
// the level. Geometry ported from the prototype drawing.
import { getTrade } from '../../content/next/trades'
import {
  Drawing,
  type DrawingCrop,
  type DrawingPartProps,
  type DrawingView,
  type PartMarker,
} from './Drawing'
import { pavers, stones } from './fills'
import {
  CutEdge,
  CutFine,
  Leader,
  Note,
  StoneFill,
  useDrawingKit,
  useFilterRef,
  useGlowClass,
  useLocalId,
  Water,
} from './primitives'

const CROP_VIEW_BOX = '100 92 500 268'

const MARKERS: readonly PartMarker[] = [
  { key: 'a', x: 300, y: 50 },
  { key: 'b', x: 70, y: 196 },
  { key: 'c', x: 330, y: 246 },
  { key: 'd', x: 500, y: 80 },
]

const COPING = 'M118 96H206Q214 96 214 104Q214 112 206 112H118Z'
const SHELL = 'M150 112H186V312H600V346H150Z'
const WATER_LEFT = 191
const WATER_RIGHT = 600
const POOL_FLOOR = 312
const FULL_LEVEL = 140
const DROPPED_LEVEL = 182
const RIPPLE_LENGTH = 40

/** A gently rippled water line across the pool at height `y`. */
function waterLine(y: number): string {
  const ripples = (WATER_RIGHT - WATER_LEFT) / RIPPLE_LENGTH
  return `M${WATER_LEFT} ${y}c14-3 26 3 40 0${' s26 3 40 0'.repeat(Math.floor(ripples) - 1)}`
}

function PoolWater({ level }: { level: number }) {
  return (
    <>
      <rect
        x={WATER_LEFT}
        y={level}
        width={WATER_RIGHT - WATER_LEFT}
        height={POOL_FLOOR - level}
        fill="#cfe2ec"
        fillOpacity={0.78}
      />
      <Water d={waterLine(level)} />
    </>
  )
}

function PoolsArt() {
  const { tile } = useDrawingKit()
  const glow = useGlowClass()
  const clipId = useLocalId('pl')
  const sand = useFilterRef('sand')
  const concrete = useFilterRef('concrete')

  const soilStones = stones({
    box: [2, 116, 146, 242],
    count: 60,
    seed: 13,
    maxRadius: 3.4,
    palette: 'soil',
  })
  const shellStones = stones({
    box: [151, 113, 448, 232],
    count: 210,
    seed: 11,
    maxRadius: 4,
  })
  const pavingRow = pavers({ box: [0, 100, 118, 12], width: 28 })

  return (
    <>
      <defs>
        <clipPath id={clipId('soil')}>
          <path d="M0 112H150V346H600V360H0Z" />
        </clipPath>
        <clipPath id={clipId('shell')}>
          <path d={SHELL} />
        </clipPath>
        <clipPath id={clipId('coping')}>
          <path d={COPING} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId('soil')})`}>
        <rect
          x={0}
          y={112}
          width={600}
          height={248}
          fill="#a8916d"
          filter={sand}
        />
        <StoneFill stones={soilStones} />
      </g>
      {pavingRow.map((paver) => (
        <rect
          key={paver.x}
          x={paver.x}
          y={paver.y}
          width={paver.width}
          height={paver.height}
          fill={paver.fill}
          filter={concrete}
          transform={paver.rotate}
        />
      ))}
      <rect x={0} y={112} width={150} height={6} fill="#d2c29d" filter={sand} />
      <g clipPath={`url(#${clipId('shell')})`}>
        <rect
          x={150}
          y={112}
          width={450}
          height={234}
          fill="#969997"
          filter={concrete}
        />
        <StoneFill stones={shellStones} />
      </g>
      <g clipPath={`url(#${clipId('coping')})`}>
        <rect
          x={118}
          y={96}
          width={96}
          height={16}
          fill="#b4b6b2"
          filter={concrete}
        />
      </g>
      <path fill="#eef3f4" d="M186 112H191V312H600V316H186Z" />
      <CutEdge d={`M150 112V346H600 M186 112V312H600 ${COPING} M0 100H118`} />
      <CutFine d="M191 112V312" />
      <g className="wz-if-fixed">
        <PoolWater level={FULL_LEVEL} />
      </g>
      {!tile && (
        <>
          <g className="wz-if-problem">
            <PoolWater level={DROPPED_LEVEL} />
            <CutFine
              d={`M${WATER_LEFT} ${FULL_LEVEL}H${WATER_RIGHT}`}
              dash="5 4"
            />
            <Note x={380} y={166} lines={['the level keeps dropping']} />
            <path
              fill="none"
              stroke="#1b1f23"
              strokeWidth={1.8}
              strokeLinejoin="round"
              d="M191 222l-9 6 6 9-12 7 7 8-14 6 8 7-11 5"
            />
            <Water d="M150 252C130 256 118 266 96 268" arrow />
            <Water d="M150 266C132 276 120 290 104 296" arrow />
          </g>
          <g className="wz-if-fixed">
            <Note x={380} y={232} lines={['the level holds steady']} />
          </g>
          <Leader
            d="M278 54L212 100 M92 204L152 226 M308 246L189 278 M500 102V140"
            dots={[
              [212, 100],
              [152, 226],
              [189, 278],
              [500, 140],
            ]}
          />
          <path
            className={glow('wz-glow-area', 'a')}
            data-part="a"
            d={COPING}
          />
          <path className={glow('wz-glow-area', 'b')} data-part="b" d={SHELL} />
          <path
            className={glow('wz-glow', 'c')}
            data-part="c"
            d="M188 114V314H598"
          />
          <path
            className={glow('wz-glow', 'd')}
            data-part="d"
            d="M194 140H598"
          />
        </>
      )}
    </>
  )
}

export function PoolsDrawing({
  view,
  crop,
  ...parts
}: {
  view: DrawingView
  crop?: DrawingCrop
} & DrawingPartProps) {
  return (
    <Drawing
      drawing={getTrade('pools').drawing}
      markers={MARKERS}
      view={view}
      crop={crop}
      cropViewBox={CROP_VIEW_BOX}
      {...parts}
    >
      <PoolsArt />
    </Drawing>
  )
}
