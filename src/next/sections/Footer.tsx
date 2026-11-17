import { Fragment } from 'react'

import {
  companyName,
  contactFacts,
  footer,
  pageNavLinks,
} from '../../content/next/index.ts'
import { EMAIL_HREF } from './ContactCard.tsx'
import { PHONE_HREF } from './Header.tsx'
import './closing.css'

const LOGO_SRC = '/content/images/winzelle-logo.jpg'
const LOGO_SIZE = 60
const PAGE_LINKS_LABEL_ID = 'wz-ft-nav'
const TOP_OF_PAGE_HREF = '#'

/**
 * Footer (spec S7): a title block ruled like a drawing sheet's. The logo is
 * decorative here (alt="") because the firm's name sits beside it.
 */
export function Footer() {
  return (
    <footer className="wz-ft">
      <div className="wz-wrap">
        <div className="wz-ft-grid">
          <div className="wz-ft-firm">
            <img
              className="wz-ft-logo"
              src={LOGO_SRC}
              alt=""
              width={LOGO_SIZE}
              height={LOGO_SIZE}
            />
            <div>
              <p className="wz-ft-name">{companyName}</p>
              <p className="wz-ft-claims">
                {footer.claims.map((claim, index) => (
                  <Fragment key={claim}>
                    {index > 0 && ' '}
                    <span className="wz-nowrap">{claim}</span>
                  </Fragment>
                ))}
              </p>
            </div>
          </div>
          <dl className="wz-ft-fields">
            <dt className="wz-voice">{footer.addressLabel}</dt>
            <dd className="wz-ft-text">{contactFacts.address}</dd>
            <dt className="wz-voice">{footer.areaLabel}</dt>
            <dd className="wz-ft-text">{contactFacts.serviceArea}</dd>
          </dl>
          <dl className="wz-ft-fields">
            <dt className="wz-voice">{footer.phoneLabel}</dt>
            <dd>
              <a className="wz-voice" href={PHONE_HREF}>
                {contactFacts.phoneDisplay}
              </a>
            </dd>
            <dt className="wz-voice">{footer.emailLabel}</dt>
            <dd>
              <a href={EMAIL_HREF}>{contactFacts.email}</a>
            </dd>
            <dt className="wz-voice">{footer.facebookLabel}</dt>
            <dd>
              <a href={contactFacts.facebookUrl} target="_blank" rel="noopener">
                {contactFacts.facebookLabel}
              </a>
            </dd>
          </dl>
          <nav aria-labelledby={PAGE_LINKS_LABEL_ID}>
            <p className="wz-voice wz-ft-label" id={PAGE_LINKS_LABEL_ID}>
              {footer.pageLinksLabel}
            </p>
            <ul className="wz-ft-list">
              {pageNavLinks.map((link) => (
                <li key={link.href}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
      <div className="wz-ft-base">
        <div className="wz-wrap wz-ft-base-row">
          <p>{footer.copyright}</p>
          <p>
            <a href={TOP_OF_PAGE_HREF}>{footer.backToTopLabel}</a>
          </p>
        </div>
      </div>
    </footer>
  )
}
