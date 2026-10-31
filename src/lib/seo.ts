import { API_PUBLIC_URL, SITE_DESCRIPTION, SITE_NAME, SITE_NAME_EN, SITE_TAGLINE, SITE_URL, absoluteUrl } from './site'
import { stripMarkdown, truncate } from './text'
import type { Book } from './types'

export type JsonLd = Record<string, unknown>

export interface SeoOptions {
  /** Page title without the site name; omitted on the home page. */
  title?: string | null
  /** Markdown or plain text; stripped and cut to a snippet. */
  description?: string | null
  /** Canonical path ("/books/x"), with any query that makes the page distinct. */
  path?: string
  /** Absolute OG image URL (1200×630). Defaults to the site card. */
  image?: string | null
  imageAlt?: string
  type?: 'website' | 'book' | 'profile' | 'article' | 'video.other' | 'music.playlist'
  /** Keep the page out of search results (account, search and admin pages). */
  noindex?: boolean
  jsonLd?: JsonLd | JsonLd[]
  prev?: string | null
  next?: string | null
  /** Extra meta tags, e.g. book:author. */
  meta?: { property?: string; name?: string; content: string }[]
}

export const DEFAULT_OG_IMAGE = absoluteUrl('/og-default.jpg')

/** Generated 1200×630 share card, rendered by the API with proper Arabic and Bangla shaping. */
export function ogImage(type: 'book' | 'author' | 'series' | 'dars', key: string) {
  return `${API_PUBLIC_URL.replace(/\/api$/, '')}/og/${type}/${encodeURIComponent(key)}.jpg`
}

/** Title, description, canonical, robots, Open Graph, Twitter and JSON-LD for a route's `head`. */
export function seo(options: SeoOptions = {}) {
  const title = options.title ? `${options.title} | ${SITE_NAME}` : `${SITE_NAME} | ${SITE_TAGLINE}`
  const description = truncate(stripMarkdown(options.description) || SITE_DESCRIPTION)
  const url = options.path !== undefined ? absoluteUrl(options.path) : undefined
  const image = options.image ?? DEFAULT_OG_IMAGE
  const robots = options.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'

  const graphs = options.jsonLd ? (Array.isArray(options.jsonLd) ? options.jsonLd : [options.jsonLd]) : []

  const meta: Record<string, unknown>[] = [
    { title },
    { name: 'description', content: description },
    { name: 'robots', content: robots },
    { property: 'og:site_name', content: `${SITE_NAME} (${SITE_NAME_EN})` },
    { property: 'og:locale', content: 'bn_BD' },
    { property: 'og:locale:alternate', content: 'ar_AR' },
    { property: 'og:type', content: options.type ?? 'website' },
    { property: 'og:title', content: options.title ?? title },
    { property: 'og:description', content: description },
    { property: 'og:image', content: image },
    { property: 'og:image:type', content: 'image/jpeg' },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { property: 'og:image:alt', content: options.imageAlt ?? options.title ?? SITE_NAME },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: options.title ?? title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: image },
    ...(url ? [{ property: 'og:url', content: url }] : []),
    ...(options.meta ?? []),
    // rendered by HeadContent as an escaped <script type="application/ld+json">
    ...(graphs.length ? [{ 'script:ld+json': { '@context': 'https://schema.org', '@graph': graphs } }] : []),
  ]

  const links: Record<string, string>[] = []
  if (url) links.push({ rel: 'canonical', href: url })
  if (options.prev) links.push({ rel: 'prev', href: absoluteUrl(options.prev) })
  if (options.next) links.push({ rel: 'next', href: absoluteUrl(options.next) })

  return { meta, links }
}

/* ---------- schema.org builders ---------- */

export const ORGANIZATION_ID = `${SITE_URL}/#organization`
export const WEBSITE_ID = `${SITE_URL}/#website`

export function organizationLd(): JsonLd {
  return {
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: SITE_NAME,
    alternateName: SITE_NAME_EN,
    url: `${SITE_URL}/`,
    logo: { '@type': 'ImageObject', url: absoluteUrl('/icon-512.png'), width: 512, height: 512 },
  }
}

