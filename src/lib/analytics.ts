import { apiBase, IS_PRODUCTION_SITE, SITE_NAME } from './site'

/**
 * Cookieless page-view beacon. The API hashes IP + user agent with a salt that changes daily,
 * so nothing here identifies the visitor. Bodies go as text/plain so no CORS preflight is needed
 * and sendBeacon works on page hide.
 */
const ENABLED = IS_PRODUCTION_SITE || import.meta.env.VITE_ANALYTICS_DEBUG === 'true'

interface View {
  id: string
  path: string
  visibleMs: number
  visibleSince: number | null
}

let current: View | null = null
let firstView = true
let listening = false

function post(endpoint: 'collect' | 'engage', data: Record<string, unknown>, beacon = false) {
  const url = `${apiBase()}/analytics/${endpoint}`
  const body = JSON.stringify(data)
  if (beacon && navigator.sendBeacon?.(url, new Blob([body], { type: 'text/plain' }))) return
  fetch(url, { method: 'POST', body, keepalive: true, credentials: 'include', headers: { 'Content-Type': 'text/plain' } }).catch(() => {})
}

function pause() {
  if (current?.visibleSince != null) {
    current.visibleMs += Date.now() - current.visibleSince
    current.visibleSince = null
  }
}

/** Send how long the current view was on screen. */
function flush() {
  if (!current) return
  pause()
  if (current.visibleMs > 0) post('engage', { id: current.id, seconds: Math.round(current.visibleMs / 1000) }, true)
  current.visibleMs = 0
}

function listen() {
  if (listening) return
  listening = true
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
    else if (current) current.visibleSince = Date.now()
  })
  window.addEventListener('pagehide', flush)
}

/** "/_site/books/$slug/" → "/books/$slug" */
function routePattern(routeId: string | undefined, path: string) {
  if (!routeId || routeId === '__root__') return path
  return routeId.replace(/\/_[^/]+/g, '').replace(/(.)\/$/, '$1') || '/'
}

export function trackPageView(path: string, routeId: string | undefined) {
  if (!ENABLED || typeof window === 'undefined' || navigator.webdriver) return
  if (path === '/admin' || path.startsWith('/admin/')) return
  if (current?.path === path) return

  listen()
  flush()
  current = { id: crypto.randomUUID(), path, visibleMs: 0, visibleSince: document.visibilityState === 'visible' ? Date.now() : null }

  const view = current
  const search = new URLSearchParams(window.location.search)
  const referrer = firstView ? document.referrer || null : null
  firstView = false

  // the route's head() sets the title just after navigation resolves
  setTimeout(() => {
    post('collect', {
      id: view.id,
      path,
      route: routePattern(routeId, path),
      title: document.title.replace(` | ${SITE_NAME}`, '').trim() || null,
      referrer,
      utm_source: search.get('utm_source') ?? search.get('ref'),
      utm_medium: search.get('utm_medium'),
      utm_campaign: search.get('utm_campaign'),
      language: navigator.language || null,
      screen_width: window.screen?.width || null,
    })
  }, 150)
}
