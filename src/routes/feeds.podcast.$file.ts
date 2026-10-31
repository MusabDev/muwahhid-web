import { createFileRoute } from '@tanstack/react-router'
import { api, ApiError } from '@/lib/api'
import { podcastEpisodes, podcastPath } from '@/lib/podcast'
import { absoluteUrl, SITE_NAME } from '@/lib/site'
import { stripMarkdown } from '@/lib/text'
import type { DarsSeries } from '@/lib/types'
import { cdata, rfc822, rssResponse, xml } from '@/lib/xml'

const AUDIO_TYPES: Record<string, string> = { mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac', ogg: 'audio/ogg', opus: 'audio/ogg', wav: 'audio/wav' }

/** /feeds/podcast/{series}.xml — an audio dars series as a podcast, for podcast apps. */
export const Route = createFileRoute('/feeds/podcast/$file')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const slug = params.file.replace(/\.xml$/, '')
        let series: DarsSeries
        try {
          series = await api<DarsSeries>(`/dars-series/${slug}`)
        } catch (error) {
          if (error instanceof ApiError && error.status === 404) return new Response('Not found', { status: 404 })
          throw error
        }
        const episodes = podcastEpisodes(series)
        if (!episodes.length) return new Response('Not found', { status: 404 })

        const link = absoluteUrl(`/durus/${series.slug}`)
        const about = stripMarkdown(series.about_md) || `${series.title_ar} — ${series.title_bn}`
        const author = series.author?.name_bn ?? SITE_NAME
        const items = episodes.map((d) => {
          const url = absoluteUrl(`/durus/${series.slug}/${d.number}`)
          const ext = d.media_url.match(/\.(\w+)(\?|$)/)?.[1]?.toLowerCase() ?? 'mp3'
          return [
            '<item>',
            `<title>${xml(`${d.number}. ${d.title_bn}`)}</title>`,
            `<link>${xml(url)}</link>`,
            `<guid isPermaLink="true">${xml(url)}</guid>`,
            `<pubDate>${rfc822(d.created_at)}</pubDate>`,
            `<description>${cdata(`<p>${xml(d.title_ar ?? '')}</p><p>পূর্ণ ট্রান্সক্রিপ্ট ও সাবটাইটেল: <a href="${xml(url)}">${xml(url)}</a></p>`)}</description>`,
            `<enclosure url="${xml(d.media_url)}" length="0" type="${AUDIO_TYPES[ext] ?? 'audio/mpeg'}" />`,
            `<itunes:episode>${d.number}</itunes:episode>`,
            d.duration_seconds ? `<itunes:duration>${Math.round(d.duration_seconds)}</itunes:duration>` : '',
            '<itunes:explicit>false</itunes:explicit>',
            '</item>',
          ].join('')
        })

        return rssResponse(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
<channel>
<title>${xml(`${series.title_bn} — ${author}`)}</title>
<link>${xml(link)}</link>
<description>${xml(about)}</description>
<language>ar</language>
<atom:link href="${xml(absoluteUrl(podcastPath(series.slug)))}" rel="self" type="application/rss+xml" />
<itunes:author>${xml(author)}</itunes:author>
<itunes:summary>${xml(about)}</itunes:summary>
<itunes:image href="${xml(absoluteUrl('/icon-512.png'))}" />
<itunes:category text="Religion &amp; Spirituality"><itunes:category text="Islam" /></itunes:category>
<itunes:explicit>false</itunes:explicit>
<itunes:type>serial</itunes:type>
${items.join('\n')}
</channel>
</rss>
`)
      },
    },
  },
})
