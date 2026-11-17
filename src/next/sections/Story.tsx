import {
  getTrade,
  storySection,
  whatsappLabels,
} from '../../content/next/index.ts'
import { usePickState } from '../pick-state.tsx'
import { buildWhatsAppLink, storyMessage, tradeMessage } from '../whatsapp.ts'
import './closing.css'

export const STORY_SECTION_ID = 'wz-story'
const STORY_TITLE_ID = 'wz-story-title'
const SIGNOFF_LABEL = 'Sign-off'

/** Story WhatsApp link: its own message until a trade is picked. */
function useStoryWhatsAppHref(): string {
  const { pickedTradeId } = usePickState()
  const message = pickedTradeId
    ? tradeMessage(getTrade(pickedTradeId))
    : storyMessage()
  return buildWhatsAppLink(message)
}

/** Our story (spec S5): the short sheet and the pinned sign-off note. */
export function Story() {
  const whatsappHref = useStoryWhatsAppHref()

  return (
    <section id={STORY_SECTION_ID} aria-labelledby={STORY_TITLE_ID}>
      <div className="wz-wrap wz-story-board">
        <article className="wz-story-sheet">
          <h2 className="wz-h2" id={STORY_TITLE_ID}>
            {storySection.heading}
          </h2>
          <h3 className="wz-h3">{storySection.todayHeading}</h3>
          <p>{storySection.todayText}</p>
          <h3 className="wz-h3">{storySection.beforeHeading}</h3>
          {storySection.beforeParagraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <a
            className="wz-whatsapp"
            href={whatsappHref}
            target="_blank"
            rel="noopener"
          >
            {whatsappLabels.general}
          </a>
        </article>
        <aside className="wz-signoff wz-pin" aria-label={SIGNOFF_LABEL}>
          <blockquote>{storySection.signoffQuote}</blockquote>
          <p>{storySection.signoffAuthor}</p>
        </aside>
      </div>
    </section>
  )
}
