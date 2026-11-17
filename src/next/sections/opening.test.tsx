// @vitest-environment jsdom
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { act, cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { getTrade } from '../../content/next/index.ts'
import { HomeBoard, NextPage } from '../NextPage.tsx'
import { PickStateProvider, usePickState } from '../pick-state.tsx'
import { buildWhatsAppLink, defaultMessage, tradeMessage } from '../whatsapp.ts'
import { LightboxProvider } from './Lightbox.tsx'
import { OpeningScreen } from './OpeningScreen.tsx'

afterEach(cleanup)

const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]'

function renderOpening() {
  return render(
    <LightboxProvider>
      <OpeningScreen
        whatsappHref={buildWhatsAppLink(defaultMessage())}
        currentSectionId={null}
      />
    </LightboxProvider>,
  )
}

describe('OpeningScreen', () => {
  it('holds the headline sheet: h1, line of trades, actions and the free note', () => {
    renderOpening()

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'We fix, maintain and build in Port Elizabeth.',
      }),
    ).toBeDefined()
    expect(
      screen.getByText(
        'Paving, walls, roofs, waterproofing, painting, kitchens, and small plumbing and electrical jobs, for homes, body corporates and small businesses.',
      ),
    ).toBeDefined()

    const whatsapp = screen.getByRole('link', { name: 'WhatsApp us a photo' })
    expect(whatsapp.id).toBe('wz-hero-wa')
    expect(whatsapp.getAttribute('href')).toBe(
      buildWhatsAppLink(defaultMessage()),
    )
    expect(whatsapp.getAttribute('target')).toBe('_blank')
    expect(whatsapp.getAttribute('rel')).toBe('noopener')

    const phones = screen.getAllByRole('link', { name: '082 878 1557' })
    expect(phones.map((link) => link.getAttribute('href'))).toEqual([
      'tel:+27828781557',
      'tel:+27828781557',
    ])
    expect(screen.getByText('The visit and the quote are free.')).toBeDefined()
  })

  it('shows the NHBRC stamp as registered, without a number', () => {
    renderOpening()

    const seal = screen.getByRole('img', { name: 'Stamp: NHBRC registered' })
    expect(seal.textContent).toBe('registeredhome builderNHBRC')
    expect(seal.textContent).not.toMatch(/\d/)
  })

  it('pins the four opening prints with alt text, captions and AVIF/WebP sources', () => {
    const { container } = renderOpening()

    const prints = [...container.querySelectorAll('.wz-cluster figure')]
    expect(prints.map((print) => print.querySelector('img')?.alt)).toEqual([
      'A new concrete apron and ramp at the door and gate of a face-brick building',
      'A tiled roof with the verge and ridge freshly painted red, beside a chimney',
      'An L-shaped kitchenette with timber counters, white cupboards and black handles',
      'A curved wall with a glass-block window, waterproofed and painted',
    ])
    expect(
      prints.map((print) => print.querySelector('figcaption')?.textContent),
    ).toEqual([
      'Concrete apron and ramp, Westering, August 2025',
      'Roof verge and ridge painted, Charlo, July 2025',
      'Kitchenette fitted, Sunridge Park, January 2026',
      'Exterior waterproofing and paint, Newton Park, June 2025',
    ])
    for (const print of prints) {
      const caption = print.querySelector('figcaption')?.textContent
      const opener = print.querySelector('button.wz-print-open')
      expect(opener?.getAttribute('aria-label')).toBe(`Open photo: ${caption}`)
      expect(opener?.querySelector('img')).not.toBeNull()
    }

    const roof = prints[1]
    expect(roof.classList.contains('wz-opening-roof-verge-paint')).toBe(true)
    expect(
      roof.querySelector('source[type="image/avif"]')?.getAttribute('srcset'),
    ).toBe(
      '/content/images/work/roof-verge-paint-800.avif 800w, /content/images/work/roof-verge-paint.avif 1050w',
    )

    for (const print of prints) {
      const sets = [
        print.querySelector('source')?.getAttribute('srcset'),
        print.querySelector('img')?.getAttribute('srcset'),
      ]
      for (const candidate of sets.join(', ').split(', ')) {
        const url = candidate.split(' ')[0]
        expect(existsSync(join(process.cwd(), 'public', url))).toBe(true)
      }
    }
  })

  it('crops the roof print to the top of the photo so the lifted tile stays out of frame', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'src/next/sections/sections.css'),
      'utf8',
    )
    const roofRule = css.slice(css.indexOf('.wz-opening-roof-verge-paint {'))
    expect(roofRule.slice(0, roofRule.indexOf('}'))).toMatch(
      /--ar: 8 \/ 5;\s+--op: 50% 0%;/,
    )
  })
})

function PickRoofs() {
  const { pick } = usePickState()
  return (
    <button type="button" onClick={() => pick('roofs')}>
      pick roofs
    </button>
  )
}

describe('NextPage opening', () => {
  it('puts the opening WhatsApp action first in the Tab order, after only the hidden sticky bar', () => {
    const { container } = render(<NextPage />)

    const focusables = [...container.querySelectorAll(FOCUSABLE)]
    const firstOutsideSticky = focusables.find(
      (element) => !element.closest('#wz-sticky'),
    )
    expect(firstOutsideSticky?.id).toBe('wz-hero-wa')
    expect(firstOutsideSticky?.closest('main')).not.toBeNull()
  })

  it('has one banner header, navigation landmarks with distinct names and no inline styles', () => {
    const { container } = render(<NextPage />)

    const topLevelHeaders = [...container.querySelectorAll('header')].filter(
      (header) =>
        !header.parentElement?.closest('article, aside, main, nav, section'),
    )
    expect(topLevelHeaders.map((header) => header.id)).toEqual(['wz-sticky'])
    expect(screen.getAllByRole('navigation')).toHaveLength(2)
    expect(screen.getByRole('navigation', { name: 'Sections' })).toBeDefined()
    expect(
      screen.getByRole('navigation', { name: 'On this page' }),
    ).toBeDefined()
    expect(container.querySelector('[style]')).toBeNull()
  })

  it('names the picked trade in the opening and sticky WhatsApp messages', () => {
    render(
      <PickStateProvider>
        <HomeBoard />
        <PickRoofs />
      </PickStateProvider>,
    )
    const hero = document.getElementById('wz-hero-wa') as HTMLElement
    const sticky = within(
      document.getElementById('wz-sticky') as HTMLElement,
    ).getByText('WhatsApp us')
    const defaultHref = buildWhatsAppLink(defaultMessage())
    expect(hero.getAttribute('href')).toBe(defaultHref)
    expect(sticky.getAttribute('href')).toBe(defaultHref)

    act(() => {
      screen.getByRole('button', { name: 'pick roofs' }).click()
    })

    const roofsHref = buildWhatsAppLink(tradeMessage(getTrade('roofs')))
    expect(hero.getAttribute('href')).toBe(roofsHref)
    expect(sticky.getAttribute('href')).toBe(roofsHref)
    expect(hero.textContent).toBe('WhatsApp us a photo')
    expect(sticky.textContent).toBe('WhatsApp us')
  })
})
