// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { quoteForm } from '../../content/next/index.ts'
import { PickStateProvider, usePickState } from '../pick-state.tsx'
import { checkForm, ContactForm, WEB3FORMS_ENDPOINT } from './ContactForm.tsx'

const TEST_KEY = 'test-access-key'
const PRIVACY_NOTICE =
  'Your details come to us, Winzelle Projects, and we use them only to reply to this message, never for marketing. Giving them is up to you. The form sends them through Web3Forms, a service outside South Africa. If you press Show the map, your browser loads it from OpenStreetMap.'
const SUCCESS =
  "Thanks, your message is on its way. We'll get back to you on the number or email you gave."
const FAILURE =
  "Your message didn't send. Phone us on 082 878 1557, or try again."

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

function PickRoofs() {
  const { pick } = usePickState()
  return (
    <button type="button" onClick={() => pick('roofs')}>
      pick roofs
    </button>
  )
}

function renderForm() {
  return render(
    <PickStateProvider>
      <PickRoofs />
      <ContactForm />
    </PickStateProvider>,
  )
}

const field = (label: string) =>
  screen.getByLabelText(label) as HTMLInputElement | HTMLTextAreaElement

function type(label: string, value: string) {
  fireEvent.change(field(label), { target: { value } })
}

function fillForm() {
  type('Your name', 'Thandi')
  type('Phone number', '082 123 4567')
  type('Email', 'thandi@example.co.za')
  type('What needs doing, and where', 'Damp wall in the lounge, Walmer')
}

const send = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Send message' }))

const statusText = () => screen.getByRole('status').textContent

