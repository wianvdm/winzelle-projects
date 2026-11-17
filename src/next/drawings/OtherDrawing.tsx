// Door and window (spec S3): a door hung in a timber frame and a window
// frame sealed into a plastered wall over a sloped sill with a drip. The
// problem view rots the foot of the door frame and lets wind and rain in round
// the window frame and under a cracked sill; the fixed view seals the frames
// and rehangs the door. Geometry ported from the prototype drawing.
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

const CROP_VIEW_BOX = '90 70 460 270'

const MARKERS: readonly PartMarker[] = [
  { key: 'a', x: 170, y: 44 },
  { key: 'b', x: 560, y: 176 },
  { key: 'c', x: 560, y: 296 },
]

const WINDOW_FRAME = 'M330 110H510V240H330Z'
const SILL = 'M318 240H522L528 254H312Z'

function OtherArt() {
  const { tile } = useDrawingKit()
  const glow = useGlowClass()
  const sand = useFilterRef('sand')
  const concrete = useFilterRef('concrete')
  const timber = useMaterialRef('timber')
  const timberV = useMaterialRef('timberV')
  const metal = useMaterialRef('metal')

  return (
    <>
      <rect
        x={20}
        y={20}
        width={580}
        height={310}
        fill="#e7e2d8"
        filter={sand}
      />
      <rect
        x={0}
        y={330}
        width={600}
        height={30}
        fill="#a4a7a4"
        filter={concrete}
      />
      <CutEdge d="M0 330H600 M20 20V330" />
      <rect x={110} y={90} width={120} height={240} fill={timberV} />
      <rect x={120} y={100} width={100} height={230} fill={timber} />
      <CutFine d="M110 90H230V330H110Z M120 100H220V330H120Z M134 116H206V206H134Z M134 222H206V312H134Z" />
      <circle
        cx={208}
        cy={214}
        r={4}
        fill={metal}
        stroke="#2b3238"
        strokeWidth={0.8}
      />
      <path fill="#6f777e" d="M121 128h4v16h-4Z M121 284h4v16h-4Z" />
      <rect x={330} y={110} width={180} height={130} fill="#f2f4f5" />
      <rect x={342} y={122} width={72} height={106} fill="#dbe9f2" />
      <rect x={426} y={122} width={72} height={106} fill="#dbe9f2" />
      <CutFine
        d={`${WINDOW_FRAME} M342 122H414V228H342Z M426 122H498V228H426Z`}
      />
      <path fill="#b4b6b2" filter={concrete} d={SILL} />
      <CutEdge d={SILL} />
      <CutFine d="M318 254v3 M522 254v3" />
      {!tile && (
        <>
          <g className="wz-if-problem">
            <path
              fill="#5f4a36"
              fillOpacity={0.75}
              d="M110 330V300l8 4 4-10 8 8v28Z M200 330l6-18 8 6 6-12 10 8v16Z"
            />
            <Water d="M548 100L514 116 M300 190L326 196" arrow />
            <Water d="M300 92L326 108" arrow />
            <path
              fill="none"
              stroke="#1b1f23"
              strokeWidth={1.4}
              d="M420 240l-4 7 6 7"
            />
            <Note
              x={250}
              y={56}
              lines={['rain and wind get in round the frame']}
              onFill
            />
          </g>
          <g className="wz-if-fixed">
            <Note
              x={250}
              y={56}
              lines={['frames sealed, door rehung']}
              onFill
            />
          </g>
          <Leader
            d="M170 66V92 M536 176H510 M546 278L526 252"
            dots={[
              [170, 92],
              [510, 176],
              [526, 252],
            ]}
          />
          <rect
            className={glow('wz-glow-area', 'a')}
            data-part="a"
            x={110}
            y={90}
            width={120}
            height={240}
          />
          <path
            className={glow('wz-glow', 'b')}
            data-part="b"
            d={WINDOW_FRAME}
          />
          <path className={glow('wz-glow-area', 'c')} data-part="c" d={SILL} />
        </>
      )}
    </>
  )
}

export function OtherDrawing({
  view,
  crop,
  ...parts
}: {
  view: DrawingView
  crop?: DrawingCrop
} & DrawingPartProps) {
  return (
    <Drawing
      drawing={getTrade('other').drawing}
      markers={MARKERS}
      view={view}
      crop={crop}
      cropViewBox={CROP_VIEW_BOX}
      {...parts}
    >
      <OtherArt />
    </Drawing>
  )
}
