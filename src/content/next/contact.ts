// Contact facts, the fallback form strings (spec S6) and the footer (S7).
// The service-area sentence is filler() until #102 confirms it. The phone
// number has exactly one display format and one tel: format, used everywhere.

import { filler, type Filler } from './filler.ts'

export interface ContactFacts {
  phoneDisplay: string
  phoneTel: string
  whatsappNumber: string
  email: string
  address: string
  directionsUrl: string
  facebookUrl: string
  facebookLabel: string
  serviceArea: Filler
  contactLead: string
  contactHeading: string
  mapTag: string
  mapCaption: string
  mapLinkLabel: string
  mapAttribution: string
  mapAttributionUrl: string
  mapShowLabel: string
  mapShowNote: string
  mapFailedNote: string
  mapRegionLabel: string
  mapPinLabel: string
}

/** The pin on the map print and the end point of the directions link. */
export const mapPin = { latitude: -33.9616, longitude: 25.492 } as const

const COORDINATE_DECIMALS = 4

export const contactFacts: ContactFacts = {
  phoneDisplay: '082 878 1557',
  phoneTel: '+27828781557',
  whatsappNumber: '27828781557',
  email: 'info@winzelle.co.za',
  address: '10 King Place, Ben Kamma, Port Elizabeth, 6025',
  directionsUrl: `https://www.openstreetmap.org/directions?to=${mapPin.latitude.toFixed(COORDINATE_DECIMALS)}%2C${mapPin.longitude.toFixed(COORDINATE_DECIMALS)}`,
  facebookUrl: 'https://www.facebook.com/winzelleprojects',
  facebookLabel: 'facebook.com/winzelleprojects',
  serviceArea: filler(
    'We work across Port Elizabeth (Gqeberha), and most of Nelson Mandela Bay depending on the job.',
  ),
  contactLead:
    "WhatsApp is quickest. Send a photo and your suburb and we'll arrange a time to come and look.",
  contactHeading: 'Tell us what needs doing',
  mapTag: '10 King Place: get directions',
  mapCaption: 'Ben Kamma, near Walker Drive.',
  mapLinkLabel:
    'Directions to 10 King Place, Ben Kamma, on OpenStreetMap (opens in a new tab)',
  mapAttribution: '© OpenStreetMap contributors',
  mapAttributionUrl: 'https://www.openstreetmap.org/copyright',
  mapShowLabel: 'Show the map',
  mapShowNote: 'The map loads from OpenStreetMap.',
  mapFailedNote: 'The map did not load. Try again, or use the directions.',
  mapRegionLabel:
    'Map around 10 King Place, Ben Kamma. Arrow keys move it; plus and minus zoom.',
  mapPinLabel: 'Winzelle Projects, 10 King Place, Ben Kamma',
}

/** Button labels stay short and general; context goes in the message. */
export const whatsappLabels = {
  general: 'WhatsApp us',
  withPhoto: 'WhatsApp us a photo',
} as const

/** Fallback quote form strings (spec S6), verbatim. */
export const quoteForm = {
  heading: 'Rather leave a message?',
  note: 'Add a phone number, an email, or both, and what needs doing.',
  nameLabel: 'Your name',
  phoneLabel: 'Phone number',
  emailLabel: 'Email',
  jobLabel: 'What needs doing, and where',
  submitLabel: 'Send message',
  phonePattern: '^\\+?[0-9][0-9 ()-]{8,15}$',
  minPhoneDigits: 9,
  maxPhoneDigits: 12,
  emailPattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$',
  errors: {
    noContact: 'Add a number or email so we can reach you.',
    phoneHasLetters:
      'That phone number has letters in it. Use digits only, with spaces if you like.',
    phoneBadShape:
      'That phone number looks too short or too long. Check it and try again.',
    emailBadShape:
      "That doesn't look like a full email address (for example name@example.co.za).",
    emailMissingAt: 'That email address is missing an @ or the part after it.',
    jobEmpty: 'Tell us in a few words what needs doing.',
  },
  honeypotLabel: 'Leave this box unticked',
  sendingStatus: 'Sending your message…',
  successStatus:
    "Thanks, your message is on its way. We'll get back to you on the number or email you gave.",
  // The phone number sits between these two parts as a tel: link.
  failureStatusBefore: "Your message didn't send. Phone us on ",
  failureStatusAfter: ', or try again.',
  subject: 'Website message',
  noTradePicked: 'Not picked',
  fromName: 'Winzelle Projects website',
} as const

/** Privacy notes (spec S6): at the form, and beside the main WhatsApp actions. */
export const privacyNotes = {
  form: 'Your details come to us, Winzelle Projects, and we use them only to reply to this message, never for marketing. Giving them is up to you. The form sends them through Web3Forms, a service outside South Africa. If you press Show the map, your browser loads it from OpenStreetMap.',
  whatsapp: 'WhatsApp is run by Meta.',
} as const

/** Footer title block and base row (spec S7). */
export const footer = {
  claims: [
    'Family-run.',
    'NHBRC registered.',
    'Free consultations and quotes.',
  ],
  addressLabel: 'Address',
  areaLabel: 'Area',
  phoneLabel: 'Phone',
  emailLabel: 'Email',
  facebookLabel: 'Facebook',
  pageLinksLabel: 'On this page',
  copyright: '© 2026 Winzelle Projects',
  backToTopLabel: 'Back to top',
} as const
