import { defineType, defineField } from 'sanity'

export const contactSection = defineType({
  name: 'contactSection',
  title: 'Contact Section',
  type: 'document',
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      initialValue: 'Get Your Free Quote Today',
    }),
    defineField({
      name: 'subtitle',
      title: 'Subtitle',
      type: 'string',
      initialValue:
        'Contact us for a personalized quote for your construction or maintenance project',
    }),
    defineField({
      name: 'formSubtitle',
      title: 'Form Subtitle',
      type: 'string',
      initialValue:
        "Fill out the form below and we'll get back to you within 24 hours",
    }),
    defineField({
      name: 'whatsappMessage',
      title: 'Pre-filled WhatsApp Message',
      type: 'string',
      initialValue: "Hi, I'd like a quote for...",
    }),
    defineField({
      name: 'web3formsKey',
      title: 'Web3Forms Access Key',
      type: 'string',
      description: 'Get your free access key from web3forms.com',
    }),
  ],
  preview: {
    prepare: () => ({ title: 'Contact Section' }),
  },
})
