// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getTrade,
  getWorkPhoto,
  photoCaption,
  trades,
} from '../../content/next/index.ts'
import { HomeBoard } from '../NextPage.tsx'
import { PickStateProvider } from '../pick-state.tsx'
import {
  buildWhatsAppLink,
  defaultMessage,
  tradeMessage,
  unsureMessage,
} from '../whatsapp.ts'

const scrollIntoView = vi.fn()

beforeEach(() => {
  scrollIntoView.mockClear()
  Element.prototype.scrollIntoView = scrollIntoView
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function renderBoard() {
  return render(
    <PickStateProvider>
      <HomeBoard />
    </PickStateProvider>,
  )
}

function tile(label: string): HTMLElement {
  const group = screen.getByRole('group', { name: 'Kinds of work' })
  return within(group).getByRole('button', { name: label })
}

function panel(): HTMLElement {
  return document.getElementById('wz-panel') as HTMLElement
}

function whatsappLinks(): HTMLAnchorElement[] {
  return [...document.querySelectorAll<HTMLAnchorElement>('a[href*="wa.me"]')]
}

/** Every media query answers `matches`; reduced motion answers `reduced`. */
function stubMedia({
  oneColumn,
  reduced = false,
}: {
  oneColumn: boolean
  reduced?: boolean
}) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('reduced-motion') ? reduced : oneColumn,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

describe('What needs doing? tiles', () => {
  it('shows ten tiles in picker order with Paving on the sheet at load', () => {
    renderBoard()

    expect(
      screen.getByRole('heading', { level: 2, name: 'What needs doing?' }),
    ).toBeDefined()
    const group = screen.getByRole('group', { name: 'Kinds of work' })
    const tiles = within(group).getAllByRole('button')
    expect(tiles.map((button) => button.textContent)).toEqual(
      trades.map((trade) => `${trade.label}On the sheet →Open below ↓`),
    )
    expect(tiles.map((button) => button.getAttribute('aria-pressed'))).toEqual(
      trades.map((trade) => String(trade.id === 'paving')),
    )
    for (const button of tiles) {
      expect(button.getAttribute('aria-controls')).toBe('wz-panel')
      expect(button.querySelector('svg')?.getAttribute('aria-hidden')).toBe(
        'true',
      )
    }
    expect(
      within(panel()).getByRole('heading', { level: 3, name: 'Paving' }),
    ).toBeDefined()
  })

  it('keeps the general WhatsApp messages at their defaults until a tile is picked', () => {
    renderBoard()

    expect(document.getElementById('wz-hero-wa')?.getAttribute('href')).toBe(
      buildWhatsAppLink(defaultMessage()),
    )
    expect(document.getElementById('wz-panel-wa')?.getAttribute('href')).toBe(
      buildWhatsAppLink(tradeMessage(getTrade('paving'))),
    )
  })

  it.each(trades.map((trade) => [trade.label, trade.id] as const))(
    'picking %s names it in every contextual WhatsApp message and keeps the labels',
    (label, id) => {
      renderBoard()
      const labelsBefore = whatsappLinks().map((link) => link.textContent)

      fireEvent.click(tile(label))

      const expected = buildWhatsAppLink(tradeMessage(getTrade(id)))
      for (const linkId of ['wz-hero-wa', 'wz-panel-wa']) {
        expect(document.getElementById(linkId)?.getAttribute('href')).toBe(
          expected,
        )
      }
      const sticky = document.getElementById('wz-sticky') as HTMLElement
      expect(
        within(sticky)
          .getByRole('link', { name: 'WhatsApp us' })
          .getAttribute('href'),
      ).toBe(expected)
      expect(whatsappLinks().map((link) => link.textContent)).toEqual(
        labelsBefore,
      )
      expect(tile(label).getAttribute('aria-pressed')).toBe('true')
      expect(
        within(panel()).getByRole('heading', { level: 3, name: label }),
      ).toBeDefined()
    },
  )

  it('keeps the "Not sure" card on its own message', () => {
    renderBoard()
    fireEvent.click(tile('Roofs'))

    const card = screen
      .getByRole('heading', { level: 3, name: 'Not sure which it is?' })
      .closest('div') as HTMLElement
    expect(
      within(card)
        .getByRole('link', { name: 'WhatsApp us a photo' })
        .getAttribute('href'),
    ).toBe(buildWhatsAppLink(unsureMessage()))
  })

  it('moves the pressed state to the picked tile only', () => {
    renderBoard()
    fireEvent.click(tile('Pools'))

    const group = screen.getByRole('group', { name: 'Kinds of work' })
    const pressed = within(group)
      .getAllByRole('button')
      .filter((button) => button.getAttribute('aria-pressed') === 'true')
    expect(pressed.map((button) => button.dataset.kind)).toEqual(['pools'])
  })
})

describe('Scrolling after a pick', () => {
  it('always brings the sheet into view on one column', () => {
    stubMedia({ oneColumn: true })
    renderBoard()
    fireEvent.click(tile('Roofs'))

    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    expect(scrollIntoView.mock.contexts[0]).toBe(panel())
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    })
  })

  it('leaves the window alone beside the tiles while the heading and action are in view', () => {
    stubMedia({ oneColumn: false })
    renderBoard()
    vi.spyOn(panel(), 'getBoundingClientRect').mockReturnValue({
      top: 200,
    } as DOMRect)
    fireEvent.click(tile('Roofs'))

    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  it('scrolls instantly under reduced motion when the heading is above the window', () => {
    stubMedia({ oneColumn: false, reduced: true })
    renderBoard()
    vi.spyOn(panel(), 'getBoundingClientRect').mockReturnValue({
      top: -200,
    } as DOMRect)
    fireEvent.click(tile('Something else'))

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'auto',
      block: 'start',
    })
  })
})