export function websiteLd(): JsonLd {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: `${SITE_URL}/`,
    name: SITE_NAME,
    alternateName: SITE_NAME_EN,
    description: SITE_DESCRIPTION,
    inLanguage: ['bn', 'ar'],
    publisher: { '@id': ORGANIZATION_ID },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  }
}

/** BreadcrumbList from [name, path] pairs; the last item is the current page. */
export function breadcrumbLd(items: [string, string][]): JsonLd {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: absoluteUrl(path) })),
  }
}

export function personLd(author: { slug: string; name_bn: string; name_ar: string; name_translit: string; about_md?: string | null }): JsonLd {
  return {
    '@type': 'Person',
    '@id': `${absoluteUrl(`/authors/${author.slug}`)}#person`,
    name: author.name_bn,
    alternateName: [author.name_ar, author.name_translit].filter(Boolean),
    url: absoluteUrl(`/authors/${author.slug}`),
    ...(author.about_md ? { description: truncate(stripMarkdown(author.about_md), 300) } : {}),
  }
}

/** ItemList of URLs, for listing pages. */
export function itemListLd(items: { path: string; name: string }[]): JsonLd {
  return {
    '@type': 'ItemList',
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({ '@type': 'ListItem', position: i + 1, url: absoluteUrl(item.path), name: item.name })),
  }
}

/** ISO 8601 duration ("PT1H2M3S") from seconds. */
export function isoDuration(seconds: number | null | undefined) {
  if (!seconds || seconds <= 0) return undefined
  const total = Math.round(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `PT${h ? `${h}H` : ''}${m ? `${m}M` : ''}${s || (!h && !m) ? `${s}S` : ''}`
}

/** YouTube video id from any watch/short/embed URL. */
export function youtubeId(url: string) {
  return url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/)?.[1] ?? null
}

export function bookId(slug: string) {
  return `${absoluteUrl(`/books/${slug}`)}#book`
}

/** schema.org Book for a kitab: a free bilingual (Arabic text + Bangla translation) e-book edition. */
export function bookLd(book: Book): JsonLd {
  const url = absoluteUrl(`/books/${book.slug}`)
  const sharh = !!book.is_sharh && !!book.explainer
  const firstPage = book.first_page ?? 1
  const person = (a: NonNullable<Book['author']>) => ({ '@type': 'Person', '@id': `${absoluteUrl(`/authors/${a.slug}`)}#person`, name: a.name_bn, alternateName: a.name_ar, url: absoluteUrl(`/authors/${a.slug}`) })

  return {
    '@type': 'Book',
    '@id': bookId(book.slug),
    url,
    name: book.title_bn,
    alternateName: [book.title_ar, book.title_translit].filter(Boolean),
    ...(book.about_md ? { description: truncate(stripMarkdown(book.about_md), 500) } : {}),
    // a sharh is the explainer's work; the author of the original text is credited as a contributor
    ...(sharh ? { author: person(book.explainer!), ...(book.author ? { contributor: person(book.author) } : {}) } : book.author ? { author: person(book.author) } : {}),
    inLanguage: ['ar', 'bn'],
    bookFormat: 'https://schema.org/EBook',
    isAccessibleForFree: true,
    image: book.cover_url ?? ogImage('book', book.slug),
    ...(book.pages_count ? { numberOfPages: book.pages_count } : {}),
    ...(book.category ? { genre: book.category.name_bn } : {}),
    ...(book.created_at ? { datePublished: book.created_at } : {}),
    ...(book.updated_at ? { dateModified: book.updated_at } : {}),
    publisher: { '@id': ORGANIZATION_ID },
    ...(book.toc?.length
      ? {
          hasPart: book.toc.map((entry, i) => ({
            '@type': 'Chapter',
            position: i + 1,
            name: entry.title_bn,
            alternateName: entry.title_ar,
            url: absoluteUrl(`/books/${book.slug}/read/${entry.page_number}`),
          })),
        }
      : {}),
    ...(book.pages_count
      ? { potentialAction: { '@type': 'ReadAction', target: { '@type': 'EntryPoint', urlTemplate: absoluteUrl(`/books/${book.slug}/read/${firstPage}`) } } }
      : {}),
  }
}
