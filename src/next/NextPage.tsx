import { useEffect, useState } from 'react'

import { getTrade, pageNavLinks } from '../content/next/index.ts'
import { PickStateProvider, usePickState } from './pick-state.tsx'
import { ContactCard } from './sections/ContactCard.tsx'
import { Footer } from './sections/Footer.tsx'
import { LightboxProvider } from './sections/Lightbox.tsx'
import { OpeningScreen } from './sections/OpeningScreen.tsx'
import { OurWork } from './sections/OurWork.tsx'
import { StickyBar, STICKY_CLEARANCE_PX } from './sections/StickyBar.tsx'
import { Story } from './sections/Story.tsx'
import { TradeBoard } from './sections/TradeBoard.tsx'
import { buildWhatsAppLink, defaultMessage, tradeMessage } from './whatsapp.ts'
import './next.css'
import './sections/sections.css'

const SECTION_IDS = pageNavLinks.map((link) => link.href.slice(1))

// A thin band just under the sticky bar: the section crossing it is the one
// being read. Sections that have not landed yet are skipped.
const SECTION_BAND_ROOT_MARGIN = `-${STICKY_CLEARANCE_PX}px 0px -70% 0px`

function useCurrentSectionId(): string | null {
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(null)

  useEffect(() => {
    const sections = SECTION_IDS.map((id) =>
      document.getElementById(id),
    ).filter((section) => section !== null)
    // jsdom has no IntersectionObserver; no link is marked current there.
    if (!sections.length || typeof IntersectionObserver !== 'function') return

    const inBand = new Set<string>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) inBand.add(entry.target.id)
          else inBand.delete(entry.target.id)
        }
        setCurrentSectionId(
          SECTION_IDS.filter((id) => inBand.has(id)).at(-1) ?? null,
        )
      },
      { rootMargin: SECTION_BAND_ROOT_MARGIN },
    )
    for (const section of sections) observer.observe(section)
    return () => observer.disconnect()
  }, [])

  return currentSectionId
}

/** General WhatsApp link: names the picked trade once a tile is picked. */
function useGeneralWhatsAppHref(): string {
  const { pickedTradeId } = usePickState()
  const message = pickedTradeId
    ? tradeMessage(getTrade(pickedTradeId))
    : defaultMessage()
  return buildWhatsAppLink(message)
}

/** The page inside its pick state, which the trade tiles set. */
export function HomeBoard() {
  const whatsappHref = useGeneralWhatsAppHref()
  const currentSectionId = useCurrentSectionId()

  return (
    <div className="wz-home">
      <LightboxProvider>
        <StickyBar
          whatsappHref={whatsappHref}
          currentSectionId={currentSectionId}
        />
        <main>
          <OpeningScreen
            whatsappHref={whatsappHref}
            currentSectionId={currentSectionId}
          />
          <TradeBoard />
          <OurWork />
          <Story />
          <ContactCard whatsappHref={whatsappHref} />
        </main>
        <Footer />
      </LightboxProvider>
    </div>
  )
}

export function NextPage() {
  return (
    <PickStateProvider>
      <HomeBoard />
    </PickStateProvider>
  )
}

export default NextPage
