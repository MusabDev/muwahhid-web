import type { Dars } from './types'

type DarsRef = Pick<Dars, 'id' | 'number'> & { series?: { slug: string } | null }

/**
 * Link target for a dars: /durus/{series}/{number}. Without the series slug (an old guest entry)
 * it goes through /durus/{id}, which redirects there.
 */
export function darsLink(dars: DarsRef, seriesSlug = dars.series?.slug) {
  return seriesSlug
    ? ({ to: '/durus/$slug/$number', params: { slug: seriesSlug, number: String(dars.number) } } as const)
    : ({ to: '/durus/$slug', params: { slug: String(dars.id) } } as const)
}

export function darsPath(dars: DarsRef, seriesSlug = dars.series?.slug) {
  return seriesSlug ? `/durus/${seriesSlug}/${dars.number}` : `/durus/${dars.id}`
}
