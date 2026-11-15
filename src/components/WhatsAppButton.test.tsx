// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { WhatsAppButton } from './WhatsAppButton'
import { QuoteForm } from './QuoteForm'
import { contactSection, siteSettings } from '../content'

const constructorSpy = vi.fn()
const observeSpy = vi.fn()
const disconnectSpy = vi.fn()
let observerCallback: IntersectionObserverCallback

class FakeIntersectionObserver {
  constructor(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit,
  ) {
    observerCallback = callback
    constructorSpy(options)
  }
  observe = observeSpy
  disconnect = disconnectSpy
}

function addQuoteSection(): HTMLElement {
  const section = document.createElement('section')
  section.id = 'quote'
  document.body.appendChild(section)
  return section
}

function setIntersecting(target: Element, isIntersecting: boolean) {
  act(() => {
    observerCallback(
      [{ isIntersecting, target } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    )
  })
}

function floatingLink(): HTMLElement {
  return screen.getByRole('link', { name: 'Chat on WhatsApp' })
}

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('WhatsAppButton', () => {
  it('stays visible and creates no observer when #quote is missing', () => {
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)
    render(<WhatsAppButton />)

    expect(constructorSpy).not.toHaveBeenCalled()
    expect(floatingLink().classList.contains('invisible')).toBe(false)
  })

  it('stays visible when IntersectionObserver is unavailable', () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    addQuoteSection()
    render(<WhatsAppButton />)

    expect(floatingLink().classList.contains('invisible')).toBe(false)
  })

  it('observes #quote with a zero threshold', () => {
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)
    const section = addQuoteSection()
    render(<WhatsAppButton />)

    expect(observeSpy).toHaveBeenCalledTimes(1)
    expect(observeSpy).toHaveBeenCalledWith(section)
    expect(constructorSpy).toHaveBeenCalledWith({ threshold: 0 })
  })

  it('hides while #quote intersects and shows again when it leaves', () => {
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)
    const section = addQuoteSection()
    render(<WhatsAppButton />)

    setIntersecting(section, true)
    expect(floatingLink().classList.contains('invisible')).toBe(true)

    setIntersecting(section, false)
    expect(floatingLink().classList.contains('invisible')).toBe(false)
  })

  it('disconnects the observer once on unmount', () => {
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)
    addQuoteSection()
    const { unmount } = render(<WhatsAppButton />)

    unmount()

    expect(disconnectSpy).toHaveBeenCalledTimes(1)
  })

  it('links to wa.me with the configured number and message', () => {
    render(<WhatsAppButton />)

    expect(floatingLink().getAttribute('href')).toBe(
      `https://wa.me/${siteSettings.whatsappNumber}?text=${encodeURIComponent(contactSection.whatsappMessage)}`,
    )
  })

  it('finds the section id the QuoteForm renders', () => {
    render(<QuoteForm />)

    expect(document.getElementById('quote')).not.toBeNull()
  })
})
