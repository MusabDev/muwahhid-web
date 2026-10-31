import { api } from './api'

/* Payloads of the API's /seo endpoints, which list every public page for the sitemaps and feeds. */

export interface SitemapDars {
  number: number
  title_bn: string
  title_ar: string | null
  media_type: 'video' | 'audio'
  media_url: string
  duration_seconds: number | null
  created_at: string | null
  updated_at: string | null
}

export interface SitemapData {
  books: { slug: string; title_bn: string; title_ar: string; author: string | null; cover_url: string | null; updated_at: string | null; pages: number[] }[]
  authors: { slug: string; name_bn: string; updated_at: string | null }[]
  series: { slug: string; title_bn: string; about: string | null; author: string | null; updated_at: string | null; durus: SitemapDars[] }[]
  categories: { slug: string; name_bn: string; books: number; series: number }[]
}

export interface FeedItem {
  type: 'book' | 'dars'
  path: string
  title: string
  title_ar: string | null
  summary: string | null
  author: string | null
  category: string | null
  image: string | null
  og_key: string
  media?: SitemapDars
  published_at: string | null
  updated_at: string | null
}

export interface FeedData {
  author: { slug: string; name_bn: string; name_ar: string } | null
  items: FeedItem[]
}

export const fetchSitemapData = () => api<SitemapData>('/seo/sitemap')

export const fetchFeedData = (params: { type?: 'all' | 'books' | 'durus'; author?: string }) => api<FeedData>('/seo/feed', { query: params })

/** Latest of several ISO dates, for <lastmod>. */
export function latest(...dates: (string | null | undefined)[]) {
  const times = dates.filter(Boolean).map((d) => new Date(d!).getTime())
  return times.length ? new Date(Math.max(...times)).toISOString() : undefined
}
