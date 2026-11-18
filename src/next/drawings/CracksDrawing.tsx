// Brick wall with a stepped crack (spec S3): the face of a brick wall with a
// window under a concrete lintel and over a sill. The problem view runs a
// stepped crack through the joints from the sill's corner, another up from the
// lintel, and cracks the lintel's end; the fixed view repoints the cracks and
// sets stitching bars into the bed joints across them. Geometry ported from
// the prototype drawing.
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

const CROP_VIEW_BOX = '30 20 480 300'

const MARKERS: readonly PartMarker[] = [
  { key: 'a', x: 545, y: 290 },
  { key: 'b', x: 545, y: 190 },
  { key: 'c', x: 545, y: 70 },
]

// Both cracks step through the mortar: bed joints every 13.7, perpends on
// the stretcher bond's half-brick offsets.
const LOWER_CRACK =
  'M282 210V214.4H304.3V228.1H325.4V241.8H346.5V255.5H367.6V269.2H388.7V282.9H409.8V296.6H430.9V310.3H452V320'
const UPPER_CRACK = 'M130 64V58.2H114.1V44.5H93V30.8H72V20'
const STITCHING_BARS = 'M286 228.1H392 M328 255.5H446 M370 282.9H480'
// The brick-face pattern's mortar and joint height.
const MORTAR = '#c5bfb2'
const BED_JOINT_WIDTH = 2.2
const LINTEL = 'M130 64H290V80H130Z'
const SILL = 'M142 200.8H278L282 210H138Z'

function Cracks({ className, colour }: { className?: string; colour: string }) {
  return (
    <>
      <path
        className={className}
        fill="none"
        stroke={colour}
        strokeWidth={2.4}
        strokeLinejoin="round"
        d={LOWER_CRACK}
      />
      <path
        className={className}
        fill="none"
        stroke={colour}
        strokeWidth={1.6}
        strokeLinejoin="round"
        d={UPPER_CRACK}
      />
    </>
  )
}

function CracksArt() {
  const { tile } = useDrawingKit()
  const glow = useGlowClass()
  const brickFace = useMaterialRef('brickFace')
  const brickFilter = useFilterRef('brick')
  const sand = useFilterRef('sand')
  const concrete = useFilterRef('concrete')

  return (
    <>
      <rect
        x={30}
        y={20}
        width={450}
        height={300}
        fill={brickFace}
        filter={brickFilter}
      />
      <rect
        x={30}
        y={320}
        width={570}
        height={40}
        fill="#a8916d"
        filter={sand}
      />
      <CutEdge d="M30 20H480V320H30Z M0 320H600" />
      <rect x={150} y={80} width={120} height={120.8} fill="#dbe9f2" />
      <path
        fill="none"
        stroke="#e8ecef"
        strokeWidth={7}
        d="M153.5 83.5H266.5V197.3H153.5Z M210 83.5V197.3"
      />
      <CutFine d="M150 80H270V200.8H150Z M157 87H263V194H157Z" />
      <rect
        x={130}
        y={64}
        width={160}
        height={16}
        fill="#9ea29f"
        filter={concrete}
      />
      <CutEdge d={LINTEL} />
      <path fill="#b4b6b2" filter={concrete} d={SILL} />
      <CutFine d={SILL} />
      <g className="wz-if-fixed">
        {/* Repointed: the cracks show as fresh mortar, and in the tile crop
            as a bold navy line (drawings.css) so the thumbnail reads. */}
        <Cracks className="wz-crack" colour="#e1dbcf" />
        <path
          fill="none"
          stroke="#b9c4cd"
          strokeWidth={3.4}
          d={STITCHING_BARS}
        />
        <path
          fill="none"
          stroke="#2b3238"
          strokeWidth={0.8}
          strokeDasharray="1.5 2.5"
          d={STITCHING_BARS}
        />
        {!tile && (
          <Note
            x={150}
            y={46}
            lines={['crack stitched and repointed']}
            onFill
          />
        )}
      </g>
      {!tile && (
        <>
          <g className="wz-if-problem">
            {/* The bed joints the stitching bars will go into, drawn so the
                bars' leader ends on mortar before they are there. */}
            <path
              fill="none"
              stroke={MORTAR}
              strokeWidth={BED_JOINT_WIDTH}
              d={STITCHING_BARS}
            />
            <Cracks colour="#1b1f23" />
            <path
              fill="none"
              stroke="#1b1f23"
              strokeWidth={1.4}
              d="M276 66l-5 7 4 7"
            />
            <Note
              x={150}
              y={46}
              lines={['a stepped crack through the joints']}
              onFill
            />
          </g>
          <Leader
            d="M523 70H288 M523 190L360 228.1 M523 290L431 302"
            dots={[
              [288, 70],
              [360, 228.1],
              [431, 302],
            ]}
          />
          <path
            className={glow('wz-glow', 'a')}
            data-part="a"
            d="M282 212H304V228H325V242H346V255H367V269H388V283H409V296H430V310H452"
          />
          <path
            className={glow('wz-glow', 'b')}
            data-part="b"
            d={STITCHING_BARS}
          />
          <path
            className={glow('wz-glow-area', 'c')}
            data-part="c"
            d={LINTEL}
          />
        </>
      )}
    </>
  )
}

export function CracksDrawing({
  view,
  crop,
  ...parts
}: {
  view: DrawingView
  crop?: DrawingCrop
} & DrawingPartProps) {
  return (
    <Drawing
      drawing={getTrade('cracks').drawing}
      markers={MARKERS}
      view={view}
      crop={crop}
      cropViewBox={CROP_VIEW_BOX}
      {...parts}
    >
      <CracksArt />
    </Drawing>
  )
}
