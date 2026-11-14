// Local typed content shapes for the W4 migration off Sanity.
// Field names mirror the Sanity schemas in sanity/schemas except where a
// local representation replaces a CMS construct (logo asset ref -> logoPath,
// document _id -> id).

export interface SiteSettings {
  companyName: string
  tagline: string
  phone: string
  email: string
  whatsappNumber: string
  facebookUrl: string
  address: string
  /** Root-absolute path of the local logo file under public/. */
  logoPath: string
}

export interface HeroSection {
  heading: string
  subtitle: string
  secondaryText: string
  ctaPrimaryLabel: string
  ctaSecondaryLabel: string
}

export interface AboutSection {
  heading: string
  description: string[]
  commitmentText: string
  commitmentItems: string[]
  storyText: string
}

/** Lucide icon names allowed by the service schema's icon field. */
export type ServiceIconName =
  | 'Droplets'
  | 'ShieldCheck'
  | 'Flame'
  | 'Wrench'
  | 'House'
  | 'BuildingComplex'

export interface Service {
  id: string
  title: string
  icon: ServiceIconName
  description: string
  details: string[]
  displayOrder: number
}

export interface ProjectGalleryImage {
  path: string
  caption?: string
}

export interface Project {
  id: string
  title: string
  location?: string
  description?: string
  coverImagePath?: string
  galleryImages?: ProjectGalleryImage[]
  rating?: number
  status?: string
  displayOrder: number
}

export interface ContactSection {
  heading: string
  subtitle: string
  formSubtitle: string
  whatsappMessage: string
}

export interface FacebookBanner {
  heading: string
  subtitle: string
}
