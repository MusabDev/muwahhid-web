import { createFileRoute } from '@tanstack/react-router'
import { ApiError } from '@/lib/api'
import { rss } from '@/lib/rss'
import { fetchFeedData } from '@/lib/seo-data'
import { SITE_NAME } from '@/lib/site'
import { rssResponse } from '@/lib/xml'

/** A scholar's new books, sharh and durus. */
export const Route = createFileRoute('/authors/$slug/rss.xml')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const { author, items } = await fetchFeedData({ type: 'all', author: params.slug })
          const name = author?.name_bn ?? params.slug
          return rssResponse(
            rss({
              title: `${name} — ${SITE_NAME}`,
              description: `${name}${author?.name_ar ? ` (${author.name_ar})` : ''}-এর নতুন যুক্ত কিতাব ও দারস।`,
              link: `/authors/${params.slug}`,
              self: `/authors/${params.slug}/rss.xml`,
              items,
            }),
          )
        } catch (error) {
          if (error instanceof ApiError && error.status === 404) return new Response('Not found', { status: 404 })
          throw error
        }
      },
    },
  },
})
