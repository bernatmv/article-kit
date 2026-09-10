# article-kit

One standardized article record, rendered into the HTML, structured data and page
metadata an answer engine needs.

Every project here was hand-writing `Article`, `FAQPage` and `BreadcrumbList` JSON-LD per
route, which meant a fix to the markup had to be made once per template and was never made
everywhere. This package is where that markup lives instead.

## Install

There is no npm release yet, so install by exact tag:

```bash
pnpm add github:bernatmv/article-kit#v0.1.0
```

Pin the tag rather than a range. Every site upgrades deliberately.

## The record

```ts
import { parseArticle, parseMarkdown } from 'article-kit'

const article = parseArticle({
  title: '6 ways to stretch a Kindle charge',
  slug: 'stretch-a-kindle-charge',
  description: 'Six settings and habits that add days of reading to a single charge.',
  body: '## Dim the front light\n\nThe light is the single largest draw.\n\n…',
  locale: 'en',
  publishedAt: '2026-09-01',
  format: 'listicle',
  faq: [{ question: 'Does airplane mode help?', answer: 'Yes.' }],
})
```

`parseMarkdown` reads the same record from a `.md` file with front matter, and `toMarkdown`
writes it back. Keys the package does not know about are kept in `article.extra` rather
than dropped.

`format: 'listicle'` is what produces `ItemList` markup, with each H2 as one item anchored
to its own heading. That anchor is the point of the format: it is what lets an assistant
cite one item instead of the whole page.

## In a Next App Router route

```tsx
import { ArticleBody, ArticleJsonLd, toMetadata } from 'article-kit/next'

const context = {
  site: { name: 'Kindle Watchlist', url: 'https://kindlewatchlist.com', logo: '/icon.svg' },
  path: ({ locale, slug }) => `/guides/${locale}/${slug}`,
  locales: ['en', 'es', 'de'],
  defaultLocale: 'en',
  breadcrumbs: [{ name: 'Guides', path: '/guides/en' }],
}

export async function generateMetadata() {
  return toMetadata(article, context)
}

export default function Page() {
  return (
    <article>
      <ArticleJsonLd article={article} context={context} />
      <ArticleBody article={article} className="prose" />
    </article>
  )
}
```

The package never guesses a URL. `path` is the project's own resolver, and everything the
markup needs — canonical, `hreflang`, breadcrumbs, item anchors — is built from it.

## Checking an article before it ships

```ts
import { markupProblems } from 'article-kit'

markupProblems(article, context) // → sentences, empty when the markup is complete
```

It catches a counted title that is not marked as a listicle, a body that does not deliver
the count the title promises, an article with no FAQ, and a site URL that is not an origin.
Call it from a test or a build step.

## Framework support

The core is framework-agnostic and returns plain objects and strings. `article-kit/next`
is a thin translation of those into Next's `Metadata` and two components. An Astro layer
would be the same size; it is not written because nothing needs it yet.

## Safety

`renderBody` escapes raw HTML in the markdown rather than passing it through, and
`jsonLdScript` escapes `<` so text containing `</script>` cannot end the tag early. Both
are covered by tests.

## Gate

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```
