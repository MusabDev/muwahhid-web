/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public site origin, e.g. https://muwahhid.net */
  readonly VITE_SITE_URL?: string
  /** Public API base, e.g. https://api.muwahhid.net/api */
  readonly VITE_API_URL?: string
  /** "true" sends page views outside the production domain (local testing) */
  readonly VITE_ANALYTICS_DEBUG?: string
  /** IndexNow key; served at /{key}.txt */
  readonly VITE_INDEXNOW_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
