// "Our story" (spec S5). The quote punctuation is verbatim from the spec.

export interface StorySection {
  heading: string
  todayHeading: string
  todayText: string
  beforeHeading: string
  beforeParagraphs: string[]
  signoffQuote: string
  signoffAuthor: string
}

export const storySection: StorySection = {
  heading: 'Our story',
  todayHeading: 'Today',
  todayText:
    'With the start of 2025, new opportunities emerged as we were blessed with maintenance and construction jobs. We learn more with every job, and thanks to the good friends we make along the way, this is opening doors we would never have thought of.',
  beforeHeading: 'Before the building work',
  beforeParagraphs: [
    'It was with great sadness that we had to say goodbye to Winzelle Dried Fruits at the end of December 2024. Hard times in the business and at home meant we could not carry on down that road.',
    'Thank you to every friend, colleague, family member and stranger who helped us along the way.',
  ],
  signoffQuote:
    'Like Joshua crossing the Jordan, we are also faced with uncertainties but the Lord promised us that He will be with us all the way — we need to be “strong and courageous” (Josh 1:9) and He will never forsake us.',
  signoffAuthor: 'The Winzelle family',
}
