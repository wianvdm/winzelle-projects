// Boundary wall, footing to coping (spec S3): 230 brickwork on a concrete
// footing wider than the wall, a damp-proof course just above the ground and
// a coping on top. The problem view leans the wall on a cracked footing; the
// fixed view stands it plumb. Geometry ported from the prototype drawing.
import { getTrade } from '../../content/next/trades'
import {
  Drawing,
  type DrawingCrop,
  type DrawingPartProps,
  type DrawingView,
  type PartMarker,
} from './Drawing'
import { bricks, stones } from './fills'
import {
  BrickFill,
  CutEdge,
  CutFine,
  Dim,
  Leader,
  Note,
  StoneFill,
  useDrawingKit,
  useFilterRef,
  useGlowClass,
  useLocalId,
} from './primitives'

const CROP_VIEW_BOX = '150 28 300 320'

const MARKERS: readonly PartMarker[] = [
  { key: 'a', x: 160, y: 60 },
  { key: 'b', x: 160, y: 170 },
  { key: 'c', x: 450, y: 236 },
  { key: 'd', x: 450, y: 330 },
]

const COPING = 'M252 62H348V52L300 40L252 52Z'
const GROUND_LEVEL = 270
const HATCH_SPACING = 24
/** Ground hatch runs either side of the wall, clear of the footing. */
const HATCH_RUNS = [
  [20, 188],
  [360, 576],
] as const

/** Short diagonal ticks along the ground line either side of the wall. */
function groundHatch(): string {
  const ticks: string[] = []
  for (const [from, to] of HATCH_RUNS) {
    for (let x = from; x <= to; x += HATCH_SPACING) {
      ticks.push(`M${x} ${GROUND_LEVEL}l-8 8`)
    }
  }
  return ticks.join(' ')
}

function WallsArt() {
  const { tile } = useDrawingKit()
  const glow = useGlowClass()
  const clipId = useLocalId('wl')
  const sand = useFilterRef('sand')
  const concrete = useFilterRef('concrete')

  const soilStones = stones({
    box: [2, 274, 596, 84],
    count: 64,
    seed: 3,
    maxRadius: 3.4,
    palette: 'soil',
  })
  const footingStones = stones({
    box: [211, 301, 178, 42],
    count: 70,
    seed: 7,
    maxRadius: 3.8,
  })
  const copingStones = stones({
    box: [253, 42, 94, 19],
    count: 26,
    seed: 29,
    maxRadius: 3.2,
  })
  const wallBricks = bricks({ box: [265, 60, 70, 242], pitch: 13.7, seed: 19 })

  return (
    <>
      <defs>
        <clipPath id={clipId('soil')}>
          <rect x={0} y={270} width={600} height={90} />
        </clipPath>
        <clipPath id={clipId('footing')}>
          <rect x={210} y={300} width={180} height={44} />
        </clipPath>
        <clipPath id={clipId('wall')}>
          <rect x={265} y={60} width={70} height={240} />
        </clipPath>
        <clipPath id={clipId('coping')}>
          <path d={COPING} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId('soil')})`}>
        <rect
          x={0}
          y={270}
          width={600}
          height={90}
          fill="#a8916d"
          filter={sand}
        />
        <StoneFill stones={soilStones} />
      </g>
      <g clipPath={`url(#${clipId('footing')})`}>
        <rect
          x={210}
          y={300}
          width={180}
          height={44}
          fill="#969997"
          filter={concrete}
        />
        <StoneFill stones={footingStones} />
      </g>
      <CutEdge d="M210 300H390V344H210Z M0 270H265 M335 270H600" />
      <CutFine d={groundHatch()} />
      {!tile && (
        <path
          className="wz-if-problem"
          fill="none"
          stroke="#1b1f23"
          strokeWidth={1.6}
          d="M300 300l-6 12 8 9-5 12 4 11"
        />
      )}
      <g className="wz-lean">
        <g clipPath={`url(#${clipId('wall')})`}>
          <rect
            x={265}
            y={60}
            width={70}
            height={240}
            fill="#c5bfb2"
            filter={sand}
          />
          <BrickFill bricks={wallBricks} />
        </g>
        <rect x={262} y={254} width={76} height={3.6} fill="#181a1d" />
        <g clipPath={`url(#${clipId('coping')})`}>
          <rect
            x={252}
            y={40}
            width={96}
            height={22}
            fill="#9ea29f"
            filter={concrete}
          />
          <StoneFill stones={copingStones} />
        </g>
        <CutEdge d={`M265 62V300 M335 62V300 ${COPING}`} />
        <CutFine d="M256 62q-1 4 0 6 M344 62q1 4 0 6" />
        {!tile && (
          <>
            <path
              className="wz-if-problem"
              fill="none"
              stroke="#1b1f23"
              strokeWidth={1.8}
              strokeLinejoin="round"
              d="M265 196l12 4 8-6 14 5 10-4 12 6 14-3"
            />
            <path
              className={glow('wz-glow-area', 'a')}
              data-part="a"
              d={COPING}
            />
            <rect
              className={glow('wz-glow-area', 'b')}
              data-part="b"
              x={265}
              y={64}
              width={70}
              height={188}
            />
            <rect
              className={glow('wz-glow-area', 'c')}
              data-part="c"
              x={262}
              y={252}
              width={76}
              height={8}
            />
          </>
        )}
      </g>
      <CutFine d="M360 34V296" dash="4 4" />
      <path fill="#38556c" d="M356 296h8l-4 8z" />
      <CutFine d="M265 34H335 M265 30V38 M335 30V38" />
      {!tile && (
        <>
          <rect
            className={glow('wz-glow-area', 'd')}
            data-part="d"
            x={210}
            y={300}
            width={180}
            height={44}
          />
          <Dim x={368} y={44}>
            plumb line
          </Dim>
          <g className="wz-if-problem">
            <Note
              x={376}
              y={120}
              lines={['the wall leans and', 'the footing has cracked']}
            />
          </g>
          <g className="wz-if-fixed">
            <Note x={376} y={120} lines={['rebuilt plumb on a new footing']} />
          </g>
          <Dim x={300} y={30} anchor="middle">
            230
          </Dim>
          <Dim x={30} y={262}>
            ground
          </Dim>
          {/* Each leg ends on its part in both views: c's dot sits where the
              damp-proof course lies plumb and leaning. */}
          <Leader
            d="M182 60L252 54 M182 170H266 M428 240L334 255 M428 330L390 324"
            dots={[
              [252, 54],
              [266, 170],
              [334, 255],
              [390, 324],
            ]}
          />
        </>
      )}
    </>
  )
}

export function WallsDrawing({
  view,
  crop,
  ...parts
}: {
  view: DrawingView
  crop?: DrawingCrop
} & DrawingPartProps) {
  return (
    <Drawing
      drawing={getTrade('walls').drawing}
      markers={MARKERS}
      view={view}
      crop={crop}
      cropViewBox={CROP_VIEW_BOX}
      {...parts}
    >
      <WallsArt />
    </Drawing>
  )
}
