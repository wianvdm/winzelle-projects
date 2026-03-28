export const siteSettingsQuery = `*[_type == "siteSettings"][0]`

export const heroQuery = `*[_type == "heroSection"][0]`

export const aboutQuery = `*[_type == "aboutSection"][0]`

export const servicesQuery = `*[_type == "service"] | order(displayOrder asc)`

export const projectsQuery = `*[_type == "project"] | order(displayOrder asc) {
  _id,
  title,
  location,
  description,
  coverImage,
  galleryImages,
  rating,
  status,
  displayOrder
}`

export const facebookBannerQuery = `*[_type == "facebookBanner"][0]`

export const contactQuery = `*[_type == "contactSection"][0]`
