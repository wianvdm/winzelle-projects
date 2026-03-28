import { useState } from 'react'
import { Menu, X } from 'lucide-react'

const navLinks = [
  { label: 'Home', href: '#home' },
  { label: 'About Us', href: '#about' },
  { label: 'Services', href: '#services' },
  { label: 'Projects', href: '#projects' },
]

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo + company name */}
          <a href="#home" className="flex items-center gap-3 no-underline">
            <img
              src="/images/logo.png"
              alt="Winzelle Projects Logo"
              className="h-10 w-10 rounded-lg object-contain"
            />
            <div>
              <span className="font-heading text-lg font-bold text-navy">
                Winzelle Projects
              </span>
              <span className="hidden sm:block text-xs text-text-muted">
                Waterproofing & Damp Sealing Experts
              </span>
            </div>
          </a>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-text-dark hover:text-steel transition-colors no-underline"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* CTA + mobile toggle */}
          <div className="flex items-center gap-3">
            <a
              href="#quote"
              className="hidden sm:inline-flex items-center rounded-full bg-amber px-5 py-2 text-sm font-semibold text-white no-underline hover:bg-amber-light transition-colors"
            >
              Get a Quote
            </a>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-navy"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block text-sm font-medium text-text-dark hover:text-steel no-underline"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#quote"
              onClick={() => setMobileOpen(false)}
              className="block w-full text-center rounded-full bg-amber px-5 py-2.5 text-sm font-semibold text-white no-underline hover:bg-amber-light transition-colors"
            >
              Get a Quote
            </a>
          </div>
        </div>
      )}
    </nav>
  )
}
