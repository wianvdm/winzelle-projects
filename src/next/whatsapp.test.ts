import { describe, expect, it } from 'vitest'

import { contactFacts } from '../content/next/contact.ts'
import { getTrade, trades, type TradeId } from '../content/next/trades.ts'
import {
  photoCaption,
  workPhotos,
  type WorkPhoto,
} from '../content/next/photos.ts'
import {
  buildWhatsAppLink,
  defaultMessage,
  photoMessage,
  storyMessage,
  tradeMessage,
  unsureMessage,
  workMessage,
} from './whatsapp.ts'

const ENDING = " I'll send a photo. My suburb is: "

function linkOf(message: string): string {
  return `https://wa.me/27828781557?text=${encodeURIComponent(message)}`
}

describe('whatsapp message builder', () => {
  it('keeps one phone format: display, tel and wa.me number from one source', () => {
    expect(contactFacts.phoneDisplay).toBe('082 878 1557')
    expect(contactFacts.phoneTel).toBe('+27828781557')
    expect(contactFacts.whatsappNumber).toBe('27828781557')
    expect(
      buildWhatsAppLink(defaultMessage()).startsWith(
        'https://wa.me/27828781557?text=',
      ),
    ).toBe(true)
  })

  it('builds the default message used by hero, sticky and contact', () => {
    const message =
      'Hello Winzelle, please come and look at a job at my property.' + ENDING
    expect(defaultMessage()).toBe(message)
    expect(buildWhatsAppLink(defaultMessage())).toBe(linkOf(message))
  })

  it('builds the story message', () => {
    expect(storyMessage()).toBe(
      'Hello Winzelle, I have some maintenance or building work for the family to look at.' +
        ENDING,
    )
  })

  it('builds the unsure card message', () => {
    expect(unsureMessage()).toBe(
      "Hello Winzelle, I'm not sure what kind of work my job needs." + ENDING,
    )
  })

  it.each(trades.map((trade) => [trade.id, trade.noun] as [TradeId, string]))(
    'builds the picked-trade message for %s',
    (id, noun) => {
      const trade = getTrade(id)
      const expected =
        id === 'other'
          ? "Hello Winzelle, I have a job that isn't on your list." + ENDING
          : `Hello Winzelle, I need help with ${noun}.` + ENDING
      expect(tradeMessage(trade)).toBe(expected)
      expect(buildWhatsAppLink(tradeMessage(trade))).toBe(linkOf(expected))
    },
  )

  it('builds the board-wide and "other" work-board messages', () => {
    expect(workMessage(null)).toBe(
      'Hello Winzelle, I saw your photos and I have a job like those.' + ENDING,
    )
    expect(workMessage(getTrade('other'))).toBe(
      "Hello Winzelle, I saw your photos and I have a job that isn't on your list." +
        ENDING,
    )
  })

  it.each(
    trades
      .filter((trade) => trade.id !== 'other')
      .map((trade) => [trade.id, trade.noun] as [TradeId, string]),
  )('builds the filtered work-board message for %s', (id, noun) => {
    const expected =
      `Hello Winzelle, I saw your photos and I need help with ${noun}.` + ENDING
    expect(workMessage(getTrade(id))).toBe(expected)
    expect(buildWhatsAppLink(workMessage(getTrade(id)))).toBe(linkOf(expected))
  })

  it.each(workPhotos.map((photo) => [photo.id, photo] as [string, WorkPhoto]))(
    'builds the lightbox message quoting the %s caption',
    (_id, photo) => {
      const caption = photoCaption(photo)
      expect(caption.length).toBeGreaterThan(0)
      expect(photoMessage(caption)).toBe(
        `Hello Winzelle, I saw your photo “${caption}”. I'd like to ask about a job like this.` +
          ENDING,
      )
    },
  )

  it('URL-encodes spaces, ampersands, quotes and accented characters', () => {
    const link = buildWhatsAppLink(
      photoMessage('Walls waterproofed & painted, Café Bé, June 2025'),
    )
    expect(link).toContain('%20')
    expect(link).not.toContain(' ')
    expect(link).toContain('%26')
    expect(link).toContain(encodeURIComponent('“'))
    expect(link).toContain(encodeURIComponent('é'))
  })

  it('ends every message with the suburb prompt', () => {
    const messages = [
      defaultMessage(),
      storyMessage(),
      unsureMessage(),
      ...trades.map((trade) => tradeMessage(trade)),
      workMessage(null),
      workMessage(getTrade('pools')),
      photoMessage('Any caption'),
    ]
    for (const message of messages) {
      expect(message.endsWith(ENDING)).toBe(true)
    }
  })
})
