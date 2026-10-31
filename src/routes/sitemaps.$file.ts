import { createFileRoute } from '@tanstack/react-router'
import { authorUrls, bookUrls, durusUrls, staticUrls, urlset } from '@/lib/sitemap'
import { fetchSitemapData } from '@/lib/seo-data'
import { xmlResponse } from '@/lib/xml'

const SECTIONS = { 'static.xml': staticUrls, 'books.xml': bookUrls, 'authors.xml': authorUrls, 'durus.xml': durusUrls }

/** /sitemaps/{static,books,authors,durus}.xml */
export const Route = createFileRoute('/sitemaps/$file')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const section = SECTIONS[params.file as keyof typeof SECTIONS]
        if (!section) return new Response('Not found', { status: 404 })
        return xmlResponse(urlset(section(await fetchSitemapData())))
      },
    },
  },
})
