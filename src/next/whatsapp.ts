// WhatsApp click-to-chat links (spec "WhatsApp message rules"). Every link
// is https://wa.me/<number>?text=<encodeURIComponent(message)> and every
// message ends with MESSAGE_ENDING. Labels stay short and general
// (whatsappLabels in src/content/next/contact.ts); the picked trade or photo
// only ever goes in the message, never in a label.

import { contactFacts } from '../content/next/contact.ts'
import type { Trade } from '../content/next/trades.ts'

const MESSAGE_ENDING = " I'll send a photo. My suburb is: "

export function buildWhatsAppLink(message: string): string {
  const number = contactFacts.whatsappNumber
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}

/** Default message for the hero, sticky bar and contact card. */
export function defaultMessage(): string {
  return (
    'Hello Winzelle, please come and look at a job at my property.' +
    MESSAGE_ENDING
  )
}

export function storyMessage(): string {
  return (
    'Hello Winzelle, I have some maintenance or building work for the family to look at.' +
    MESSAGE_ENDING
  )
}

export function unsureMessage(): string {
  return (
    "Hello Winzelle, I'm not sure what kind of work my job needs." +
    MESSAGE_ENDING
  )
}

/** Message once a trade is picked; updates hero, sticky, panel, contact, story. */
export function tradeMessage(trade: Trade): string {
  if (trade.id === 'other') {
    return (
      "Hello Winzelle, I have a job that isn't on your list." + MESSAGE_ENDING
    )
  }
  return `Hello Winzelle, I need help with ${trade.noun}.` + MESSAGE_ENDING
}

/** Our work ask card: null trade means the unfiltered "All our work" board. */
export function workMessage(trade: Trade | null): string {
  if (!trade) {
    return (
      'Hello Winzelle, I saw your photos and I have a job like those.' +
      MESSAGE_ENDING
    )
  }
  if (trade.id === 'other') {
    return (
      "Hello Winzelle, I saw your photos and I have a job that isn't on your list." +
      MESSAGE_ENDING
    )
  }
  return (
    `Hello Winzelle, I saw your photos and I need help with ${trade.noun}.` +
    MESSAGE_ENDING
  )
}

/** Lightbox message quoting the viewed photo's caption. */
export function photoMessage(caption: string): string {
  return (
    `Hello Winzelle, I saw your photo “${caption}”. I'd like to ask about a job like this.` +
    MESSAGE_ENDING
  )
}
