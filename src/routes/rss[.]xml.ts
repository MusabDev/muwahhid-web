import { createFileRoute } from '@tanstack/react-router'
import { rss, SITE_FEED } from '@/lib/rss'
import { fetchFeedData } from '@/lib/seo-data'
import { rssResponse } from '@/lib/xml'

/** Everything new on the site: books and durus, newest first. */
export const Route = createFileRoute('/rss.xml')({
  server: {
    handlers: {
      GET: async () => rssResponse(rss({ ...SITE_FEED, link: '/', self: '/rss.xml', items: (await fetchFeedData({ type: 'all' })).items })),
    },
  },
})
