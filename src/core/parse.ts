/**
 * Reading an article from the two shapes a generator produces: a JSON object, or
 * markdown with front matter. Both land on the same validated record, so a project can
 * switch storage without touching its templates.
 */
import matter from 'gray-matter'
import type { Article, ArticleFormat, FaqEntry, HeroImage } from './types.js'

export class ArticleParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ArticleParseError'
  }
}

const REQUIRED = ['title', 'slug', 'description', 'body', 'locale', 'publishedAt'] as const

/**
 * Validates and normalizes an article-shaped object. Unknown keys are kept in `extra`
 * rather than dropped: a project's own front matter is none of this package's business,
 * but losing it silently would be.
 */
export function parseArticle(input: unknown): Article {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ArticleParseError('An article must be an object')
  }
  const raw = input as Record<string, unknown>

  const strings: Record<string, string> = {}
  for (const key of REQUIRED) {
    const value = raw[key]
    if (typeof value !== 'string' || value.trim() === '') {
      throw new ArticleParseError(`An article needs a non-empty ${key}`)
    }
    strings[key] = value.trim()
  }

  const body = String(raw.body)
  if (!isIsoDate(strings.publishedAt as string)) {
    throw new ArticleParseError(`publishedAt must be an ISO date, got "${String(raw.publishedAt)}"`)
  }
  if (raw.updatedAt !== undefined && !isIsoDate(String(raw.updatedAt))) {
    throw new ArticleParseError(`updatedAt must be an ISO date, got "${String(raw.updatedAt)}"`)
  }

  const known = new Set([
    ...REQUIRED,
    'updatedAt',
    'keywords',
    'format',
    'heroImage',
    'faq',
    'extra',
  ])
  const extra: Record<string, unknown> = { ...(asRecord(raw.extra) ?? {}) }
  for (const [key, value] of Object.entries(raw)) {
    if (!known.has(key)) extra[key] = value
  }

  const article: Article = {
    title: strings.title as string,
    slug: strings.slug as string,
    description: strings.description as string,
    body,
    locale: strings.locale as string,
    publishedAt: strings.publishedAt as string,
    format: parseFormat(raw.format),
    keywords: parseKeywords(raw.keywords),
    faq: parseFaq(raw.faq),
  }
  const updatedAt = raw.updatedAt === undefined ? undefined : String(raw.updatedAt)
  if (updatedAt) article.updatedAt = updatedAt
  const hero = parseHero(raw.heroImage)
  if (hero) article.heroImage = hero
  if (Object.keys(extra).length > 0) article.extra = extra

  return article
}

/** Front matter plus markdown body, the shape a generated `.md` file arrives in. */
export function parseMarkdown(source: string): Article {
  const { data, content } = matter(source)
  if (Object.keys(data).length === 0) {
    throw new ArticleParseError('The markdown file has no front matter')
  }
  return parseArticle({ ...data, body: content.trim() })
}

/** The inverse of `parseMarkdown`, so a project can round-trip an article to disk. */
export function toMarkdown(article: Article): string {
  const { body, ...front } = article
  return matter.stringify(`${body}\n`, front)
}

function parseFormat(value: unknown): ArticleFormat {
  // Anything but an explicit listicle is prose: `ItemList` markup on a page that is not
  // a list is a structured-data mismatch, so the format has to be stated.
  return value === 'listicle' ? 'listicle' : 'prose'
}

function parseKeywords(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((entry) => String(entry).trim()).filter(Boolean)
}

function parseFaq(value: unknown): FaqEntry[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => {
      const record = asRecord(entry)
      if (!record) return null
      // `q`/`a` is what several of these repos already store.
      const question = String(record.question ?? record.q ?? '').trim()
      const answer = String(record.answer ?? record.a ?? '').trim()
      return question && answer ? { question, answer } : null
    })
    .filter((entry): entry is FaqEntry => entry !== null)
}

function parseHero(value: unknown): HeroImage | undefined {
  if (typeof value === 'string') return value.trim() ? { src: value.trim() } : undefined
  const record = asRecord(value)
  if (!record) return undefined
  const src = String(record.src ?? record.path ?? '').trim()
  if (!src) return undefined
  const hero: HeroImage = { src }
  if (record.alt) hero.alt = String(record.alt)
  if (typeof record.width === 'number') hero.width = record.width
  if (typeof record.height === 'number') hero.height = record.height
  return hero
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:\d{2})?)?$/.test(value)
}
