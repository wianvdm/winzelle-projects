// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  contactFacts,
  getTrade,
  getWorkPhoto,
  openingPhotoIds,
  photoCaption,
  trades,
  workPhotos,
  workPhotosFor,
  type Trade,
} from '../../content/next/index.ts'
import { HomeBoard } from '../NextPage.tsx'
import { PickStateProvider } from '../pick-state.tsx'
import { buildWhatsAppLink, photoMessage, workMessage } from '../whatsapp.ts'

const TOTAL_PRINTS = workPhotos.length

// jsdom has no modal dialogs: open and close toggle the attribute and fire
// the close event like a browser does.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close() {
    if (!this.hasAttribute('open')) return
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
})

beforeEach(() => {
  window.scrollBy = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function renderPage() {
  return render(
    <PickStateProvider>
      <HomeBoard />
    </PickStateProvider>,
  )
}

function board(): HTMLElement {
  return document.getElementById('wz-prints') as HTMLElement
}

function shownPrints(): HTMLElement[] {
  return [...board().querySelectorAll<HTMLElement>('figure')].filter(
    (print) => !print.hidden,
  )
}

function shownCaptions(): string[] {
  return shownPrints().map(
    (print) => print.querySelector('figcaption')?.textContent ?? '',
  )
}

function tags(): HTMLElement {
  return screen.getByRole('group', { name: 'Show our work by kind' })
}

function tag(label: string): HTMLElement {
  return within(tags()).getByRole('button', { name: label })
}

function pickTile(trade: Trade) {
  const tiles = screen.getByRole('group', { name: 'Kinds of work' })
  fireEvent.click(within(tiles).getByRole('button', { name: trade.label }))
}

function status(): string {
  return document.querySelector('.wz-work-status')?.textContent ?? ''
}

function askHref(): string | null {
  return document.getElementById('wz-work-wa')?.getAttribute('href') ?? null
}

function dialog(): HTMLDialogElement {
  return document.getElementById('wz-lightbox') as HTMLDialogElement
}

function openerFor(container: Element, caption: string): HTMLElement {
  return within(container as HTMLElement).getByRole('button', {
    name: `Open photo: ${caption}`,
  })
}

function lightboxCaption(): string {
  return dialog().querySelector('.wz-lb-caption-text')?.textContent ?? ''
}

function lightboxCount(): string {
  return dialog().querySelector('.wz-lb-count')?.textContent ?? ''
}

describe('Our work board', () => {
  it('pins the fourteen prints in board order with alt text and captions', () => {
    renderPage()

    expect(shownCaptions()).toEqual(workPhotos.map(photoCaption))
    const alts = shownPrints().map((print) => print.querySelector('img')?.alt)
    expect(alts).toEqual(workPhotos.map((photo) => photo.alt))
  })

  it('spreads the opening photos out and keeps them off the last row', () => {
    const positions = openingPhotoIds
      .map((id) => workPhotos.findIndex((photo) => photo.id === id))
      .sort((a, b) => a - b)

    for (let i = 1; i < positions.length; i++) {
      expect(positions[i] - positions[i - 1]).toBeGreaterThan(1)
    }
    // The last row holds at most three prints at any width.
    expect(Math.max(...positions)).toBeLessThan(TOTAL_PRINTS - 3)
  })

  it('opens unfiltered with "All our work" pressed and no status', () => {
    renderPage()

    expect(tag('All our work').getAttribute('aria-pressed')).toBe('true')
    expect(shownPrints()).toHaveLength(TOTAL_PRINTS)
    expect(status()).toBe('')
    expect(askHref()).toBe(buildWhatsAppLink(workMessage(null)))
  })

  it('tags "All our work" and every trade with photos, in picker order', () => {
    renderPage()

    const labels = within(tags())
      .getAllByRole('button')
      .map((button) => button.textContent)
    const withPhotos = trades.filter(
      (trade) => workPhotosFor(trade.id).length > 0,
    )
    expect(labels).toEqual([
      'All our work',
      ...withPhotos.map((trade) => trade.label),
    ])
    expect(withPhotos.map((trade) => trade.id)).not.toContain('pools')
    expect(withPhotos.map((trade) => trade.id)).not.toContain('other')
  })

  it('agrees on the count for every trade, from a tile or from its tag', () => {
    renderPage()

    for (const trade of trades) {
      const expected = workPhotosFor(trade.id)
      pickTile(trade)
      const fromTile = { captions: shownCaptions(), status: status() }

      if (!expected.length) {
        expect(fromTile.captions).toHaveLength(TOTAL_PRINTS)
        expect(fromTile.status).toBe(trade.noPhotosStatus)
        expect(tag('All our work').getAttribute('aria-pressed')).toBe('true')
        continue
      }

      expect(fromTile.captions).toEqual(expected.map(photoCaption))
      const noun = expected.length === 1 ? 'photo' : 'photos'
      expect(fromTile.status).toBe(`${trade.label}: ${expected.length} ${noun}`)
      expect(tag(trade.label).getAttribute('aria-pressed')).toBe('true')

      fireEvent.click(tag('All our work'))
      expect(shownPrints()).toHaveLength(TOTAL_PRINTS)
      fireEvent.click(tag(trade.label))
      expect({ captions: shownCaptions(), status: status() }).toEqual(fromTile)
    }
  })

  it('keeps a trade with no photos in the ask while showing all our work', () => {
    renderPage()

    pickTile(getTrade('pools'))
    expect(shownPrints()).toHaveLength(TOTAL_PRINTS)
    expect(askHref()).toBe(buildWhatsAppLink(workMessage(getTrade('pools'))))

    pickTile(getTrade('other'))
    expect(askHref()).toBe(buildWhatsAppLink(workMessage(getTrade('other'))))
  })

  it('names the tag in the ask, and nothing for "All our work"', () => {
    renderPage()

    fireEvent.click(tag('Roofs'))
    expect(askHref()).toBe(buildWhatsAppLink(workMessage(getTrade('roofs'))))

    fireEvent.click(tag('All our work'))
    expect(askHref()).toBe(buildWhatsAppLink(workMessage(null)))
    expect(status()).toBe('')
  })

  it('filters the board again when the same tile is picked after a tag', () => {
    renderPage()

    pickTile(getTrade('roofs'))
    fireEvent.click(tag('All our work'))
    expect(shownPrints()).toHaveLength(TOTAL_PRINTS)

    pickTile(getTrade('roofs'))
    expect(shownCaptions()).toEqual(workPhotosFor('roofs').map(photoCaption))
  })

  it('asks about "work like this" when one photo shows', () => {
    renderPage()
    const lead = () => document.getElementById('wz-work-ask-lead')?.textContent

    expect(lead()).toBe('Want work like one of these?')
    fireEvent.click(tag('Walls and building'))
    expect(shownPrints()).toHaveLength(1)
    expect(lead()).toBe('Want work like this?')
    fireEvent.click(tag('Paving'))
    expect(lead()).toBe('Want work like one of these?')
  })

  it('links to Facebook from the label sheet', () => {
    renderPage()

    expect(
      screen.getByText('A few of our jobs. There are more on Facebook.'),
    ).toBeDefined()
    const link = screen.getByRole('link', {
      name: 'See more of our work on Facebook',
    })
    expect(link.getAttribute('href')).toBe(contactFacts.facebookUrl)
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener')
  })

  it('shows few prints larger, never above 1.3x their pixels', () => {
    renderPage()
    Object.defineProperty(board(), 'clientWidth', { value: 782 })
    const print = (id: string) =>
      board().querySelector(`.wz-work-${id}`) as HTMLElement
    const widthOf = (id: string) => print(id).style.width
    // The AVIF <source> and the <img>: the browser picks from the source.
    const sizesOf = (id: string) =>
      [...print(id).querySelectorAll('source, img')].map((candidate) =>
        candidate.getAttribute('sizes'),
      )

    fireEvent.click(tag('Walls and building'))
    // One print: the 560px cap, under the column and the pixel limit.
    expect(widthOf('wall-facebrick')).toBe('560px')
    // The enlarged print names its own width for the srcset pick.
    expect(sizesOf('wall-facebrick')).toEqual(['560px', '560px'])

    fireEvent.click(tag('Roofs'))
    // Two to a row share 371px; the 268px ridge photo stops at 1.3x plus
    // the print's paper (jsdom computes no aspect, so the 4:3 default).
    expect(widthOf('waterproof-roof')).toBe('371px')
    expect(widthOf('roof-ridge-sealed')).toBe(
      `${Math.floor(getWorkPhoto('roof-ridge-sealed').width * 1.3 + 20)}px`,
    )

    fireEvent.click(tag('All our work'))
    expect(widthOf('waterproof-roof')).toBe('')
    // Back on the full board the prints carry the board sizes again.
    expect(sizesOf('waterproof-roof')).toEqual([
      '(max-width: 1099px) 50vw, 280px',
      '(max-width: 1099px) 50vw, 280px',
    ])
  })

  it('scrolls the matches into view from a tag when they sit above the window', () => {
    renderPage()
    fireEvent.click(tag('Paving'))
    // jsdom lays everything out at 0, under the sticky bar's clearance.
    expect(window.scrollBy).toHaveBeenCalled()
  })

  it('renders without inline styles', () => {
    const { container } = renderPage()
    expect(container.querySelector('[style]')).toBeNull()
  })
})

describe('Lightbox', () => {
  it('opens a board print with its caption, count, WhatsApp and Facebook', () => {
    renderPage()
    const photo = workPhotos[0]
    const opener = openerFor(board(), photoCaption(photo))

    fireEvent.click(opener)

    expect(dialog().open).toBe(true)
    expect(document.activeElement?.getAttribute('aria-label')).toBe(
      'Close photo',
    )
    expect(lightboxCaption()).toBe(photoCaption(photo))
    expect(lightboxCount()).toBe(`1 of ${TOTAL_PRINTS}`)
    expect(within(dialog()).getByRole('img').getAttribute('alt')).toBe(
      photo.alt,
    )
    const whatsapp = within(dialog()).getByRole('link', { name: 'WhatsApp us' })
    expect(whatsapp.getAttribute('href')).toBe(
      buildWhatsAppLink(photoMessage(photoCaption(photo))),
    )
    expect(whatsapp.getAttribute('target')).toBe('_blank')
    const facebook = within(dialog()).getByRole('link', {
      name: 'More of our work on Facebook',
    })
    expect(facebook.getAttribute('href')).toBe(contactFacts.facebookUrl)
  })

  it('pages with the arrow keys and the buttons, wrapping at the ends', () => {
    renderPage()
    fireEvent.click(openerFor(board(), photoCaption(workPhotos[0])))

    fireEvent.keyDown(dialog(), { key: 'ArrowRight' })
    expect(lightboxCaption()).toBe(photoCaption(workPhotos[1]))
    fireEvent.keyDown(dialog(), { key: 'ArrowLeft' })
    fireEvent.keyDown(dialog(), { key: 'ArrowLeft' })
    expect(lightboxCaption()).toBe(photoCaption(workPhotos[TOTAL_PRINTS - 1]))
    expect(lightboxCount()).toBe(`${TOTAL_PRINTS} of ${TOTAL_PRINTS}`)

    fireEvent.click(screen.getByRole('button', { name: 'Next photo' }))
    expect(lightboxCaption()).toBe(photoCaption(workPhotos[0]))
    fireEvent.click(screen.getByRole('button', { name: 'Previous photo' }))
    expect(lightboxCaption()).toBe(photoCaption(workPhotos[TOTAL_PRINTS - 1]))
  })

  it('pages on a swipe of 50px or more, and not on a shorter one', () => {
    renderPage()
    fireEvent.click(openerFor(board(), photoCaption(workPhotos[0])))
    const inner = dialog().querySelector('.wz-lb-inner') as HTMLElement

    fireEvent.pointerDown(inner, { clientX: 300 })
    fireEvent.pointerUp(inner, { clientX: 260 })
    expect(lightboxCaption()).toBe(photoCaption(workPhotos[0]))

    fireEvent.pointerDown(inner, { clientX: 300 })
    fireEvent.pointerUp(inner, { clientX: 200 })
    expect(lightboxCaption()).toBe(photoCaption(workPhotos[1]))
    // The click that ends a mouse drag does not close the photo.
    fireEvent.click(inner)
    expect(dialog().open).toBe(true)

    fireEvent.pointerDown(inner, { clientX: 200 })
    fireEvent.pointerUp(inner, { clientX: 300 })
    expect(lightboxCaption()).toBe(photoCaption(workPhotos[0]))
  })

  it('closes from the backdrop on the first tap after a touch swipe', () => {
    renderPage()
    fireEvent.click(openerFor(board(), photoCaption(workPhotos[0])))
    const inner = dialog().querySelector('.wz-lb-inner') as HTMLElement

    // A touch swipe pages and emits no click, so it must not latch the drag
    // flag for this open's first backdrop tap.
    fireEvent.pointerDown(inner, { clientX: 300, pointerType: 'touch' })
    fireEvent.pointerUp(inner, { clientX: 200, pointerType: 'touch' })
    expect(lightboxCount()).toBe(`2 of ${TOTAL_PRINTS}`)

    // Touch browsers may swallow the click after a swipe gesture, so the
    // first tap closes on pointerup without waiting for a click.
    fireEvent.pointerDown(inner, { clientX: 200, pointerType: 'touch' })
    fireEvent.pointerUp(inner, { clientX: 200, pointerType: 'touch' })
    expect(dialog().open).toBe(false)

    // When a click does arrive, the tap that sent it still closes.
    fireEvent.click(openerFor(board(), photoCaption(workPhotos[1])))
    fireEvent.pointerDown(inner, { clientX: 300, pointerType: 'touch' })
    fireEvent.pointerUp(inner, { clientX: 200, pointerType: 'touch' })
    fireEvent.pointerDown(inner, { clientX: 200, pointerType: 'touch' })
    fireEvent.click(inner)
    expect(dialog().open).toBe(false)
  })

  it('cancels the click a touch tap on the backdrop would send to the page', () => {
    renderPage()
    fireEvent.click(openerFor(board(), photoCaption(workPhotos[0])))
    const inner = dialog().querySelector('.wz-lb-inner') as HTMLElement

    // fireEvent returns false when a handler called preventDefault.
    expect(fireEvent.touchEnd(inner)).toBe(false)
    expect(
      fireEvent.touchEnd(dialog().querySelector('.wz-lb-photo') as HTMLElement),
    ).toBe(true)
  })

  it('closes from the backdrop and the close button, returning focus to the print', () => {
    renderPage()
    const opener = openerFor(board(), photoCaption(workPhotos[2]))

    fireEvent.click(opener)
    fireEvent.click(dialog().querySelector('.wz-lb-inner') as HTMLElement)
    expect(dialog().open).toBe(false)
    expect(document.activeElement).toBe(opener)

    fireEvent.click(opener)
    fireEvent.click(dialog().querySelector('.wz-lb-print') as HTMLElement)
    expect(dialog().open).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Close photo' }))
    expect(dialog().open).toBe(false)
    expect(document.activeElement).toBe(opener)
  })

  it('returns focus to the print when the browser closes it (Esc)', () => {
    renderPage()
    const opener = openerFor(board(), photoCaption(workPhotos[3]))

    fireEvent.click(opener)
    dialog().close()
    expect(document.activeElement).toBe(opener)
  })

  it('pages only through the prints the filter shows', () => {
    renderPage()
    fireEvent.click(tag('Paving'))
    const [first, second] = workPhotosFor('paving')

    fireEvent.click(openerFor(board(), photoCaption(second)))
    expect(lightboxCount()).toBe('2 of 2')
    fireEvent.keyDown(dialog(), { key: 'ArrowRight' })
    expect(lightboxCaption()).toBe(photoCaption(first))
  })

  it('opens the opening prints as their own set of four', () => {
    const { container } = renderPage()
    const cluster = container.querySelector('.wz-cluster') as HTMLElement
    const photo = getWorkPhoto(openingPhotoIds[1])

    fireEvent.click(openerFor(cluster, photoCaption(photo)))
    expect(lightboxCaption()).toBe(photoCaption(photo))
    expect(lightboxCount()).toBe(`2 of ${openingPhotoIds.length}`)
  })

  it('opens the explorer print alone, without paging', () => {
    const { container } = renderPage()
    const media = container.querySelector('.wz-panel-media') as HTMLElement
    const opener = within(media).getByRole('button')

    fireEvent.click(opener)
    expect(lightboxCount()).toBe('')
    for (const button of dialog().querySelectorAll<HTMLButtonElement>(
      '.wz-lb-prev, .wz-lb-next',
    )) {
      expect(button.hidden).toBe(true)
    }
    fireEvent.keyDown(dialog(), { key: 'ArrowRight' })
    expect(document.activeElement?.getAttribute('aria-label')).toBe(
      'Close photo',
    )
  })

  it('locks the page behind an open photo in CSS', () => {
    const css = readFileSync('src/next/sections/work.css', 'utf8')
    expect(css).toMatch(
      /html:has\(\.wz-lightbox\[open\]\)\s*\{\s*overflow:\s*hidden;/,
    )
  })
})
