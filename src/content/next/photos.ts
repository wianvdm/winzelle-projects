// The converted photo set (spec S2 cluster, S3 explorer prints, S4 board).
// width/height record the intrinsic pixels so sections cap display at about
// 1.3x. Suburbs and months are filler() until #102 confirms them.
// Captions compose as "Work, Suburb, Month Year" via photoCaption().

import { filler, type Filler } from './filler.ts'
import type { TradeId } from './trades.ts'

export interface WorkPhoto {
  /** Base file name under /content/images/work/, without extension. */
  id: string
  width: number
  height: number
  alt: string
  /** Caption part: the work done, e.g. "Concrete apron and ramp". */
  work: string
  suburb: Filler
  month: Filler
  /** Trades this print belongs to (the board's data-kinds). */
  trades: TradeId[]
  /** Width of the "<id>-<width>" derivative, for prints shown much smaller. */
  smallWidth?: number
}

const WORK_IMAGES_BASE = '/content/images/work/'

// Verbatim S4 board order.
export const workPhotos: WorkPhoto[] = [
  {
    id: 'waterproof-roof',
    width: 779,
    height: 427,
    alt: 'A flat roof sealed with a silver coating, carried up over the parapet edge',
    work: 'Flat roof sealed and coated',
    suburb: filler('Newton Park'),
    month: filler('June 2025'),
    trades: ['damp', 'roofs'],
  },
  {
    id: 'kitchenette-l',
    width: 541,
    height: 395,
    alt: 'An L-shaped kitchenette with timber counters, white cupboards and black handles',
    work: 'Kitchenette fitted',
    suburb: filler('Sunridge Park'),
    month: filler('January 2026'),
    trades: ['kitchens'],
  },
  {
    id: 'roof-ridge-sealed',
    width: 268,
    height: 346,
    alt: 'A roof ridge and verge sealed and painted red along the tile edge',
    work: 'Ridge and verge sealed',
    suburb: filler('Lorraine'),
    month: filler('February 2026'),
    trades: ['roofs', 'damp'],
  },
  {
    id: 'wall-facebrick',
    width: 1400,
    height: 1050,
    alt: 'A face-brick boundary wall going up course by course, new bricks stacked beside it',
    work: 'Face-brick boundary wall going up',
    suburb: filler('Kabega'),
    month: filler('April 2026'),
    trades: ['walls'],
  },
  {
    id: 'paving-forecourt',
    width: 1400,
    height: 1050,
    alt: 'A new concrete apron and ramp at the door and gate of a face-brick building',
    work: 'Concrete apron and ramp',
    suburb: filler('Westering'),
    month: filler('August 2025'),
    trades: ['paving'],
    smallWidth: 800,
  },
  {
    id: 'bathroom-basin',
    width: 775,
    height: 424,
    alt: 'A white basin and toilet against tiled walls in a refreshed bathroom',
    work: 'Basin and toilet in a refreshed bathroom',
    suburb: filler('Walmer'),
    month: filler('March 2026'),
    trades: ['plumbing'],
  },
  {
    id: 'scaffolding-facade',
    width: 1400,
    height: 1050,
    alt: 'Scaffolding up along a building facade for repairs, city buildings behind',
    work: 'Scaffolding up for facade repairs',
    suburb: filler('Central'),
    month: filler('October 2025'),
    trades: ['cracks'],
  },
  {
    id: 'waterproof-curve',
    width: 580,
    height: 437,
    alt: 'A curved wall with a glass-block window, waterproofed and painted',
    work: 'Exterior waterproofing and paint',
    suburb: filler('Newton Park'),
    month: filler('June 2025'),
    trades: ['damp', 'painting'],
  },
  {
    id: 'kitchenette-sink',
    width: 543,
    height: 400,
    alt: 'A double stainless-steel sink set into a timber counter over white cupboards',
    work: 'Sink and cupboards fitted',
    suburb: filler('Sunridge Park'),
    month: filler('January 2026'),
    trades: ['kitchens', 'plumbing'],
  },
  {
    id: 'roof-verge-paint',
    width: 1050,
    height: 1400,
    alt: 'A tiled roof with the verge and ridge freshly painted red, beside a chimney',
    work: 'Roof verge and ridge painted',
    suburb: filler('Charlo'),
    month: filler('July 2025'),
    trades: ['roofs', 'painting'],
    smallWidth: 800,
  },
  {
    id: 'paving-kerb',
    width: 1050,
    height: 1400,
    alt: 'A channel dug beside a paved walkway, new kerbs going in along the road edge',
    work: 'Channel and kerbs going in',
    suburb: filler('Fairview'),
    month: filler('March 2026'),
    trades: ['paving'],
  },
  {
    id: 'bathroom-bath',
    width: 783,
    height: 432,
    alt: 'A bathroom after mould treatment, the bath and wall tiles clean',
    work: 'Bathroom mould treated',
    suburb: filler('Walmer'),
    month: filler('March 2026'),
    trades: ['damp'],
  },
  {
    id: 'ceiling-fan',
    width: 547,
    height: 397,
    alt: 'New white ceiling boards in a room, a ceiling fan in the middle',
    work: 'New ceiling boards',
    suburb: filler('Walmer'),
    month: filler('March 2026'),
    trades: ['kitchens'],
  },
  {
    id: 'waterproof-wall',
    width: 583,
    height: 440,
    alt: 'A long exterior wall with windows, waterproofed and painted',
    work: 'Walls waterproofed and painted',
    suburb: filler('Newton Park'),
    month: filler('June 2025'),
    trades: ['painting', 'damp'],
  },
]

