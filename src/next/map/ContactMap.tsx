import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { contactFacts } from '../../content/next/index.ts'
import { matchesMedia } from '../sections/ExplorerSheet.tsx'
import type { LiveMap, PinGeometry } from './loadMap.ts'

const MAP_IMAGE_BASE = '/content/images/map-ben-kamma'
const MAP_IMAGE_WIDTH = 1536
const MAP_IMAGE_HEIGHT = 1024
const NOTE_ID = 'wz-map-note'
const FAILED_NOTE_ID = 'wz-map-failed'
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const TOUCH_FIRST_QUERY = '(pointer: coarse)'
// The pin drawing below: 28 by 42, its tip at (14, 40).
const PIN_SIZE: PinGeometry['size'] = [28, 42]
const PIN_TIP: PinGeometry['tip'] = [14, 40]

type MapPhase = 'preview' | 'loading' | 'live' | 'failed'

interface MapMarkProps {
  /** Names the pin once it marks a live map; on the preview it is decoration. */
  pinLabel?: string
}

function MapMark({ pinLabel }: MapMarkProps) {
  const pinNaming = pinLabel
    ? { role: 'img', 'aria-label': pinLabel }
    : { 'aria-hidden': true }
  return (
    <>
      <svg className="wz-map-pin" viewBox="0 0 28 42" {...pinNaming}>
        <ellipse cx="18" cy="40" rx="7" ry="2.2" fill="#102e44" opacity="0.3" />
        <path
          d="M14 40C14 40 3 25 3 14a11 11 0 0 1 22 0c0 11-11 26-11 26z"
          fill="#102e44"
          stroke="#ffffff"
          strokeWidth="2"
        />
        <circle cx="14" cy="14" r="4.2" fill="#ffffff" />
      </svg>
      <a
        className="wz-map-tag"
        href={contactFacts.directionsUrl}
        target="_blank"
        rel="noopener"
        aria-label={contactFacts.mapLinkLabel}
      >
        {contactFacts.mapTag}
      </a>
    </>
  )
}

/** Where the preview pin's tip sits, from the frame's centre. */
function tipOffset(
  frame: HTMLElement,
  mark: HTMLElement,
): PinGeometry['offset'] {
  const frameBox = frame.getBoundingClientRect()
  const markBox = mark.getBoundingClientRect()
  return [
    markBox.left + PIN_TIP[0] - (frameBox.left + frameBox.width / 2),
    markBox.top + PIN_TIP[1] - (frameBox.top + frameBox.height / 2),
  ]
}

/**
 * The map print (spec S6). It shows a still picture of the map until the
 * visitor asks for the live one, so a visitor who never does sends nothing
 * to OpenStreetMap; then Leaflet loads and the pin stays where it was.
 */
export function ContactMap() {
  const [phase, setPhase] = useState<MapPhase>('preview')
  const [markElement, setMarkElement] = useState<HTMLElement | null>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const previewMarkRef = useRef<HTMLDivElement>(null)
  const liveRef = useRef<HTMLDivElement>(null)
  const pinOffsetRef = useRef<PinGeometry['offset']>([0, 0])
  const focusMapRef = useRef(false)
  const activated = phase === 'loading' || phase === 'live'

  useEffect(() => {
    if (!activated) return
    let cancelled = false
    let liveMap: LiveMap | null = null

    async function start() {
      try {
        const { createLiveMap } = await import('./loadMap.ts')
        const container = liveRef.current
        if (cancelled || !container) return
        liveMap = createLiveMap(container, {
          pin: { size: PIN_SIZE, tip: PIN_TIP, offset: pinOffsetRef.current },
          reducedMotion: matchesMedia(REDUCED_MOTION_QUERY),
          touchFirst: matchesMedia(TOUCH_FIRST_QUERY),
        })
        setMarkElement(liveMap.markElement)
        setPhase('live')
        if (focusMapRef.current) container.focus()
      } catch (error) {
        if (cancelled) return
        console.error(error)
        setPhase('failed')
      }
    }

    void start()
    return () => {
      cancelled = true
      liveMap?.remove()
      setMarkElement(null)
    }
  }, [activated])

  function showMap() {
    const frame = frameRef.current
    const mark = previewMarkRef.current
    if (activated || !frame || !mark) return
    pinOffsetRef.current = tipOffset(frame, mark)
    // Focus follows into the map when the button held it: after a keypress,
    // and after a mouse click in Chrome. Where a click leaves the button
    // unfocused, as in Safari, focus stays where it was.
    focusMapRef.current = frame.contains(document.activeElement)
    setPhase('loading')
  }

  const showsPreview = phase !== 'live'
  const failed = phase === 'failed'

  return (
    <figure className="wz-map-print wz-pin wz-pin-print">
      <div className="wz-map-frame" ref={frameRef}>
        {showsPreview && (
          <>
            <picture>
              <source type="image/avif" srcSet={`${MAP_IMAGE_BASE}.avif`} />
              <img
                className="wz-map-preview"
                src={`${MAP_IMAGE_BASE}.webp`}
                alt=""
                width={MAP_IMAGE_WIDTH}
                height={MAP_IMAGE_HEIGHT}
                loading="lazy"
                decoding="async"
              />
            </picture>
            <div className="wz-map-mark" ref={previewMarkRef}>
              <MapMark />
            </div>
          </>
        )}
        {activated && (
          <div
            ref={liveRef}
            className="wz-map-live"
            role="region"
            aria-label={contactFacts.mapRegionLabel}
          />
        )}
        {showsPreview && (
          <div className="wz-map-show">
            <button
              type="button"
              onClick={showMap}
              aria-describedby={
                failed ? `${FAILED_NOTE_ID} ${NOTE_ID}` : NOTE_ID
              }
            >
              {contactFacts.mapShowLabel}
            </button>
            {failed && (
              <p className="wz-map-failed" id={FAILED_NOTE_ID} role="alert">
                {contactFacts.mapFailedNote}
              </p>
            )}
            <p id={NOTE_ID}>{contactFacts.mapShowNote}</p>
          </div>
        )}
        {markElement &&
          createPortal(
            <MapMark pinLabel={contactFacts.mapPinLabel} />,
            markElement,
          )}
      </div>
      <figcaption>
        <span>{contactFacts.mapCaption}</span>
        <a
          className="wz-voice"
          href={contactFacts.mapAttributionUrl}
          target="_blank"
          rel="noopener"
        >
          {contactFacts.mapAttribution}
        </a>
      </figcaption>
    </figure>
  )
}
