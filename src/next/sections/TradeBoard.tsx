import { flushSync } from 'react-dom'

import {
  trades,
  whatNeedsDoing,
  whatsappLabels,
  type Trade,
} from '../../content/next/index.ts'
import { drawingsByTrade } from '../drawings/index.ts'
import { usePickState } from '../pick-state.tsx'
import { buildWhatsAppLink, unsureMessage } from '../whatsapp.ts'
import {
  ExplorerSheet,
  matchesMedia,
  ONE_COLUMN_QUERY,
  PANEL_ID,
  PANEL_WHATSAPP_ID,
  scrollBehavior,
} from './ExplorerSheet.tsx'
import { STICKY_CLEARANCE_PX } from './StickyBar.tsx'
// The shared board styles first, so this section's rules override them.
import '../next.css'
import './trades.css'

export const WHAT_SECTION_ID = 'wz-what'
const TILES_LABEL = 'Kinds of work'

/**
 * On one column the sheet sits below the tiles, so it always follows a
 * pick. Beside the tiles, a lower tile can leave the sheet's heading above
 * the window, or a higher one its WhatsApp action below it.
 */
function revealPanel() {
  const panel = document.getElementById(PANEL_ID)
  const panelWhatsApp = document.getElementById(PANEL_WHATSAPP_ID)
  if (!panel || !panelWhatsApp) return
  const headingHidden = panel.getBoundingClientRect().top < STICKY_CLEARANCE_PX
  const whatsAppHidden =
    panelWhatsApp.getBoundingClientRect().bottom > window.innerHeight
  const oneColumn = matchesMedia(ONE_COLUMN_QUERY)
  if (!oneColumn && !headingHidden && !whatsAppHidden) return
  panel.scrollIntoView({ behavior: scrollBehavior(), block: 'start' })
}

function TradeTile({ trade, open }: { trade: Trade; open: boolean }) {
  const { pick } = usePickState()
  const TileDrawing = drawingsByTrade[trade.id]
  const pickTrade = () => {
    // The sheet must show the new trade before its position is measured.
    flushSync(() => pick(trade.id))
    revealPanel()
  }
  return (
    <button
      type="button"
      className="wz-tile wz-pin"
      data-kind={trade.id}
      aria-pressed={open}
      aria-controls={PANEL_ID}
      onClick={pickTrade}
    >
      <TileDrawing view="fixed" crop="tile" />
      <span className="wz-tile-name">{trade.label}</span>
      <span className="wz-tile-slot wz-voice" aria-hidden="true">
        <span className="wz-tile-slot-wide">
          {whatNeedsDoing.pickedSlotLabelDesktop} →
        </span>
        <span className="wz-tile-slot-narrow">
          {whatNeedsDoing.pickedSlotLabelNarrow} ↓
        </span>
      </span>
    </button>
  )
}

/**
 * What needs doing? (spec S3, #wz-what): the tray of drawn tiles and the
 * "Not sure" card beside the explorer sheet. Below 1100px the sheet follows
 * the tiles and the card follows the sheet.
 */
export function TradeBoard() {
  const { openTradeId } = usePickState()
  return (
    <section id={WHAT_SECTION_ID} aria-labelledby="wz-what-title">
      <div className="wz-wrap wz-needs">
        <div className="wz-tray-side">
          <div className="wz-tray">
            <h2 className="wz-h2" id="wz-what-title">
              {whatNeedsDoing.heading}
            </h2>
            <p className="wz-tray-how">{whatNeedsDoing.helperLine}</p>
            <div className="wz-tiles" role="group" aria-label={TILES_LABEL}>
              {trades.map((trade) => (
                <TradeTile
                  key={trade.id}
                  trade={trade}
                  open={trade.id === openTradeId}
                />
              ))}
            </div>
          </div>
          <div className="wz-unsure wz-pin">
            <h3 className="wz-h3">{whatNeedsDoing.notSure.heading}</h3>
            <p>{whatNeedsDoing.notSure.text}</p>
            <a
              className="wz-whatsapp"
              href={buildWhatsAppLink(unsureMessage())}
              target="_blank"
              rel="noopener"
            >
              {whatsappLabels.withPhoto}
            </a>
          </div>
        </div>
        <ExplorerSheet />
      </div>
    </section>
  )
}
