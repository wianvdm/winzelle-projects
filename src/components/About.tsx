import { useState } from 'react'
import {
  CheckCircle,
  Handshake,
  Award,
  Heart,
  MapPin,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { aboutSection } from '../content'

const valueBadges = [
  { icon: Handshake, title: 'Hands-On', subtitle: 'Every Project' },
  { icon: Award, title: 'Quality', subtitle: 'Workmanship' },
  { icon: Heart, title: 'Trusted', subtitle: 'Local Service' },
  { icon: MapPin, title: 'PE', subtitle: 'Based Locally' },
]

export function About() {
  const [storyOpen, setStoryOpen] = useState(false)

  const heading = aboutSection.heading
  const description = aboutSection.description
  const commitmentText = aboutSection.commitmentText
  const commitmentItems = aboutSection.commitmentItems
  const storyParagraphs = aboutSection.storyText.split('\n\n').filter(Boolean)

  return (
    <section id="about" className="py-20 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section heading */}
        <div className="text-center mb-14">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-primary">
            About Us
          </h2>
          <div className="section-underline" />
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Left column */}
          <div>
            <h3 className="font-heading text-xl sm:text-2xl font-bold text-primary mb-6">
              {heading}
            </h3>
            {description.map((para, i) => (
              <p key={i} className="text-text-muted leading-relaxed mb-4">
                {para}
              </p>
            ))}

            {/* Value badges */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              {valueBadges.map((badge) => (
                <div
                  key={badge.title}
                  className="rounded-xl border border-gray-200 bg-light p-5 text-center"
                >
                  <badge.icon
                    size={24}
                    className="mx-auto mb-2 text-primary"
                  />
                  <p className="font-heading text-lg font-bold text-primary">
                    {badge.title}
                  </p>
                  <p className="text-sm text-text-muted">{badge.subtitle}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right column - Commitment card */}
          <div>
            <div className="rounded-2xl border border-accent bg-[linear-gradient(135deg,#cbe5f1_0%,#fefefd_100%)] p-8">
              <h4 className="font-heading text-xl font-bold text-primary mb-4">
                Our Commitment
              </h4>
              <p className="text-text-muted leading-relaxed mb-6">
                {commitmentText}
              </p>
              <ul className="space-y-3">
                {commitmentItems.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle
                      size={20}
                      className="mt-0.5 shrink-0 text-accent"
                    />
                    <span className="text-text-dark font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Read Our Story expandable */}
        <div className="mt-12">
          <button
            onClick={() => setStoryOpen(!storyOpen)}
            className="mx-auto flex items-center gap-2 text-accent font-medium hover:text-accent-light transition-colors bg-transparent border-none cursor-pointer"
          >
            {storyOpen ? 'Hide Our Story' : 'Read Our Story'}
            {storyOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {storyOpen && (
            <div className="mt-6 mx-auto max-w-3xl rounded-2xl bg-surface border border-gray-200 p-8">
              {storyParagraphs.map((para, i) => (
                <p
                  key={i}
                  className={`text-text-muted leading-relaxed${i < storyParagraphs.length - 1 ? ' mb-4' : ' italic'}`}
                >
                  {para}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