/** S2 opening cluster, in pinned order. */
export const openingPhotoIds = [
  'paving-forecourt',
  'roof-verge-paint',
  'kitchenette-l',
  'waterproof-curve',
] as const

/** S3 explorer footer print per trade; pools and other have none. */
export const panelPhotoIdByTrade: Partial<Record<TradeId, string>> = {
  paving: 'paving-kerb',
  walls: 'wall-facebrick',
  roofs: 'roof-ridge-sealed',
  damp: 'waterproof-roof',
  cracks: 'scaffolding-facade',
  painting: 'waterproof-wall',
  kitchens: 'kitchenette-sink',
  plumbing: 'bathroom-basin',
}

export function photoCaption(photo: WorkPhoto): string {
  return `${photo.work}, ${photo.suburb}, ${photo.month}`
}

export function photoImageUrls(photo: WorkPhoto): {
  avif: string
  webp: string
} {
  return {
    avif: `${WORK_IMAGES_BASE}${photo.id}.avif`,
    webp: `${WORK_IMAGES_BASE}${photo.id}.webp`,
  }
}

/** srcset strings (w descriptors) listing the derivative before the full file. */
export function photoSourceSets(photo: WorkPhoto): {
  avif: string
  webp: string
} {
  const base = `${WORK_IMAGES_BASE}${photo.id}`
  const sourceSet = (extension: string) => {
    const full = `${base}.${extension} ${photo.width}w`
    if (!photo.smallWidth) return full
    return `${base}-${photo.smallWidth}.${extension} ${photo.smallWidth}w, ${full}`
  }
  return { avif: sourceSet('avif'), webp: sourceSet('webp') }
}

export function getWorkPhoto(id: string): WorkPhoto {
  const photo = workPhotos.find((candidate) => candidate.id === id)
  if (!photo) throw new Error(`Unknown work photo: ${id}`)
  return photo
}

/** Section-level copy for "Our work" (spec S4). */
export const ourWork = {
  heading: 'Our work',
  introLine:
    'Photos from our own jobs, taken on our phones. Pick a kind of work, or open a photo to see it larger.',
  allFilterLabel: 'All our work',
  facebookNote: 'A few of our jobs. There are more on Facebook.',
  facebookCtaLabel: 'See more of our work on Facebook',
  lightboxFacebookLabel: 'More of our work on Facebook',
  askLeadMany: 'Want work like one of these?',
  askLeadSingle: 'Want work like this?',
  askText: 'Send us a photo of the spot and your suburb.',
}
