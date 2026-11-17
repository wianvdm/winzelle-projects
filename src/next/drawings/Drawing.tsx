// The shared drawing shell (spec S3 "Surveyor drawing"): one 600x360 figure
// with a caption strip ("{name}, {view}, not to scale"), problem/fixed state
// switching via data-state, lettered markers, and a tile crop that renders the
// fixed state as an aria-hidden thumbnail. One component serves both sizes;
// the trade components supply only the artwork.
import { useId, useMemo, type ReactNode } from 'react'

import type { TradeDrawing } from '../../content/next/trades'
import {
  DrawingKitProvider,
  Marker,
  MaterialDefs,
  type DrawingIds,
} from './primitives'
import './drawings.css'

export type DrawingView = 'problem' | 'fixed'
export type DrawingCrop = 'full' | 'tile'

export interface PartMarker {
  key: string
  x: number
  y: number
}

export interface DrawingProps {
  drawing: TradeDrawing
  /** Marker positions in viewBox units, one per lettered part. */
  markers: readonly PartMarker[]
  view: DrawingView
  /** Letter of the part to light up, if any. */
  highlight?: string | null
  crop?: DrawingCrop
  /** viewBox for the tile crop, for example "0 150 600 210". */
  cropViewBox?: string
  children: ReactNode
}

const ID_NAMES: readonly (keyof DrawingIds)[] = [
  'concrete',
  'sand',
  'brick',
  'granule',
  'metal',
  'pipe',
  'downpipe',
  'timber',
  'timberV',
  'shadow',
  'rust',
  'brickFace',
  'tileWall',
  'tileFace',
  'arrow',
  'waterArrow',
]

function useDrawingIds(): { ids: DrawingIds; titleId: string } {
  const raw = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  return useMemo(
    () => ({
      ids: Object.fromEntries(
        ID_NAMES.map((name) => [name, `wzd-${raw}-${name}`]),
      ) as unknown as DrawingIds,
      titleId: `wzd-${raw}-title`,
    }),
    [raw],
  )
}

export function Drawing({
  drawing,
  markers,
  view,
  highlight = null,
  crop = 'full',
  cropViewBox,
  children,
}: DrawingProps) {
  const { ids, titleId } = useDrawingIds()

  if (crop === 'tile') {
    if (!cropViewBox)
      throw new Error('Drawing crop="tile" requires cropViewBox.')
    return (
      <svg
        className="wz-drawing-tile"
        viewBox={cropViewBox}
        data-state="fixed"
        aria-hidden="true"
        focusable="false"
      >
        <MaterialDefs ids={ids} />
        <DrawingKitProvider value={{ ids, tile: true, highlight: null }}>
          {children}
        </DrawingKitProvider>
      </svg>
    )
  }

  return (
    <figure className="wz-drawing">
      <div className="wz-canvas">
        <svg
          viewBox="0 0 600 360"
          role="img"
          aria-labelledby={titleId}
          data-state={view}
        >
          <title id={titleId}>{drawing.title}</title>
          <MaterialDefs ids={ids} />
          <DrawingKitProvider value={{ ids, tile: false, highlight }}>
            {children}
            {markers.map((marker) => (
              <Marker
                key={marker.key}
                x={marker.x}
                y={marker.y}
                letter={marker.key}
                held={highlight === marker.key}
              />
            ))}
          </DrawingKitProvider>
        </svg>
      </div>
      <figcaption className="wz-drawing-strip">
        <span>{drawing.name}</span>
        <span className="wz-drawing-view">{drawing.view}, not to scale</span>
        {/* Below 1220px the in-drawing notes hide and this strip carries them. */}
        <span className="wz-drawing-note">
          {view === 'problem' ? drawing.problemNote : drawing.fixedNote}
        </span>
      </figcaption>
    </figure>
  )
}
