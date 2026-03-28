import { useEffect, useState } from 'react'
import { Shield } from 'lucide-react'
import { sanityClient } from '../lib/sanity.client'
import { heroQuery } from '../lib/sanity.queries'

interface HeroData {
  heading?: string
  subtitle?: string
  secondaryText?: string
  ctaPrimaryLabel?: string
  ctaSecondaryLabel?: string
}

export function Hero() {
  const [data, setData] = useState<HeroData | null>(null)

  useEffect(() => {
    sanityClient.fetch<HeroData>(heroQuery).then(setData)
  }, [])

  const heading = data?.heading || 'Professional Waterproofing & Damp Sealing'
  const subtitle =
    data?.subtitle ||
    'Specialized contractors for all your general repairs & maintenance, damp proofing, bitumen torch-on and much more...'
  const secondaryText =
    data?.secondaryText ||
    'Serving Port Elizabeth and surrounding areas with expertise in waterproofing and damp sealing solutions.'
  const ctaPrimary = data?.ctaPrimaryLabel || 'Request Free Quote'
  const ctaSecondary = data?.ctaSecondaryLabel || 'Our Services'

  return (
    <section
      id="home"
      className="relative min-h-[600px] flex items-center overflow-hidden"
    >
      {/* Background with gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-secondary to-accent" />
      <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/70 to-primary/40" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left column - text */}
          <div>
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight">
              {heading}
            </h1>
            <p className="mt-6 text-lg text-gray-300 max-w-xl">{subtitle}</p>
            <p className="mt-4 text-base text-gray-400">{secondaryText}</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="#quote"
                className="inline-flex items-center rounded-full bg-light px-7 py-3 text-base font-semibold text-primary no-underline hover:bg-accent hover:text-white hover:shadow-lg transition-all"
              >
                {ctaPrimary}
              </a>
              <a
                href="#services"
                className="inline-flex items-center rounded-full border-2 border-white/30 px-7 py-3 text-base font-semibold text-white no-underline hover:bg-white/10 transition-colors"
              >
                {ctaSecondary}
              </a>
            </div>
            <div className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm text-gray-300">
              <Shield size={16} className="text-light" />
              NHBRC Registered
            </div>
          </div>

          {/* Right column - logo card */}
          <div className="hidden lg:flex justify-center">
            <div className="glass-card p-8 w-72 h-72 flex items-center justify-center">
              <img
                src="/images/winzelle_logo.jpg"
                alt="Winzelle Projects"
                className="w-56 h-56 object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
