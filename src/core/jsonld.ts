/**
 * The structured data an answer engine reads. This is the reason the package exists:
 * every project was hand-writing these blocks per route, so a fix to the markup had to
 * be made once per template and was never made everywhere.
 */
import { countWords, listicleItems, readingMinutes, titleItemCount } from './render.js'
import type { Article, ArticleContext } from './types.js'

export type JsonLd = Record<string, unknown>

export type JsonLdOptions = {
  /** `Article` by default; `BlogPosting` when the entry is a blog post. */
  articleType?: 'Article' | 'BlogPosting' | 'TechArticle'
}

/**
 * Every block the article warrants, in one array ready for a single `<script>` tag.
 * Blocks nothing can be said about are omitted rather than emitted empty: an empty
 * `FAQPage` is worse than no `FAQPage`.
 */
export function articleJsonLd(
  article: Article,
  context: ArticleContext,
  options: JsonLdOptions = {},
): JsonLd[] {
  const blocks: JsonLd[] = [mainArticle(article, context, options)]

  const faq = faqPage(article)
  if (faq) blocks.push(faq)

  const list = itemList(article, context)
  if (list) blocks.push(list)

  const breadcrumbs = breadcrumbList(article, context)
  if (breadcrumbs) blocks.push(breadcrumbs)

  return blocks
}

export function mainArticle(
  article: Article,
  context: ArticleContext,
  options: JsonLdOptions = {},
): JsonLd {
  const url = absolute(context.site.url, context.path(article))
  const publisher = organization(context)

  return prune({
    '@context': 'https://schema.org',
    '@type': options.articleType ?? 'Article',
    headline: article.title,
    description: article.description,
    inLanguage: article.locale,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt ?? article.publishedAt,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    url,
    keywords: article.keywords?.length ? article.keywords.join(', ') : undefined,
    image: article.heroImage ? absolute(context.site.url, article.heroImage.src) : undefined,
    wordCount: countWords(article.body),
    timeRequired: `PT${readingMinutes(article)}M`,
    author: { '@type': 'Organization', name: context.site.author ?? context.site.name },
    publisher,
  })
}

export function faqPage(article: Article): JsonLd | null {
  if (!article.faq?.length) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: article.locale,
    mainEntity: article.faq.map((entry) => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: { '@type': 'Answer', text: entry.answer },
    })),
  }
}

/**
 * `ItemList` for a listicle, each item anchored to its own heading. The anchor is what
 * makes an item quotable on its own, which is the whole point of the format.
 */
export function itemList(article: Article, context: ArticleContext): JsonLd | null {
  if (article.format !== 'listicle') return null
  const items = listicleItems(article)
  if (items.length < 2) return null

  const url = absolute(context.site.url, context.path(article))
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: article.title,
    inLanguage: article.locale,
    numberOfItems: items.length,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: `${url}#${item.id}`,
      ...(item.summary ? { description: item.summary } : {}),
    })),
  }
}

export function breadcrumbList(article: Article, context: ArticleContext): JsonLd | null {
  if (!context.breadcrumbs?.length) return null
  const trail = [...context.breadcrumbs, { name: article.title, path: context.path(article) }]
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((entry, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: entry.name,
      item: absolute(context.site.url, entry.path),
    })),
  }
}

/**
 * Serialized for a `<script type="application/ld+json">`. The `<` escape is not
 * decoration: an article whose text contains `</script>` would otherwise end the tag
 * early and inject the rest of the JSON into the document.
 */
export function jsonLdScript(blocks: JsonLd[] | JsonLd): string {
  return JSON.stringify(blocks).replace(/</g, '\\u003c')
}

/**
 * What is missing before the markup is answer-engine complete. Returned as sentences so
 * a build step or a test can fail with something a person can act on.
 */
export function markupProblems(article: Article, context: ArticleContext): string[] {
  const problems: string[] = []
  const promised = titleItemCount(article.title)

  if (article.format === 'listicle') {
    const items = listicleItems(article)
    if (items.length < 2) {
      problems.push('The article declares format "listicle" but has fewer than two H2 items.')
    }
    if (promised !== null && items.length !== promised) {
      problems.push(`The title promises ${promised} items but the body has ${items.length}.`)
    }
  } else if (promised !== null) {
    problems.push(
      `The title promises ${promised} items but the article is not marked as a listicle, ` +
        'so no ItemList markup is emitted.',
    )
  }

  if (!article.faq?.length) {
    problems.push('The article has no FAQ entries, so no FAQPage markup is emitted.')
  }
  if (!context.site.url.startsWith('http')) {
    problems.push(`site.url must be an absolute origin, got "${context.site.url}".`)
  }
  return problems
}

function organization(context: ArticleContext): JsonLd {
  return prune({
    '@type': 'Organization',
    name: context.site.name,
    url: context.site.url,
    logo: context.site.logo
      ? { '@type': 'ImageObject', url: absolute(context.site.url, context.site.logo) }
      : undefined,
  })
}

/** Absolute URL from an origin and a path, leaving an already-absolute URL alone. */
export function absolute(origin: string, path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  return `${origin.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
}

/** Drops undefined values, so no key is serialized with a meaningless `null`. */
function prune(value: JsonLd): JsonLd {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined))
}
