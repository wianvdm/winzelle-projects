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

const commitmentItems = [
  'Professional expertise & experience',
  'Free consultations and quotes',
  'Timely project completion',
  'Clean and tidy work sites',
  'NHBRC registered for home building & construction',
]

const valueBadges = [
  { icon: Handshake, title: 'Hands-On', subtitle: 'Every Project' },
  { icon: Award, title: 'Quality', subtitle: 'Workmanship' },
  { icon: Heart, title: 'Trusted', subtitle: 'Local Service' },
  { icon: MapPin, title: 'PE', subtitle: 'Based Locally' },
]

export function About() {
  const [storyOpen, setStoryOpen] = useState(false)

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
              Your Trusted Construction Partner in Port Elizabeth
            </h3>
            <p className="text-text-muted leading-relaxed mb-4">
              Winzelle Projects is a dedicated team of construction professionals
              specializing in maintenance, repairs, and waterproofing services.
              Based in Port Elizabeth, South Africa, we've built our reputation on
              quality workmanship and reliable service, becoming a trusted name for
              homeowners and businesses throughout the region.
            </p>
            <p className="text-text-muted leading-relaxed mb-8">
              Our hands-on team provides personalized attention to every project,
              from routine maintenance jobs to comprehensive waterproofing
              installations. We combine proven techniques with quality materials to
              deliver lasting solutions that protect your property. Every project
              receives our full dedication — you're not just a job number, you're a
              valued client.
            </p>

            {/* Value badges */}
            <div className="grid grid-cols-2 gap-4">
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
                We believe in transparent pricing, quality workmanship, and
                exceptional customer service. Every project receives our full
                attention and dedication, ensuring the job is done right the first
                time. Your satisfaction is our priority, and we work closely with
                you throughout every stage of your project.
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
              <p className="text-text-muted leading-relaxed mb-4">
                It was with great sadness that we had to say goodbye to Winzelle
                Dried Fruits at the end of December 2024. Due to financial
                difficulties and other personal issues, we could not continue on
                that road.
              </p>
              <p className="text-text-muted leading-relaxed mb-4">
                With the start of 2025, new opportunities emerged as we were
                blessed with maintenance and construction jobs. We still have much
                to learn, but thanks to good friends that we make on our way, this
                is creating opportunities we would never have thought of.
              </p>
              <p className="text-text-muted leading-relaxed italic">
                Like Joshua crossing the Jordan, we are also faced with
                uncertainties but the Lord promised us that He will be with us all
                the way — we need to be "strong and courageous" (Josh 1:9) and He
                will never forsake us. Thank you for every friend, colleague,
                family member and stranger that helped us on our way...
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
