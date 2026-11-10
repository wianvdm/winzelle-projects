import { MessageCircle } from 'lucide-react'
import { siteSettings } from '../content'

const quickLinks = [
  { label: 'Home', href: '#home' },
  { label: 'About Us', href: '#about' },
  { label: 'Services', href: '#services' },
  { label: 'Projects', href: '#projects' },
  { label: 'Contact', href: '#quote' },
]

const serviceLinks = [
  'Waterproofing',
  'Damp Sealing',
  'Bitumen Torch-On',
  'General Repairs',
  'Maintenance',
  'Structural Repairs',
]

export function Footer() {
  const currentYear = new Date().getFullYear()

  const companyName = siteSettings.companyName
  const tagline = siteSettings.tagline
  const phone = siteSettings.phone
  const address = siteSettings.address
  const facebookUrl = siteSettings.facebookUrl
  const waNumber = siteSettings.whatsappNumber

  return (
    <footer className="bg-primary text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {/* Company info */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img
                src={siteSettings.logoPath}
                alt="Winzelle Projects"
                className="h-10 w-10 rounded-lg object-contain"
              />
              <div>
                <span className="font-heading text-lg font-bold">
                  {companyName}
                </span>
                <span className="block text-xs text-light">{tagline}</span>
              </div>
            </div>
            <p className="text-sm text-light leading-relaxed mb-4">
              Professional waterproofing and construction services in Port
              Elizabeth.
            </p>
            <div className="space-y-1 text-sm text-light">
              <p>{address}</p>
              <p>{phone}</p>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-heading text-base font-bold mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2.5 list-none p-0 m-0">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-light hover:text-white transition-colors no-underline"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-heading text-base font-bold mb-4">Services</h4>
            <ul className="space-y-2.5 list-none p-0 m-0">
              {serviceLinks.map((service) => (
                <li key={service}>
                  <a
                    href="#services"
                    className="text-sm text-light hover:text-white transition-colors no-underline"
                  >
                    {service}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-secondary">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-secondary m-0">
            &copy; {currentYear} {companyName}. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            {/* Facebook */}
            <a
              href={facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-secondary hover:text-white transition-colors no-underline"
              aria-label="Facebook"
            >
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>
            {/* WhatsApp */}
            <a
              href={`https://wa.me/${waNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-secondary hover:text-white transition-colors no-underline"
              aria-label="WhatsApp"
            >
              <MessageCircle size={20} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
