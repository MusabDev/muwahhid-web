import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { api } from './api'
import { useUser } from './auth'
import { GUEST_KEYS, guestId, type GuestDurus, type GuestLibrary } from './guest'
import { useLocal } from './storage'
import type { Annotation, AnnotationTarget, Book, Bookmark, BookStatus, Dars, DarsEntry, Lang, LibraryEntry } from './types'

/* ------------------------------------------------------------------ Library */

export function useLibrary() {
  const { data: user } = useUser()
  const [guest] = useLocal<GuestLibrary>(GUEST_KEYS.library, {})
  const query = useQuery({
    queryKey: ['me', 'library'],
    queryFn: () => api<LibraryEntry[]>('/me/library'),
    enabled: !!user,
  })
  const entries = user ? (query.data ?? []) : Object.values(guest).sort((a, b) => (b.last_read_at ?? '').localeCompare(a.last_read_at ?? ''))
  return { entries, isLoading: !!user && query.isLoading }
}

export function useLibraryEntry(book: Book | undefined) {
  const { data: user } = useUser()
  const queryClient = useQueryClient()
  const [guest, setGuest] = useLocal<GuestLibrary>(GUEST_KEYS.library, {})
  const bookId = book?.id

  const query = useQuery({
    queryKey: ['me', 'library', bookId],
    queryFn: () => api<LibraryEntry>(`/me/library/${bookId}`),
    enabled: !!user && !!bookId,
  })

  const entry: LibraryEntry | undefined = user ? query.data : bookId ? guest[bookId] : undefined

  const slimBook = useMemo(
    () =>
      book && {
        id: book.id,
        slug: book.slug,
        title_ar: book.title_ar,
        title_bn: book.title_bn,
        title_translit: book.title_translit,
        cover_url: book.cover_url,
        about_md: null,
        content_version: book.content_version,
        is_published: book.is_published,
        is_sharh: book.is_sharh,
        author: book.author,
        explainer: book.explainer,
      },
    [book],
  )

  const updateGuest = useCallback(
    (patch: Partial<LibraryEntry>) => {
      if (!bookId || !slimBook) return
      setGuest((prev) => {
        const current: LibraryEntry = prev[bookId] ?? {
          book_id: bookId,
          status: null,
          last_page: null,
          last_sentence_id: null,
          progress: 0,
          last_read_at: null,
        }
        return { ...prev, [bookId]: { ...current, ...patch, book: slimBook as Book } }
      })
    },
    [bookId, slimBook, setGuest],
  )

  const statusMutation = useMutation({
    mutationFn: (status: BookStatus | null) => api<LibraryEntry>(`/me/library/${bookId}/status`, { method: 'PUT', body: { status } }),
    onSuccess: (data) => {
      queryClient.setQueryData(['me', 'library', bookId], data)
      queryClient.invalidateQueries({ queryKey: ['me', 'library'], exact: true })
    },
  })

  const setStatus = (status: BookStatus | null) => {
    if (user) statusMutation.mutate(status)
    else updateGuest({ status })
  }

  const saveProgress = useCallback(
    async (lastPage: number, lastSentenceId: number | null, progress: number) => {
      if (!bookId) return
      if (user) {
        const data = await api<LibraryEntry>(`/me/library/${bookId}/progress`, {
          method: 'PUT',
          body: { last_page: lastPage, last_sentence_id: lastSentenceId, progress },
        })
        queryClient.setQueryData(['me', 'library', bookId], data)
      } else {
        const current = guest[bookId]
        updateGuest({
          last_page: lastPage,
          last_sentence_id: lastSentenceId,
          progress,
          last_read_at: new Date().toISOString(),
          status: current?.status ?? 'reading',
        })
      }
    },
    [bookId, user, guest, updateGuest, queryClient],
  )

  return { entry, setStatus, saveProgress }
}

/* -------------------------------------------------------------------- Durus */

/** Share of a dars after which it counts as fully listened (same as the server). */
export const DARS_COMPLETED_AT = 95

export function useDarsLibrary() {
  const { data: user } = useUser()
  const [guest] = useLocal<GuestDurus>(GUEST_KEYS.durus, {})
  const query = useQuery({
    queryKey: ['me', 'durus'],
    queryFn: () => api<DarsEntry[]>('/me/durus'),
    enabled: !!user,
  })
  const entries = user ? (query.data ?? []) : Object.values(guest).sort((a, b) => (b.last_played_at ?? '').localeCompare(a.last_played_at ?? ''))
  return { entries, isLoading: !!user && query.isLoading }
}

