import { createFileRoute } from '@tanstack/react-router'
import { pageUrls, urlset } from '@/lib/sitemap'
import { fetchSitemapData } from '@/lib/seo-data'
import { xmlResponse } from '@/lib/xml'

/** /sitemaps/pages/{book}.xml (and {book}.2.xml… for books past the per-file limit): every reader page of a book. */
export const Route = createFileRoute('/sitemaps/pages/$file')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const match = params.file.match(/^([\w-]+?)(?:\.(\d+))?\.xml$/)
        const book = match && (await fetchSitemapData()).books.find((b) => b.slug === match[1])
        const urls = book ? pageUrls(book, Number(match[2] ?? 1)) : []
        if (!urls.length) return new Response('Not found', { status: 404 })
        return xmlResponse(urlset(urls))
      },
    },
  },
})
