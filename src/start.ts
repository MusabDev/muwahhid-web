import { createMiddleware, createStart } from '@tanstack/react-start'
import { hasSessionCookie } from '@/lib/site'

/** Pages rendered with the visitor's reader settings (theme, mode, fonts) from their cookie. */
const PERSONAL_PAGES = /^\/(books\/[^/]+\/read\/|durus\/[^/]+\/\d+|settings|my-library|admin|login|register|forgot-password|reset-password|verify-email)/

/**
 * One URL per page: `www.` goes to the bare domain and a trailing slash is dropped, both with a 301,
 * so links and canonicals never split a page's ranking.
 */
const canonicalHost = createMiddleware({ type: 'request' }).server(async ({ request, next }) => {
  if (request.method === 'GET' || request.method === 'HEAD') {
    const url = new URL(request.url)
    let moved = false
    if (url.hostname.startsWith('www.')) {
      url.hostname = url.hostname.slice(4)
      moved = true
    }
    if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
      url.pathname = url.pathname.replace(/\/+$/, '')
      moved = true
    }
    if (moved) return Response.redirect(url.toString(), 301)
  }
  return next()
})

/**
 * Server-rendered HTML for guests is the same for every visitor, so public pages can sit in a CDN for a few minutes.
 * Pages drawn from the visitor's settings cookie, account pages, and anything rendered for a signed-in visitor
 * (their session cookie is forwarded to the API during SSR) can't.
 */
const cacheHeaders = createMiddleware({ type: 'request' }).server(async ({ request, next, pathname }) => {
  const result = await next()
  const { response } = result
  const type = response.headers.get('Content-Type') ?? ''
  if (request.method !== 'GET' || !type.includes('text/html') || response.headers.has('Cache-Control')) return result

  response.headers.set(
    'Cache-Control',
    response.status !== 200 || PERSONAL_PAGES.test(pathname) || hasSessionCookie(request.headers.get('cookie')) ? 'private, no-cache' : 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600',
  )
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  return result
})

export const startInstance = createStart(() => ({
  requestMiddleware: [canonicalHost, cacheHeaders],
}))
