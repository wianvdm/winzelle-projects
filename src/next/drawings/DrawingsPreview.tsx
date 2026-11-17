// Dev-only preview of the drawing kit (#94), mounted at /next/drawings only
// when import.meta.env.DEV is true (see src/router.tsx), so it is absent from
// every build. It renders each drawing in both views, with a held part, and
// as a tile crop, for screenshot comparison against the prototype.
import { getTrade } from '../../content/next/trades'
import '../next.css'
import { PavingDrawing } from './PavingDrawing'
import { RoofsDrawing } from './RoofsDrawing'

const CASES = [
  {
    id: 'paving',
    label: getTrade('paving').label,
    DrawingComponent: PavingDrawing,
  },
  {
    id: 'roofs',
    label: getTrade('roofs').label,
    DrawingComponent: RoofsDrawing,
  },
] as const

export default function DrawingsPreview() {
  return (
    <main className="wz-page">
      <h1 className="wz-shell-title">Surveyor drawing kit preview</h1>
      <p>
        Development-only check page for the Paving and Roofs drawings: problem
        and fixed views, a held part, and the tile crop.
      </p>
      {CASES.map(({ id, label, DrawingComponent }) => (
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
            <div className="wz-preview-case" data-case={`${id}-tile`}>
              <p>Tile crop (fixed)</p>
              <div className="wz-preview-tile">
                <DrawingComponent view="fixed" crop="tile" />
              </div>
            </div>
          </div>
        </section>
      ))}
    </main>
  )
}
