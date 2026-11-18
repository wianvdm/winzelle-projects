import { useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { flushSync } from 'react-dom'

import {
  getTrade,
  getWorkPhoto,
  panelPhotoIdByTrade,
  whatNeedsDoing,
  whatsappLabels,
  type Trade,
  type TradeId,
  type TradePart,
} from '../../content/next/index.ts'
import { drawingsByTrade, type DrawingView } from '../drawings/index.ts'
import { usePickState } from '../pick-state.tsx'
import { buildWhatsAppLink, tradeMessage } from '../whatsapp.ts'
import { PhotoPrint } from './Lightbox.tsx'
import { STICKY_CLEARANCE_PX } from './StickyBar.tsx'

export const PANEL_ID = 'wz-panel'
export const PANEL_WHATSAPP_ID = 'wz-panel-wa'
const PANEL_NAME_ID = 'wz-panel-name'

/** Below this the sheet stacks under the tiles and the key under the drawing. */
export const ONE_COLUMN_QUERY = '(max-width: 1099px)'
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const KEY_LABEL = 'Parts of the drawing'

// The print is about 240px wide beside the involves copy and at most 320px
// on one column.
const PANEL_PRINT_SIZES = '(max-width: 1099px) 320px, 242px'

export function matchesMedia(query: string): boolean {
  return typeof window.matchMedia === 'function'
    ? window.matchMedia(query).matches
    : false
}

export function scrollBehavior(): ScrollBehavior {
  return matchesMedia(REDUCED_MOTION_QUERY) ? 'auto' : 'smooth'
}

/**
 * On one column the key sits below the drawing, so a part held from there
 * brings the drawing into view, or its strip's foot when only that is cut
 * off: the strip carries the held part's note.
 */
function revealDrawing(frame: HTMLElement | null) {
  if (!frame || !matchesMedia(ONE_COLUMN_QUERY)) return
  const box = frame.getBoundingClientRect()
  const visibleHeight =
    Math.min(box.bottom, window.innerHeight) - Math.max(box.top, 0)
  if (visibleHeight < box.height / 2) {
    frame.scrollIntoView({ behavior: scrollBehavior(), block: 'start' })
    return
  }
  const overhang = box.bottom - window.innerHeight
  if (overhang > 0 && box.top - overhang >= STICKY_CLEARANCE_PX) {
    window.scrollBy({ top: overhang, behavior: scrollBehavior() })
  }
}

function isTouchClick(event: MouseEvent): boolean {
  const pointerType = (event.nativeEvent as PointerEvent).pointerType
  return pointerType === 'touch' || pointerType === 'pen'
}

interface KeyButtonProps {
  part: TradePart
  held: boolean
  /** Whether any part is held, so Escape releases it from any key button. */
  anyHeld: boolean
  hot: boolean
  onHot: (letter: string | null) => void
  onPress: (letter: string, event: MouseEvent) => void
  onRelease: () => void
}

/** A key row: the keyboard route to a part, mirroring its marker. */
function KeyButton({
  part,
  held,
  anyHeld,
  hot,
  onHot,
  onPress,
  onRelease,
}: KeyButtonProps) {
  const releaseOnEscape = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !anyHeld) return
    event.preventDefault()
    onRelease()
  }
  return (
    <li>
      <button
        type="button"
        className={hot ? 'wz-key-btn wz-hot' : 'wz-key-btn'}
        data-part={part.key}
        aria-pressed={held}
        onPointerEnter={(event) => {
          if (event.pointerType === 'mouse') onHot(part.key)
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === 'mouse') onHot(null)
        }}
        onFocus={() => onHot(part.key)}
        onBlur={() => onHot(null)}
        onClick={(event) => onPress(part.key, event)}
        onKeyDown={releaseOnEscape}
      >
        <span className="wz-key-letter wz-voice" aria-hidden="true">
          {part.key}
        </span>
        <span>
          <strong>{part.name}</strong>
          {part.note}
        </span>
      </button>
    </li>
  )
}

/** The trade's photo print, or the pinned note for trades with none. */
function PanelMedia({ trade }: { trade: Trade }) {
  const photoId = panelPhotoIdByTrade[trade.id]
  if (!photoId) {
    return (
      <div className="wz-panel-note wz-pin">
        <p>{trade.noPhotoFallbackNote}</p>
      </div>
    )
  }
  return (
    <PhotoPrint
      photo={getWorkPhoto(photoId)}
      className={`wz-print wz-panel-print wz-pin wz-pin-print wz-panel-${trade.id}`}
      sizes={PANEL_PRINT_SIZES}
      loading="lazy"
    />
  )
}

