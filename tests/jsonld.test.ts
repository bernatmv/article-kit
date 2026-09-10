import { describe, expect, it } from 'vitest'
import {
  articleJsonLd,
  itemList,
  jsonLdScript,
  listicleItems,
  markupProblems,
  type JsonLd,
} from '@/core/index.js'
import { CONTEXT, LISTICLE, PROSE } from './fixtures.js'

const typesIn = (blocks: JsonLd[]) => blocks.map((block) => block['@type'])

describe('articleJsonLd', () => {
  it('emits Article, FAQPage and BreadcrumbList for a prose entry', () => {
    expect(typesIn(articleJsonLd(PROSE, CONTEXT))).toEqual(['Article', 'FAQPage', 'BreadcrumbList'])
  })

  it('adds ItemList for a listicle, and only for a listicle', () => {
    expect(typesIn(articleJsonLd(LISTICLE, CONTEXT))).toContain('ItemList')
    expect(typesIn(articleJsonLd(PROSE, CONTEXT))).not.toContain('ItemList')
  })

  it('omits FAQPage rather than emitting an empty one', () => {
    const blocks = articleJsonLd({ ...PROSE, faq: [] }, CONTEXT)

    expect(typesIn(blocks)).not.toContain('FAQPage')
  })

  it('gives every block a context and a type', () => {
    for (const block of articleJsonLd(LISTICLE, CONTEXT)) {
      expect(block['@context']).toBe('https://schema.org')
      expect(typeof block['@type']).toBe('string')
    }
  })

  it('serializes no undefined and no null values', () => {
    const serialized = JSON.stringify(articleJsonLd({ ...PROSE, heroImage: undefined }, CONTEXT))

    expect(serialized).not.toContain('null')
    expect(serialized).not.toContain('undefined')
  })

  it('dates the article, falling back to the publication date when never updated', () => {
    const [prose] = articleJsonLd(PROSE, CONTEXT)
    const [listicle] = articleJsonLd(LISTICLE, CONTEXT)

    expect(prose).toMatchObject({ datePublished: '2026-08-26', dateModified: '2026-08-26' })
    expect(listicle).toMatchObject({ datePublished: '2026-09-01', dateModified: '2026-09-10' })
  })

  it('makes every URL absolute, including the hero image and the logo', () => {
    const [article] = articleJsonLd(LISTICLE, CONTEXT)

    expect(article?.url).toBe('https://kindlewatchlist.com/guides/en/stretch-a-kindle-charge')
    expect(article?.image).toBe('https://kindlewatchlist.com/images/stretch-a-kindle-charge.png')
    expect(article?.publisher).toMatchObject({
      logo: { url: 'https://kindlewatchlist.com/icon.svg' },
    })
  })

  it('puts the article last in the breadcrumb trail', () => {
    const breadcrumbs = articleJsonLd(PROSE, CONTEXT).find(
      (block) => block['@type'] === 'BreadcrumbList',
    )
    const trail = breadcrumbs?.itemListElement as { name: string; position: number }[]

    expect(trail.map((entry) => entry.name)).toEqual(['Guides', PROSE.title])
    expect(trail.map((entry) => entry.position)).toEqual([1, 2])
  })
})

describe('itemList', () => {
  it('numbers items from one and anchors each to its own heading', () => {
    const list = itemList(LISTICLE, CONTEXT)
    const items = list?.itemListElement as { position: number; url: string; name: string }[]

    expect(list?.numberOfItems).toBe(6)
    expect(items[0]).toMatchObject({
      position: 1,
      name: 'Dim the front light',
      url: 'https://kindlewatchlist.com/guides/en/stretch-a-kindle-charge#dim-the-front-light',
    })
    expect(items.at(-1)?.position).toBe(6)
  })

  it('matches the anchors the renderer produces', () => {
    const items = itemList(LISTICLE, CONTEXT)?.itemListElement as { url: string }[]
    const ids = listicleItems(LISTICLE).map((item) => item.id)

    expect(items.map((item) => item.url.split('#')[1])).toEqual(ids)
  })

  it('declines to claim a list when the body has no items', () => {
    expect(itemList({ ...LISTICLE, body: 'Just a sentence.' }, CONTEXT)).toBeNull()
  })
})

describe('jsonLdScript', () => {
  it('escapes a closing script tag hidden in the content', () => {
    const article = { ...PROSE, description: 'Ends the tag: </script><img onerror=x>' }
    const serialized = jsonLdScript(articleJsonLd(article, CONTEXT))

    expect(serialized).not.toContain('</script>')
    expect(serialized).toContain('\\u003c/script>')
    expect(JSON.parse(serialized.replace(/\\u003c/g, '<'))).toHaveLength(3)
  })
})

describe('markupProblems', () => {
  it('says nothing about a well-formed listicle', () => {
    expect(markupProblems(LISTICLE, CONTEXT)).toEqual([])
  })

  it('catches a counted title that is not marked as a listicle', () => {
    const mislabelled = { ...LISTICLE, format: 'prose' as const }

    expect(markupProblems(mislabelled, CONTEXT)).toContainEqual(
      expect.stringContaining('not marked as a listicle'),
    )
  })

  it('catches a body that does not deliver the count the title promises', () => {
    const short = {
      ...LISTICLE,
      body: '## Dim the front light\n\nOne.\n\n## Turn off sync\n\nTwo.',
    }

    expect(markupProblems(short, CONTEXT)).toContainEqual(
      expect.stringContaining('promises 6 items but the body has 2'),
    )
  })

  it('catches a site URL that is not an origin', () => {
    const context = { ...CONTEXT, site: { ...CONTEXT.site, url: '/relative' } }

    expect(markupProblems(PROSE, context)).toContainEqual(
      expect.stringContaining('must be an absolute origin'),
    )
  })
})
