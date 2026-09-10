/**
 * article-kit: one standardized article record, rendered into the HTML, structured data
 * and metadata an answer engine needs. Framework-agnostic; see `article-kit/next` for
 * the App Router bindings.
 */
export type {
  Article,
  ArticleContext,
  ArticleFormat,
  FaqEntry,
  HeroImage,
  PathResolver,
  Site,
} from './types.js'
export { ArticleParseError, parseArticle, parseMarkdown, toMarkdown } from './parse.js'
export {
  countWords,
  escapeHtml,
  headingId,
  listicleItems,
  readingMinutes,
  renderBody,
  sections,
  titleItemCount,
  type RenderOptions,
  type Section,
} from './render.js'
export {
  absolute,
  articleJsonLd,
  breadcrumbList,
  faqPage,
  itemList,
  jsonLdScript,
  mainArticle,
  markupProblems,
  type JsonLd,
  type JsonLdOptions,
} from './jsonld.js'
export { articleMetadata, languageAlternates, type ArticleMetadata } from './metadata.js'