describe('Explorer sheet', () => {
  it('shows the line, the WhatsApp note and what the job involves', () => {
    renderBoard()
    fireEvent.click(tile('Kitchens, ceilings and carpentry'))
    const trade = getTrade('kitchens')
    const sheet = within(panel())

    expect(sheet.getByText(trade.line)).toBeDefined()
    expect(
      sheet.getByText(
        `Opens WhatsApp with a message about ${trade.noun}. Add your suburb and a photo.`,
      ),
    ).toBeDefined()
    expect(
      sheet.getByRole('heading', { level: 4, name: 'What the job involves' }),
    ).toBeDefined()
    expect(sheet.getByText(trade.involves)).toBeDefined()
    expect(sheet.getByRole('link', { name: 'WhatsApp us' }).id).toBe(
      'wz-panel-wa',
    )
  })

  it('pins the matching print for a trade with photos', () => {
    renderBoard()
    fireEvent.click(tile('Small plumbing and electrical'))
    const photo = getWorkPhoto('bathroom-basin')

    const image = within(panel()).getByRole('img', { name: photo.alt })
    expect(image.getAttribute('width')).toBe(String(photo.width))
    expect(within(panel()).getByText(photoCaption(photo))).toBeDefined()
    expect(image.closest('figure')?.className).toContain('wz-panel-plumbing')
  })

  it.each([['Pools', 'pools'] as const, ['Something else', 'other'] as const])(
    'pins the no-photo note for %s',
    (label, id) => {
      renderBoard()
      fireEvent.click(tile(label))

      expect(panel().querySelector('.wz-panel-media img')).toBeNull()
      expect(
        within(panel()).getByText(getTrade(id).noPhotoFallbackNote as string),
      ).toBeDefined()
    },
  )

  it('toggles the drawing between the problem and the fixed view', () => {
    renderBoard()
    const toggle = within(panel()).getByRole('button', {
      name: 'Show it fixed',
    })
    const drawing = panel().querySelector('.wz-canvas svg') as SVGElement
    expect(toggle.getAttribute('aria-pressed')).toBe('false')
    expect(drawing.getAttribute('data-state')).toBe('problem')

    fireEvent.click(toggle)

    expect(toggle.getAttribute('aria-pressed')).toBe('true')
    expect(toggle.textContent).toBe('Show the problem')
    expect(drawing.getAttribute('data-state')).toBe('fixed')
  })
})

describe('Drawing key and markers', () => {
  function keyButton(name: RegExp): HTMLElement {
    const key = screen.getByRole('list', { name: 'Parts of the drawing' })
    return within(key).getByRole('button', { name })
  }

  function strip(): string {
    return panel().querySelector('.wz-drawing-note')?.textContent ?? ''
  }

  it("lists the open trade's parts as buttons", () => {
    renderBoard()
    fireEvent.click(tile('Cracks and structural'))

    const key = screen.getByRole('list', { name: 'Parts of the drawing' })
    expect(
      within(key)
        .getAllByRole('button')
        .map((button) => button.dataset.part),
    ).toEqual(getTrade('cracks').drawing.parts.map((part) => part.key))
  })

  it('holds a part from the key, shows it in the strip and lets Escape release it', () => {
    renderBoard()
    const part = getTrade('paving').drawing.parts[1]
    const button = keyButton(new RegExp(part.name))

    fireEvent.click(button)
    expect(button.getAttribute('aria-pressed')).toBe('true')
    expect(strip()).toBe(`${part.name}: ${part.note}`)
    expect(
      panel()
        .querySelector(`.wz-marker[data-part="${part.key}"]`)
        ?.classList.contains('wz-held'),
    ).toBe(true)

    fireEvent.keyDown(button, { key: 'Escape' })
    expect(button.getAttribute('aria-pressed')).toBe('false')
    expect(strip()).toBe(getTrade('paving').drawing.problemNote)
  })

  it('lights a part while its key button has focus', () => {
    renderBoard()
    const button = keyButton(/Kerb/)

    fireEvent.focus(button)
    expect(button.classList.contains('wz-hot')).toBe(true)
    expect(
      panel()
        .querySelector('.wz-marker[data-part="d"]')
        ?.classList.contains('wz-hot'),
    ).toBe(true)

    fireEvent.blur(button)
    expect(button.classList.contains('wz-hot')).toBe(false)
  })

  it('holds a part from a tapped marker and names it in the strip', () => {
    renderBoard()
    fireEvent.click(tile('Roofs'))
    const part = getTrade('roofs').drawing.parts[0]

    fireEvent.click(
      panel().querySelector(`.wz-marker[data-part="${part.key}"]`) as Element,
    )

    expect(strip()).toBe(`${part.name}: ${part.note}`)
    expect(keyButton(new RegExp(part.name)).getAttribute('aria-pressed')).toBe(
      'true',
    )
  })

  it('releases the held part when the sheet changes trade', () => {
    renderBoard()
    fireEvent.click(keyButton(/Pavers/))
    fireEvent.click(tile('Walls and building'))

    const key = screen.getByRole('list', { name: 'Parts of the drawing' })
    expect(
      within(key)
        .getAllByRole('button')
        .some((button) => button.getAttribute('aria-pressed') === 'true'),
    ).toBe(false)
    expect(panel().querySelector('.wz-landing')).not.toBeNull()
  })
})

describe('What needs doing? markup', () => {
  it('has no inline styles', () => {
    const { container } = renderBoard()
    expect(container.querySelector('[style]')).toBeNull()
  })
})
