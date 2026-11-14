import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { siteSettings } from './content/site-settings.ts'

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

    expect(jsonLd['url']).toBe('https://winzelle.co.za')
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

  it('contains no obsolete domain or placeholder telephone', () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

    expect(html).not.toContain('winzelleprojects.co.za')
    expect(html).not.toContain('XXXX')
  })
})
