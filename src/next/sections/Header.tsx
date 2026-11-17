import {
  companyName,
  contactFacts,
  header,
  pageNavLinks,
} from '../../content/next/index.ts'

const LOGO_SRC = '/content/images/winzelle-logo.jpg'
const LOGO_SIZE = 66

export const PHONE_HREF = `tel:${contactFacts.phoneTel}`

export interface SectionLinksProps {
  /** Id of the section under the sticky bar, marked with aria-current. */
  currentSectionId: string | null
}

/** The four section anchors, shared by the header nav and the sticky bar. */
export function SectionLinks({ currentSectionId }: SectionLinksProps) {
  return pageNavLinks.map((link) => (
    <a
      key={link.href}
      href={link.href}
      aria-current={link.href === `#${currentSectionId}` ? 'true' : undefined}
    >
      {link.label}
    </a>
  ))
}

// Keeps the last word ("Family-run.") from breaking away onto its own line.
function splitLastWord(text: string): [string, string] {
  const lastSpace = text.lastIndexOf(' ')
  return [text.slice(0, lastSpace + 1), text.slice(lastSpace + 1)]
}

/**
 * Top header (spec S1). Sits after the headline sheet in the DOM so the
 * opening WhatsApp action is the first Tab stop; CSS places it on top.
 */
export function Header({ currentSectionId }: SectionLinksProps) {
  const [summaryLead, summaryTail] = splitLastWord(header.tradeSummary)

  return (
    <header className="wz-header">
      <span className="wz-plate">
        <img
          src={LOGO_SRC}
          alt={header.logoAlt}
          width={LOGO_SIZE}
          height={LOGO_SIZE}
        />
      </span>
      <span className="wz-firm">
        <span className="wz-firm-name">{companyName}</span>
        <span className="wz-firm-trade">
          {summaryLead}
          <span className="wz-nowrap">{summaryTail}</span>
        </span>
      </span>
      <nav className="wz-nav" aria-label="Sections">
        <SectionLinks currentSectionId={currentSectionId} />
      </nav>
      <a className="wz-header-phone wz-voice" href={PHONE_HREF}>
        {contactFacts.phoneDisplay}
      </a>
    </header>
  )
}
