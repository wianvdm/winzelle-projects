// Integrity checks for the home page content modules against the design spec
// (docs/design/home-page.md). Verbatim copy is asserted where #93 fixes the
// wording; the rest is structural so sections can rely on the data.

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { contactFacts, mapPin, privacyNotes, quoteForm } from './contact.ts'
import { filler, fillerValues } from './filler.ts'
import { opening } from './index.ts'
import {
  getWorkPhoto,
  openingPhotoIds,
  panelPhotoIdByTrade,
  photoCaption,
  photoImageUrls,
  photoSourceSets,
  workPhotos,
  workPhotosFor,
} from './photos.ts'
import { getTrade, trades } from './trades.ts'

const TRADE_ORDER = [
  'paving',
  'walls',
  'roofs',
  'damp',
  'cracks',
  'painting',
  'kitchens',
  'plumbing',
  'pools',
  'other',
]

const MONTHS =
  '(January|February|March|April|May|June|July|August|September|October|November|December)'

// A street address looks like "10 King Place"; captions and alt text may only
// name the work, suburb and month. Client names are proper nouns we cannot
// list, so the shape check plus the suburb/month composition is the guard.
const STREET_ADDRESS =
  /\b\d+\s+[A-Z][a-z]+\s+(Street|Road|Avenue|Drive|Place|Lane|Close|Way)\b/

describe('trades catalogue', () => {
  it('lists the ten trades in the spec order', () => {
    expect(trades.map((trade) => trade.id)).toEqual(TRADE_ORDER)
  })

  it('uses the small plumbing and electrical line word for word', () => {
    expect(getTrade('plumbing').involves).toBe(
      "Small plumbing and electrical jobs: fitting toilets, basins, shower heads and baths; replacing plugs and light fittings. For work that needs a certificate of compliance, we'll point you to a registered electrician or plumber.",
    )
  })

  it('gives every trade a label, noun, line, involves copy and a drawing', () => {
    for (const trade of trades) {
      expect(trade.label.length).toBeGreaterThan(0)
      expect(trade.noun.length).toBeGreaterThan(0)
      expect(trade.line.length).toBeGreaterThan(0)
      expect(trade.involves.length).toBeGreaterThan(0)
      expect(trade.drawing.name.length).toBeGreaterThan(0)
      expect(trade.drawing.title.length).toBeGreaterThan(0)
      expect(['section', 'elevation']).toContain(trade.drawing.view)
      expect(trade.drawing.problemNote.length).toBeGreaterThan(0)
      expect(trade.drawing.fixedNote.length).toBeGreaterThan(0)
      expect(trade.drawing.parts.length).toBeGreaterThanOrEqual(3)
      for (const part of trade.drawing.parts) {
        expect(part.key).toMatch(/^[a-d]$/)
        expect(part.name.length).toBeGreaterThan(0)
        expect(part.note.length).toBeGreaterThan(0)
      }
    }
  })

  it('marks pools and other with fallback notes and no-photos status', () => {
    for (const id of ['pools', 'other'] as const) {
      const trade = getTrade(id)
      expect(trade.noPhotoFallbackNote).toBeTruthy()
      expect(trade.noPhotosStatus).toBeTruthy()
      expect(panelPhotoIdByTrade[id]).toBeUndefined()
    }
  })
})

describe('work photos', () => {
  it('holds the fourteen board prints with intrinsic sizes and converted files', () => {
    expect(workPhotos).toHaveLength(14)
    for (const photo of workPhotos) {
      expect(photo.width).toBeGreaterThan(0)
      expect(photo.height).toBeGreaterThan(0)
      const urls = photoImageUrls(photo)
      for (const url of [urls.avif, urls.webp]) {
        expect(url.startsWith('/content/images/work/')).toBe(true)
        expect(existsSync(join(process.cwd(), 'public', url))).toBe(true)
      }
    }
  })

  it('lists a converted derivative for every photo much larger than its print', () => {
    for (const photo of workPhotos) {
      if (Math.max(photo.width, photo.height) < 1050) continue
      expect(photo.smallWidth).toBe(800)
      const sets = photoSourceSets(photo)
      for (const set of [sets.avif, sets.webp]) {
        const url = set.split(' ')[0]
        expect(url).toMatch(/-800\.(avif|webp)$/)
        expect(existsSync(join(process.cwd(), 'public', url))).toBe(true)
      }
    }
  })

  it('composes captions as "Work, Suburb, Month Year"', () => {
    const captionShape = new RegExp(`^[^,]+, [^,]+, ${MONTHS} \\d{4}$`)
    for (const photo of workPhotos) {
      expect(photoCaption(photo)).toMatch(captionShape)
    }
  })

  it('keeps every suburb and month as confirmed, unflagged strings', () => {
    for (const photo of workPhotos) {
      expect(photo.suburb.length).toBeGreaterThan(0)
      expect(photo.month.length).toBeGreaterThan(0)
      expect(fillerValues.has(photo.suburb)).toBe(false)
      expect(fillerValues.has(photo.month)).toBe(false)
    }
  })

  it('keeps file names, alt text and captions free of street addresses', () => {
    for (const photo of workPhotos) {
      expect(photo.id).toMatch(/^[a-z]+(-[a-z]+)*$/)
      expect(photo.id).not.toMatch(STREET_ADDRESS)
      expect(photo.alt).not.toMatch(STREET_ADDRESS)
      expect(photoCaption(photo)).not.toMatch(STREET_ADDRESS)
    }
  })

  it('maps every board print to at least one trade that exists', () => {
    const ids = new Set(trades.map((trade) => trade.id))
    for (const photo of workPhotos) {
      expect(photo.trades.length).toBeGreaterThan(0)
      for (const tradeId of photo.trades) {
        expect(ids.has(tradeId)).toBe(true)
      }
    }
  })

  it('picks the board prints for a trade in board order, or all of them', () => {
    expect(workPhotosFor(null)).toEqual(workPhotos)
    expect(workPhotosFor('paving').map((photo) => photo.id)).toEqual([
      'paving-forecourt',
      'paving-kerb',
    ])
    expect(workPhotosFor('pools')).toEqual([])
  })

  it('pins the four opening prints and one panel print per trade with photos', () => {
    expect(openingPhotoIds).toHaveLength(4)
    for (const id of openingPhotoIds) {
      expect(getWorkPhoto(id).id).toBe(id)
    }
    for (const trade of trades) {
      const panelId = panelPhotoIdByTrade[trade.id]
      if (trade.noPhotoFallbackNote) {
        expect(panelId).toBeUndefined()
        continue
      }
      expect(panelId).toBeTruthy()
      expect(getWorkPhoto(panelId as string).trades).toContain(trade.id)
    }
  })
})

