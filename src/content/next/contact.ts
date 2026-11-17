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
}

export const contactFacts: ContactFacts = {
  phoneDisplay: '082 878 1557',
  phoneTel: '+27828781557',
  whatsappNumber: '27828781557',
  email: 'info@winzelle.co.za',
  address: '10 King Place, Ben Kamma, Port Elizabeth, 6025',
  directionsUrl:
    'https://www.openstreetmap.org/directions?to=-33.9616%2C25.4920',
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
  submitStatus:
    "Thanks. We'll get back to you on the number or email you gave. (Prototype: nothing was sent.)",
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
