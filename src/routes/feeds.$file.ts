import { createFileRoute } from '@tanstack/react-router'
import { rss } from '@/lib/rss'
import { fetchFeedData } from '@/lib/seo-data'
import { SITE_NAME } from '@/lib/site'
import { rssResponse } from '@/lib/xml'

const FEEDS = {
  'books.xml': { type: 'books', title: `${SITE_NAME} — নতুন কিতাব`, description: 'আরবি মূলপাঠ ও বাংলা অনুবাদে নতুন যুক্ত কিতাব।', link: '/library' },
  'durus.xml': { type: 'durus', title: `${SITE_NAME} — নতুন দারস`, description: 'আরবি ও বাংলা সাবটাইটেলসহ নতুন যুক্ত দারস।', link: '/library?type=durus' },
} as const

/** /feeds/books.xml and /feeds/durus.xml */
export const Route = createFileRoute('/feeds/$file')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const feed = FEEDS[params.file as keyof typeof FEEDS]
        if (!feed) return new Response('Not found', { status: 404 })
        const { items } = await fetchFeedData({ type: feed.type })
        return rssResponse(rss({ ...feed, self: `/feeds/${params.file}`, items }))
      },
    },
  },
})
