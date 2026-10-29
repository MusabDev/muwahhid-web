import { api } from './api'
import { getLocal, setLocal } from './storage'
import type { Annotation, Bookmark, LibraryEntry } from './types'

export const GUEST_KEYS = {
  library: 'mw:library',
  annotations: 'mw:annotations',
  bookmarks: 'mw:bookmarks',
  settings: 'mw:settings',
} as const

export type GuestLibrary = Record<string, LibraryEntry>

export function guestId() {
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** Push guest data to the account after login, then clear it locally. */
export async function syncGuestData() {
  const library = getLocal<GuestLibrary>(GUEST_KEYS.library, {})
  const annotations = getLocal<Annotation[]>(GUEST_KEYS.annotations, [])
  const bookmarks = getLocal<Bookmark[]>(GUEST_KEYS.bookmarks, [])
  const settings = getLocal<Record<string, unknown> | null>(GUEST_KEYS.settings, null)

  const hasData = Object.keys(library).length || annotations.length || bookmarks.length || settings
  if (!hasData) return

  await api('/me/sync', {
    method: 'POST',
    body: {
      library: Object.values(library).map(({ book: _book, ...entry }) => entry),
      annotations,
      bookmarks: bookmarks.map(({ book: _book, ...bookmark }) => bookmark),
      ...(settings ? { settings } : {}),
    },
  })

  setLocal(GUEST_KEYS.library, null)
  setLocal(GUEST_KEYS.annotations, null)
  setLocal(GUEST_KEYS.bookmarks, null)
}
