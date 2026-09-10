import { describe, expect, it } from 'vitest'
import { ArticleParseError, parseArticle, parseMarkdown, toMarkdown } from '@/core/index.js'
import { LISTICLE, PROSE } from './fixtures.js'

describe('parseArticle', () => {
  it('accepts a complete record unchanged', () => {
    expect(parseArticle(PROSE)).toMatchObject({
      title: PROSE.title,
      slug: PROSE.slug,
      locale: 'en',
      format: 'prose',
    })
  })

  it.each(['title', 'slug', 'description', 'body', 'locale', 'publishedAt'])(
    'refuses a record with no %s',
    (field) => {
      const broken = { ...PROSE, [field]: '' }
      expect(() => parseArticle(broken)).toThrow(new RegExp(`needs a non-empty ${field}`))
    },
  )

  it('refuses a date that is not ISO', () => {
    expect(() => parseArticle({ ...PROSE, publishedAt: 'August 2026' })).toThrow(ArticleParseError)
  })

  it('treats an unstated format as prose, so no ItemList is claimed by accident', () => {
    expect(parseArticle({ ...PROSE, format: undefined }).format).toBe('prose')
    expect(parseArticle({ ...PROSE, format: 'LISTICLE' }).format).toBe('prose')
    expect(parseArticle(LISTICLE).format).toBe('listicle')
  })

  it('reads the q/a FAQ shape these repos already store', () => {
    const parsed = parseArticle({
      ...PROSE,
      faq: [
        { q: 'Is it fast?', a: 'Yes.' },
        { q: '', a: 'dropped' },
      ],
    })

    expect(parsed.faq).toEqual([{ question: 'Is it fast?', answer: 'Yes.' }])
  })

  it('accepts a hero image as a bare path or an object', () => {
    expect(parseArticle({ ...PROSE, heroImage: '/a.png' }).heroImage).toEqual({ src: '/a.png' })
    expect(parseArticle({ ...PROSE, heroImage: { src: '/a.png', alt: 'x' } }).heroImage).toEqual({
      src: '/a.png',
      alt: 'x',
    })
  })

  it("keeps a project's own front matter instead of dropping it", () => {
    const parsed = parseArticle({ ...PROSE, cluster: 'guides', readingLevel: 8 })

    expect(parsed.extra).toEqual({ cluster: 'guides', readingLevel: 8 })
  })

  it.each([null, 'a string', 42, []])('refuses %s as an article', (value) => {
    expect(() => parseArticle(value)).toThrow(ArticleParseError)
  })
})

describe('markdown round trip', () => {
  it('reads front matter and body back into the same record', () => {
    const restored = parseMarkdown(toMarkdown(LISTICLE))

    expect(restored).toEqual(LISTICLE)
  })

  it('refuses a markdown file with no front matter', () => {
    expect(() => parseMarkdown('# Just a heading\n\nSome text.')).toThrow(/no front matter/)
  })
})
