/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public site origin, e.g. https://muwahhid.net */
  readonly VITE_SITE_URL?: string
  /** Public API base, e.g. https://api.muwahhid.net/api */
  readonly VITE_API_URL?: string
  /** IndexNow key; served at /{key}.txt */
  readonly VITE_INDEXNOW_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