/** The text an invalid field points at through aria-describedby. */
function describedError(label: string): string | null {
  const input = field(label)
  if (input.getAttribute('aria-invalid') !== 'true') return null
  const id = input.getAttribute('aria-describedby') ?? ''
  return document.getElementById(id)?.textContent ?? null
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function stubFetch(response: Promise<Response> | Response) {
  const fetchMock = vi.fn().mockReturnValue(Promise.resolve(response))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function sentBody(fetchMock: ReturnType<typeof vi.fn>): unknown {
  const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
  return JSON.parse(init.body as string)
}

describe('ContactForm', () => {
  it('shows the heading, note, four labelled fields, the send button and the privacy notice', () => {
    renderForm()

    const form = document.getElementById('wz-form') as HTMLFormElement
    expect(form.noValidate).toBe(true)
    expect(form.getAttribute('action')).toBeNull()
    expect(
      within(form).getByRole('heading', {
        level: 3,
        name: 'Rather leave a message?',
      }),
    ).toBeDefined()
    expect(
      within(form).getByText(
        'Add a phone number, an email, or both, and what needs doing.',
      ),
    ).toBeDefined()
    expect(
      ['Your name', 'Phone number', 'Email', 'What needs doing, and where'].map(
        (label) => [field(label).tagName, field(label).getAttribute('name')],
      ),
    ).toEqual([
      ['INPUT', 'name'],
      ['INPUT', 'phone'],
      ['INPUT', 'email'],
      ['TEXTAREA', 'job'],
    ])
    expect(within(form).getByText(PRIVACY_NOTICE)).toBeDefined()
    expect(screen.getByRole('status').id).toBe('wz-form-status')
    expect(statusText()).toBe('')
  })

  it('hides the honeypot from people, the tab order and the accessibility tree', () => {
    renderForm()

    const honeypot = document.querySelector<HTMLInputElement>(
      'input[name="botcheck"]',
    )
    expect(honeypot?.type).toBe('checkbox')
    expect(honeypot?.tabIndex).toBe(-1)
    expect(honeypot?.closest('.wz-honeypot')).not.toBeNull()

    const css = readFileSync(
      resolve(process.cwd(), 'src/next/sections/form.css'),
      'utf8',
    )
    expect(css).toMatch(/\.wz-honeypot \{\s+display: none;\s+\}/)
  })

  it('writes the errors beside the fields and focuses the first one on an empty submit', () => {
    const fetchMock = stubFetch(jsonResponse(200, { success: true }))
    renderForm()

    send()

    expect(describedError('Your name')).toBeNull()
    expect(describedError('Phone number')).toBe(
      'Add a number or email so we can reach you.',
    )
    expect(describedError('Email')).toBeNull()
    expect(describedError('What needs doing, and where')).toBe(
      'Tell us in a few words what needs doing.',
    )
    expect(document.activeElement).toBe(field('Phone number'))
    expect(field('Phone number').getAttribute('aria-describedby')).toBe(
      'wz-phone-error',
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('announces the first error in the status region when Enter is pressed in the invalid field', () => {
    const fetchMock = stubFetch(jsonResponse(200, { success: true }))
    renderForm()

    type('Email', 'name@example')
    field('Email').focus()
    fireEvent.keyDown(field('Email'), { key: 'Enter' })
    // jsdom skips the implicit submission Enter would trigger; submit the
    // form the same way with focus still in the invalid field.
    fireEvent.submit(document.getElementById('wz-form') as HTMLFormElement)

    expect(document.activeElement).toBe(field('Email'))
    expect(statusText()).toBe(quoteForm.errors.emailBadShape)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does not mirror the error into the status region when focus moves to the field', () => {
    renderForm()

    send()

    expect(document.activeElement).toBe(field('Phone number'))
    expect(statusText()).toBe('')
  })

  it('focuses the job box when only the message is missing', () => {
    stubFetch(jsonResponse(200, { success: true }))
    renderForm()

    type('Email', 'thandi@example.co.za')
    send()

    expect(document.activeElement).toBe(field('What needs doing, and where'))
  })

  it('clears each error as its field is fixed, and an email clears the missing-number error', () => {
    renderForm()
    type('Phone number', 'abc')
    send()
    expect(describedError('Phone number')).toBe(
      'That phone number has letters in it. Use digits only, with spaces if you like.',
    )

    type('Phone number', '')
    expect(describedError('Phone number')).toBe(
      'Add a number or email so we can reach you.',
    )
    type('Email', 'thandi@example.co.za')
    expect(describedError('Phone number')).toBeNull()
    expect(field('Phone number').getAttribute('aria-invalid')).toBe('false')

    type('What needs doing, and where', 'Roof leaks')
    expect(describedError('What needs doing, and where')).toBeNull()
  })

  it('only checks a field while it shows an error, so typing never raises a new one', () => {
    renderForm()

    type('Phone number', '08')

    expect(describedError('Phone number')).toBeNull()
  })

  it("keeps the visitor's input after an error", () => {
    renderForm()
    type('Your name', 'Thandi')
    type('Phone number', '12')
    type('What needs doing, and where', 'Cracked wall')

    send()

    expect(field('Your name').value).toBe('Thandi')
    expect(field('Phone number').value).toBe('12')
    expect(field('What needs doing, and where').value).toBe('Cracked wall')
  })

  it('posts every field, the picked trade and the env key to Web3Forms, then says what happens next', async () => {
    vi.stubEnv('VITE_WEB3FORMS_ACCESS_KEY', TEST_KEY)
    const fetchMock = stubFetch(jsonResponse(200, { success: true }))
    renderForm()
    fireEvent.click(screen.getByRole('button', { name: 'pick roofs' }))
    fillForm()

    send()

    await waitFor(() => expect(statusText()).toBe(SUCCESS))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(WEB3FORMS_ENDPOINT)
    expect(url).toBe('https://api.web3forms.com/submit')
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({
      'Content-Type': 'application/json',
      Accept: 'application/json',
    })
    expect(sentBody(fetchMock)).toEqual({
      access_key: TEST_KEY,
      subject: 'Website message: Roofs',
      from_name: 'Winzelle Projects website',
      name: 'Thandi',
      phone: '082 123 4567',
      email: 'thandi@example.co.za',
      trade: 'Roofs',
      message: 'Damp wall in the lounge, Walmer',
    })
    expect(field('Your name').value).toBe('')
    expect(field('What needs doing, and where').value).toBe('')
  })

  it('says no trade was picked when the visitor never picked a tile', async () => {
    vi.stubEnv('VITE_WEB3FORMS_ACCESS_KEY', TEST_KEY)
    const fetchMock = stubFetch(jsonResponse(200, { success: true }))
    renderForm()
    fillForm()

    send()

    await waitFor(() => expect(statusText()).toBe(SUCCESS))
    expect(sentBody(fetchMock)).toMatchObject({
      subject: 'Website message',
      trade: 'Not picked',
    })
  })

  it('sends botcheck when a bot ticks the honeypot, as a browser would', async () => {
    vi.stubEnv('VITE_WEB3FORMS_ACCESS_KEY', TEST_KEY)
    const fetchMock = stubFetch(jsonResponse(200, { success: true }))
    renderForm()
    fillForm()
    fireEvent.click(
      document.querySelector<HTMLInputElement>('input[name="botcheck"]')!,
    )

    send()

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(sentBody(fetchMock)).toMatchObject({ botcheck: 'on' })
  })

  it('shows "sending" while the post is under way', async () => {
    vi.stubEnv('VITE_WEB3FORMS_ACCESS_KEY', TEST_KEY)
    let reply: (response: Response) => void = () => {}
    const fetchMock = stubFetch(
      new Promise<Response>((resolve) => {
        reply = resolve
      }),
    )
    renderForm()
    fillForm()

    send()

    await waitFor(() => expect(statusText()).toBe('Sending your message…'))
    send()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await act(async () => reply(jsonResponse(200, { success: true })))
    expect(statusText()).toBe(SUCCESS)
  })

  it('gives the phone number and keeps the input when Web3Forms refuses the message', async () => {
    vi.stubEnv('VITE_WEB3FORMS_ACCESS_KEY', TEST_KEY)
    stubFetch(jsonResponse(400, { success: false }))
    renderForm()
    fillForm()

    send()

    await waitFor(() => expect(statusText()).toBe(FAILURE))
    const call = within(screen.getByRole('status')).getByRole('link', {
      name: '082 878 1557',
    })
    expect(call.getAttribute('href')).toBe('tel:+27828781557')
    expect(field('Your name').value).toBe('Thandi')
    expect(field('Phone number').value).toBe('082 123 4567')
    expect(field('Email').value).toBe('thandi@example.co.za')
    expect(field('What needs doing, and where').value).toBe(
      'Damp wall in the lounge, Walmer',
    )
  })

  it('gives the phone number when the network fails', async () => {
    vi.stubEnv('VITE_WEB3FORMS_ACCESS_KEY', TEST_KEY)
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
    renderForm()
    fillForm()

    send()

    await waitFor(() => expect(statusText()).toBe(FAILURE))
    expect(field('Your name').value).toBe('Thandi')
  })

  it('never posts without an access key and gives the phone number instead', () => {
    vi.stubEnv('VITE_WEB3FORMS_ACCESS_KEY', '')
    const fetchMock = stubFetch(jsonResponse(200, { success: true }))
    renderForm()
    fillForm()

    send()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(statusText()).toBe(FAILURE)
  })
})

describe('checkForm', () => {
  const values = { name: '', phone: '', email: '', job: 'Paving' }

  it('needs a phone number or an email, and a job', () => {
    expect(checkForm({ ...values, job: ' ' })).toEqual({
      phone: quoteForm.errors.noContact,
      email: '',
      job: quoteForm.errors.jobEmpty,
    })
    expect(checkForm({ ...values, phone: '082 878 1557' }).phone).toBe('')
    expect(checkForm({ ...values, email: 'a@b.co' }).phone).toBe('')
  })

  it.each([
    ['082 878 1557', ''],
    ['+27 82 878 1557', ''],
    ['041 123-4567', ''],
    ['(041) 123 4567', quoteForm.errors.phoneBadShape],
    ['082 878 155a', quoteForm.errors.phoneHasLetters],
    ['082 878', quoteForm.errors.phoneBadShape],
    ['0828781557123', quoteForm.errors.phoneBadShape],
    ['082 878 1557!', quoteForm.errors.phoneBadShape],
  ])('checks the phone number %j', (phone, error) => {
    expect(checkForm({ ...values, phone }).phone).toBe(error)
  })

  it.each([
    ['name@example.co.za', ''],
    ['name@example', quoteForm.errors.emailBadShape],
    ['name@.c', quoteForm.errors.emailBadShape],
    ['name.example.co.za', quoteForm.errors.emailMissingAt],
  ])('checks the email %j', (email, error) => {
    expect(checkForm({ ...values, email }).email).toBe(error)
  })
})
