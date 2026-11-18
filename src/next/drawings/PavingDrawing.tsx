// Paving on a kerb (spec S3): pavers on a sand bed over a compacted stone
// base, held at the edge by a kerb set in concrete beside the road. The
// problem view dips the pavers over a weak base; the fixed view falls to the
// kerb. Geometry ported from the prototype drawing.
import { useId } from 'react'

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
  Dim,
  useGlowClass,
  Leader,
  Note,
  StoneFill,
  useDrawingKit,
  useFilterRef,
  Water,
} from './primitives'

const CROP_VIEW_BOX = '0 150 600 210'

const MARKERS: readonly PartMarker[] = [
  { key: 'a', x: 100, y: 110 },
  { key: 'b', x: 240, y: 110 },
  { key: 'c', x: 380, y: 110 },
  { key: 'd', x: 540, y: 110 },
]

function PavingArt() {
  const { tile } = useDrawingKit()
  const glow = useGlowClass()
  const raw = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const clipBase = `wzpv-${raw}-base`
  const clipSoil = `wzpv-${raw}-soil`
  const clipKerb = `wzpv-${raw}-kerb`
  const sand = useFilterRef('sand')
  const concrete = useFilterRef('concrete')

  const soilStones = stones({
    box: [2, 276, 596, 82],
    count: 60,
    seed: 43,
    maxRadius: 3.4,
    palette: 'soil',
  })
  const baseStones = stones({
    box: [21, 233, 438, 38],
    count: 190,
    seed: 47,
    maxRadius: 4,
  })
  const kerbStones = stones({
    box: [461, 187, 34, 102],
    count: 34,
    seed: 53,
    maxRadius: 2.8,
  })
  const levelPavers = pavers({ box: [20, 196, 440, 24], width: 52 })
  const dippedPavers = pavers({
    box: [20, 196, 440, 24],
    width: 52,
    dip: [160, 370, 13],
  })

  return (
    <>
      <defs>
        <clipPath id={clipBase}>
          <rect x={20} y={232} width={440} height={40} />
        </clipPath>
        <clipPath id={clipSoil}>
          <rect x={0} y={272} width={600} height={88} />
        </clipPath>
        <clipPath id={clipKerb}>
          <path d="M460 186H492Q496 186 496 190V290H460Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipSoil})`}>
        <rect
          x={0}
          y={272}
          width={600}
          height={88}
          fill="#a8916d"
          filter={sand}
        />
        <StoneFill stones={soilStones} />
      </g>
      <g clipPath={`url(#${clipBase})`}>
        <rect
          x={20}
          y={232}
          width={440}
          height={40}
          fill="#8f8b84"
          filter={sand}
        />
        <StoneFill stones={baseStones} />
      </g>
      <rect
        x={20}
        y={220}
        width={440}
        height={12}
        fill="#d2c29d"
        filter={sand}
      />
      {!tile && (
        <path
          className="wz-if-problem"
          d="M170 232Q260 252 350 232Z"
          fill="#5f574d"
        />
      )}
      <g className="wz-if-fixed">
        {levelPavers.map((paver) => (
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
      </g>
      {!tile && (
        <g className="wz-if-problem">
          {dippedPavers.map((paver) => (
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
        </g>
      )}
      <path fill="#a7a9a6" filter={concrete} d="M460 236L434 272H460Z" />
      <g clipPath={`url(#${clipKerb})`}>
        <rect
          x={460}
          y={186}
          width={36}
          height={104}
          fill="#a4a7a4"
          filter={concrete}
        />
        <StoneFill stones={kerbStones} />
      </g>
      <rect
        x={496}
        y={236}
        width={104}
        height={14}
        fill="#3c4146"
        filter={sand}
      />
      <rect
        x={496}
        y={250}
        width={104}
        height={22}
        fill="#8f8b84"
        filter={sand}
      />
      <CutEdge d="M460 186H492Q496 186 496 190V290H460Z M496 236H600 M20 232H460 M20 272H460 M20 196V272" />
      <CutFine d="M0 272H20 M496 272H600 M20 220H460" />
      {!tile && (
        <g className="wz-if-problem">
          <path
            d="M190 210Q262 216 334 210Q262 212 190 210Z"
            fill="#1f5e8a"
            fillOpacity={0.55}
          />
          <Water d="M262 154V196" arrow />
          <Note x={270} y={166} lines={['water stands', 'in the dip']} />
        </g>
      )}
      <g className="wz-if-fixed">
        <CutFine d="M130 184L440 186" arrow />
        {!tile && <Note x={262} y={176} lines={['falls to the kerb']} />}
      </g>
      {!tile && (
        <>
          <Leader
            d="M100 132V203 M380 132V252 M540 132L486 192"
            dots={[
              [100, 203],
              [380, 252],
              [486, 192],
            ]}
          />
          {/* The dipped pavers cover the sand bed under the dip, so in the
              problem view the sand bed's leader ends where it still shows. */}
          <g className="wz-if-fixed">
            <Leader d="M240 132V226" dots={[[240, 226]]} />
          </g>
          <g className="wz-if-problem">
            <Leader d="M240 132L140 226" dots={[[140, 226]]} />
          </g>
          <Dim x={548} y={230}>
            road
          </Dim>
          <rect
            className={glow('wz-glow-area', 'a')}
            data-part="a"
            x={20}
            y={196}
            width={440}
            height={24}
          />
          <rect
            className={glow('wz-glow-area', 'b')}
            data-part="b"
            x={20}
            y={220}
            width={440}
            height={12}
          />
          <rect
            className={glow('wz-glow-area', 'c')}
            data-part="c"
            x={20}
            y={232}
            width={440}
            height={40}
          />
          <path
            className={glow('wz-glow-area', 'd')}
            data-part="d"
            d="M460 186H492Q496 186 496 190V290H460Z"
          />
        </>
      )}
    </>
  )
}

export function PavingDrawing({
  view,
  crop,
  ...parts
}: {
  view: DrawingView
  crop?: DrawingCrop
} & DrawingPartProps) {
  return (
    <Drawing
      drawing={getTrade('paving').drawing}
      markers={MARKERS}
      view={view}
      crop={crop}
      cropViewBox={CROP_VIEW_BOX}
      {...parts}
    >
      <PavingArt />
    </Drawing>
  )
}
