/**
 * The regression guard. Two kinds of promise are held here rather than in the unit
 * tests: the public API surface, which consumers pin a version against, and the exact
 * markup a page renders, so a refactor that quietly drops a property fails loudly.
 */
import { describe, expect, it } from 'vitest'
import * as core from '@/core/index.js'
import * as next from '@/next/index.js'
import { articleJsonLd, renderBody, type JsonLd } from '@/core/index.js'
import { CONTEXT, LISTICLE, PROSE } from './fixtures.js'

const CORE_API = [
  'ArticleParseError',
  'absolute',
  'articleJsonLd',
  'articleMetadata',
  'breadcrumbList',
  'countWords',
  'escapeHtml',
  'faqPage',
  'headingId',
  'itemList',
  'jsonLdScript',
  'languageAlternates',
  'listicleItems',
  'mainArticle',
  'markupProblems',
  'parseArticle',
  'parseMarkdown',
  'readingMinutes',
  'renderBody',
  'sections',
  'titleItemCount',
  'toMarkdown',
]

const NEXT_API = ['ArticleBody', 'ArticleJsonLd', 'toMetadata']

describe('public API', () => {
  it('exports exactly what the version promises', () => {
    expect(Object.keys(core).sort()).toEqual(CORE_API)
  })

  it('exports the Next bindings', () => {
    expect(Object.keys(next).sort()).toEqual(NEXT_API)
  })
})

describe('schema.org shape', () => {
  const required: Record<string, string[]> = {
    Article: [
      'headline',
      'description',
      'datePublished',
      'author',
      'publisher',
      'mainEntityOfPage',
    ],
    FAQPage: ['mainEntity'],
    ItemList: ['itemListElement', 'numberOfItems'],
    BreadcrumbList: ['itemListElement'],
  }

  it.each([
    ['prose', PROSE],
    ['listicle', LISTICLE],
  ])('gives every %s block the properties its type requires', (_name, article) => {
    for (const block of articleJsonLd(article, CONTEXT)) {
      const type = String(block['@type'])
      for (const key of required[type] ?? []) {
        expect(block, `${type} is missing ${key}`).toHaveProperty(key)
      }
    }
  })

  it('numbers every list position consecutively from one', () => {
    for (const block of articleJsonLd(LISTICLE, CONTEXT)) {
      const items = block.itemListElement as { position: number }[] | undefined
      if (!items) continue
      expect(items.map((item) => item.position)).toEqual(items.map((_, index) => index + 1))
    }
  })

  it('leaves no relative URL anywhere in the markup', () => {
    const urls = collectUrls(articleJsonLd(LISTICLE, CONTEXT))

    expect(urls.length).toBeGreaterThan(3)
    for (const url of urls) expect(url).toMatch(/^https:\/\//)
  })
})

describe('rendered output', () => {
  it('renders the listicle exactly as recorded', () => {
    expect(renderBody(LISTICLE)).toMatchSnapshot()
  })

  it('builds the listicle markup exactly as recorded', () => {
    expect(articleJsonLd(LISTICLE, CONTEXT)).toMatchSnapshot()
  })

  it('builds the prose markup exactly as recorded', () => {
    expect(articleJsonLd(PROSE, CONTEXT)).toMatchSnapshot()
  })
})

/** Every `url`, `item` and `@id` in the tree, however deeply nested. */
function collectUrls(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectUrls)
  if (!value || typeof value !== 'object') return []
  const record = value as JsonLd
  const here = ['url', 'item', '@id', 'image'].flatMap((key) =>
    typeof record[key] === 'string' ? [record[key] as string] : [],
  )
  return [...here, ...Object.values(record).flatMap(collectUrls)]
}
