import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ArticleBody, ArticleJsonLd, toMetadata } from '@/next/index.js'
import { CONTEXT, LISTICLE, PROSE } from './fixtures.js'

describe('toMetadata', () => {
  it('nests canonical and languages the way Next expects', () => {
    const metadata = toMetadata(PROSE, CONTEXT)

    expect(metadata.alternates.canonical).toBe(
      'https://kindlewatchlist.com/guides/en/kindle-battery-life',
    )
    expect(Object.keys(metadata.alternates.languages)).toEqual(['en', 'es', 'de', 'x-default'])
    expect(metadata).not.toHaveProperty('canonical')
  })

  it('omits keywords when the article declares none', () => {
    expect(toMetadata({ ...PROSE, keywords: [] }, CONTEXT)).not.toHaveProperty('keywords')
  })
})

describe('ArticleJsonLd', () => {
  it('renders one script tag holding every block', () => {
    const html = renderToStaticMarkup(<ArticleJsonLd article={LISTICLE} context={CONTEXT} />)

    expect(html.startsWith('<script type="application/ld+json">')).toBe(true)
    const payload = html.slice(html.indexOf('>') + 1, html.lastIndexOf('</script>'))
    const blocks = JSON.parse(payload.replace(/\\u003c/g, '<')) as { '@type': string }[]
    expect(blocks.map((block) => block['@type'])).toEqual([
      'Article',
      'FAQPage',
      'ItemList',
      'BreadcrumbList',
    ])
  })

  it('honours the article type override', () => {
    const html = renderToStaticMarkup(
      <ArticleJsonLd article={PROSE} context={CONTEXT} options={{ articleType: 'BlogPosting' }} />,
    )

    expect(html).toContain('"@type":"BlogPosting"')
  })
})

describe('ArticleBody', () => {
  it('renders the body with heading anchors and the class it was given', () => {
    const html = renderToStaticMarkup(<ArticleBody article={LISTICLE} className="prose" />)

    expect(html).toContain('<div class="prose">')
    expect(html).toContain('<h2 id="dim-the-front-light">')
  })

  it('escapes raw HTML from the markdown source', () => {
    const article = { ...PROSE, body: '<img src=x onerror="alert(1)">\n\nText.' }

    expect(renderToStaticMarkup(<ArticleBody article={article} />)).not.toContain('onerror="')
  })
})
