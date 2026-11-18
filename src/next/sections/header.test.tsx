// @vitest-environment jsdom
import { act, cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { buildWhatsAppLink, defaultMessage } from '../whatsapp.ts'
import { Header } from './Header.tsx'
import { HERO_WHATSAPP_ID, StickyBar } from './StickyBar.tsx'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const SECTION_LINKS = [
  ['What needs doing', '#wz-what'],
  ['Our work', '#wz-work'],
  ['Our story', '#wz-story'],
  ['Contact', '#wz-contact'],
]

describe('Header', () => {
  it('shows the logo unchanged, the firm, the section links and the phone', () => {
    render(<Header currentSectionId={null} />)

    const logo = screen.getByRole('img', {
      name: 'Winzelle Projects logo: building tools forming a W, with Jos 1:9, Wees sterk en vasberade',
    })
    expect(logo.getAttribute('src')).toBe('/content/images/winzelle-logo.jpg')
    expect(logo.getAttribute('width')).toBe('66')
    expect(logo.getAttribute('height')).toBe('66')
    expect(screen.getByText('Winzelle Projects')).toBeDefined()
    expect(screen.getByText('Family-run.').className).toBe('wz-nowrap')

    const nav = screen.getByRole('navigation', { name: 'Sections' })
    const links = within(nav).getAllByRole('link')
    expect(
      links.map((link) => [link.textContent, link.getAttribute('href')]),
    ).toEqual(SECTION_LINKS)

    const phone = screen.getByRole('link', { name: '082 878 1557' })
    expect(phone.getAttribute('href')).toBe('tel:+27828781557')
  })

  it('marks only the current section link', () => {
    render(<Header currentSectionId="wz-work" />)

    const current = screen.getByRole('link', { name: 'Our work' })
    expect(current.getAttribute('aria-current')).toBe('true')
    expect(
      screen
        .getAllByRole('link')
        .filter((link) => link.hasAttribute('aria-current')),
    ).toHaveLength(1)
  })
})

function placeHeroAction(top: number, bottom: number) {
  const heroAction = document.createElement('a')
  heroAction.id = HERO_WHATSAPP_ID
  heroAction.getBoundingClientRect = () => ({ top, bottom }) as DOMRect
  document.body.append(heroAction)
  return heroAction
}

describe('StickyBar', () => {
  const whatsappHref = buildWhatsAppLink(defaultMessage())

  it('carries the firm, links, phone, Call and WhatsApp us inside a Contact region, not a banner', () => {
    const heroAction = placeHeroAction(400, 460)
    const { container } = render(
      <StickyBar whatsappHref={whatsappHref} currentSectionId={null} />,
    )
    heroAction.remove()

    const bar = container.querySelector('#wz-sticky')
    // The header is the page's one banner; the bar is a named region.
    expect(bar?.getAttribute('role')).toBe('region')
    expect(bar?.getAttribute('aria-label')).toBe('Contact')
    expect(bar?.querySelector('nav')).toBeNull()
    expect(
      [...(bar?.querySelectorAll('.wz-sticky-nav a') ?? [])].map((link) =>
        link.getAttribute('href'),
      ),
    ).toEqual(SECTION_LINKS.map(([, href]) => href))

    const call = screen.getByRole('link', { name: 'Call 082 878 1557' })
    expect(call.textContent).toBe('Call')
    expect(call.getAttribute('href')).toBe('tel:+27828781557')

    const whatsapp = screen.getByRole('link', { name: 'WhatsApp us' })
    expect(whatsapp.getAttribute('href')).toBe(whatsappHref)
    expect(whatsapp.getAttribute('target')).toBe('_blank')
    expect(whatsapp.getAttribute('rel')).toBe('noopener')
  })

  it('stays hidden while the opening WhatsApp action is in view and shows once it scrolls away', () => {
    vi.stubGlobal('innerHeight', 800)
    const heroAction = placeHeroAction(400, 460)
    const { container } = render(
      <StickyBar whatsappHref={whatsappHref} currentSectionId={null} />,
    )
    const bar = container.querySelector('#wz-sticky')
    expect(bar?.classList.contains('wz-shown')).toBe(false)

    heroAction.getBoundingClientRect = () =>
      ({ top: -60, bottom: 0 }) as DOMRect
    act(() => {
      window.dispatchEvent(new Event('scroll'))
    })
    expect(bar?.classList.contains('wz-shown')).toBe(true)

    heroAction.getBoundingClientRect = () =>
      ({ top: 900, bottom: 960 }) as DOMRect
    act(() => {
      window.dispatchEvent(new Event('resize'))
    })
    expect(bar?.classList.contains('wz-shown')).toBe(true)

    heroAction.getBoundingClientRect = () =>
      ({ top: 100, bottom: 160 }) as DOMRect
    act(() => {
      window.dispatchEvent(new Event('scroll'))
    })
    expect(bar?.classList.contains('wz-shown')).toBe(false)

    heroAction.remove()
    vi.unstubAllGlobals()
  })
})
