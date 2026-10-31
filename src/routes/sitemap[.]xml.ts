import { createFileRoute } from '@tanstack/react-router'
import { sitemapFiles, sitemapIndex } from '@/lib/sitemap'
import { fetchSitemapData } from '@/lib/seo-data'
import { xmlResponse } from '@/lib/xml'

/** Sitemap index: static pages, books, authors, durus, and every book's reader pages. */
export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => xmlResponse(sitemapIndex(sitemapFiles(await fetchSitemapData()))),
    },
  },
})
