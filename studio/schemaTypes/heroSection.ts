import { defineType, defineField } from 'sanity'

export const heroSection = defineType({
  name: 'heroSection',
  title: 'Hero Section',
  type: 'document',
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      initialValue: 'Professional Waterproofing & Damp Sealing',
    }),
    defineField({
      name: 'subtitle',
      title: 'Subtitle',
      type: 'text',
      rows: 3,
      initialValue:
        'Specialized contractors for all your general repairs & maintenance, damp proofing, bitumen torch-on and much more...',
    }),
    defineField({
      name: 'secondaryText',
      title: 'Secondary Text',
      type: 'text',
      rows: 2,
      initialValue:
        'Serving Port Elizabeth and surrounding areas with expertise in waterproofing and damp sealing solutions.',
    }),
    defineField({
      name: 'ctaPrimaryLabel',
      title: 'Primary CTA Label',
      type: 'string',
      initialValue: 'Request Free Quote',
    }),
    defineField({
      name: 'ctaSecondaryLabel',
      title: 'Secondary CTA Label',
      type: 'string',
      initialValue: 'Our Services',
    }),
    defineField({
      name: 'backgroundImage',
      title: 'Background Image',
      type: 'image',
      options: { hotspot: true },
    }),
  ],
  preview: {
    prepare: () => ({ title: 'Hero Section' }),
  },
})
