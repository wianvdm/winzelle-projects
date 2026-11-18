import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { flushSync } from 'react-dom'

import {
  contactFacts,
  getTrade,
  privacyNotes,
  quoteForm,
} from '../../content/next/index.ts'
import { getWeb3FormsAccessKey } from '../../lib/public-env.ts'
import { usePickState } from '../pick-state.tsx'
import { PHONE_HREF } from './Header.tsx'
import './form.css'

export const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit'
const FORM_ID = 'wz-form'
const STATUS_ID = 'wz-form-status'
// A ticked honeypot is sent the way a browser sends a ticked checkbox;
// Web3Forms drops any message that carries it.
const HONEYPOT_TICKED = 'on'

const PHONE_PATTERN = new RegExp(quoteForm.phonePattern)
const EMAIL_PATTERN = new RegExp(quoteForm.emailPattern)
const LETTERS = /[a-z]/i
const NON_DIGITS = /\D/g

interface FormValues {
  name: string
  phone: string
  email: string
  job: string
}

type CheckedField = 'phone' | 'email' | 'job'
type FieldErrors = Record<CheckedField, string>
type SendState = 'idle' | 'sending' | 'sent' | 'failed'

const EMPTY_VALUES: FormValues = { name: '', phone: '', email: '', job: '' }
const NO_ERRORS: FieldErrors = { phone: '', email: '', job: '' }
const CHECKED_FIELDS: CheckedField[] = ['phone', 'email', 'job']

const fieldIdOf = (field: keyof FormValues) => `wz-${field}`
const errorIdOf = (field: CheckedField) => `wz-${field}-error`

function phoneError(phone: string): string {
  if (!phone) return ''
  if (LETTERS.test(phone)) return quoteForm.errors.phoneHasLetters
  const digitCount = phone.replace(NON_DIGITS, '').length
  const digitsInRange =
    digitCount >= quoteForm.minPhoneDigits &&
    digitCount <= quoteForm.maxPhoneDigits
  if (!PHONE_PATTERN.test(phone) || !digitsInRange)
    return quoteForm.errors.phoneBadShape
  return ''
}

function emailError(email: string): string {
  if (!email || EMAIL_PATTERN.test(email)) return ''
  if (email.includes('@')) return quoteForm.errors.emailBadShape
  return quoteForm.errors.emailMissingAt
}

/** Spec S6 rules: phone or email required, each checked if filled. */
export function checkForm(values: FormValues): FieldErrors {
  const phone = values.phone.trim()
  const email = values.email.trim()
  const noContact = phone || email ? '' : quoteForm.errors.noContact
  return {
    phone: phoneError(phone) || noContact,
    email: emailError(email),
    job: values.job.trim() ? '' : quoteForm.errors.jobEmpty,
  }
}

interface Submission {
  accessKey: string
  values: FormValues
  tradeLabel: string | null
  honeypotTicked: boolean
}

/** The JSON Web3Forms receives; the picked trade goes in a field and the subject. */
function buildSubmission({
  accessKey,
  values,
  tradeLabel,
  honeypotTicked,
}: Submission): Record<string, string> {
  return {
    access_key: accessKey,
    subject: tradeLabel
      ? `${quoteForm.subject}: ${tradeLabel}`
      : quoteForm.subject,
    from_name: quoteForm.fromName,
    name: values.name.trim(),
    phone: values.phone.trim(),
    email: values.email.trim(),
    trade: tradeLabel ?? quoteForm.noTradePicked,
    message: values.job.trim(),
    ...(honeypotTicked && { botcheck: HONEYPOT_TICKED }),
  }
}

async function postSubmission(body: Record<string, string>): Promise<boolean> {
  try {
    const response = await fetch(WEB3FORMS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    })
    const result: unknown = await response.json()
    return (
      response.ok &&
      typeof result === 'object' &&
      result !== null &&
      (result as { success?: unknown }).success === true
    )
  } catch {
    // Offline, blocked or a non-JSON reply: the failure line gives the phone.
    return false
  }
}

function FieldError({
  field,
  message,
}: {
  field: CheckedField
  message: string
}) {
  return (
    <span className="wz-error" id={errorIdOf(field)}>
      {message}
    </span>
  )
}

function SendStatus({ sendState }: { sendState: SendState }) {
  if (sendState === 'sending') return quoteForm.sendingStatus
  if (sendState === 'sent') return quoteForm.successStatus
  if (sendState !== 'failed') return null
  return (
    <>
      {quoteForm.failureStatusBefore}
      <a className="wz-voice" href={PHONE_HREF}>
        {contactFacts.phoneDisplay}
      </a>
      {quoteForm.failureStatusAfter}
    </>
  )
}

/**
 * The fallback message form (spec S6). Errors are written beside each field
 * and the first invalid field takes focus; the visitor's input stays until a
 * message is sent. It posts only with fetch: the CSP's form-action 'none'
 * blocks a native form post.
 */
