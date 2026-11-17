// Kitchen counter under a boarded ceiling (spec S3): ceiling boards fixed
// under timber brandering with a cornice along the wall, and below them a
// timber worktop on fitted cupboards with a row of drawers, a tiled
// splashback and a plinth. The problem view sags a ceiling board, swells the
// worktop at its joint and drops a cupboard door; the fixed view puts them
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

const CROP_VIEW_BOX = '40 150 520 210'

const MARKERS: readonly PartMarker[] = [
  { key: 'a', x: 90, y: 92 },
  { key: 'b', x: 540, y: 96 },
  { key: 'c', x: 576, y: 154 },
  { key: 'd', x: 576, y: 268 },
]

const DOOR_FILL = '#f5f5f3'
const HANDLE_FILL = '#23282c'
const DRAWER_FRONTS =
  'M422 218H538V248H422Z M422 252H538V282H422Z M422 286H538V316H422Z'

/** `M{x} {y}v{length}` ticks from `start` to `end` every `step`. */
function ticks(options: {
  start: number
  end: number
  step: number
  y: number
  length: number
}): string {
  const { start, end, step, y, length } = options
  const marks: string[] = []
  for (let x = start; x <= end; x += step) marks.push(`M${x} ${y}v${length}`)
  return marks.join(' ')
}

/** Brandering battens, seen end-on under the roof timber, 90 apart. */
function brandering(): string {
  const battens: string[] = []
  for (let x = 40; x < 600; x += 90) battens.push(`M${x} 22h14v12h-14Z`)
  return battens.join(' ')
}

/** Splashback tiles, two rows in half bond. */
const SPLASHBACK_JOINTS = [
  'M60 164H540V200H60Z M60 182H540',
  ticks({ start: 84, end: 516, step: 24, y: 164, length: 18 }),
  ticks({ start: 72, end: 528, step: 24, y: 182, length: 18 }),
].join(' ')

const BOARD_JOINTS = ticks({ start: 80, end: 560, step: 60, y: 34, length: 6 })
const FLOOR_JOINTS = `${ticks({ start: 60, end: 540, step: 80, y: 330, length: 30 })} M0 345H600`

function KitchensArt() {
  const { tile } = useDrawingKit()
  const glow = useGlowClass()
  const sand = useFilterRef('sand')
  const timber = useMaterialRef('timber')
  const timberV = useMaterialRef('timberV')
  const battens = brandering()

  return (
    <>
      <rect x={0} y={8} width={600} height={14} fill={timber} />
      <path fill={timberV} d={battens} />
      <CutFine d={battens} />
      <rect
        x={20}
        y={52}
        width={580}
        height={278}
        fill="#e7e2d8"
        filter={sand}
      />
      <rect x={20} y={34} width={580} height={6} fill="#f4f4f1" />
      <path fill="#eceae4" d="M20 40H600V52H20Z" />
      <path
        fill="#d9d6ce"
        d="M20 47Q30 44 40 52H20Z M20 40H600V43Q40 43 30 52H20Z"
        opacity={0.6}
      />
      <CutFine d={`M20 34H600 M20 40H600 M20 52H600 ${BOARD_JOINTS}`} />
      <CutEdge d="M0 22H600 M20 22V330" />
      <rect x={60} y={164} width={480} height={36} fill="#eef1f2" />
      <CutFine d={SPLASHBACK_JOINTS} />
      <rect x={60} y={216} width={480} height={102} fill="#d6d3cc" />
      <rect x={62} y={218} width={116} height={98} fill={DOOR_FILL} />
      <g className="wz-hang">
        <rect x={182} y={218} width={116} height={98} fill={DOOR_FILL} />
        <CutFine d="M182 218H298V316H182Z" />
        <rect x={190} y={240} width={3.4} height={34} fill={HANDLE_FILL} />
      </g>
      <rect x={302} y={218} width={116} height={98} fill={DOOR_FILL} />
      <path fill={DOOR_FILL} d={DRAWER_FRONTS} />
      <CutFine
        d={`M62 218H178V316H62Z M302 218H418V316H302Z ${DRAWER_FRONTS}`}
      />
      <path
        fill={HANDLE_FILL}
        d="M168 240h3.4v34H168Z M408 240h3.4v34H408Z M465 231h30v3.4h-30Z M465 265h30v3.4h-30Z M465 299h30v3.4h-30Z"
      />
      <rect x={66} y={318} width={470} height={12} fill="#4f585f" />
      <rect
        x={0}
        y={330}
        width={600}
        height={30}
        fill="#9d6a57"
        filter={sand}
      />
      <CutFine d={FLOOR_JOINTS} />
      <rect x={52} y={200} width={496} height={16} fill={timber} />
      <CutEdge d="M52 200H548V216H52Z M60 216V330 M540 216V330 M0 330H600" />
      {!tile && (
        <>
          <g className="wz-if-problem">
            <path
              fill="#e4dfd2"
              stroke="#525b63"
              strokeWidth={0.75}
              d="M230 34Q320 66 410 34V40Q320 72 230 40Z"
            />
            <ellipse
              cx={320}
              cy={50}
              rx={44}
              ry={7}
              fill="#9b8462"
              fillOpacity={0.45}
            />
            <path
              fill="#7d5a3f"
              fillOpacity={0.55}
              d="M286 200Q306 189 326 200V216H286Z"
            />
            <path
              fill="none"
              stroke="#1b1f23"
              strokeWidth={1.2}
              d="M286 200Q306 189 326 200"
            />
            <Note
              x={150}
              y={98}
              lines={[
                'a ceiling board sags, the worktop swells',
                'at its joint, and a door has dropped',
              ]}
              onFill
            />
          </g>
          <g className="wz-if-fixed">
            <Note
              x={150}
              y={98}
              lines={['boards replaced, worktop sealed, door rehung']}
              onFill
            />
          </g>
          <Leader
            d="M90 70V38 M540 74V47 M576 136L546 206 M576 246L540 262"
            dots={[
              [90, 38],
              [540, 47],
              [546, 206],
              [540, 262],
            ]}
          />
          <rect
            className={glow('wz-glow-area', 'a')}
            data-part="a"
            x={20}
            y={34}
            width={580}
            height={6}
          />
          <rect
            className={glow('wz-glow-area', 'b')}
            data-part="b"
            x={20}
            y={40}
            width={580}
            height={12}
          />
          <rect
            className={glow('wz-glow-area', 'c')}
            data-part="c"
            x={52}
            y={200}
            width={496}
            height={16}
          />
          <rect
            className={glow('wz-glow-area', 'd')}
            data-part="d"
            x={60}
            y={216}
            width={480}
            height={102}
          />
        </>
      )}
    </>
  )
}

export function KitchensDrawing({
  view,
  crop,
  ...parts
}: {
  view: DrawingView
  crop?: DrawingCrop
} & DrawingPartProps) {
  return (
    <Drawing
      drawing={getTrade('kitchens').drawing}
      markers={MARKERS}
      view={view}
      crop={crop}
      cropViewBox={CROP_VIEW_BOX}
      {...parts}
    >
      <KitchensArt />
    </Drawing>
  )
}
