// Integrity checks for the /next content modules against the design spec
// (docs/design/home-page.md). Verbatim copy is asserted where #93 fixes the
// wording; the rest is structural so sections can rely on the data.

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { contactFacts, quoteForm } from './contact.ts'
import { fillerValues } from './filler.ts'
import {
  getWorkPhoto,
  openingPhotoIds,
  panelPhotoIdByTrade,
  photoCaption,
  photoImageUrls,
  workPhotos,
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

  it('composes captions as "Work, Suburb, Month Year"', () => {
    const captionShape = new RegExp(`^[^,]+, [^,]+, ${MONTHS} \\d{4}$`)
    for (const photo of workPhotos) {
      expect(photoCaption(photo)).toMatch(captionShape)
    }
  })

  it('flags every suburb and month as filler', () => {
    for (const photo of workPhotos) {
      expect(fillerValues.has(photo.suburb)).toBe(true)
      expect(fillerValues.has(photo.month)).toBe(true)
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
  it('flags the service-area line as filler', () => {
    expect(fillerValues.has(contactFacts.serviceArea)).toBe(true)
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
    expect(quoteForm.submitStatus).toBe(
      "Thanks. We'll get back to you on the number or email you gave. (Prototype: nothing was sent.)",
    )
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
    expect(fillerValues.size).toBeGreaterThan(0)
  })
})