export function ContactForm() {
  const { pickedTradeId } = usePickState()
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES)
  const [errors, setErrors] = useState<FieldErrors>(NO_ERRORS)
  const [honeypotTicked, setHoneypotTicked] = useState(false)
  const [sendState, setSendState] = useState<SendState>('idle')
  // The first validation error, mirrored into the status region only when
  // focus stays put (Enter pressed in the invalid field), so a reader hears
  // it even though no description change or focus move announces it.
  const [statusNote, setStatusNote] = useState('')
  const phoneRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const jobRef = useRef<HTMLTextAreaElement>(null)

  // A field showing an error is checked again on every change, so its error
  // clears once fixed (an email clears the phone's "add a number" error too).
  const updateValue =
    (field: keyof FormValues) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const nextValues = { ...values, [field]: event.target.value }
      setValues(nextValues)
      const nextErrors = checkForm(nextValues)
      setErrors((shown) => ({
        phone: shown.phone && nextErrors.phone,
        email: shown.email && nextErrors.email,
        job: shown.job && nextErrors.job,
      }))
    }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (sendState === 'sending') return

    const found = checkForm(values)
    const firstInvalid = CHECKED_FIELDS.find((field) => found[field])
    if (firstInvalid) {
      // Commit the error text first, so focus lands on a described field.
      flushSync(() => {
        setErrors(found)
        setSendState('idle')
      })
      const fieldRefs = { phone: phoneRef, email: emailRef, job: jobRef }
      const target = fieldRefs[firstInvalid].current
      // Announcing the moved-to field already speaks its error; only a field
      // that keeps focus needs the status mirror to be heard.
      const focusStays = document.activeElement === target
      target?.focus()
      setStatusNote(focusStays ? found[firstInvalid] : '')
      return
    }

    setErrors(NO_ERRORS)
    setStatusNote('')
    const accessKey = getWeb3FormsAccessKey()
    if (accessKey === undefined) {
      setStatusNote('')
      setSendState('failed')
      return
    }
    setSendState('sending')
    const tradeLabel = pickedTradeId ? getTrade(pickedTradeId).label : null
    const sent = await postSubmission(
      buildSubmission({ accessKey, values, tradeLabel, honeypotTicked }),
    )
    if (!sent) {
      setSendState('failed')
      return
    }
    setValues(EMPTY_VALUES)
    setHoneypotTicked(false)
    setStatusNote('')
    setSendState('sent')
  }

  const describedField = (field: CheckedField) => ({
    'aria-invalid': errors[field] ? ('true' as const) : ('false' as const),
    'aria-describedby': errorIdOf(field),
  })

  return (
    <form
      className="wz-form wz-pin"
      id={FORM_ID}
      noValidate
      onSubmit={handleSubmit}
    >
      <h3 className="wz-h3">{quoteForm.heading}</h3>
      <p className="wz-form-note">{quoteForm.note}</p>
      <div className="wz-form-grid">
        <div className="wz-field">
          <label className="wz-voice" htmlFor={fieldIdOf('name')}>
            {quoteForm.nameLabel}
          </label>
          <input
            id={fieldIdOf('name')}
            type="text"
            name="name"
            autoComplete="name"
            value={values.name}
            onChange={updateValue('name')}
          />
        </div>
        <div className="wz-field">
          <label className="wz-voice" htmlFor={fieldIdOf('phone')}>
            {quoteForm.phoneLabel}
          </label>
          <input
            ref={phoneRef}
            id={fieldIdOf('phone')}
            type="tel"
            name="phone"
            autoComplete="tel"
            value={values.phone}
            onChange={updateValue('phone')}
            {...describedField('phone')}
          />
          <FieldError field="phone" message={errors.phone} />
        </div>
        <div className="wz-field">
          <label className="wz-voice" htmlFor={fieldIdOf('email')}>
            {quoteForm.emailLabel}
          </label>
          <input
            ref={emailRef}
            id={fieldIdOf('email')}
            type="email"
            name="email"
            autoComplete="email"
            value={values.email}
            onChange={updateValue('email')}
            {...describedField('email')}
          />
          <FieldError field="email" message={errors.email} />
        </div>
        <div className="wz-field wz-field-job">
          <label className="wz-voice" htmlFor={fieldIdOf('job')}>
            {quoteForm.jobLabel}
          </label>
          <textarea
            ref={jobRef}
            id={fieldIdOf('job')}
            name="job"
            value={values.job}
            onChange={updateValue('job')}
            {...describedField('job')}
          />
          <FieldError field="job" message={errors.job} />
        </div>
        {/* Hidden from people and assistive tech by its class; only bots
            that fill every box tick it. */}
        <div className="wz-honeypot">
          <label>
            {quoteForm.honeypotLabel}
            <input
              type="checkbox"
              name="botcheck"
              tabIndex={-1}
              checked={honeypotTicked}
              onChange={(event) => setHoneypotTicked(event.target.checked)}
            />
          </label>
        </div>
        <div className="wz-form-send">
          <button className="wz-send" type="submit">
            {quoteForm.submitLabel}
          </button>
        </div>
      </div>
      <p className="wz-form-status" id={STATUS_ID} role="status">
        {statusNote}
        <SendStatus sendState={sendState} />
      </p>
      <p className="wz-form-privacy">{privacyNotes.form}</p>
    </form>
  )
}
