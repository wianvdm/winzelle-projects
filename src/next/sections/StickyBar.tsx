import { useEffect, useState } from 'react'

import {
  companyName,
  contactFacts,
  header,
  whatsappLabels,
} from '../../content/next/index.ts'
import { PHONE_HREF, SectionLinks, type SectionLinksProps } from './Header.tsx'

export const HERO_WHATSAPP_ID = 'wz-hero-wa'

/** Height the sticky bar covers at the top of the window, plus a margin. */
export const STICKY_CLEARANCE_PX = 72

interface StickyBarProps extends SectionLinksProps {
  whatsappHref: string
}

function heroActionOutOfView(): boolean {
  const heroAction = document.getElementById(HERO_WHATSAPP_ID)
  if (!heroAction) return false
  const box = heroAction.getBoundingClientRect()
  return box.bottom < STICKY_CLEARANCE_PX || box.top > window.innerHeight
}

// Checked on every scroll, so the bar is already there by the time the
// opening button slides under it.
function useHeroActionOutOfView(): boolean {
  const [outOfView, setOutOfView] = useState(false)

  useEffect(() => {
    const place = () => setOutOfView(heroActionOutOfView())
    window.addEventListener('scroll', place, { passive: true })
    window.addEventListener('resize', place)
    place()
    return () => {
      window.removeEventListener('scroll', place)
      window.removeEventListener('resize', place)
    }
  }, [])

  return outOfView
}

/**
 * Sticky contact bar (spec S1, #wz-sticky). Hidden (visibility: hidden, so
 * out of the Tab order) until the opening WhatsApp action leaves the window.
 * A labelled region, not a banner: the header is the page's one banner and
 * carries the navigation, while the bar's own contents still sit in a
 * landmark once it shows.
 */
export function StickyBar({ whatsappHref, currentSectionId }: StickyBarProps) {
  const shown = useHeroActionOutOfView()

  return (
    <div
      className={shown ? 'wz-sticky wz-shown' : 'wz-sticky'}
      id="wz-sticky"
      role="region"
      aria-label="Contact"
    >
      <div className="wz-sticky-row">
        <span className="wz-sticky-name">{companyName}</span>
        <div className="wz-sticky-nav">
          <SectionLinks currentSectionId={currentSectionId} />
        </div>
        <a className="wz-sticky-phone wz-voice" href={PHONE_HREF}>
          {contactFacts.phoneDisplay}
        </a>
        <a
          className="wz-sticky-call"
          href={PHONE_HREF}
          aria-label={`${header.callButtonLabel} ${contactFacts.phoneDisplay}`}
        >
          {header.callButtonLabel}
        </a>
        <a
          className="wz-whatsapp"
          href={whatsappHref}
          target="_blank"
          rel="noopener"
        >
          {whatsappLabels.general}
        </a>
      </div>
    </div>
  )
}
