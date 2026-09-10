import { describe, expect, it } from 'vitest'
import {
  countWords,
  headingId,
  listicleItems,
  readingMinutes,
  renderBody,
  sections,
  titleItemCount,
} from '@/core/index.js'
import { LISTICLE, PROSE } from './fixtures.js'

describe('renderBody', () => {
  it('gives every heading an id an assistant can link an item to', () => {
    const html = renderBody(LISTICLE)

    expect(html).toContain('<h2 id="dim-the-front-light">Dim the front light</h2>')
    expect(html).toContain('<h3 id="a-note-on-warmth">A note on warmth</h3>')
  })

  it('prefixes ids on request, for a page that renders two articles', () => {
    expect(renderBody(PROSE, { idPrefix: 'guide' })).toContain(
      'id="guide-how-long-does-a-charge-last"',
    )
  })

  it('never collides two ids, even when two headings read the same', () => {
    const article = { ...PROSE, body: '## Setup\n\nOne.\n\n## Setup\n\nTwo.' }
    const html = renderBody(article)

    expect(html).toContain('id="setup"')
    expect(html).toContain('id="setup-2"')
  })

  it('escapes raw HTML in the source rather than passing it through', () => {
    const article = { ...PROSE, body: '<script>alert(1)</script>\n\nText.' }

    expect(renderBody(article)).not.toContain('<script>')
    expect(renderBody(article)).toContain('&lt;script&gt;')
  })

  it('renders links and emphasis as markdown, not as text', () => {
    const article = { ...PROSE, body: 'See the [guide](/guides/en/x) and **note** this.' }
    const html = renderBody(article)

    expect(html).toContain('<a href="/guides/en/x">guide</a>')
    expect(html).toContain('<strong>note</strong>')
  })
})

describe('sections', () => {
  it('reads a listicle as its H2 items, in order', () => {
    expect(listicleItems(LISTICLE).map((item) => item.name)).toEqual([
      'Dim the front light',
      'Turn off wireless sync',
      'Sideload instead of streaming',
      'Skip the animated screensaver',
      'Charge to eighty percent',
      'Keep it out of the cold',
    ])
  })

  it('keeps sub-headings out of the item list', () => {
    expect(sections(LISTICLE).some((section) => section.level === 3)).toBe(true)
    expect(listicleItems(LISTICLE).some((item) => item.level !== 2)).toBe(false)
  })

  it('summarises each item from the sentences under it', () => {
    const [first] = listicleItems(LISTICLE)

    expect(first?.summary).toBe(
      'The light is the single largest draw. Halving it buys back about a week.',
    )
  })

  it('assigns the same ids the renderer does, so anchors resolve', () => {
    const html = renderBody(LISTICLE)

    for (const item of listicleItems(LISTICLE)) {
      expect(html).toContain(`id="${item.id}"`)
    }
  })

  it('ignores headings inside fenced code blocks', () => {
    const article = { ...PROSE, body: '## Real\n\nText.\n\n```md\n## Fake\n```' }

    expect(sections(article).map((section) => section.name)).toEqual(['Real'])
  })
})

describe('helpers', () => {
  it('slugifies accents and punctuation out of a heading id', () => {
    expect(headingId('¿Cuánto dura la batería?')).toBe('cuanto-dura-la-bateria')
  })

  it('counts words without counting markdown syntax', () => {
    expect(countWords('A [linked](/x) **word** here.')).toBe(4)
  })

  it('never reports less than a minute of reading', () => {
    expect(readingMinutes({ ...PROSE, body: 'One word.' })).toBe(1)
  })

  it.each([
    ['6 ways to stretch a Kindle charge', 6],
    ['The 2026 Kindle lineup', null],
    ['Kindle Paperwhite 12 review', null],
    ['How long do batteries last?', null],
    ['The 7 best e-readers for small hands', 7],
    ['5 email marketing mistakes that cost you readers', 5],
    ['A guide to the 9 series worth starting', null],
    ['2 quick fixes', null],
  ])('reads the promised count in %s', (title, expected) => {
    expect(titleItemCount(title)).toBe(expected)
  })
})
