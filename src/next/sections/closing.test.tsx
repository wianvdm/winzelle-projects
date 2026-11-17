// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { fillerValues, getTrade } from '../../content/next/index.ts'
import { PickStateProvider, usePickState } from '../pick-state.tsx'
import {
  buildWhatsAppLink,
  defaultMessage,
  storyMessage,
  tradeMessage,
} from '../whatsapp.ts'
import { ContactCard } from './ContactCard.tsx'
import { Footer } from './Footer.tsx'
import { Story } from './Story.tsx'

afterEach(cleanup)

const SERVICE_AREA =
  'We work across Port Elizabeth (Gqeberha), and most of Nelson Mandela Bay depending on the job.'
const ADDRESS = '10 King Place, Ben Kamma, Port Elizabeth, 6025'
const DIRECTIONS_URL =
  'https://www.openstreetmap.org/directions?to=-33.9616%2C25.4920'
const FACEBOOK_URL = 'https://www.facebook.com/winzelleprojects'

function PickRoofs() {
  const { pick } = usePickState()
  return (
    <button type="button" onClick={() => pick('roofs')}>
      pick roofs
    </button>
  )
}

function linkSummary(link: HTMLElement) {
  return [
    link.textContent,
    link.getAttribute('href'),
    link.getAttribute('target'),
    link.getAttribute('rel'),
  ]
}

describe('Story', () => {
  it('shows the sheet with both parts of the story and the pinned sign-off', () => {
    render(
      <PickStateProvider>
        <Story />
      </PickStateProvider>,
    )

    const section = screen.getByRole('region', { name: 'Our story' })
    expect(section.id).toBe('wz-story')
    expect(
      within(section)
        .getAllByRole('heading')
        .map((heading) => [heading.tagName, heading.textContent]),
    ).toEqual([
      ['H2', 'Our story'],
      ['H3', 'Today'],
      ['H3', 'Before the building work'],
    ])
    expect(
      screen.getByText(/^With the start of 2025, new opportunities emerged/),
    ).toBeDefined()
    expect(
      screen.getByText(/^It was with great sadness that we had to say goodbye/),
    ).toBeDefined()
    expect(
      screen.getByText(
        'Thank you to every friend, colleague, family member and stranger who helped us along the way.',
      ),
    ).toBeDefined()

    const signoff = screen.getByRole('complementary', { name: 'Sign-off' })
    expect(signoff.querySelector('blockquote')?.textContent).toBe(
      'Like Joshua crossing the Jordan, we are also faced with uncertainties but the Lord promised us that He will be with us all the way — we need to be “strong and courageous” (Josh 1:9) and He will never forsake us.',
    )
    expect(within(signoff).getByText('The Winzelle family')).toBeDefined()
  })

  it('sends the story message until a trade is picked, then names the trade', () => {
    render(
      <PickStateProvider>
        <Story />
        <PickRoofs />
      </PickStateProvider>,
    )
    const whatsapp = screen.getByRole('link', { name: 'WhatsApp us' })
    expect(linkSummary(whatsapp)).toEqual([
      'WhatsApp us',
      buildWhatsAppLink(storyMessage()),
      '_blank',
      'noopener',
    ])

    act(() => {
      screen.getByRole('button', { name: 'pick roofs' }).click()
    })

    expect(whatsapp.getAttribute('href')).toBe(
      buildWhatsAppLink(tradeMessage(getTrade('roofs'))),
    )
    expect(whatsapp.textContent).toBe('WhatsApp us')
  })
})

describe('ContactCard', () => {
  const whatsappHref = buildWhatsAppLink(defaultMessage())

  it('leads with WhatsApp, then phone, email, address and Facebook', () => {
    render(<ContactCard whatsappHref={whatsappHref} />)

    const section = screen.getByRole('region', {
      name: 'Tell us what needs doing',
    })
    expect(section.id).toBe('wz-contact')
    const card = section.querySelector<HTMLElement>('.wz-card')
    expect(card).not.toBeNull()
    expect(within(card!).getAllByRole('link').map(linkSummary)).toEqual([
      ['WhatsApp us082 878 1557', whatsappHref, '_blank', 'noopener'],
      ['082 878 1557', 'tel:+27828781557', null, null],
      ['info@winzelle.co.za', 'mailto:info@winzelle.co.za', null, null],
      [ADDRESS, DIRECTIONS_URL, '_blank', 'noopener'],
      ['facebook.com/winzelleprojects', FACEBOOK_URL, '_blank', 'noopener'],
    ])
    expect(
      [...section.querySelectorAll('dt')].map((term) => term.textContent),
    ).toEqual(['Phone', 'Email', 'Address', 'Facebook'])
  })

  it('hangs the card over the map print, which starts as a still picture', () => {
    render(<ContactCard whatsappHref={whatsappHref} />)

    const board = document.querySelector('.wz-contact-board')
    expect(
      [...(board?.children ?? [])].map((child) => child.className),
    ).toEqual(['wz-card wz-pin', 'wz-map-print wz-pin wz-pin-print'])
    expect(screen.getByRole('button', { name: 'Show the map' })).toBeDefined()
    expect(document.querySelector('.leaflet-container')).toBeNull()
  })

  it('carries the flagged service-area line in the lead', () => {
    render(<ContactCard whatsappHref={whatsappHref} />)

    expect(fillerValues.has(SERVICE_AREA)).toBe(true)
    expect(screen.getByText(/^WhatsApp is quickest\./).textContent).toBe(
      `WhatsApp is quickest. Send a photo and your suburb and we'll arrange a time to come and look. ${SERVICE_AREA}`,
    )
  })
})

