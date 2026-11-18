import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
  type TouchEvent,
} from 'react'

import {
  contactFacts,
  getWorkPhoto,
  ourWork,
  photoCaption,
  photoImageUrls,
  photoSourceSets,
  whatsappLabels,
  type WorkPhoto,
} from '../../content/next/index.ts'
import { buildWhatsAppLink, photoMessage } from '../whatsapp.ts'
import './work.css'

/** Prints inside an element with this attribute page through together. */
const PHOTO_SET_ATTRIBUTE = 'data-wz-set'
const OPENER_SELECTOR = '.wz-print-open'
const LIGHTBOX_ID = 'wz-lightbox'
const FALLBACK_RATIO = 4 / 3
const SWIPE_MIN_PX = 50
// Room the frame leaves for the round buttons beside it, and for the
// caption, counter and margins under it.
const NARROW_WINDOW_PX = 700
const SIDE_ROOM_NARROW_PX = 44
const SIDE_ROOM_WIDE_PX = 180
const FRAME_MAX_PX = 1100
const BELOW_FRAME_ROOM_PX = 190

type OpenPhoto = (opener: HTMLButtonElement) => void

interface LightboxItem {
  photo: WorkPhoto
  ratio: number
  objectPosition: string
}

interface LightboxView {
  items: LightboxItem[]
  index: number
}

const LightboxContext = createContext<OpenPhoto | null>(null)

function useOpenPhoto(): OpenPhoto {
  const openPhoto = useContext(LightboxContext)
  if (!openPhoto) {
    throw new Error('useOpenPhoto must be used inside LightboxProvider')
  }
  return openPhoto
}

/** A print's crop aspect, as CSS sets it on its .wz-photo frame. */
export function cropRatio(frame: Element): number {
  const [width, height] = getComputedStyle(frame)
    .aspectRatio.split('/')
    .map(Number)
  return width && height ? width / height : FALLBACK_RATIO
}

// Aspect and crop live in CSS per print, so they are read from the print.
function itemFor(opener: HTMLElement): LightboxItem {
  const photo = getWorkPhoto(opener.dataset.photoId ?? '')
  const frame = opener.querySelector('.wz-photo')
  return {
    photo,
    ratio: frame ? cropRatio(frame) : FALLBACK_RATIO,
    objectPosition: frame
      ? getComputedStyle(frame).getPropertyValue('--op').trim()
      : '',
  }
}

/** The opener's set: the prints beside it that are showing, in page order. */
function openersBeside(opener: HTMLButtonElement): HTMLButtonElement[] {
  const set = opener.closest(`[${PHOTO_SET_ATTRIBUTE}]`)
  if (!set) return [opener]
  return [...set.querySelectorAll<HTMLButtonElement>(OPENER_SELECTOR)].filter(
    (candidate) => !candidate.closest('[hidden]'),
  )
}

/**
 * Fits the frame to the window at the photo's crop, never wider than the
 * photo's own pixels, and carries the crop's focus point to the image.
 * CSSOM writes: the CSP forbids style attributes in markup.
 */
function fitFrame(frame: HTMLElement, item: LightboxItem) {
  const sideRoom =
    window.innerWidth < NARROW_WINDOW_PX
      ? SIDE_ROOM_NARROW_PX
      : SIDE_ROOM_WIDE_PX
  const maxWidth = Math.min(
    window.innerWidth - sideRoom,
    FRAME_MAX_PX,
    item.photo.width,
  )
  const maxHeight = window.innerHeight - BELOW_FRAME_ROOM_PX
  const width = Math.min(maxWidth, maxHeight * item.ratio)
  frame.style.width = `${width}px`
  frame.style.height = `${width / item.ratio}px`
  frame.style.setProperty('--op', item.objectPosition)
}

interface LightboxDialogProps {
  view: LightboxView | null
  dialogRef: RefObject<HTMLDialogElement | null>
  closeRef: RefObject<HTMLButtonElement | null>
  onStep: (step: number) => void
  onClosed: () => void
}

/**
 * The photo lightbox (spec S4): a native modal dialog, so Esc, the focus
 * trap and the inert page come from the browser.
 */
