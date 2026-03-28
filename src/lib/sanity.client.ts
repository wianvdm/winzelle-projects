import { createClient } from '@sanity/client'
import imageUrlBuilder from '@sanity/image-url'
import type { SanityImageSource } from '@sanity/image-url/lib/types/types'

// TODO: Replace with your actual Sanity project ID
const projectId = import.meta.env.VITE_SANITY_PROJECT_ID || 'your-project-id'
const dataset = import.meta.env.VITE_SANITY_DATASET || 'production'

export const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion: '2025-03-28',
  useCdn: true,
})

const builder = imageUrlBuilder(sanityClient)

export function urlFor(source: SanityImageSource) {
  return builder.image(source)
}
