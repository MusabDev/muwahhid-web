import { youtubeId } from '@/hooks/use-media-player'
import { ogImage } from './seo'
import type { FeedItem } from './seo-data'
import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from './site'
import { cdata, rfc822, xml } from './xml'

interface Channel {
  title: string
  description: string
  /** Page the feed belongs to. */
  link: string
  /** Path of the feed itself, for atom:link rel=self. */
  self: string
  items: FeedItem[]
}

function itemImage(item: FeedItem) {
  if (item.image) return item.image
  const yt = item.media && youtubeId(item.media.media_url)
  if (yt) return `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`
  const [type, key] = item.og_key.split('/') as ['book' | 'dars', string]
  return ogImage(type, key)
}

function itemXml(item: FeedItem) {
  const url = absoluteUrl(item.path)
  const image = itemImage(item)
  const html = [
    `<p><img src="${xml(image)}" alt="${xml(item.title)}" /></p>`,
    item.title_ar ? `<p lang="ar" dir="rtl"><strong>${xml(item.title_ar)}</strong></p>` : '',
    item.author ? `<p>${xml(item.author)}</p>` : '',
    item.summary ? `<p>${xml(item.summary)}</p>` : '',
    `<p><a href="${xml(url)}">${item.type === 'book' ? 'কিতাবটি পড়ুন' : 'দারসটি শুনুন'} →</a></p>`,
  ].join('')

  return [
    '<item>',
    `<title>${xml(item.title)}</title>`,
    `<link>${xml(url)}</link>`,
    `<guid isPermaLink="true">${xml(url)}</guid>`,
    `<pubDate>${rfc822(item.published_at)}</pubDate>`,
    item.updated_at ? `<atom:updated>${item.updated_at}</atom:updated>` : '',
    item.author ? `<dc:creator>${xml(item.author)}</dc:creator>` : '',
    item.category ? `<category>${xml(item.category)}</category>` : '',
    `<description>${xml(item.summary ?? [item.title_ar, item.author].filter(Boolean).join(' — '))}</description>`,
    `<content:encoded>${cdata(html)}</content:encoded>`,
    `<media:thumbnail url="${xml(image)}" />`,
    '</item>',
  ].join('')
}

/** RSS 2.0 with Atom self link, Dublin Core creators and full HTML content. */
export function rss(channel: Channel) {
  const updated = channel.items.reduce<string | null>((max, i) => (i.updated_at && (!max || i.updated_at > max) ? i.updated_at : max), null)
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">
<channel>
<title>${xml(channel.title)}</title>
<link>${xml(absoluteUrl(channel.link))}</link>
<description>${xml(channel.description)}</description>
<language>bn</language>
<generator>${xml(SITE_URL)}</generator>
<lastBuildDate>${rfc822(updated)}</lastBuildDate>
<ttl>60</ttl>
<atom:link href="${xml(absoluteUrl(channel.self))}" rel="self" type="application/rss+xml" />
<image><url>${xml(absoluteUrl('/icon-512.png'))}</url><title>${xml(channel.title)}</title><link>${xml(absoluteUrl(channel.link))}</link></image>
${channel.items.map(itemXml).join('\n')}
</channel>
</rss>
`
}

export const SITE_FEED = { title: `${SITE_NAME} — নতুন কিতাব ও দারস`, description: SITE_DESCRIPTION }
