import { youtubeId } from '@/hooks/use-media-player'
import { ogImage } from './seo'
import { latest, type SitemapData } from './seo-data'
import { absoluteUrl } from './site'
import { xml } from './xml'

/** Most URLs one sitemap file may hold (the protocol allows 50,000). */
export const SITEMAP_LIMIT = 45000

interface Url {
  path: string
  lastmod?: string
  /** Extra child elements (image:image, video:video), already escaped. */
  extra?: string
}

const NAMESPACES = [
  'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
  'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"',
  'xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"',
].join(' ')

export function urlset(urls: Url[]) {
  const body = urls
    .map((u) => `<url><loc>${xml(absoluteUrl(u.path))}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}${u.extra ?? ''}</url>`)
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset ${NAMESPACES}>\n${body}\n</urlset>\n`
}

export function sitemapIndex(maps: { path: string; lastmod?: string }[]) {
  const body = maps.map((m) => `<sitemap><loc>${xml(absoluteUrl(m.path))}</loc>${m.lastmod ? `<lastmod>${m.lastmod}</lastmod>` : ''}</sitemap>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`
}

function image(loc: string, title: string) {
  return `<image:image><image:loc>${xml(loc)}</image:loc><image:title>${xml(title)}</image:title></image:image>`
}

/** Reader-page sitemap files of a book: "pages/{slug}.xml", then "pages/{slug}.2.xml"… for very long books. */
export function pageSitemapFiles(book: SitemapData['books'][number]) {
  const parts = Math.max(1, Math.ceil(book.pages.length / SITEMAP_LIMIT))
  return Array.from({ length: parts }, (_, i) => `/sitemaps/pages/${book.slug}${i ? `.${i + 1}` : ''}.xml`)
}

export function sitemapFiles(data: SitemapData) {
  const books = latest(...data.books.map((b) => b.updated_at))
  return [
    { path: '/sitemaps/static.xml', lastmod: latest(books, ...data.series.map((s) => s.updated_at)) },
    { path: '/sitemaps/books.xml', lastmod: books },
    { path: '/sitemaps/authors.xml', lastmod: latest(...data.authors.map((a) => a.updated_at)) },
    { path: '/sitemaps/durus.xml', lastmod: latest(...data.series.flatMap((s) => [s.updated_at, ...s.durus.map((d) => d.updated_at)])) },
    ...data.books.filter((b) => b.pages.length).flatMap((b) => pageSitemapFiles(b).map((path) => ({ path, lastmod: latest(b.updated_at) }))),
  ]
}

export function staticUrls(data: SitemapData): Url[] {
  const lastmod = latest(...data.books.map((b) => b.updated_at), ...data.series.map((s) => s.updated_at))
  return [
    { path: '/', lastmod },
    { path: '/library', lastmod },
    { path: '/library?type=durus', lastmod },
    { path: '/authors', lastmod: latest(...data.authors.map((a) => a.updated_at)) },
    ...data.categories.flatMap((c) => [
      ...(c.books ? [{ path: `/library?category=${encodeURIComponent(c.slug)}` }] : []),
      ...(c.series ? [{ path: `/library?type=durus&category=${encodeURIComponent(c.slug)}` }] : []),
    ]),
  ]
}

export function bookUrls(data: SitemapData): Url[] {
  return data.books.map((b) => ({
    path: `/books/${b.slug}`,
    lastmod: latest(b.updated_at),
    extra: [b.cover_url && image(b.cover_url, b.title_bn), image(ogImage('book', b.slug), `${b.title_bn} — ${b.title_ar}`)].filter(Boolean).join(''),
  }))
}

export function authorUrls(data: SitemapData): Url[] {
  return data.authors.map((a) => ({ path: `/authors/${a.slug}`, lastmod: latest(a.updated_at), extra: image(ogImage('author', a.slug), a.name_bn) }))
}

export function durusUrls(data: SitemapData): Url[] {
  return data.series.flatMap((s) => [
    { path: `/durus/${s.slug}`, lastmod: latest(s.updated_at, ...s.durus.map((d) => d.updated_at)), extra: image(ogImage('series', s.slug), s.title_bn) },
    ...s.durus.map((d) => {
      const yt = youtubeId(d.media_url)
      const title = `${d.title_bn} — ${s.title_bn}`
      const video =
        d.media_type === 'video' && yt
          ? `<video:video><video:thumbnail_loc>${xml(`https://i.ytimg.com/vi/${yt}/hqdefault.jpg`)}</video:thumbnail_loc><video:title>${xml(title)}</video:title><video:description>${xml((s.about ?? `${s.title_bn}${s.author ? `, ${s.author}` : ''}: আরবি ও বাংলা সাবটাইটেলসহ দারস।`).slice(0, 2000))}</video:description><video:player_loc>${xml(`https://www.youtube.com/embed/${yt}`)}</video:player_loc>${d.duration_seconds ? `<video:duration>${Math.min(28800, Math.round(d.duration_seconds))}</video:duration>` : ''}${d.created_at ? `<video:publication_date>${d.created_at}</video:publication_date>` : ''}<video:family_friendly>yes</video:family_friendly></video:video>`
          : image(ogImage('dars', `${s.slug}-${d.number}`), title)
      return { path: `/durus/${s.slug}/${d.number}`, lastmod: latest(d.updated_at), extra: video }
    }),
  ])
}

/** One file of a book's reader pages; `part` counts from 1. */
export function pageUrls(book: SitemapData['books'][number], part: number): Url[] {
  return book.pages.slice((part - 1) * SITEMAP_LIMIT, part * SITEMAP_LIMIT).map((n) => ({ path: `/books/${book.slug}/read/${n}`, lastmod: latest(book.updated_at) }))
}