describe('contact facts and form strings', () => {
  it('points the directions link at the map pin, to four decimals', () => {
    expect(mapPin).toEqual({ latitude: -33.9616, longitude: 25.492 })
    expect(contactFacts.directionsUrl).toBe(
      'https://www.openstreetmap.org/directions?to=-33.9616%2C25.4920',
    )
  })

  it('keeps the map print strings and the OSM copyright link', () => {
    expect(contactFacts.mapTag).toBe('10 King Place: get directions')
    expect(contactFacts.mapCaption).toBe('Ben Kamma, near Walker Drive.')
    expect(contactFacts.mapAttribution).toBe('© OpenStreetMap contributors')
    expect(contactFacts.mapAttributionUrl).toBe(
      'https://www.openstreetmap.org/copyright',
    )
    expect(contactFacts.mapShowLabel).toBe('Show the map')
    expect(contactFacts.mapShowNote).toContain('OpenStreetMap')
  })

  it('keeps the service-area line as confirmed copy and the form statuses as real copy', () => {
    expect(contactFacts.serviceArea).toBe(
      'We work across Port Elizabeth (Gqeberha), and most of Nelson Mandela Bay depending on the job.',
    )
    expect(fillerValues.has(contactFacts.serviceArea)).toBe(false)
    expect(fillerValues.has(quoteForm.successStatus)).toBe(false)
    expect(quoteForm.successStatus).not.toContain('Prototype')
  })

  it('names who gets the form details, why, and where they go', () => {
    expect(privacyNotes.form).toContain('Winzelle Projects')
    expect(privacyNotes.form).toContain('only to reply to this message')
    expect(privacyNotes.form).toContain('never for marketing')
    expect(privacyNotes.form).toContain('up to you')
    expect(privacyNotes.form).toContain(
      'Web3Forms, a service outside South Africa',
    )
    expect(privacyNotes.form).toContain('OpenStreetMap')
    expect(privacyNotes.whatsapp).toBe('WhatsApp is run by Meta.')
  })

  it('keeps the verbatim form error and status strings', () => {
    expect(quoteForm.errors.noContact).toBe(
      'Add a number or email so we can reach you.',
    )
    expect(quoteForm.errors.phoneHasLetters).toBe(
      'That phone number has letters in it. Use digits only, with spaces if you like.',
    )
    expect(quoteForm.errors.phoneBadShape).toBe(
      'That phone number looks too short or too long. Check it and try again.',
    )
    expect(quoteForm.errors.emailBadShape).toBe(
      "That doesn't look like a full email address (for example name@example.co.za).",
    )
    expect(quoteForm.errors.emailMissingAt).toBe(
      'That email address is missing an @ or the part after it.',
    )
    expect(quoteForm.errors.jobEmpty).toBe(
      'Tell us in a few words what needs doing.',
    )
    expect(quoteForm.successStatus).toBe(
      "Thanks, your message is on its way. We'll get back to you on the number or email you gave.",
    )
    expect(
      `${quoteForm.failureStatusBefore}${contactFacts.phoneDisplay}${quoteForm.failureStatusAfter}`,
    ).toBe("Your message didn't send. Phone us on 082 878 1557, or try again.")
  })

  it('compiles the documented phone and email patterns', () => {
    expect(new RegExp(quoteForm.phonePattern).test('082 878 1557')).toBe(true)
    expect(new RegExp(quoteForm.phonePattern).test('082')).toBe(false)
    expect(new RegExp(quoteForm.emailPattern).test('info@winzelle.co.za')).toBe(
      true,
    )
  })
})

describe('filler marker', () => {
  it('registers marked values so tests and the build guard can find them', () => {
    const flagged = filler('Only a test placeholder')
    expect(fillerValues.has(flagged)).toBe(true)
  })
})

describe('NHBRC registration number slot', () => {
  it('holds no number or one of up to ten digits, with the claims unchanged', () => {
    // Ten digits is the most the stamp's inner ring fits.
    expect(opening.nhbrcNumber).toMatch(/^\d{0,10}$/)
    expect(opening.sealLabel).toBe('Stamp: NHBRC registered')
    expect(opening.sealLines).toEqual(['registered', 'NHBRC', 'home builder'])
  })
})