describe('Footer', () => {
  it('is the page footer: logo, firm and its claims kept whole', () => {
    const { container } = render(<Footer />)

    const footer = screen.getByRole('contentinfo')
    const logo = container.querySelector('.wz-ft-logo')
    expect(logo?.getAttribute('src')).toBe('/content/images/winzelle-logo.jpg')
    expect(logo?.getAttribute('alt')).toBe('')
    expect(logo?.getAttribute('width')).toBe('60')
    expect(logo?.getAttribute('height')).toBe('60')
    expect(within(footer).getByText('Winzelle Projects')).toBeDefined()

    const claims = footer.querySelector('.wz-ft-claims')
    expect(
      [...(claims?.querySelectorAll('.wz-nowrap') ?? [])].map(
        (claim) => claim.textContent,
      ),
    ).toEqual([
      'Family-run.',
      'NHBRC registered.',
      'Free consultations and quotes.',
    ])
    expect(claims?.textContent).toBe(
      'Family-run. NHBRC registered. Free consultations and quotes.',
    )
  })

  it('labels each field: address and area, then phone, email and Facebook', () => {
    render(<Footer />)

    const fields = [...document.querySelectorAll('.wz-ft-fields')].map((list) =>
      [...list.children].map((child) => [child.tagName, child.textContent]),
    )
    expect(fields).toEqual([
      [
        ['DT', 'Address'],
        ['DD', ADDRESS],
        ['DT', 'Area'],
        ['DD', SERVICE_AREA],
      ],
      [
        ['DT', 'Phone'],
        ['DD', '082 878 1557'],
        ['DT', 'Email'],
        ['DD', 'info@winzelle.co.za'],
        ['DT', 'Facebook'],
        ['DD', 'facebook.com/winzelleprojects'],
      ],
    ])
    expect(
      linkSummary(screen.getByRole('link', { name: '082 878 1557' })),
    ).toEqual(['082 878 1557', 'tel:+27828781557', null, null])
    expect(
      screen
        .getByRole('link', { name: 'info@winzelle.co.za' })
        .getAttribute('href'),
    ).toBe('mailto:info@winzelle.co.za')
    expect(
      linkSummary(
        screen.getByRole('link', { name: 'facebook.com/winzelleprojects' }),
      ),
    ).toEqual([
      'facebook.com/winzelleprojects',
      FACEBOOK_URL,
      '_blank',
      'noopener',
    ])
  })

  it('names its section links "On this page" and ends with the copyright row', () => {
    render(<Footer />)

    const nav = screen.getByRole('navigation', { name: 'On this page' })
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => [link.textContent, link.getAttribute('href')]),
    ).toEqual([
      ['What needs doing', '#wz-what'],
      ['Our work', '#wz-work'],
      ['Our story', '#wz-story'],
      ['Contact', '#wz-contact'],
    ])

    const base = document.querySelector('.wz-ft-base')
    expect(
      [...(base?.querySelectorAll('p') ?? [])].map((line) => line.textContent),
    ).toEqual(['© 2026 Winzelle Projects', 'Back to top'])
    expect(
      screen.getByRole('link', { name: 'Back to top' }).getAttribute('href'),
    ).toBe('#')
  })
})

describe('closing.css', () => {
  const css = readFileSync(
    resolve(process.cwd(), 'src/next/sections/closing.css'),
    'utf8',
  )

  it('makes phone footer links 44px to 48px tall with labels on the left', () => {
    const phoneRules = css.slice(css.indexOf('@media (max-width: 600px)'))
    expect(phoneRules).toMatch(
      /\.wz-ft-fields \{\s+display: grid;\s+grid-template-columns: 84px minmax\(0, 1fr\);/,
    )
    expect(phoneRules).toMatch(/\.wz-ft-fields a \{\s+min-height: 48px;/)
    expect(phoneRules).toMatch(
      /\.wz-ft-list a,\s+\.wz-ft-base a \{\s+min-height: 44px;/,
    )
  })

  it('uses no data: URLs', () => {
    expect(css).not.toMatch(/data:/)
  })

  it('places the map pin as the prototype does: 68% across, centred on one column', () => {
    expect(css).toMatch(
      /\.wz-map-preview \{\s+position: absolute;\s+left: calc\(68% - 640px\);\s+top: calc\(50% - 385px\);\s+width: 1152px;/,
    )
    expect(css).toMatch(
      /\.wz-map-mark \{\s+position: absolute;\s+left: calc\(68% - 14px\);/,
    )
    const oneColumn = css.slice(css.indexOf('@media (max-width: 1099px)'))
    expect(oneColumn).toMatch(/\.wz-map-frame \{\s+height: 300px;/)
    expect(oneColumn).toMatch(/\.wz-map-mark \{\s+left: calc\(50% - 14px\);/)
  })
})
