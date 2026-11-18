// Page-level copy: the header and sticky bar (spec S1) and the opening
// screen (S2). Section copy lives in the sibling modules re-exported here.

export * from './filler.ts'
export * from './trades.ts'
export * from './photos.ts'
export * from './story.ts'
export * from './contact.ts'

export const companyName = 'Winzelle Projects'

/** Anchor links shared by the header, sticky bar and footer. */
export const pageNavLinks = [
  { label: 'What needs doing', href: '#wz-what' },
  { label: 'Our work', href: '#wz-work' },
  { label: 'Our story', href: '#wz-story' },
  { label: 'Contact', href: '#wz-contact' },
] as const

export const header = {
  logoAlt:
    'Winzelle Projects logo: building tools forming a W, with Jos 1:9, Wees sterk en vasberade',
  tradeSummary: 'Maintenance, repairs and building. Family-run.',
  callButtonLabel: 'Call',
} as const

export const opening = {
  headline: 'We fix, maintain and build in Port Elizabeth.',
  subtitle:
    'Paving, walls, roofs, waterproofing, painting, kitchens, and small plumbing and electrical jobs, for homes, body corporates and small businesses.',
  phoneLeadIn: 'or phone',
  freeQuoteNote: 'The visit and the quote are free.',
  sealLabel: 'Stamp: NHBRC registered',
  sealLines: ['registered', 'NHBRC', 'home builder'],
  // Registration number, to be supplied later; while empty the stamp and
  // footer claims stay exactly as the spec's S2/S7 wording.
  nhbrcNumber: '',
} as const
