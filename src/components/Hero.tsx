import { Shield } from 'lucide-react'

export function Hero() {
  return (
    <section
      id="home"
      className="relative min-h-[600px] flex items-center overflow-hidden"
    >
      {/* Background with gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy-light to-steel" />
      {/* Placeholder for future background image */}
      {/* <img src="/images/hero-bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" /> */}
      <div className="absolute inset-0 bg-gradient-to-r from-navy/90 via-navy/70 to-navy/40" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left column - text */}
          <div>
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight">
              Professional{' '}
              <span className="text-amber">Waterproofing</span>
              <br />
              & <span className="text-amber">Damp Sealing</span>
            </h1>
            <p className="mt-6 text-lg text-gray-300 max-w-xl">
              Specialized contractors for all your general repairs &
              maintenance, damp proofing, bitumen torch-on and much more...
            </p>
            <p className="mt-4 text-base text-gray-400">
              Serving Port Elizabeth and surrounding areas with expertise in
              waterproofing and damp sealing solutions.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="#quote"
                className="inline-flex items-center rounded-full bg-amber px-7 py-3 text-base font-semibold text-white no-underline hover:bg-amber-light transition-colors"
              >
                Request Free Quote
              </a>
              <a
                href="#services"
                className="inline-flex items-center rounded-full border-2 border-white/30 px-7 py-3 text-base font-semibold text-white no-underline hover:bg-white/10 transition-colors"
              >
                Our Services
              </a>
            </div>
            <div className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm text-gray-300">
              <Shield size={16} className="text-amber" />
              NHBRC Registered
            </div>
          </div>

          {/* Right column - logo card */}
          <div className="hidden lg:flex justify-center">
            <div className="glass-card p-8 w-72 h-72 flex items-center justify-center">
              <img
                src="/images/logo.png"
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
