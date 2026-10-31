/** Escape text for XML element content and attribute values. */
export function xml(text: string | number | null | undefined) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    // characters XML 1.0 does not allow at all
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '')
}

/** Wrap HTML for an RSS <content:encoded>, splitting any "]]>" so it can't end the section early. */
export function cdata(html: string) {
  return `<![CDATA[${html.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`
}

/** RFC 822 date, as RSS wants. */
export function rfc822(iso: string | null | undefined) {
  return new Date(iso ?? Date.now()).toUTCString()
}

/** A text response for a crawler file, cached by browsers briefly and by a CDN for an hour. */
export function textResponse(body: string, contentType: string, sMaxAge = 3600) {
  return new Response(body, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': `public, max-age=600, s-maxage=${sMaxAge}, stale-while-revalidate=86400`,
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

export const xmlResponse = (body: string, sMaxAge?: number) => textResponse(body, 'application/xml; charset=utf-8', sMaxAge)

export const rssResponse = (body: string) => textResponse(body, 'application/rss+xml; charset=utf-8')
