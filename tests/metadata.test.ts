import { describe, expect, it } from 'vitest'
import { articleMetadata, languageAlternates } from '@/core/index.js'
import { CONTEXT, LISTICLE, PROSE } from './fixtures.js'

describe('articleMetadata', () => {
  it('builds an absolute canonical from the path resolver', () => {
    expect(articleMetadata(PROSE, CONTEXT).canonical).toBe(
      'https://kindlewatchlist.com/guides/en/kindle-battery-life',
    )
  })

  it('tolerates a site URL with a trailing slash', () => {
    const context = { ...CONTEXT, site: { ...CONTEXT.site, url: 'https://kindlewatchlist.com/' } }

    expect(articleMetadata(PROSE, context).canonical).toBe(
      'https://kindlewatchlist.com/guides/en/kindle-battery-life',
    )
  })

  it('carries the hero image into both cards', () => {
    const metadata = articleMetadata(LISTICLE, CONTEXT)

    expect(metadata.openGraph.images).toEqual([
      {
        url: 'https://kindlewatchlist.com/images/stretch-a-kindle-charge.png',
        alt: 'A Kindle on a desk',
        width: 1200,
        height: 630,
      },
    ])
    expect(metadata.twitter.images).toEqual([
      'https://kindlewatchlist.com/images/stretch-a-kindle-charge.png',
    ])
  })

  it('omits the image keys entirely when there is no hero', () => {
    const metadata = articleMetadata(PROSE, CONTEXT)

    expect(metadata.openGraph.images).toBeUndefined()
    expect(metadata.twitter.images).toBeUndefined()
  })

  it('normalizes a bare twitter handle', () => {
    expect(articleMetadata(PROSE, CONTEXT).twitter.site).toBe('@kindlewatch')
  })

  it('dates the open graph card, falling back to publication', () => {
    expect(articleMetadata(PROSE, CONTEXT).openGraph).toMatchObject({
      publishedTime: '2026-08-26',
      modifiedTime: '2026-08-26',
    })
  })
})

describe('languageAlternates', () => {
  it('gives every locale an absolute URL at its own path', () => {
    expect(languageAlternates(PROSE, CONTEXT)).toEqual({
      en: 'https://kindlewatchlist.com/guides/en/kindle-battery-life',
      es: 'https://kindlewatchlist.com/guides/es/kindle-battery-life',
      de: 'https://kindlewatchlist.com/guides/de/kindle-battery-life',
      'x-default': 'https://kindlewatchlist.com/guides/en/kindle-battery-life',
    })
  })

  it('falls back to the article locale when none are declared', () => {
    const context = { ...CONTEXT, locales: undefined, defaultLocale: undefined }

    expect(languageAlternates(PROSE, context)).toEqual({
      en: 'https://kindlewatchlist.com/guides/en/kindle-battery-life',
    })
  })

  it('omits x-default when the default locale is not one of the alternates', () => {
    const context = { ...CONTEXT, defaultLocale: 'fr' }

    expect(languageAlternates(PROSE, context)['x-default']).toBeUndefined()
  })
})
