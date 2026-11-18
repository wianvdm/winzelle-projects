import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
// @ts-expect-error the script ships no type declarations
import { headersFor, parseHeadersFile } from '../scripts/design-gates/serve.mjs'
import { siteSettings } from './content/site-settings.ts'
import { services } from './content/services.ts'

function readJsonLd(): Record<string, unknown> {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  const match = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
  )
  expect(match, 'index.html should contain a JSON-LD block').not.toBeNull()
  return JSON.parse(match![1]!) as Record<string, unknown>
}

function toE164(phone: string): string {
  return phone.replace(/\s+/g, '')
}

describe('index.html SEO metadata', () => {
  it('keeps the JSON-LD business details in sync with siteSettings', () => {
    const jsonLd = readJsonLd()

    expect(jsonLd['url']).toBe('https://winzelle.co.za/')
    expect(jsonLd['telephone']).toBe(toE164(siteSettings.phone))
    expect(jsonLd['email']).toBe(siteSettings.email)
    expect(jsonLd['sameAs']).toEqual([siteSettings.facebookUrl])

    const address = jsonLd['address'] as Record<string, unknown>
    const parts = siteSettings.address.split(',').map((part) => part.trim())
    const street = parts.slice(0, 2).join(', ')
    const city = parts[2]!
    // JSON-LD uses the ISO 3166-1 alpha-2 code for the country name.
    const country = { 'South Africa': 'ZA' }[parts[3]!] ?? parts[3]
    const postalCode = parts[4]!
    expect(address['streetAddress']).toBe(street)
    expect(address['addressLocality']).toBe(city)
    expect(address['addressCountry']).toBe(country)
    expect(address['postalCode']).toBe(postalCode)
  })

  it('lists every service from src/content in the offer catalog', () => {
    const jsonLd = readJsonLd()
    const catalog = jsonLd['hasOfferCatalog'] as Record<string, unknown>
    const offers = catalog['itemListElement'] as Record<string, unknown>[]
    const offerNames = offers.map(
      (offer) =>
        (offer['itemOffered'] as Record<string, unknown>)['name'] as string,
    )

    expect(offerNames).toEqual(services.map((service) => service.title))
  })

  it('contains no obsolete domain or placeholder telephone', () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

    expect(html).not.toContain('winzelleprojects.co.za')
    expect(html).not.toContain('XXXX')
  })
})

function readRepoFile(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
}

// The files that render /: its HTML, the legacy components and the legacy
// content modules (src/content/next/ belongs to /next).
function legacyPageFiles(): string[] {
  const inDir = (dir: string) =>
    readdirSync(new URL(`../${dir}`, import.meta.url), { withFileTypes: true })
      .filter((entry) => entry.isFile() && !entry.name.includes('.test.'))
      .map((entry) => `${dir}/${entry.name}`)
  return [
    'index.html',
    'src/routes/index.tsx',
    ...inDir('src/components'),
    ...inDir('src/content'),
  ]
}

describe('/next soak stays out of search (#104)', () => {
  const headerBlocks = parseHeadersFile(readRepoFile('public/_headers'))
  const robotsHeaderAt = (pathname: string) =>
    new Map<string, string>(headersFor(headerBlocks, pathname)).get(
      'x-robots-tag',
    )

  it('sends X-Robots-Tag: noindex on /next and not on /', () => {
    expect(robotsHeaderAt('/next')).toBe('noindex')
    expect(robotsHeaderAt('/')).toBeUndefined()
  })

  it('keeps /next out of the sitemap', () => {
    expect(readRepoFile('public/sitemap.xml')).not.toContain('/next')
  })

  it('never links to /next from /', () => {
    for (const file of legacyPageFiles()) {
      expect(readRepoFile(file), file).not.toContain('/next')
    }
  })
})
