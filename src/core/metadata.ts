/**
 * Page metadata as a plain object. It maps one-to-one onto Next's `Metadata`, but
 * nothing here imports Next, so the same values serve an Astro layout or a hand-written
 * `<head>`.
 */
import { absolute } from './jsonld.js'
import type { Article, ArticleContext } from './types.js'

export type ArticleMetadata = {
  title: string
  description: string
  keywords?: string[]
  canonical: string
  languages: Record<string, string>
  openGraph: {
    type: 'article'
    title: string
    description: string
    url: string
    siteName: string
    locale: string
    publishedTime: string
    modifiedTime: string
    images?: { url: string; alt?: string; width?: number; height?: number }[]
  }
  twitter: {
    card: 'summary_large_image'
    title: string
    description: string
    site?: string
    images?: string[]
  }
}

/**
 * `languages` carries absolute URLs. A relative `hreflang` is legal but is read against
 * the current page rather than the site root, which is a class of bug nobody notices
 * until a locale disappears from the index.
 */
export function articleMetadata(article: Article, context: ArticleContext): ArticleMetadata {
  const origin = context.site.url.replace(/\/+$/, '')
  const canonical = absolute(origin, context.path(article))
  const image = article.heroImage
    ? {
        url: absolute(origin, article.heroImage.src),
        ...(article.heroImage.alt ? { alt: article.heroImage.alt } : {}),
        ...(article.heroImage.width ? { width: article.heroImage.width } : {}),
        ...(article.heroImage.height ? { height: article.heroImage.height } : {}),
      }
    : null

  const metadata: ArticleMetadata = {
    title: article.title,
    description: article.description,
    canonical,
    languages: languageAlternates(article, context),
    openGraph: {
      type: 'article',
      title: article.title,
      description: article.description,
      url: canonical,
      siteName: context.site.name,
      locale: article.locale,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt ?? article.publishedAt,
      ...(image ? { images: [image] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.description,
      ...(context.site.twitter ? { site: twitterHandle(context.site.twitter) } : {}),
      ...(image ? { images: [image.url] } : {}),
    },
  }
  if (article.keywords?.length) metadata.keywords = article.keywords
  return metadata
}

export function languageAlternates(
  article: Article,
  context: ArticleContext,
): Record<string, string> {
  const origin = context.site.url.replace(/\/+$/, '')
  const locales = context.locales?.length ? context.locales : [article.locale]
  const alternates: Record<string, string> = {}

  for (const locale of locales) {
    alternates[locale] = absolute(origin, context.path({ slug: article.slug, locale }))
  }
  const fallback = context.defaultLocale
  if (fallback && locales.includes(fallback)) {
    alternates['x-default'] = absolute(
      origin,
      context.path({ slug: article.slug, locale: fallback }),
    )
  }
  return alternates
}

function twitterHandle(value: string): string {
  return value.startsWith('@') ? value : `@${value}`
}
