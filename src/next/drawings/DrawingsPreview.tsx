// Dev-only preview of the drawing kit (#94, #95), mounted at /drawings
// only when import.meta.env.DEV is true (see src/router.tsx), so it is absent
// from every build. It renders each trade's drawing in both views, with a held
// part, with live markers and a view toggle, and as a tile crop, plus a note
// on a textured fill, for screenshot comparison against the prototype.
import { useState } from 'react'

import { trades, whatNeedsDoing, type TradeId } from '../../content/next/trades'
import '../next.css'
import { CracksDrawing } from './CracksDrawing'
import { DampDrawing } from './DampDrawing'
import type { DrawingView } from './Drawing'
import { stones } from './fills'
import { KitchensDrawing } from './KitchensDrawing'
import { OtherDrawing } from './OtherDrawing'
import { PaintingDrawing } from './PaintingDrawing'
import { PavingDrawing } from './PavingDrawing'
import { PlumbingDrawing } from './PlumbingDrawing'
import { PoolsDrawing } from './PoolsDrawing'
import { Note } from './primitives'
import { RoofsDrawing } from './RoofsDrawing'
import { WallsDrawing } from './WallsDrawing'

type DrawingComponent = typeof PavingDrawing

const DRAWINGS: Record<TradeId, DrawingComponent> = {
  paving: PavingDrawing,
  walls: WallsDrawing,
  roofs: RoofsDrawing,
  damp: DampDrawing,
  cracks: CracksDrawing,
  painting: PaintingDrawing,
  kitchens: KitchensDrawing,
  plumbing: PlumbingDrawing,
  pools: PoolsDrawing,
  other: OtherDrawing,
}

/**
 * Markers wired like the explorer will wire them: hover lights, click holds,
 * and the state toggle switches the view.
 */
function LiveCase({
  DrawingComponent,
}: {
  DrawingComponent: DrawingComponent
}) {
  const [held, setHeld] = useState<string | null>(null)
  const [hot, setHot] = useState<string | null>(null)
  const [view, setView] = useState<DrawingView>('problem')
  const fixed = view === 'fixed'
  return (
    <>
      <button
        type="button"
        className="wz-preview-toggle"
        aria-pressed={fixed}
        onClick={() => setView(fixed ? 'problem' : 'fixed')}
      >
        {fixed
          ? whatNeedsDoing.showProblemLabel
          : whatNeedsDoing.showFixedLabel}
      </button>
      <DrawingComponent
        view={view}
        highlight={held}
        hot={hot}
        onPartHover={setHot}
        onPartPress={(letter) =>
          setHeld((current) => (current === letter ? null : letter))
        }
      />
    </>
  )
}

/** A two-line note on a stone fill, to check its paper labels in a browser. */
function NoteOnFillCase() {
  const bed = stones({
    box: [0, 0, 600, 120],
    count: 320,
    seed: 47,
    maxRadius: 5,
  })
  return (
    <div className="wz-canvas wz-preview-fill">
      <svg viewBox="0 0 600 120" role="img" aria-label="Note on a stone fill">
        <rect width={600} height={120} fill="#8c8478" />
        {bed.map((stone) => (
          <polygon key={stone.points} points={stone.points} fill={stone.fill} />
        ))}
        <Note
          x={150}
          y={52}
          lines={[
            'a ceiling board sags, the worktop swells',
            'at its joint, and a door has dropped',
          ]}
          onFill
        />
      </svg>
    </div>
  )
}

export default function DrawingsPreview() {
  return (
    <main className="wz-page">
      <h1 className="wz-shell-title">Surveyor drawing kit preview</h1>
      <p>
        Development-only check page for every trade's drawing: problem and fixed
        views, a held part, live markers with a view toggle, the tile crop, and
        a note on a textured fill.
      </p>
      {trades.map(({ id, label }) => {
        const DrawingComponent = DRAWINGS[id]
        return (
          <section key={id} className="wz-preview-section" aria-label={label}>
            <h2 className="wz-shell-title">{label}</h2>
            <div className="wz-preview-grid">
              <div className="wz-preview-case" data-case={`${id}-problem`}>
                <p>Problem, full size</p>
                <DrawingComponent view="problem" />
              </div>
              <div className="wz-preview-case" data-case={`${id}-fixed`}>
                <p>Fixed, full size</p>
                <DrawingComponent view="fixed" />
              </div>
              <div className="wz-preview-case" data-case={`${id}-held`}>
                <p>Fixed, part c held</p>
                <DrawingComponent view="fixed" highlight="c" />
              </div>
              <div className="wz-preview-case" data-case={`${id}-live`}>
                <p>Live markers (hover lights, click holds) and view toggle</p>
                <LiveCase DrawingComponent={DrawingComponent} />
              </div>
              <div className="wz-preview-case" data-case={`${id}-tile`}>
                <p>Tile crop (fixed)</p>
                <div className="wz-preview-tile">
                  <DrawingComponent view="fixed" crop="tile" />
                </div>
              </div>
            </div>
          </section>
        )
      })}
      <section className="wz-preview-section" aria-label="Note on a fill">
        <h2 className="wz-shell-title">Note on a textured fill</h2>
        <div className="wz-preview-case" data-case="note-on-fill">
          <p>Paper labels behind each line (shown from 1220px up)</p>
          <NoteOnFillCase />
        </div>
      </section>
    </main>
  )
}
