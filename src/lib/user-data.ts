import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { api } from './api'
import { useUser } from './auth'
import { GUEST_KEYS, guestId, type GuestLibrary } from './guest'
import { useLocal } from './storage'
import type { Annotation, AnnotationTarget, Book, Bookmark, BookStatus, Lang, LibraryEntry } from './types'

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
        author: book.author,
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

  const create = async (data: NewAnnotation) => {
    if (user) {
      const created = await api<Annotation>('/me/annotations', { method: 'POST', body: { ...data } })
      invalidate()
      return created
    }
    const created: Annotation = {
      ...data,
      id: guestId(),
      book_id: scope.bookId ?? null,
      dars_id: scope.darsId ?? null,
      created_at: new Date().toISOString(),
    }
    setGuest((prev) => [created, ...prev])
    return created
  }

  const update = async (id: Annotation['id'], patch: { color?: string | null; note?: string | null }) => {
    if (user) {
      await api(`/me/annotations/${id}`, { method: 'PUT', body: patch })
      invalidate()
    } else {
      setGuest((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)))
    }
  }

  const remove = async (id: Annotation['id']) => {
    if (user) {
      await api(`/me/annotations/${id}`, { method: 'DELETE' })
      invalidate()
    } else {
      setGuest((prev) => prev.filter((a) => a.id !== id))
    }
  }

  return { annotations, create, update, remove }
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

export interface ReaderSettings {
  mode: ReaderMode
  theme: ReaderTheme
  fontSize: number
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
