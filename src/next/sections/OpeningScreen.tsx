import {
  contactFacts,
  getWorkPhoto,
  opening,
  openingPhotoIds,
  privacyNotes,
  whatsappLabels,
} from '../../content/next/index.ts'
import { Header, PHONE_HREF, type SectionLinksProps } from './Header.tsx'
import { PhotoPrint } from './Lightbox.tsx'
import { HERO_WHATSAPP_ID } from './StickyBar.tsx'

interface OpeningScreenProps extends SectionLinksProps {
  whatsappHref: string
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
        d="M4.2 19.8l1.1-3.9A8.2 8.2 0 1 1 8.4 19z"
      />
      <path
        fill="currentColor"
        d="M9 8.2c.3-.5.7-.5 1-.3l.8 1.8c.1.3 0 .5-.2.8l-.5.6c.6 1.2 1.6 2.1 2.8 2.7l.6-.6c.2-.2.5-.3.8-.2l1.7.8c.3.2.3.6.1 1-.5.9-1.4 1.3-2.4 1-2.4-.7-4.4-2.6-5.1-5.1-.2-.9 0-1.7.4-2.5z"
      />
    </svg>
  )
}

/**
 * NHBRC stamp (spec S2): registered. The registration number renders, and
 * joins the stamp's name, only once one is supplied; empty, the slot adds
 * nothing.
 */
export function NhbrcSeal({ nhbrcNumber }: { nhbrcNumber: string }) {
  const [topLine, centreLine, bottomLine] = opening.sealLines
  const label = nhbrcNumber
    ? `${opening.sealLabel}, ${opening.sealNumberLead} ${nhbrcNumber}`
    : opening.sealLabel
  return (
    <svg
      className="wz-seal"
      viewBox="0 0 128 128"
      role="img"
      aria-label={label}
    >
      <defs>
        <path id="wz-seal-top" d="M20 64a44 44 0 0 1 88 0" />
        <path id="wz-seal-bottom" d="M14 64a50 50 0 0 0 100 0" />
      </defs>
      <circle className="wz-seal-face" cx="64" cy="64" r="61" />
      <circle className="wz-seal-ring" cx="64" cy="64" r="56" />
      <circle className="wz-seal-ring" cx="64" cy="64" r="34" />
      <text className="wz-seal-arc" textAnchor="middle">
        <textPath href="#wz-seal-top" startOffset="50%">
          {topLine}
        </textPath>
      </text>
      <text className="wz-seal-arc" textAnchor="middle">
        <textPath href="#wz-seal-bottom" startOffset="50%">
          {bottomLine}
        </textPath>
      </text>
      <text className="wz-seal-mark" x="64" y="71" textAnchor="middle">
        {centreLine}
      </text>
      {nhbrcNumber !== '' && (
        <text className="wz-seal-number" x="64" y="84" textAnchor="middle">
          {nhbrcNumber}
        </text>
      )}
    </svg>
  )
}

// Prints are at most about 300px wide on the board and half the window in
// the two-column phone grid.
const OPENING_PRINT_SIZES = '(max-width: 1099px) 50vw, 300px'

/** Opening screen (spec S2): headline sheet, header, stamp, photo cluster. */
export function OpeningScreen({
  whatsappHref,
  currentSectionId,
}: OpeningScreenProps) {
  return (
    <section className="wz-opening" aria-labelledby="wz-title">
      <div className="wz-wrap wz-opening-board">
        <div className="wz-headline wz-pin">
          <h1 className="wz-title" id="wz-title">
            {opening.headline}
          </h1>
          <p className="wz-title-sub">{opening.subtitle}</p>
          <div className="wz-act">
            <a
              className="wz-whatsapp"
              id={HERO_WHATSAPP_ID}
              href={whatsappHref}
              target="_blank"
              rel="noopener"
            >
              <WhatsAppIcon />
              <span>{whatsappLabels.withPhoto}</span>
            </a>
            <span className="wz-act-phone">
              {opening.phoneLeadIn}{' '}
              <a className="wz-voice" href={PHONE_HREF}>
                {contactFacts.phoneDisplay}
              </a>
            </span>
          </div>
          <p className="wz-act-free">{opening.freeQuoteNote}</p>
          <p className="wz-meta-note">{privacyNotes.whatsapp}</p>
        </div>

        <Header currentSectionId={currentSectionId} />

        <NhbrcSeal nhbrcNumber={opening.nhbrcNumber} />

        {/* Placement, aspect and crop live in sections.css under the photo
            id: the CSP forbids inline style attributes. */}
        <div className="wz-cluster" data-wz-set="opening">
          {openingPhotoIds.map((id) => (
            <PhotoPrint
              key={id}
              photo={getWorkPhoto(id)}
              className={`wz-pinned wz-pin wz-pin-print wz-print wz-opening-${id}`}
              sizes={OPENING_PRINT_SIZES}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
