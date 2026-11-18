import {
  contactFacts,
  footer as fieldLabels,
  privacyNotes,
  whatsappLabels,
} from '../../content/next/index.ts'
import { ContactMap } from '../map/ContactMap.tsx'
import { ContactForm } from './ContactForm.tsx'
import { PHONE_HREF } from './Header.tsx'
import './closing.css'

const CONTACT_SECTION_ID = 'wz-contact'
const CONTACT_TITLE_ID = 'wz-contact-title'
export const EMAIL_HREF = `mailto:${contactFacts.email}`

interface ContactCardProps {
  whatsappHref: string
}

/**
 * Contact (spec S6): the pinned card, WhatsApp first, hanging over the map
 * print, with the message form tucked under the card.
 */
export function ContactCard({ whatsappHref }: ContactCardProps) {
  return (
    <section id={CONTACT_SECTION_ID} aria-labelledby={CONTACT_TITLE_ID}>
      <div className="wz-wrap">
        <div className="wz-contact-board">
          <div className="wz-card wz-pin">
            <h2 className="wz-h2" id={CONTACT_TITLE_ID}>
              {contactFacts.contactHeading}
            </h2>
            <p className="wz-card-lead">
              {contactFacts.contactLead} {contactFacts.serviceArea}
            </p>
            <a
              className="wz-whatsapp"
              href={whatsappHref}
              target="_blank"
              rel="noopener"
            >
              <span className="wz-whatsapp-label">
                {whatsappLabels.general}
              </span>
              <span className="wz-whatsapp-number wz-voice">
                {contactFacts.phoneDisplay}
              </span>
            </a>
            <p className="wz-meta-note">{privacyNotes.whatsapp}</p>
            <dl className="wz-other">
              <dt className="wz-voice">{fieldLabels.phoneLabel}</dt>
              <dd>
                <a className="wz-voice" href={PHONE_HREF}>
                  {contactFacts.phoneDisplay}
                </a>
              </dd>
              <dt className="wz-voice">{fieldLabels.emailLabel}</dt>
              <dd>
                <a href={EMAIL_HREF}>{contactFacts.email}</a>
              </dd>
              <dt className="wz-voice">{fieldLabels.addressLabel}</dt>
              <dd>
                <a
                  href={contactFacts.directionsUrl}
                  target="_blank"
                  rel="noopener"
                >
                  {contactFacts.address}
                </a>
              </dd>
              <dt className="wz-voice">{fieldLabels.facebookLabel}</dt>
              <dd>
                <a
                  href={contactFacts.facebookUrl}
                  target="_blank"
                  rel="noopener"
                >
                  {contactFacts.facebookLabel}
                </a>
              </dd>
            </dl>
          </div>
          <ContactMap />
          <ContactForm />
        </div>
      </div>
    </section>
  )
}
