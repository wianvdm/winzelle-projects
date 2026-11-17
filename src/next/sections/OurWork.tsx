import { useLayoutEffect, useRef } from 'react'
import { flushSync } from 'react-dom'

import {
  contactFacts,
  getTrade,
  ourWork,
  trades,
  whatsappLabels,
  workPhotos,
  workPhotosFor,
  type Trade,
  type TradeId,
} from '../../content/next/index.ts'
import { usePickState } from '../pick-state.tsx'
import { buildWhatsAppLink, workMessage } from '../whatsapp.ts'
import {
  matchesMedia,
  ONE_COLUMN_QUERY,
  scrollBehavior,
} from './ExplorerSheet.tsx'
import { cropRatio, PhotoPrint } from './Lightbox.tsx'
import { STICKY_CLEARANCE_PX } from './StickyBar.tsx'
import './work.css'

export const WORK_SECTION_ID = 'wz-work'
const PRINTS_ID = 'wz-prints'
const TAGS_LABEL = 'Show our work by kind'
const ALL_FILTER = 'all'

// Board prints are about 180px to 270px wide beside the label sheet and
// half the window in the two-column phone grid.
const BOARD_PRINT_SIZES = '(max-width: 1099px) 50vw, 280px'

// A filter showing this many prints or fewer shows them larger, at most two
// to a row, so they fill the board. The photos are small phone pictures:
// never shown above 1.3 times their own pixels.
const FEW_PRINTS = 3
const PRINTS_PER_ROW = 2
const PRINT_GAP_PX = 20
const PRINT_PADDING_PX = 20
const PIXEL_LIMIT = 1.3
const LONE_PRINT_MAX_PX = 560

/** Trades with at least one print on the board get a luggage tag. */
const taggedTrades = trades.filter(
  (trade) => workPhotosFor(trade.id).length > 0,
)

function hasTag(tradeId: TradeId): boolean {
  return taggedTrades.some((trade) => trade.id === tradeId)
}

/** The widest a print may show: its crop at 1.3x the photo's pixels. */
function largestPrintWidth(print: HTMLElement): number {
  const image = print.querySelector('img')
  const frame = print.querySelector('.wz-photo')
  if (!image || !frame) return 0
  // The attributes hold the photo's own pixels; image.width is the rendered size.
  const pixelWidth = Number(image.getAttribute('width'))
  const pixelHeight = Number(image.getAttribute('height'))
  const shownWidth = Math.min(pixelWidth, pixelHeight * cropRatio(frame))
  return shownWidth * PIXEL_LIMIT + PRINT_PADDING_PX
}

function boardPrints(board: HTMLElement): HTMLElement[] {
  return [...board.querySelectorAll<HTMLElement>('.wz-print')]
}

function clearPrintWidths(board: HTMLElement) {
  for (const print of boardPrints(board)) print.style.removeProperty('width')
}

/**
 * Sizes a filtered board of few prints so they fill it. CSSOM writes: the
 * CSP forbids style attributes in markup.
 */
function sizeFewPrints(board: HTMLElement) {
  clearPrintWidths(board)
  const shown = boardPrints(board).filter((print) => !print.hidden)
  if (shown.length > FEW_PRINTS || matchesMedia(ONE_COLUMN_QUERY)) return
  const perRow = Math.min(shown.length, PRINTS_PER_ROW)
  const share = (board.clientWidth - perRow * PRINT_GAP_PX) / perRow
  if (share <= 0) return
  for (const print of shown) {
    const width = Math.min(share, largestPrintWidth(print), LONE_PRINT_MAX_PX)
    print.style.width = `${Math.floor(width)}px`
  }
}

/**
 * Beside the tags the matches can sit above the window; on one column the
 * row with the tag just pressed lands under the sticky bar, the status line
 * below it and the first prints after that.
 */
function revealPrints(tag: HTMLElement) {
  const behavior = scrollBehavior()
  if (matchesMedia(ONE_COLUMN_QUERY)) {
    const top = tag.getBoundingClientRect().top - STICKY_CLEARANCE_PX
    window.scrollBy({ top, behavior })
    return
  }
  const shownTops = [
    ...document.querySelectorAll<HTMLElement>(`#${PRINTS_ID} .wz-print`),
  ]
    .filter((print) => !print.hidden)
    .map((print) => print.getBoundingClientRect().top)
  const highest = Math.min(...shownTops)
  if (highest >= STICKY_CLEARANCE_PX) return
  window.scrollBy({ top: highest - STICKY_CLEARANCE_PX, behavior })
}

function photoCount(trade: Trade, count: number): string {
  return `${trade.label}: ${count} ${count === 1 ? 'photo' : 'photos'}`
}