interface PartState {
  tradeId: TradeId
  held: string | null
  hot: string | null
  /** True once the sheet has changed trade: each new drawing lands. */
  landing: boolean
}

/** Which part is held or hot, reset whenever the sheet changes trade. */
function usePartState(tradeId: TradeId) {
  const [state, setState] = useState<PartState>({
    tradeId,
    held: null,
    hot: null,
    landing: false,
  })
  if (state.tradeId === tradeId) return { ...state, setState }
  // Adjusting state while rendering: React re-renders before painting.
  const next = { tradeId, held: null, hot: null, landing: true }
  setState(next)
  return { ...next, setState }
}

/**
 * Explorer sheet (spec S3, #wz-panel): the open trade's name, line and
 * WhatsApp action, the drawing with its markers and key, what the job
 * involves, and a matching photo.
 */
export function ExplorerSheet() {
  const { openTradeId } = usePickState()
  const trade = getTrade(openTradeId)
  const TradeDrawing = drawingsByTrade[trade.id]
  const [view, setView] = useState<DrawingView>('problem')
  const { held, hot, landing, setState } = usePartState(trade.id)
  const frameRef = useRef<HTMLDivElement>(null)
  const fixed = view === 'fixed'

  const setHot = (letter: string | null) =>
    setState((current) => ({ ...current, hot: letter }))
  // The released part goes dark even while its own key button keeps focus.
  const release = () =>
    setState((current) => ({
      ...current,
      held: null,
      hot: current.hot === current.held ? null : current.hot,
    }))
  const toggleHeld = (letter: string) => {
    const holding = held !== letter
    // The strip carries the held part's note, so it must be at its new
    // height before the drawing is measured for the reveal.
    flushSync(() =>
      setState((current) => ({
        ...current,
        held: holding ? letter : null,
        hot: holding ? current.hot : null,
      })),
    )
    if (holding) revealDrawing(frameRef.current)
  }
  // Touch has no pointer leave, so a tapped key row would stay lit; only the
  // held state shows.
  const pressKey = (letter: string, event: MouseEvent) => {
    toggleHeld(letter)
    if (isTouchClick(event)) setHot(null)
  }

  return (
    <div
      className="wz-explorer wz-pin"
      id={PANEL_ID}
      role="region"
      aria-labelledby={PANEL_NAME_ID}
    >
      <div className="wz-panel-head">
        <div>
          <div aria-live="polite">
            <h3 className="wz-h3 wz-panel-name" id={PANEL_NAME_ID}>
              {trade.label}
            </h3>
            <p className="wz-panel-line">{trade.line}</p>
          </div>
          <div className="wz-panel-ask">
            <a
              className="wz-whatsapp"
              id={PANEL_WHATSAPP_ID}
              href={buildWhatsAppLink(tradeMessage(trade))}
              target="_blank"
              rel="noopener"
            >
              {whatsappLabels.general}
            </a>
            <p className="wz-panel-ask-note wz-voice">
              {whatNeedsDoing.whatsappHelperBefore}
              {trade.noun}
              {whatNeedsDoing.whatsappHelperAfter}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="wz-state"
          aria-pressed={fixed}
          onClick={() => setView(fixed ? 'problem' : 'fixed')}
        >
          {fixed
            ? whatNeedsDoing.showProblemLabel
            : whatNeedsDoing.showFixedLabel}
        </button>
      </div>

      <div
        key={trade.id}
        ref={frameRef}
        className={landing ? 'wz-panel-drawing wz-landing' : 'wz-panel-drawing'}
      >
        <TradeDrawing
          view={view}
          highlight={held}
          hot={hot}
          onPartHover={setHot}
          onPartPress={toggleHeld}
        />
      </div>

      <ol className="wz-key" aria-label={KEY_LABEL}>
        {trade.drawing.parts.map((part) => (
          <KeyButton
            key={part.key}
            part={part}
            held={held === part.key}
            anyHeld={held !== null}
            hot={hot === part.key}
            onHot={setHot}
            onPress={pressKey}
            onRelease={release}
          />
        ))}
      </ol>

      <div className="wz-panel-foot">
        <div>
          <h4 className="wz-involves-label">
            {whatNeedsDoing.involvesHeading}
          </h4>
          <p className="wz-involves">{trade.involves}</p>
        </div>
        <div className="wz-panel-media" data-wz-set="panel">
          <PanelMedia trade={trade} />
        </div>
      </div>
    </div>
  )
}
