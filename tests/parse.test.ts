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

  it('reads dates a generator wrote unquoted, which YAML turns into Date objects', () => {
    const article = parseMarkdown(
      [
        '---',
        'title: A title',
        'slug: a-slug',
        'description: A description long enough to be a description.',
        'locale: es',
        'publishedAt: 2026-09-25',
        'updatedAt: 2026-09-26T10:30:00Z',
        '---',
        '',
        '## Body',
      ].join('\n'),
    )

    expect(article.publishedAt).toBe('2026-09-25')
    expect(article.updatedAt).toBe('2026-09-26T10:30:00.000Z')
  })

  it('reads the exact front matter the SEO optimizer writes', () => {
    // Shape of seo-optimizer's markdown adapter output: unquoted safe scalars, JSON-quoted
    // everything else, inline keyword arrays and a block list of question/answer pairs.
    const article = parseMarkdown(
      [
        '---',
        'title: "Qué es el BORME: guía para consultarlo"',
        'slug: que-es-el-borme',
        'description: "El BORME publica cada día hábil los actos inscritos en el Registro Mercantil."',
        'locale: es',
        'publishedAt: 2026-09-25',
        'keywords: ["borme", "registro mercantil"]',
        'format: listicle',
        'heroImage: /images/que-es-el-borme.png',
        'faq:',
        '  - question: "¿Es gratuito?"',
        '    answer: "Sí, la consulta en boe.es es gratuita."',
        '---',
        '',
        '## Primero',
      ].join('\n'),
    )

    expect(article).toMatchObject({
      title: 'Qué es el BORME: guía para consultarlo',
      publishedAt: '2026-09-25',
      keywords: ['borme', 'registro mercantil'],
      format: 'listicle',
      heroImage: { src: '/images/que-es-el-borme.png' },
      faq: [{ question: '¿Es gratuito?', answer: 'Sí, la consulta en boe.es es gratuita.' }],
    })
  })

  it('refuses a markdown file with no front matter', () => {
    expect(() => parseMarkdown('# Just a heading\n\nSome text.')).toThrow(/no front matter/)
  })
})