export function useDarsEntry(dars: Dars | undefined) {
  const { data: user } = useUser()
  const queryClient = useQueryClient()
  const [guest, setGuest] = useLocal<GuestDurus>(GUEST_KEYS.durus, {})
  const darsId = dars?.id

  const query = useQuery({
    queryKey: ['me', 'durus', darsId],
    queryFn: () => api<DarsEntry>(`/me/durus/${darsId}`),
    enabled: !!user && !!darsId,
  })

  const entry: DarsEntry | undefined = user ? query.data : darsId ? guest[darsId] : undefined

  /* stored with guest entries so the library can show them without the API */
  const slimDars = useMemo(
    () =>
      dars && {
        id: dars.id,
        series_id: dars.series_id,
        number: dars.number,
        title_ar: dars.title_ar,
        title_bn: dars.title_bn,
        media_type: dars.media_type,
        media_url: dars.media_url,
        duration_seconds: dars.duration_seconds,
        series: dars.series && { ...dars.series, durus: undefined, book: undefined, about_md: null },
      },
    [dars],
  )

  const updateGuest = useCallback(
    (patch: Partial<DarsEntry>) => {
      if (!darsId || !slimDars) return
      setGuest((prev) => {
        const current: DarsEntry = prev[darsId] ?? { dars_id: darsId, status: null, position_seconds: 0, progress: 0, last_played_at: null }
        return { ...prev, [darsId]: { ...current, ...patch, dars: slimDars as Dars } }
      })
    },
    [darsId, slimDars, setGuest],
  )

  const statusMutation = useMutation({
    mutationFn: (status: BookStatus | null) => api<DarsEntry>(`/me/durus/${darsId}/status`, { method: 'PUT', body: { status } }),
    onSuccess: (data) => {
      queryClient.setQueryData(['me', 'durus', darsId], data)
      queryClient.invalidateQueries({ queryKey: ['me', 'durus'], exact: true })
    },
  })

  const setStatus = (status: BookStatus | null) => {
    if (user) statusMutation.mutate(status)
    else updateGuest({ status })
  }

  const saveProgress = useCallback(
    async (position: number, duration: number, keepalive = false) => {
      if (!darsId) return
      if (user) {
        const data = await api<DarsEntry>(`/me/durus/${darsId}/progress`, {
          method: 'PUT',
          keepalive,
          body: { position_seconds: position, duration_seconds: duration || null },
        })
        queryClient.setQueryData(['me', 'durus', darsId], data)
        queryClient.invalidateQueries({ queryKey: ['me', 'durus'], exact: true })
      } else {
        const total = dars?.duration_seconds || duration
        const progress = total ? Math.round(Math.min(position / total, 1) * 10000) / 100 : 0
        const status = guest[darsId]?.status ?? null
        updateGuest({
          position_seconds: position,
          progress,
          last_played_at: new Date().toISOString(),
          status: progress >= DARS_COMPLETED_AT && (status === null || status === 'reading') ? 'completed' : (status ?? 'reading'),
        })
      }
    },
    [darsId, dars?.duration_seconds, user, guest, updateGuest, queryClient],
  )

  return { entry, isLoading: !!user && query.isLoading, setStatus, saveProgress }
}

/* -------------------------------------------------------------- Annotations */

type AnnotationScope = { bookId?: number; darsId?: number }

export interface NewAnnotation {
  target_type: AnnotationTarget
  target_id: number
  lang: Lang
  start_offset: number
  end_offset: number
  quote: string
  color: string | null
  note: string | null
  group_id?: string | null
  /** Kept with a guest's highlight; the server looks it up itself. */
  page_number?: number | null
}

/** The parts of the highlight `annotation` belongs to, in reading order. */
export function annotationGroup(annotations: Annotation[], annotation: Annotation) {
  if (!annotation.group_id) return [annotation]
  return annotations.filter((a) => a.group_id === annotation.group_id).sort(byPosition)
}

