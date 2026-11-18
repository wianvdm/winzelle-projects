import type { MouseEvent } from 'react'
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
 * How far to scroll toward the sheet, `panelOffset` away, without the
 * focused tile leaving the window.
 */
function scrollKeepingTileInView(panelOffset: number, tile: HTMLElement) {
  const box = tile.getBoundingClientRect()
  return panelOffset > 0
    ? Math.min(panelOffset, box.top - STICKY_CLEARANCE_PX)
    : Math.max(panelOffset, box.bottom - window.innerHeight)
}

/**
 * On one column the sheet sits below the tiles, so it always follows a
 * pick. Beside the tiles, a lower tile can leave the sheet's heading above
 * the window, or a higher one its WhatsApp action below it. A keyboard pick
 * leaves focus on the tile, so the sheet comes up only as far as the tile
 * stays in view.
 */
function revealPanel(focusedTile: HTMLElement | null) {
  const panel = document.getElementById(PANEL_ID)
  const panelWhatsApp = document.getElementById(PANEL_WHATSAPP_ID)
  if (!panel || !panelWhatsApp) return
  const panelOffset = panel.getBoundingClientRect().top - STICKY_CLEARANCE_PX
  const headingHidden = panelOffset < 0
  const whatsAppHidden =
    panelWhatsApp.getBoundingClientRect().bottom > window.innerHeight
  const oneColumn = matchesMedia(ONE_COLUMN_QUERY)
  if (!oneColumn && !headingHidden && !whatsAppHidden) return
  if (!focusedTile) {
    panel.scrollIntoView({ behavior: scrollBehavior(), block: 'start' })
    return
  }
  const scroll = scrollKeepingTileInView(panelOffset, focusedTile)
  if (scroll === 0) return
  window.scrollBy({ top: scroll, behavior: scrollBehavior() })
}

function TradeTile({ trade, open }: { trade: Trade; open: boolean }) {
  const { pick } = usePickState()
  const TileDrawing = drawingsByTrade[trade.id]
  const pickTrade = (event: MouseEvent<HTMLButtonElement>) => {
    // The sheet must show the new trade before its position is measured.
    flushSync(() => pick(trade.id))
    // Enter and Space on a button send a click with no pointer presses.
    const byKeyboard = event.detail === 0
    revealPanel(byKeyboard ? event.currentTarget : null)
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
 * What needs doing? (spec S3, #wz-what): the tray of drawn tiles, the
 * explorer sheet and the "Not sure" card. Below 1100px they stack in this
 * order; wider, the sheet sits beside the tray and the card under the tray.
 */
export function TradeBoard() {
  const { openTradeId } = usePickState()
  return (
    <section id={WHAT_SECTION_ID} aria-labelledby="wz-what-title">
      <div className="wz-wrap wz-needs">
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
        <ExplorerSheet />
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
    </section>
  )
}
