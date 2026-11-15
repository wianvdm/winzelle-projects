import { useEffect, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { contactSection, siteSettings } from '../content'

// Hidden while this section is in view: the fixed button covers its Business Hours card.
const CONTACT_SECTION_ID = 'quote'
const BASE_CLASSES =
  'fixed bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 rounded-full bg-green-500 text-white shadow-lg hover:bg-green-600 hover:scale-110 transition-all no-underline'
const HIDDEN_CLASSES = 'invisible opacity-0 pointer-events-none'

export function WhatsAppButton() {
  const [contactInView, setContactInView] = useState(false)
  const waNumber = siteSettings.whatsappNumber
  const waMessage = encodeURIComponent(contactSection.whatsappMessage)

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const contactSectionElement = document.getElementById(CONTACT_SECTION_ID)
    if (!contactSectionElement) return

    const observer = new IntersectionObserver(
      ([entry]) => setContactInView(entry.isIntersecting),
      { threshold: 0 },
    )
    observer.observe(contactSectionElement)
    return () => observer.disconnect()
  }, [])

  return (
    <a
      href={`https://wa.me/${waNumber}?text=${waMessage}`}
      target="_blank"
      rel="noopener noreferrer"
      className={
        contactInView ? `${BASE_CLASSES} ${HIDDEN_CLASSES}` : BASE_CLASSES
      }
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle size={28} />
    </a>
  )
}