/** Annotations gathered into whole highlights, each one's parts in reading order. */
export function groupAnnotations(annotations: Annotation[]) {
  const groups = new Map<string, Annotation[]>()
  for (const a of annotations) {
    const key = a.group_id ?? `id:${a.id}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(a)
  }
  return [...groups.values()].map((parts) => parts.sort(byPosition))
}

/* the Bangla text comes before the Arabic on the page */
const LANG_ORDER: Record<Lang, number> = { bn: 0, ar: 1 }

function byPosition(a: Annotation, b: Annotation) {
  return LANG_ORDER[a.lang] - LANG_ORDER[b.lang] || a.target_id - b.target_id || a.start_offset - b.start_offset
}

/** A highlight's text as one passage per language, in reading order. */
export function quoteByLang(parts: Pick<Annotation, 'lang' | 'quote'>[]) {
  const passages: { lang: Lang; text: string }[] = []
  for (const part of parts) {
    const last = passages.at(-1)
    if (last?.lang === part.lang) last.text += ` ${part.quote}`
    else passages.push({ lang: part.lang, text: part.quote })
  }
  return passages
}

export function useAnnotations(scope: AnnotationScope) {
  const { data: user } = useUser()
  const queryClient = useQueryClient()
  const [guest, setGuest] = useLocal<Annotation[]>(GUEST_KEYS.annotations, [])
  const key = ['me', 'annotations', scope]

  const query = useQuery({
    queryKey: key,
    queryFn: () => api<Annotation[]>('/me/annotations', { query: { book_id: scope.bookId, dars_id: scope.darsId } }),
    enabled: !!user && !!(scope.bookId || scope.darsId),
  })

  const annotations = user
    ? (query.data ?? [])
    : guest.filter((a) => (scope.bookId ? a.book_id === scope.bookId : a.dars_id === scope.darsId))

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['me', 'annotations'] })

  /* a highlight's parts are changed and removed together */
  const partsOf = (id: Annotation['id']) => {
    const annotation = annotations.find((a) => a.id === id)
    return annotation ? annotationGroup(annotations, annotation).map((a) => a.id) : [id]
  }

  /**
   * Save annotation parts as given (each names its own group), in place of the
   * exact parts in `replaces` — used when a new highlight cuts into older ones.
   */
  const create = async (parts: NewAnnotation[], replaces: Annotation['id'][] = []) => {
    if (user) {
      const [created] = await Promise.all([
        Promise.all(parts.map((data) => api<Annotation>('/me/annotations', { method: 'POST', body: { ...data } }))),
        Promise.all(replaces.map((id) => api(`/me/annotations/${id}`, { method: 'DELETE' }))),
      ])
      invalidate()
      return created
    }
    const created: Annotation[] = parts.map((data) => ({
      ...data,
      group_id: data.group_id ?? null,
      id: guestId(),
      book_id: scope.bookId ?? null,
      dars_id: scope.darsId ?? null,
      created_at: new Date().toISOString(),
    }))
    setGuest((prev) => [...created, ...prev.filter((a) => !replaces.includes(a.id))])
    return created
  }

  const update = async (id: Annotation['id'], patch: { color?: string | null; note?: string | null }) => {
    const ids = partsOf(id)
    if (user) {
      await Promise.all(ids.map((part) => api(`/me/annotations/${part}`, { method: 'PUT', body: patch })))
      invalidate()
    } else {
      setGuest((prev) => prev.map((a) => (ids.includes(a.id) ? { ...a, ...patch } : a)))
    }
  }

  const remove = async (id: Annotation['id']) => {
    const ids = partsOf(id)
    if (user) {
      await Promise.all(ids.map((part) => api(`/me/annotations/${part}`, { method: 'DELETE' })))
      invalidate()
    } else {
      setGuest((prev) => prev.filter((a) => !ids.includes(a.id)))
    }
  }

  return { annotations, create, update, remove }
}

/** Every book highlight with a note, across the whole library. */
export function useNotes() {
  const { data: user } = useUser()
  const queryClient = useQueryClient()
  const [guest, setGuest] = useLocal<Annotation[]>(GUEST_KEYS.annotations, [])

  const query = useQuery({
    queryKey: ['me', 'annotations', 'notes'],
    queryFn: () => api<Annotation[]>('/me/annotations', { query: { has_note: 1 } }),
    enabled: !!user,
  })

  const notes = user ? (query.data ?? []) : guest.filter((a) => a.book_id && a.note?.trim())

  /* a highlight's parts are removed together */
  const remove = async (id: Annotation['id']) => {
    const annotation = notes.find((a) => a.id === id)
    const ids = annotation ? annotationGroup(notes, annotation).map((a) => a.id) : [id]
    if (user) {
      await Promise.all(ids.map((part) => api(`/me/annotations/${part}`, { method: 'DELETE' })))
      queryClient.invalidateQueries({ queryKey: ['me', 'annotations'] })
    } else {
      setGuest((prev) => prev.filter((a) => !ids.includes(a.id)))
    }
  }

  return { notes, remove }
}

/* ---------------------------------------------------------------- Bookmarks */

export function useBookmarks(bookId?: number) {
  const { data: user } = useUser()
  const queryClient = useQueryClient()
  const [guest, setGuest] = useLocal<Bookmark[]>(GUEST_KEYS.bookmarks, [])

  const query = useQuery({
    queryKey: ['me', 'bookmarks', bookId ?? 'all'],
    queryFn: () => api<Bookmark[]>('/me/bookmarks', { query: { book_id: bookId } }),
    enabled: !!user,
  })

  const bookmarks = user ? (query.data ?? []) : guest.filter((b) => !bookId || b.book_id === bookId)
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['me', 'bookmarks'] })

  /** `book` is stored with guest bookmarks so the library can link to them without the API. */
  const create = async (data: { book_id: number; page_number: number; sentence_id: number | null; label: string | null }, book?: Book) => {
    if (user) {
      await api('/me/bookmarks', { method: 'POST', body: data })
      invalidate()
    } else {
      const snapshot = book && ({ id: book.id, slug: book.slug, title_ar: book.title_ar, title_bn: book.title_bn, title_translit: book.title_translit, cover_url: book.cover_url } as Book)
      setGuest((prev) => [...prev, { ...data, id: guestId(), created_at: new Date().toISOString(), book: snapshot }])
    }
  }

  const update = async (id: Bookmark['id'], label: string | null) => {
    if (user) {
      await api(`/me/bookmarks/${id}`, { method: 'PUT', body: { label } })
      invalidate()
    } else {
      setGuest((prev) => prev.map((b) => (b.id === id ? { ...b, label } : b)))
    }
  }

  const remove = async (id: Bookmark['id']) => {
    if (user) {
      await api(`/me/bookmarks/${id}`, { method: 'DELETE' })
      invalidate()
    } else {
      setGuest((prev) => prev.filter((b) => b.id !== id))
    }
  }

  return { bookmarks, create, update, remove }
}

/* ----------------------------------------------------------- Reader settings */

export type ReaderTheme = 'paper' | 'sepia' | 'dark' | 'night'
export type ReaderMode = 'book' | 'sentence'
export type ReaderLeading = 'compact' | 'normal' | 'relaxed'

export interface ReaderSettings {
  mode: ReaderMode
  theme: ReaderTheme
  fontSize: number
  leading: ReaderLeading
  fontAr: string
  fontBn: string
  showArabic: boolean
  showBangla: boolean
  diacritics: boolean
  subtitles: 'ar' | 'bn' | 'both'
}

export const DEFAULT_SETTINGS: ReaderSettings = {
  mode: 'book',
  theme: 'paper',
  fontSize: 19,
  leading: 'normal',
  fontAr: 'amiri',
  fontBn: 'noto-serif-bengali',
  showArabic: true,
  showBangla: true,
  diacritics: true,
  subtitles: 'both',
}

/** Settings live in localStorage for everyone and are mirrored to the account when signed in. */
export function useReaderSettings() {
  const { data: user } = useUser()
  const [stored, setStored] = useLocal<Partial<ReaderSettings>>(GUEST_KEYS.settings, {})
  const settings = useMemo(() => ({ ...DEFAULT_SETTINGS, ...stored }), [stored])
  const timer = useRef<number | undefined>(undefined)
  const pulled = useRef<number | null>(null)
  const pending = useRef<Partial<ReaderSettings>>({})

  useEffect(() => {
    if (!user || pulled.current === user.id) return
    pulled.current = user.id
    api<{ settings: Partial<ReaderSettings> }>('/me/settings')
      .then(({ settings: remote }) => {
        if (remote && Object.keys(remote).length) setStored((prev) => ({ ...prev, ...remote }))
      })
      .catch(() => {})
  }, [user, setStored])

  const update = useCallback(
    (patch: Partial<ReaderSettings>) => {
      setStored((prev) => ({ ...prev, ...patch }))
      if (user) {
        pending.current = { ...pending.current, ...patch }
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => {
          const settings = pending.current
          pending.current = {}
          api('/me/settings', { method: 'PUT', body: { settings } }).catch(() => {})
        }, 800)
      }
    },
    [user, setStored],
  )

  return { settings, update }
}
