import type { ContactSection } from './types.ts'

// Canonical source: published contactSection document `contactSection`.
// The web3forms access key is not CMS content; QuoteForm reads it from the
// VITE_WEB3FORMS_ACCESS_KEY environment variable.
export const contactSection: ContactSection = {
  heading: 'Get Your Free Quote Today',
  subtitle:
    'Contact us for a personalized quote for your construction or maintenance project',
  formSubtitle:
    "Fill out the form below and we'll get back to you within 24 hours",
  whatsappMessage: "Hi, I'd like a quote for...",
}