function LightboxDialog({
  view,
  dialogRef,
  closeRef,
  onStep,
  onClosed,
}: LightboxDialogProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const swipeStartX = useRef<number | null>(null)
  const swiped = useRef(false)
  const item = view ? view.items[view.index] : null
  const paging = !!view && view.items.length > 1

  useLayoutEffect(() => {
    const frame = frameRef.current
    if (!frame || !item) return
    const fit = () => fitFrame(frame, item)
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [item])

  const close = () => dialogRef.current?.close()

  const pageWithArrows = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (!paging) return
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      onStep(-1)
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      onStep(1)
    }
  }

  // The dialog fills the window, so a click on the dark area around the
  // print is a backdrop click. A mouse drag that paged is not; a touch tap
  // closes on pointerup in endSwipe.
  const closeFromBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    const wasSwipe = swiped.current
    swiped.current = false
    if (wasSwipe || event.target !== event.currentTarget) return
    close()
  }

  const startSwipe = (event: PointerEvent<HTMLDivElement>) => {
    // A touch swipe ends without a click, so a swipe from an earlier open
    // must not latch the drag flag and swallow this open's first tap.
    swiped.current = false
    swipeStartX.current = event.clientX
  }

  const endSwipe = (event: PointerEvent<HTMLDivElement>) => {
    const startX = swipeStartX.current
    swipeStartX.current = null
    if (startX === null) return
    const moved = event.clientX - startX
    if (Math.abs(moved) < SWIPE_MIN_PX) {
      // A touch tap on the dark area closes here, not on the click, which
      // a touch browser may swallow after a swipe gesture.
      if (
        event.pointerType === 'touch' &&
        event.target === event.currentTarget
      ) {
        close()
      }
      return
    }
    if (!paging) return
    swiped.current = true
    onStep(moved < 0 ? 1 : -1)
  }

  // The tap's click would land on the page under the dark area once
  // endSwipe has closed the dialog, so a tap there sends no click. After a
  // scroll-like drag the touchend cannot be cancelled, and trying logs a
  // console error.
  const keepTapOnBackdrop = (event: TouchEvent<HTMLDivElement>) => {
    if (event.cancelable && event.target === event.currentTarget)
      event.preventDefault()
  }

  const caption = item ? photoCaption(item.photo) : ''
  const urls = item ? photoImageUrls(item.photo) : null

  return (
    <dialog
      ref={dialogRef}
      className="wz-lightbox"
      id={LIGHTBOX_ID}
      aria-label="Photo"
      onKeyDown={pageWithArrows}
      onClose={onClosed}
    >
      <div
        className="wz-lb-inner"
        onClick={closeFromBackdrop}
        onPointerDown={startSwipe}
        onPointerUp={endSwipe}
        onTouchEnd={keepTapOnBackdrop}
      >
        <div className="wz-lb-print">
          <div className="wz-lb-photo" ref={frameRef}>
            {item && urls && (
              <picture>
                <source type="image/avif" srcSet={urls.avif} />
                <img
                  src={urls.webp}
                  alt={item.photo.alt}
                  width={item.photo.width}
                  height={item.photo.height}
                />
              </picture>
            )}
          </div>
          <div className="wz-lb-caption">
            <span className="wz-voice wz-lb-caption-text">{caption}</span>
            <a
              className="wz-whatsapp"
              href={buildWhatsAppLink(photoMessage(caption))}
              target="_blank"
              rel="noopener"
            >
              {whatsappLabels.general}
            </a>
            <a
              className="wz-fb-link"
              href={contactFacts.facebookUrl}
              target="_blank"
              rel="noopener"
            >
              {ourWork.lightboxFacebookLabel}
            </a>
          </div>
        </div>
        <p className="wz-lb-count wz-voice">
          {paging && view ? `${view.index + 1} of ${view.items.length}` : ''}
        </p>
        <button
          ref={closeRef}
          className="wz-lb-btn wz-lb-close"
          type="button"
          aria-label="Close photo"
          onClick={close}
        >
          ×
        </button>
        <button
          className="wz-lb-btn wz-lb-prev"
          type="button"
          aria-label="Previous photo"
          hidden={!paging}
          onClick={() => onStep(-1)}
        >
          ‹
        </button>
        <button
          className="wz-lb-btn wz-lb-next"
          type="button"
          aria-label="Next photo"
          hidden={!paging}
          onClick={() => onStep(1)}
        >
          ›
        </button>
      </div>
    </dialog>
  )
}

/** Holds the one lightbox every print on the page opens. */
export function LightboxProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<LightboxView | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const openerRef = useRef<HTMLButtonElement | null>(null)

  const openPhoto = useCallback((opener: HTMLButtonElement) => {
    const openers = openersBeside(opener)
    openerRef.current = opener
    setView({ items: openers.map(itemFor), index: openers.indexOf(opener) })
    dialogRef.current?.showModal()
    closeRef.current?.focus()
  }, [])

  const step = useCallback((by: number) => {
    setView((current) => {
      if (!current) return current
      const count = current.items.length
      return { ...current, index: (current.index + by + count) % count }
    })
  }, [])

  const returnFocus = useCallback(() => {
    openerRef.current?.focus({ preventScroll: true })
  }, [])

  return (
    <LightboxContext.Provider value={openPhoto}>
      {children}
      <LightboxDialog
        view={view}
        dialogRef={dialogRef}
        closeRef={closeRef}
        onStep={step}
        onClosed={returnFocus}
      />
    </LightboxContext.Provider>
  )
}

interface PhotoPrintProps {
  photo: WorkPhoto
  className: string
  sizes: string
  loading?: 'lazy' | 'eager'
  hidden?: boolean
}

/** A pinned photo print whose photo opens the lightbox. */
export function PhotoPrint({
  photo,
  className,
  sizes,
  loading,
  hidden,
}: PhotoPrintProps) {
  const openPhoto = useOpenPhoto()
  const urls = photoImageUrls(photo)
  const sourceSets = photoSourceSets(photo)
  const caption = photoCaption(photo)
  return (
    <figure className={className} hidden={hidden}>
      <button
        type="button"
        className="wz-print-open"
        data-photo-id={photo.id}
        aria-label={`Open photo: ${caption}`}
        onClick={(event) => openPhoto(event.currentTarget)}
      >
        <span className="wz-photo">
          <picture>
            <source type="image/avif" srcSet={sourceSets.avif} sizes={sizes} />
            <img
              src={urls.webp}
              srcSet={sourceSets.webp}
              sizes={sizes}
              alt={photo.alt}
              width={photo.width}
              height={photo.height}
              loading={loading}
              decoding="async"
            />
          </picture>
        </span>
      </button>
      <figcaption className="wz-voice">{caption}</figcaption>
    </figure>
  )
}
