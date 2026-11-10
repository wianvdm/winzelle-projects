import { MessageCircle } from 'lucide-react'
import { siteSettings } from '../content'

export function WhatsAppButton() {
  const waNumber = siteSettings.whatsappNumber

  return (
    <a
      href={`https://wa.me/${waNumber}?text=Hi%2C%20I'd%20like%20a%20quote%20for...`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 rounded-full bg-green-500 text-white shadow-lg hover:bg-green-600 hover:scale-110 transition-all no-underline"
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle size={28} />
    </a>
  )
}
