import { defineType, defineField } from 'sanity'

export const aboutSection = defineType({
  name: 'aboutSection',
  title: 'About Section',
  type: 'document',
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      initialValue: 'Your Trusted Construction Partner in Port Elizabeth',
    }),
    defineField({
      name: 'description',
      title: 'Description Paragraphs',
      type: 'array',
      of: [{ type: 'text' }],
    }),
    defineField({
      name: 'commitmentText',
      title: 'Commitment Text',
      type: 'text',
      rows: 4,
    }),
    defineField({
      name: 'commitmentItems',
      title: 'Commitment Checklist Items',
      type: 'array',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'storyText',
      title: 'Our Story (expandable section)',
      type: 'text',
      rows: 8,
    }),
  ],
  preview: {
    prepare: () => ({ title: 'About Section' }),
  },
})
