/**
 * Markdown to HTML, plus the section structure the rest of the package needs. Headings
 * get stable ids because an assistant that can link to one item cites the item, and a
 * reader who lands on that anchor sees the answer rather than the top of the page.
 */
import { Marked } from 'marked'
import type { Article } from './types.js'

export type Section = {
  /** Heading text with markdown stripped. */
  name: string
  /** Slugified id, matching the `id` attribute on the rendered heading. */
  id: string
  level: number
  /** The first sentence or two under the heading, as plain text. */
  summary: string
}

export type RenderOptions = {
  /** Prefix for generated heading ids, when a page renders more than one article. */
  idPrefix?: string
}

/** Renders the body to HTML. Raw HTML in the source is escaped, never passed through. */
export function renderBody(article: Article, options: RenderOptions = {}): string {
  const marked = new Marked({ gfm: true, breaks: false, async: false })
  const used = new Set<string>()

  marked.use({
    renderer: {
      heading({ tokens, depth }) {
        const text = this.parser.parseInline(tokens)
        const id = uniqueId(headingId(stripTags(text), options.idPrefix), used)
        return `<h${depth} id="${id}">${text}</h${depth}>\n`
      },
      html({ raw }) {
        return escapeHtml(raw)
      },
    },
  })

  return (marked.parse(article.body) as string).trim()
}

/** The H2 sections, in document order. For a listicle these are the items. */
export function sections(article: Article, options: RenderOptions = {}): Section[] {
  const used = new Set<string>()
  const found: Section[] = []
  const lines = article.body.split('\n')
  let fenced = false

  lines.forEach((line, index) => {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced
    if (fenced) return
    const match = /^(#{2,4})\s+(.*)$/.exec(line)
    if (!match) return
    const name = stripInlineMarkdown(match[2] as string).trim()
    if (!name) return
    found.push({
      name,
      id: uniqueId(headingId(name, options.idPrefix), used),
      level: (match[1] as string).length,
      summary: summaryAfter(lines, index),
    })
  })

  return found
}

/**
 * The items a listicle promises. Only H2s count: a listicle's items are its top-level
 * sections, and folding H3s in would put sub-points in the `ItemList` as peers.
 */
export function listicleItems(article: Article, options: RenderOptions = {}): Section[] {
  return sections(article, options).filter((section) => section.level === 2)
}

/** Whole-article reading time, at 220 words a minute, never less than one. */
export function readingMinutes(article: Article): number {
  return Math.max(1, Math.round(countWords(article.body) / 220))
}

export function countWords(markdown: string): number {
  return stripInlineMarkdown(markdown).split(/\s+/).filter(Boolean).length
}

/**
 * The count a title promises, or null when it names none.
 *
 * A bare number is not a promise: "Kindle Paperwhite 12 review" is a model number and
 * "The 2026 lineup" is a year. What distinguishes a list is that the count leads the
 * title and something plural follows it, which is the test applied here.
 */
export function titleItemCount(title: string): number | null {
  const match = /(?:^|[^\d.,])(\d{1,2})\s+([a-z].*)$/i.exec(title)
  if (!match) return null

  const count = Number(match[1])
  if (count < 3 || count > 50) return null

  // Counts lead: "6 ways…", "The 7 best…". A number four or more words in is describing
  // the subject, not counting it.
  const before = title.slice(0, match.index + (match[0]?.length ?? 0) - (match[2]?.length ?? 0))
  if (before.trim().split(/\s+/).filter(Boolean).length > 3) return null

  const after = (match[2] as string).toLowerCase().split(/\s+/).slice(0, 4)
  return after.some(isPlural) ? count : null
}

/** Words that end in `s` without being a plural noun, so they promise nothing. */
const NOT_PLURAL = new Set([
  'this',
  'its',
  'was',
  'has',
  'is',
  'as',
  'us',
  'yours',
  'less',
  'plus',
  'versus',
  'across',
  'business',
  'process',
])

function isPlural(word: string): boolean {
  const bare = word.replace(/[^a-z]/g, '')
  if (bare.length < 4 || NOT_PLURAL.has(bare)) return false
  return bare.endsWith('s') && !bare.endsWith('ss')
}

function summaryAfter(lines: string[], headingIndex: number): string {
  const collected: string[] = []
  for (let index = headingIndex + 1; index < lines.length; index += 1) {
    const line = (lines[index] ?? '').trim()
    if (/^#{2,4}\s/.test(line)) break
    if (!line) {
      if (collected.length > 0) break
      continue
    }
    collected.push(line)
  }
  const text = stripInlineMarkdown(collected.join(' '))
  const sentences = text.match(/[^.!?]+[.!?]+/g)
  if (!sentences) return text.trim()
  return sentences
    .slice(0, 2)
    .map((sentence) => sentence.trim())
    .join(' ')
}

export function headingId(text: string, prefix?: string): string {
  const base = text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const id = base || 'section'
  return prefix ? `${prefix}-${id}` : id
}

function uniqueId(id: string, used: Set<string>): string {
  let candidate = id
  let counter = 2
  while (used.has(candidate)) {
    candidate = `${id}-${counter}`
    counter += 1
  }
  used.add(candidate)
  return candidate
}

function stripInlineMarkdown(value: string): string {
  return value
    .replace(/`{1,3}[^`]*`{1,3}/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_~]+/g, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/\s+/g, ' ')
}

function stripTags(value: string): string {
  return value.replace(/<[^>]*>/g, '')
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
