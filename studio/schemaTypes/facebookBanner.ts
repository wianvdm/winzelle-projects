import { defineType, defineField } from 'sanity'

export const facebookBanner = defineType({
  name: 'facebookBanner',
  title: 'Facebook Banner',
  type: 'document',
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      initialValue: 'Follow Us on Facebook',
    }),
    defineField({
      name: 'subtitle',
      title: 'Subtitle',
      type: 'string',
      initialValue:
        'Stay updated with our latest projects and receive exclusive insights',
    }),
    defineField({
      name: 'bodyText',
      title: 'Body Text',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'facebookUrl',
      title: 'Facebook Page URL',
      type: 'url',
    }),
  ],
  preview: {
    prepare: () => ({ title: 'Facebook Banner' }),
  },
})
