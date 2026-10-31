import { youtubeId } from '@/hooks/use-media-player'
import type { Dars, DarsSeries } from './types'

/** Durus a podcast app can play: audio files, not YouTube or other embeds. */
export function podcastEpisodes(series: DarsSeries) {
  return (series.durus ?? []).filter((d: Dars) => d.media_type === 'audio' && !youtubeId(d.media_url) && /^https?:\/\/.+\.(mp3|m4a|aac|ogg|opus|wav)(\?|$)/i.test(d.media_url))
}

export const podcastPath = (slug: string) => `/feeds/podcast/${slug}.xml`
