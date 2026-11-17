// Parapet at a flat roof edge (spec S3): a concrete slab with screed laid to
// fall to an outlet, two layers of torch-on turned up the parapet over an
// angle fillet and tucked under a flashing in a chase, and a coping with drips
// on the wall. The problem view lets rain past the flashing into the wall and
// ponds it where the roof dips, staining the ceiling; the fixed view runs it
// to the outlet. Geometry ported from the prototype drawing, which draws the
// section at 0.72 scale inside the frame.
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
  useMaterialRef,
  Water,
} from './primitives'

const CROP_VIEW_BOX = '130 56 300 290'
const SECTION_TRANSFORM = 'translate(130 -8) scale(0.72)'

const MARKERS: readonly PartMarker[] = [
  { key: 'a', x: 540, y: 64 },
  { key: 'b', x: 540, y: 160 },
  { key: 'c', x: 250, y: 120 },
  { key: 'd', x: 76, y: 300 },
]

const COPING = 'M318 98L400 90V112H396Q394 106 392 112H326Q324 106 322 112H318Z'
const SCREED = 'M88 324L330 316V330H88Z M14 319L54 324V330H14Z'
const FILLET = 'M306 317L330 292V316Z'

/** Torch-on in section: primer line, base layer and granular cap sheet. */
function TorchOn() {
  const granule = useFilterRef('granule')
  return (
    <>
      <path
        fill="none"
        stroke="#221c1a"
        strokeWidth={2}
        d="M88 323.5L303 316.6 M14 318.2L54 323.2"
      />
      <path
        fill="none"
        stroke="#181a1d"
        strokeWidth={2.6}
        d="M82 321.2L302 314 M14 316L56 321.2"
      />
      <path
        fill="none"
        stroke="#616e78"
        strokeWidth={3.2}
        filter={granule}
        d="M82 318L300 310.8 M14 312.8L56 318"
      />
    </>
  )
}

/** The torch-on turned up the parapet over the fillet to the flashing. */
function TorchOnUpstand() {
  const granule = useFilterRef('granule')
  return (
    <>
      <path
        fill="none"
        stroke="#221c1a"
        strokeWidth={2}
        d="M303 316.6L305.5 316.5L329.2 291.5V264"
      />
      <path
        fill="none"
        stroke="#181a1d"
        strokeWidth={2.6}
        strokeLinejoin="round"
        d="M301 314L304 313.9L327 290.7V263"
      />
      <path
        fill="none"
        stroke="#616e78"
        strokeWidth={3.2}
        strokeLinejoin="round"
        filter={granule}
        d="M299 310.8L301.5 310.7L324 289.5V261"
      />
    </>
  )
}

