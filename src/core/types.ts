/**
 * The standardized article record. Everything else in this package is a pure function
 * of this type plus the site it is published on, so a project that can produce one of
 * these gets consistent markup without writing any of it.
 */
export type Article = {
  title: string
  slug: string
  description: string
  /** Markdown. The only body format the package accepts. */
  body: string
  locale: string
  /** ISO date, `YYYY-MM-DD` or a full timestamp. */
  publishedAt: string
  updatedAt?: string
  keywords?: string[]
  /**
   * How the article is shaped. A listicle declares `ItemList` markup, which is what lets
   * an assistant cite one item instead of the whole page.
   */
  format?: ArticleFormat
  heroImage?: HeroImage
  faq?: FaqEntry[]
  /** Extra front matter the project uses; carried through untouched. */
  extra?: Record<string, unknown>
}

export type ArticleFormat = 'prose' | 'listicle'

export type HeroImage = {
  src: string
  alt?: string
  width?: number
  height?: number
}

export type FaqEntry = {
  question: string
  answer: string
}

/** The site the article is published on. Supplied once, usually from a `site.ts`. */
export type Site = {
  name: string
  /** Origin, with no trailing slash: `https://example.com`. */
  url: string
  /** Absolute or root-relative path to the publisher logo. */
  logo?: string
  /** `@handle` or bare handle, used for the Twitter card. */
  twitter?: string
  /** Overrides the organization author when the article has no byline. */
  author?: string
}

/**
 * Where an article lives on the site. Projects disagree about locale prefixes and path
 * shape, so the caller owns the URL and the package never guesses one.
 */
export type PathResolver = (article: Pick<Article, 'slug' | 'locale'>) => string

export type ArticleContext = {
  site: Site
  /** Path for this article, e.g. `/guides/en/kindle-battery-life`. */
  path: PathResolver
  /** Every locale the article exists in, for `hreflang`. Include the article's own. */
  locales?: string[]
  /** Locale that gets `x-default`. */
  defaultLocale?: string
  /** Breadcrumb trail above the article, nearest ancestor last. */
  breadcrumbs?: { name: string; path: string }[]
}
