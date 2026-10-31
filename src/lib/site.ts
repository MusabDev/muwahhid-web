import { createIsomorphicFn } from '@tanstack/react-start'

export const SITE_NAME = 'আল-মুওয়াহহিদ'
export const SITE_NAME_EN = 'Al-Muwahhid'
export const SITE_TAGLINE = 'আহলুল ইলমের কিতাব ও দারস আরবি ও বাংলায়'
export const SITE_DESCRIPTION = 'আলেমদের কিতাব আর দারস, আরবি ও বাংলা পাশাপাশি রেখে বাক্য ধরে ধরে পড়ুন।'

/** Public origin of the site, without a trailing slash; every canonical URL is built from it. */
export const SITE_URL = (import.meta.env.VITE_SITE_URL ?? 'http://localhost:5173').replace(/\/+$/, '')

/** Absolute URL on the site for a path ("/books/x"). */
export function absoluteUrl(path = '/') {
  return path.startsWith('http') ? path : `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

/** True only on the real domain; previews and local builds are kept out of search engines. */
export const IS_PRODUCTION_SITE = /^https:\/\/(www\.)?muwahhid\.net$/.test(SITE_URL)

/**
 * Base URL of the Laravel API. The browser calls the public API domain (or the dev proxy);
 * the SSR server can reach it over a private address instead.
 */
export const apiBase = createIsomorphicFn()
  .server(() => (process.env.API_INTERNAL_URL ?? import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api').replace(/\/+$/, ''))
  .client(() => (import.meta.env.VITE_API_URL ?? '/api').replace(/\/+$/, ''))

/** Public API origin, for <link rel=preconnect> and API-hosted images (OG cards). */
export const API_PUBLIC_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api').replace(/\/+$/, '')
export const API_ORIGIN = new URL(API_PUBLIC_URL, SITE_URL).origin

/** Whether a Cookie header carries Laravel's session cookie (`<app>-session`), i.e. the visitor may be signed in. */
export function hasSessionCookie(cookie: string | null | undefined) {
  return !!cookie && /(?:^|;\s*)[\w.-]+[-_]session=/.test(cookie)
}
