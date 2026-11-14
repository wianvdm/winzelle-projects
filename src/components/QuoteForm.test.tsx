// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QuoteForm } from './QuoteForm'
import { PLACEHOLDER_WEB3FORMS_ACCESS_KEY } from '../lib/public-env'
import { siteSettings } from '../content'

const VALID_KEY = 'test-access-key'

function inputValue(label: RegExp): string {
  return (screen.getByLabelText(label) as HTMLInputElement).value
}

function fillForm() {
  fireEvent.change(screen.getByLabelText(/Full Name/), {
    target: { value: 'Jane Doe' },
  })
  fireEvent.change(screen.getByLabelText(/Email Address/), {
    target: { value: 'jane@example.com' },
  })
  fireEvent.change(screen.getByLabelText(/Project Type/), {
    target: { value: 'Waterproofing' },
  })
  fireEvent.change(screen.getByLabelText(/Project Details/), {
    target: { value: 'Leaking roof' },
  })
}

function submitForm() {
  fireEvent.click(screen.getByRole('button', { name: /Submit Quote Request/i }))
}

async function waitForAlert(): Promise<HTMLElement> {
  await waitFor(() => {
    expect(screen.queryByRole('alert')).not.toBeNull()
  })
  return screen.getByRole('alert')
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('QuoteForm', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('clears the form and shows the status panel on success', async () => {
    vi.stubEnv('VITE_WEB3FORMS_ACCESS_KEY', VALID_KEY)
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { success: true }))
    vi.stubGlobal('fetch', fetchMock)

    render(<QuoteForm />)
    fillForm()
    submitForm()

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeNull()
    })
    expect(screen.getByRole('status').textContent).toContain(
      'Quote Request Sent!',
    )
    expect(screen.queryByLabelText(/Full Name/)).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('keeps input and shows an alert on HTTP 500', async () => {
    vi.stubEnv('VITE_WEB3FORMS_ACCESS_KEY', VALID_KEY)
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(500, { success: false }))
    vi.stubGlobal('fetch', fetchMock)

    render(<QuoteForm />)
    fillForm()
    submitForm()

    const alert = await waitForAlert()
    expect(alert.textContent).toContain('not sent')
    expect(alert.textContent).toContain(siteSettings.phone)
    expect(inputValue(/Full Name/)).toBe('Jane Doe')
  })

  it('keeps input and shows an alert on HTTP 200 with success:false', async () => {
    vi.stubEnv('VITE_WEB3FORMS_ACCESS_KEY', VALID_KEY)
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { success: false }))
    vi.stubGlobal('fetch', fetchMock)

    render(<QuoteForm />)
    fillForm()
    submitForm()

    const alert = await waitForAlert()
    expect(alert.textContent).toContain('not sent')
    expect(inputValue(/Full Name/)).toBe('Jane Doe')
  })

  it('keeps input and shows an alert when fetch rejects', async () => {
    vi.stubEnv('VITE_WEB3FORMS_ACCESS_KEY', VALID_KEY)
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'))
    vi.stubGlobal('fetch', fetchMock)

    render(<QuoteForm />)
    fillForm()
    submitForm()

    const alert = await waitForAlert()
    expect(alert.textContent).toContain('not sent')
    expect(inputValue(/Full Name/)).toBe('Jane Doe')
  })

  it('shows an alert and never calls fetch when the key is missing', async () => {
    vi.stubEnv('VITE_WEB3FORMS_ACCESS_KEY', undefined)
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    render(<QuoteForm />)
    fillForm()
    submitForm()

    const alert = await waitForAlert()
    expect(alert.textContent).toContain('not sent')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(inputValue(/Full Name/)).toBe('Jane Doe')
  })

  it('shows an alert and never calls fetch for the placeholder key', async () => {
    vi.stubEnv('VITE_WEB3FORMS_ACCESS_KEY', PLACEHOLDER_WEB3FORMS_ACCESS_KEY)
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    render(<QuoteForm />)
    fillForm()
    submitForm()

    const alert = await waitForAlert()
    expect(alert.textContent).toContain('not sent')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