function DampSection() {
  const { tile } = useDrawingKit()
  const glow = useGlowClass()
  const clipId = useLocalId('dp')
  const sand = useFilterRef('sand')
  const concrete = useFilterRef('concrete')
  const shadow = useMaterialRef('shadow')
  const pipe = useMaterialRef('pipe')
  const metal = useMaterialRef('metal')

  const wallBricks = bricks({ box: [330, 112, 58, 382], pitch: 13.7, seed: 19 })
  const slabStones = stones({
    box: [16, 332, 312, 38],
    count: 125,
    seed: 11,
    maxRadius: 5.4,
  })
  const copingStones = stones({
    box: [320, 92, 78, 18],
    count: 28,
    seed: 29,
    maxRadius: 3.6,
  })

  return (
    <g transform={SECTION_TRANSFORM}>
      <defs>
        <clipPath id={clipId('wall')}>
          <rect x={330} y={112} width={58} height={380} />
        </clipPath>
        <clipPath id={clipId('coping')}>
          <path d={COPING} />
        </clipPath>
        <clipPath id={clipId('slab')}>
          <rect x={14} y={330} width={316} height={42} />
        </clipPath>
      </defs>
      <rect x={14} y={375} width={313} height={6} fill={shadow} />
      <g clipPath={`url(#${clipId('wall')})`}>
        <rect
          x={330}
          y={112}
          width={58}
          height={380}
          fill="#c5bfb2"
          filter={sand}
        />
        <BrickFill bricks={wallBricks} />
        <rect x={330} y={112} width={58} height={8} fill={shadow} />
      </g>
      <rect
        x={388}
        y={112}
        width={4}
        height={380}
        fill="#ded9ce"
        filter={sand}
      />
      <rect x={326.5} y={375} width={3.5} height={117} fill="#e5e1d7" />
      <CutEdge d="M330 112V492 M388 112V492" />
      <CutFine d="M392 112V492 M326.5 375V492" />
      <g clipPath={`url(#${clipId('slab')})`}>
        <rect
          x={14}
          y={330}
          width={316}
          height={42}
          fill="#969997"
          filter={concrete}
        />
        <StoneFill stones={slabStones} />
      </g>
      <rect x={14} y={372} width={313} height={3.5} fill="#e7e4dc" />
      <CutEdge d="M14 330H330 M14 372H330" />
      <CutFine d="M14 375.5H326.5 M14 318V344l-6 6 12 6-6 6V380" />
      <path fill="#c6c0b2" filter={sand} d={SCREED} />
      <CutFine d={SCREED} />
      <rect x={60} y={323} width={20} height={113} fill={pipe} />
      <rect
        x={64}
        y={325}
        width={12}
        height={111}
        fill="#dbe9f2"
        opacity={0.88}
      />
      <CutEdge d="M60 323V436 M80 323V436" />
      <path
        fill={metal}
        stroke="#2b3238"
        strokeWidth={0.9}
        d="M50 320.5H60V324H50Z M80 320.5H90V324H80Z"
      />
      <path
        fill="none"
        stroke="#4f5a63"
        strokeWidth={1.2}
        d="M61 322Q70 309 79 322 M66 314V322 M70 312V322 M74 314V322"
      />
      <TorchOn />
      <path fill="#bcb5a6" filter={sand} d={FILLET} />
      <CutFine d={FILLET} />
      <TorchOnUpstand />
      <rect
        x={330}
        y={243}
        width={8}
        height={6}
        fill="#525659"
        stroke="#2b3238"
        strokeWidth={0.7}
      />
      <polygon
        fill={metal}
        stroke="#2b3238"
        strokeWidth={0.9}
        points="337,244.5 319.5,244.5 319.5,280.5 315,285 317,287 322,281.5 322,247 337,247"
      />
      <g clipPath={`url(#${clipId('coping')})`}>
        <rect
          x={318}
          y={90}
          width={82}
          height={22}
          fill="#9ea29f"
          filter={concrete}
        />
        <StoneFill stones={copingStones} />
      </g>
      <CutEdge d={COPING} />
      <Water d="M118 40L106 74 M160 34L148 68 M202 42L190 76 M244 36L232 70" />
      <g className="wz-if-fixed">
        <Water d="M262 292L150 298" arrow />
        <Water d="M70 334V408" arrow />
      </g>
      {!tile && (
        <>
          <g className="wz-if-problem">
            <path
              d="M196 312Q250 300 300 308L300 311Q250 314 196 314Z"
              fill="#1f5e8a"
              fillOpacity={0.6}
            />
            <path
              fill="none"
              stroke="#1b1f23"
              strokeWidth={2}
              d="M318 262l6 4-4 5 6 3"
            />
            <Water d="M336 252C344 280 340 320 348 352" arrow />
            <path
              d="M180 376q30 16 70 6q24 10 44 -2Z"
              fill="#7d6a4f"
              fillOpacity={0.45}
            />
            <Water d="M232 386q-2 5 0 7q2-2 0-7z" fill="#1f5e8a" />
          </g>
          <path
            className={glow('wz-glow-area', 'a')}
            data-part="a"
            d="M318 98L400 90V112H318Z"
          />
          <path
            className={glow('wz-glow', 'b')}
            data-part="b"
            d="M337 246H320.5V281L316 286"
          />
          <path
            className={glow('wz-glow', 'c')}
            data-part="c"
            d="M84 318L300 311L326 290V262"
          />
          <path
            className={glow('wz-glow', 'd')}
            data-part="d"
            d="M60 320V436 M80 320V436"
          />
        </>
      )}
    </g>
  )
}

function DampArt() {
  const { tile } = useDrawingKit()
  return (
    <>
      <DampSection />
      {!tile && (
        <>
          <g className="wz-if-problem">
            <Note
              x={24}
              y={40}
              lines={[
                'rain gets past the flashing,',
                'and stands where the roof dips',
              ]}
            />
          </g>
          <g className="wz-if-fixed">
            <Note x={24} y={40} lines={['the roof falls to its outlet']} />
          </g>
          <Dim x={196} y={288}>
            ceiling
          </Dim>
          {/* Leaders in frame units; each dot lands on its part as drawn at
              0.72 scale (coping edge, flashing, cap sheet, outlet pipe). */}
          <Leader
            d="M518 64L416 64 M518 160L361 176 M252 142L258 218 M98 300L176 278"
            dots={[
              [416, 64],
              [361, 176],
              [258, 218],
              [176, 278],
            ]}
          />
        </>
      )}
    </>
  )
}

export function DampDrawing({
  view,
  crop,
  ...parts
}: {
  view: DrawingView
  crop?: DrawingCrop
} & DrawingPartProps) {
  return (
    <Drawing
      drawing={getTrade('damp').drawing}
      markers={MARKERS}
      view={view}
      crop={crop}
      cropViewBox={CROP_VIEW_BOX}
      {...parts}
    >
      <DampArt />
    </Drawing>
  )
}
