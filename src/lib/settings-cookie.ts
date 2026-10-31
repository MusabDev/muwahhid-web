import { createIsomorphicFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'

/**
 * Reader settings are mirrored from localStorage into this cookie so the server can render
 * the reader in the visitor's theme, mode and font size instead of flashing the defaults.
 */
export const SETTINGS_COOKIE = 'mw_settings'

type Json = string | number | boolean | null | Json[] | { [key: string]: Json }
export type SettingsCookie = { [key: string]: Json }

function parse(raw: string | undefined | null): SettingsCookie {
  if (!raw) return {}
  try {
    const value = JSON.parse(decodeURIComponent(raw))
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  } catch {
    return {}
  }
}

export const readSettingsCookie = createIsomorphicFn()
  .server(() => parse(getCookie(SETTINGS_COOKIE)))
  .client(() => parse(document.cookie.match(new RegExp(`(?:^|; )${SETTINGS_COOKIE}=([^;]*)`))?.[1]))

export function writeSettingsCookie(settings: object) {
  const value = encodeURIComponent(JSON.stringify(settings))
  // a cookie past ~4KB is dropped by the browser; the reader then just starts from defaults
  if (value.length > 3800) return
  document.cookie = `${SETTINGS_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax${location.protocol === 'https:' ? '; secure' : ''}`
}
