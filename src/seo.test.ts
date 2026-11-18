import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
// @ts-expect-error the script ships no type declarations
import { headersFor, parseHeadersFile } from '../scripts/design-gates/serve.mjs'
import { contactFacts, trades } from './content/next/index.ts'

function readRepoFile(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
}

function readJsonLd(): Record<string, unknown> {
  const match = readRepoFile('index.html').match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
  )
  expect(match, 'index.html should contain a JSON-LD block').not.toBeNull()
  return JSON.parse(match![1]!) as Record<string, unknown>
}

function normaliseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function readMetaContent(html: string, attribute: string): string {
  const metaTag = html
    .match(/<meta\b[^>]*>/g)
    ?.find((tag) => tag.includes(attribute))
  const content = metaTag?.match(/content="([^"]*)"/)?.[1]
  expect(
    content,
    `index.html should contain a ${attribute} meta tag`,
  ).toBeDefined()
  return normaliseWhitespace(content!)
}

describe('index.html SEO metadata', () => {
  it('keeps the JSON-LD business details in sync with src/content/next', () => {
    const jsonLd = readJsonLd()

    expect(jsonLd['url']).toBe('https://winzelle.co.za/')
    expect(jsonLd['telephone']).toBe(contactFacts.phoneTel)
    expect(jsonLd['email']).toBe(contactFacts.email)
    expect(jsonLd['sameAs']).toEqual([contactFacts.facebookUrl])

    const address = jsonLd['address'] as Record<string, unknown>
    const [street, suburb, city, postalCode] = contactFacts.address
      .split(',')
      .map((part) => part.trim())
    expect(address['streetAddress']).toBe(`${street}, ${suburb}`)
    expect(address['addressLocality']).toBe(city)
    expect(address['postalCode']).toBe(postalCode)
    expect(address['addressCountry']).toBe('ZA')
  })

  it('lists every trade but the catch-all in the offer catalog', () => {
    const catalog = readJsonLd()['hasOfferCatalog'] as Record<string, unknown>
    const offers = catalog['itemListElement'] as Record<string, unknown>[]
    const offerNames = offers.map(
      (offer) =>
        (offer['itemOffered'] as Record<string, unknown>)['name'] as string,
    )

    expect(offerNames).toEqual(
      trades
        .filter((trade) => trade.id !== 'other')
        .map((trade) => trade.label),
    )
  })

  it('states no opening hours, which the page does not show', () => {
    expect(readJsonLd()).not.toHaveProperty('openingHoursSpecification')
  })

  it('drops the old waterproofing headline from every tag', () => {
    const html = readRepoFile('index.html')

    expect(html).not.toMatch(/damp\s+sealing/i)
    expect(html).toMatch(
      /<title>\s*Winzelle Projects \| Maintenance, repairs and building in Port Elizabeth\s*<\/title>/,
    )
  })

  it('gives social cards the same title and description as search results', () => {
    const html = readRepoFile('index.html')

    expect(readMetaContent(html, 'property="og:title"')).toBe(
      normaliseWhitespace(html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ''),
    )
    expect(readMetaContent(html, 'property="og:description"')).toBe(
      readMetaContent(html, 'name="description"'),
    )
  })

  it('stays indexable at the canonical home page', () => {
    const html = readRepoFile('index.html')

    expect(html).toContain(
      '<link rel="canonical" href="https://winzelle.co.za/" />',
    )
    expect(html).not.toContain('name="robots"')
  })

  it('contains no obsolete domain or placeholder telephone', () => {
    const html = readRepoFile('index.html')

    expect(html).not.toContain('winzelleprojects.co.za')
    expect(html).not.toContain('XXXX')
  })
})

describe('self-hosted fonts only', () => {
  it('loads no stylesheet or preconnect from another host in index.html', () => {
    const linkTags = readRepoFile('index.html').match(/<link\b[^>]*>/g) ?? []
    const remote = linkTags.filter(
      (tag) =>
        /rel="(?:stylesheet|preconnect)"/.test(tag) &&
        !/href="\/(?!\/)/.test(tag),
    )

    expect(remote).toEqual([])
  })

  it("limits styles and fonts to 'self' in the CSP", () => {
    const csp = new Map<string, string>(
      headersFor(parseHeadersFile(readRepoFile('public/_headers')), '/'),
    ).get('content-security-policy')

    expect(csp).toContain("style-src 'self';")
    expect(csp).toContain("font-src 'self';")
  })
})

describe('crawl surface', () => {
  it('sends no X-Robots-Tag on any path', () => {
    const blocks = parseHeadersFile(readRepoFile('public/_headers'))
    for (const pathname of ['/', '/next'])
      expect(
        new Map<string, string>(headersFor(blocks, pathname)).has(
          'x-robots-tag',
        ),
        pathname,
      ).toBe(false)
  })

  it('lists only / in the sitemap', () => {
    const locations = [
      ...readRepoFile('public/sitemap.xml').matchAll(/<loc>([^<]*)<\/loc>/g),
    ].map((match) => match[1])

    expect(locations).toEqual(['https://winzelle.co.za/'])
  })
})
