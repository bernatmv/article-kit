/**
 * App Router bindings. Everything here is a thin translation of the core's plain objects
 * into what Next expects, so a bug in the markup is fixed in the core and every consumer
 * gets it on upgrade.
 */
import { createElement, type ReactElement } from 'react'
import {
  articleJsonLd,
  articleMetadata,
  jsonLdScript,
  renderBody,
  type Article,
  type ArticleContext,
  type JsonLdOptions,
  type RenderOptions,
} from '../core/index.js'

/**
 * Next's `Metadata`, structurally. The type is reproduced rather than imported so the
 * package does not depend on Next at build time; assigning it to a `Metadata` return
 * type type-checks in a consuming app.
 */
export type NextArticleMetadata = {
  title: string
  description: string
  keywords?: string[]
  alternates: { canonical: string; languages: Record<string, string> }
  openGraph: Record<string, unknown>
  twitter: Record<string, unknown>
}

export function toMetadata(article: Article, context: ArticleContext): NextArticleMetadata {
  const metadata = articleMetadata(article, context)
  const { canonical, languages, ...rest } = metadata
  return {
    title: rest.title,
    description: rest.description,
    ...(rest.keywords ? { keywords: rest.keywords } : {}),
    alternates: { canonical, languages },
    openGraph: rest.openGraph as unknown as Record<string, unknown>,
    twitter: rest.twitter as unknown as Record<string, unknown>,
  }
}

export type ArticleJsonLdProps = {
  article: Article
  context: ArticleContext
  options?: JsonLdOptions
}

/** The single `<script>` tag carrying every block the article warrants. */
export function ArticleJsonLd({ article, context, options }: ArticleJsonLdProps): ReactElement {
  return createElement('script', {
    type: 'application/ld+json',
    dangerouslySetInnerHTML: { __html: jsonLdScript(articleJsonLd(article, context, options)) },
  })
}

export type ArticleBodyProps = {
  article: Article
  className?: string
  options?: RenderOptions
}

/**
 * The rendered body. `dangerouslySetInnerHTML` is safe here in the one sense that
 * matters: the HTML comes from this package's own renderer, which escapes any raw HTML
 * in the markdown rather than passing it through.
 */
export function ArticleBody({ article, className, options }: ArticleBodyProps): ReactElement {
  return createElement('div', {
    ...(className ? { className } : {}),
    dangerouslySetInnerHTML: { __html: renderBody(article, options) },
  })
}

export type { Article, ArticleContext } from '../core/index.js'
