/**
 * Two articles that look like what the optimizer actually publishes: one prose entry and
 * one listicle. Every test builds on these, so a change in the shape breaks loudly.
 */
import type { Article, ArticleContext, Site } from '@/core/index.js'

export const SITE: Site = {
  name: 'Kindle Watchlist',
  url: 'https://kindlewatchlist.com',
  logo: '/icon.svg',
  twitter: 'kindlewatch',
}

export const CONTEXT: ArticleContext = {
  site: SITE,
  path: ({ locale, slug }) => `/guides/${locale}/${slug}`,
  locales: ['en', 'es', 'de'],
  defaultLocale: 'en',
  breadcrumbs: [{ name: 'Guides', path: '/guides/en' }],
}

export const PROSE: Article = {
  title: 'How long do Kindle batteries last?',
  slug: 'kindle-battery-life',
  description:
    'A Kindle battery holds a useful charge for about four years of daily reading before it needs replacing.',
  body: [
    '## How long does a charge last?',
    '',
    'About six weeks of daily reading, on the published specification.',
    '',
    '## What drains it fastest?',
    '',
    'The front light, followed by wireless sync.',
  ].join('\n'),
  locale: 'en',
  publishedAt: '2026-08-26',
  keywords: ['kindle battery life', 'e-reader battery'],
  faq: [{ question: 'Can the battery be replaced?', answer: 'Yes, by an authorised repairer.' }],
}

export const LISTICLE: Article = {
  title: '6 ways to stretch a Kindle charge',
  slug: 'stretch-a-kindle-charge',
  description:
    'Six settings and habits that add days of reading to a single charge, ordered by how much each one saves.',
  body: [
    'Six changes, largest saving first.',
    '',
    '## Dim the front light',
    '',
    'The light is the single largest draw. Halving it buys back about a week.',
    '',
    '### A note on warmth',
    '',
    'Warm light costs the same as cold light.',
    '',
    '## Turn off wireless sync',
    '',
    'Sync wakes the radio hourly. Turning it off saves three or four days a month.',
    '',
    '## Sideload instead of streaming',
    '',
    'A sideloaded book never touches the radio again.',
    '',
    '## Skip the animated screensaver',
    '',
    'Each redraw costs a full page refresh.',
    '',
    '## Charge to eighty percent',
    '',
    'A partial charge ages the cell more slowly.',
    '',
    '## Keep it out of the cold',
    '',
    'Lithium cells report less capacity when cold.',
  ].join('\n'),
  locale: 'en',
  publishedAt: '2026-09-01',
  updatedAt: '2026-09-10',
  format: 'listicle',
  keywords: ['kindle battery tips'],
  heroImage: {
    src: '/images/stretch-a-kindle-charge.png',
    alt: 'A Kindle on a desk',
    width: 1200,
    height: 630,
  },
  faq: [
    {
      question: 'Does airplane mode help?',
      answer: 'Yes, it is the same saving as disabling sync.',
    },
  ],
}
