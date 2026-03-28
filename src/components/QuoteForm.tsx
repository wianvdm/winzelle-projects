import { useState } from 'react'
import {
  MapPin,
  Phone,
  Mail,
  AlertTriangle,
  Send,
  MessageCircle,
} from 'lucide-react'

const serviceOptions = [
  'Waterproofing',
  'Damp Sealing',
  'Bitumen Torch-On',
  'General Repairs',
  'Maintenance',
  'Structural Repairs',
  'Scaffolding & Inspections',
  'Other',
]

export function QuoteForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    projectType: '',
    details: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_key: import.meta.env.VITE_WEB3FORMS_ACCESS_KEY,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          project_type: formData.projectType,
          message: formData.details,
          subject: `New Quote Request - ${formData.projectType}`,
        }),
      })

      if (response.ok) {
        setSubmitted(true)
        setFormData({
          name: '',
          email: '',
          phone: '',
          projectType: '',
          details: '',
        })
      }
    } catch {
      // Handle error silently for now
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section id="quote" className="py-20 bg-gradient-to-br from-primary via-secondary to-accent">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section heading */}
        <div className="text-center mb-14">
          <span className="section-badge border-light text-light">Contact Us</span>
          <h2 className="mt-4 font-heading text-3xl sm:text-4xl font-bold text-white">
            Get Your Free Quote Today
          </h2>
          <div className="section-underline !bg-light" />
          <p className="mt-3 text-gray-200">
            Contact us for a personalized quote for your construction or
            maintenance project
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left column - Form */}
          <div className="rounded-2xl border border-accent bg-white shadow-xl p-6 sm:p-8">
            <h3 className="font-heading text-xl font-bold text-primary mb-1">
              Request a Quote
            </h3>
            <p className="text-sm text-text-muted mb-6">
              Fill out the form below and we'll get back to you within 24 hours
            </p>

            {submitted ? (
              <div className="text-center py-12">
                <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <Send size={24} className="text-green-600" />
                </div>
                <h4 className="font-heading text-lg font-bold text-primary mb-2">
                  Quote Request Sent!
                </h4>
                <p className="text-text-muted">
                  We'll get back to you within 24 hours.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-4 text-accent font-medium hover:text-secondary bg-transparent border-none cursor-pointer"
                >
                  Send another request
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-text-dark mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-text-dark placeholder:text-gray-400 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-dark mb-1.5">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-text-dark placeholder:text-gray-400 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-dark mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+27 XX XXX XXXX"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-text-dark placeholder:text-gray-400 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-dark mb-1.5">
                    Project Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.projectType}
                    onChange={(e) =>
                      setFormData({ ...formData, projectType: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-text-dark focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors bg-white"
                  >
                    <option value="">Select a service</option>
                    {serviceOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-dark mb-1.5">
                    Project Details <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Please describe your project requirements..."
                    value={formData.details}
                    onChange={(e) =>
                      setFormData({ ...formData, details: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-text-dark placeholder:text-gray-400 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors resize-vertical"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-base font-semibold text-white hover:bg-secondary transition-colors disabled:opacity-50"
                >
                  <Send size={18} />
                  {submitting ? 'Sending...' : 'Submit Quote Request'}
                </button>
              </form>
            )}
          </div>

          {/* Right column - Contact info cards */}
          <div className="space-y-6">
            {/* Contact Information */}
            <div className="rounded-2xl border border-accent bg-white shadow-xl p-6">
              <h4 className="font-heading text-lg font-bold text-primary mb-1">
                Contact Information
              </h4>
              <p className="text-sm text-text-muted mb-5">
                Reach out to us directly for immediate assistance
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-light flex items-center justify-center shrink-0">
                    <MapPin size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-text-dark">Location</p>
                    <p className="text-sm text-text-muted">
                      Port Elizabeth, South Africa
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-light flex items-center justify-center shrink-0">
                    <Phone size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-text-dark">Phone</p>
                    <p className="text-sm text-text-muted">+27 XX XXX XXXX</p>
                    <p className="text-xs text-text-muted">Mon-Fri 8am - 5pm</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-light flex items-center justify-center shrink-0">
                    <Mail size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-text-dark">Email</p>
                    <p className="text-sm text-text-muted">
                      info@winzelleprojects.co.za
                    </p>
                    <p className="text-xs text-text-muted">
                      We reply within 24 hours
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* WhatsApp card */}
            <div className="rounded-2xl border border-green-200 bg-green-50 shadow-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                  <MessageCircle size={20} className="text-white" />
                </div>
                <div>
                  <h4 className="font-heading text-lg font-bold text-primary">
                    Chat With Us Directly
                  </h4>
                  <p className="text-sm text-text-muted">
                    Get an instant response via WhatsApp
                  </p>
                </div>
              </div>
              <a
                href="https://wa.me/27XXXXXXXXXX?text=Hi%2C%20I'd%20like%20a%20quote%20for..."
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 w-full flex items-center justify-center gap-2 rounded-lg bg-green-500 px-6 py-3 text-base font-semibold text-white no-underline hover:bg-green-600 transition-colors"
              >
                <MessageCircle size={18} />
                Message Us on WhatsApp
              </a>
            </div>

            {/* Business Hours */}
            <div className="rounded-2xl border border-accent bg-white shadow-xl p-6">
              <h4 className="font-heading text-lg font-bold text-primary mb-4">
                Business Hours
              </h4>
              <div className="space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Monday - Friday</span>
                  <span className="font-medium text-text-dark">
                    8:00 AM - 5:00 PM
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Saturday</span>
                  <span className="font-medium text-text-dark">
                    8:00 AM - 12:00 PM
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Sunday</span>
                  <span className="font-medium text-text-dark">Closed</span>
                </div>
              </div>
              <div className="mt-4 flex items-start gap-2 rounded-lg bg-accent/10 px-4 py-3">
                <AlertTriangle
                  size={16}
                  className="mt-0.5 shrink-0 text-accent"
                />
                <div>
                  <p className="text-sm font-medium text-text-dark">
                    Emergency services available
                  </p>
                  <p className="text-xs text-text-muted">
                    Higher rates apply — contact us via WhatsApp for urgent
                    requests
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