/** The status line: the count for a filter, or why everything shows. */
function statusText(trade: Trade | null, count: number): string {
  if (!trade) return ''
  if (!hasTag(trade.id)) return trade.noPhotosStatus ?? ''
  return photoCount(trade, count)
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M24 12.07C24 5.44 18.63.07 12 .07S0 5.44 0 12.07c0 5.99 4.39 10.95 10.13 11.85v-8.38H7.08v-3.47h3.05V9.43c0-3.01 1.79-4.67 4.53-4.67 1.31 0 2.69.23 2.69.23v2.96h-1.52c-1.49 0-1.95.92-1.95 1.87v2.25h3.33l-.53 3.47h-2.8v8.38C19.61 23.02 24 18.06 24 12.07z" />
    </svg>
  )
}

interface WorkTagProps {
  filterId: TradeId | typeof ALL_FILTER
  label: string
  pressed: boolean
}

function WorkTag({ filterId, label, pressed }: WorkTagProps) {
  const { showWork } = usePickState()
  const showFilter = (tag: HTMLButtonElement) => {
    // The board must show the new filter before the prints are measured.
    flushSync(() => showWork(filterId === ALL_FILTER ? null : filterId))
    revealPrints(tag)
  }
  return (
    <button
      type="button"
      className="wz-tag"
      data-kind={filterId}
      aria-pressed={pressed}
      aria-controls={PRINTS_ID}
      onClick={(event) => showFilter(event.currentTarget)}
    >
      <span className="wz-tag-shape" aria-hidden="true" />
      <span className="wz-tag-hole" aria-hidden="true" />
      <span className="wz-tag-text">{label}</span>
    </button>
  )
}

/**
 * Our work (spec S4, #wz-work): the label sheet with its luggage tags beside
 * the board of prints. A tile pick filters the board too; a trade with no
 * photos shows them all but keeps its name in the ask's WhatsApp message.
 */
export function OurWork() {
  const { workTradeId } = usePickState()
  const boardRef = useRef<HTMLDivElement>(null)
  const workTrade = workTradeId ? getTrade(workTradeId) : null
  const filterId = workTradeId && hasTag(workTradeId) ? workTradeId : null
  const shownIds = new Set(workPhotosFor(filterId).map((photo) => photo.id))

  useLayoutEffect(() => {
    const board = boardRef.current
    if (!board) return
    const size = () =>
      filterId ? sizeFewPrints(board) : clearPrintWidths(board)
    size()
    window.addEventListener('resize', size)
    return () => window.removeEventListener('resize', size)
  }, [filterId])

  return (
    <section id={WORK_SECTION_ID} aria-labelledby="wz-work-title">
      <div className="wz-wrap">
        <div className="wz-work-board">
          <div className="wz-work-side">
            <div className="wz-pin wz-work-label">
              <h2 className="wz-h2" id="wz-work-title">
                {ourWork.heading}
              </h2>
              <p>{ourWork.introLine}</p>
              <div className="wz-tags" role="group" aria-label={TAGS_LABEL}>
                <WorkTag
                  filterId={ALL_FILTER}
                  label={ourWork.allFilterLabel}
                  pressed={filterId === null}
                />
                {taggedTrades.map((trade) => (
                  <WorkTag
                    key={trade.id}
                    filterId={trade.id}
                    label={trade.label}
                    pressed={filterId === trade.id}
                  />
                ))}
              </div>
              <p className="wz-work-status" role="status">
                {statusText(workTrade, shownIds.size)}
              </p>
              <p className="wz-fb-note">{ourWork.facebookNote}</p>
              <a
                className="wz-fb"
                href={contactFacts.facebookUrl}
                target="_blank"
                rel="noopener"
              >
                <FacebookIcon />
                {ourWork.facebookCtaLabel}
              </a>
            </div>
          </div>

          <div
            className="wz-prints"
            id={PRINTS_ID}
            ref={boardRef}
            data-wz-set="work"
            aria-live="polite"
          >
            {workPhotos.map((photo) => (
              <PhotoPrint
                key={photo.id}
                photo={photo}
                className={`wz-pin wz-pin-print wz-print wz-work-${photo.id}`}
                sizes={BOARD_PRINT_SIZES}
                loading="lazy"
                hidden={!shownIds.has(photo.id)}
              />
            ))}
            <div className="wz-pin wz-work-ask" id="wz-work-ask">
              <p>
                <span id="wz-work-ask-lead">
                  {shownIds.size === 1
                    ? ourWork.askLeadSingle
                    : ourWork.askLeadMany}
                </span>{' '}
                {ourWork.askText}
              </p>
              <a
                className="wz-whatsapp"
                id="wz-work-wa"
                href={buildWhatsAppLink(workMessage(workTrade))}
                target="_blank"
                rel="noopener"
              >
                {whatsappLabels.general}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
