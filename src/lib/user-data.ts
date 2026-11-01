import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouteContext } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { api } from './api'
import { useUser } from './auth'
import { GUEST_KEYS, guestId, type GuestDurus, type GuestLibrary } from './guest'
import { writeSettingsCookie } from './settings-cookie'
import { useLocal } from './storage'
import type { Annotation, AnnotationTarget, Book, Bookmark, BookStatus, Dars, DarsEntry, DarsSeries, Lang, LibraryEntry } from './types'

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

/**
 * How far the user is through a series: the share listened (each dars weighed by
 * its length when known), how many durus are finished, and the dars to resume.
 */
export function useDarsSeriesProgress(series: DarsSeries | undefined) {
  const { entries } = useDarsLibrary()

  return useMemo(() => {
    const durus = series?.durus ?? []
    const byId = new Map(entries.map((e) => [e.dars_id, e]))
    const done = (e: DarsEntry | undefined) => !!e && (e.status === 'completed' || e.progress >= DARS_COMPLETED_AT)

    let listened = 0
    let total = 0
    for (const d of durus) {
      const entry = byId.get(d.id)
      const weight = d.duration_seconds || 1
      listened += weight * (done(entry) ? 100 : (entry?.progress ?? 0))
      total += weight
    }

    const started = durus.filter((d) => byId.get(d.id)?.position_seconds)
    const latest = started.sort((a, b) => (byId.get(b.id)?.last_played_at ?? '').localeCompare(byId.get(a.id)?.last_played_at ?? ''))[0]
    /* the last played dars, or the one after it once that is finished */
    const resume = latest && done(byId.get(latest.id)) ? durus.find((d) => d.number > latest.number && !done(byId.get(d.id))) : latest

    return {
      progress: total ? listened / total : 0,
      completed: durus.filter((d) => done(byId.get(d.id))).length,
      resume,
    }
  }, [series, entries])
}

/** The library status of a whole series: one shared by every dars in it, or null. */
export function useDarsSeriesStatus(series: DarsSeries | undefined) {
  const { data: user } = useUser()
  const queryClient = useQueryClient()
  const { entries } = useDarsLibrary()
  const [, setGuest] = useLocal<GuestDurus>(GUEST_KEYS.durus, {})
  const durus = useMemo(() => series?.durus ?? [], [series])

  const byId = new Map(entries.map((e) => [e.dars_id, e]))
  const statuses = durus.map((d) => byId.get(d.id)?.status ?? null)
  const status = statuses.length && statuses.every((s) => s === statuses[0]) ? statuses[0] : null
  const saved = statuses.some((s) => s !== null)

  const statusMutation = useMutation({
    mutationFn: (status: BookStatus | null) => api<DarsEntry[]>(`/me/dars-series/${series?.id}/status`, { method: 'PUT', body: { status } }),
    onSuccess: (data) => {
      for (const entry of data) queryClient.setQueryData(['me', 'durus', entry.dars_id], entry)
      queryClient.invalidateQueries({ queryKey: ['me', 'durus'], exact: true })
    },
  })

  const setStatus = (status: BookStatus | null) => {
    if (!series) return
    if (user) return statusMutation.mutate(status)
    /* stored like useDarsEntry's guest entries, so the library can show them without the API */
    const slimSeries = { ...series, durus: undefined, book: undefined, about_md: null }
    setGuest((prev) => {
      const next = { ...prev }
      for (const d of durus) {
        const current: DarsEntry = prev[d.id] ?? { dars_id: d.id, status: null, position_seconds: 0, progress: 0, last_played_at: null }
        next[d.id] = {
          ...current,
          status,
          dars: {
            id: d.id,
            series_id: d.series_id,
            number: d.number,
            title_ar: d.title_ar,
            title_bn: d.title_bn,
            media_type: d.media_type,
            media_url: d.media_url,
            duration_seconds: d.duration_seconds,
            series: slimSeries,
          },
        }
      }
      return next
    })
  }

  return { status, saved, setStatus, isPending: statusMutation.isPending }
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

/**
 * How a new subtitle line comes in: fading, rising from a little below, the same while coming into focus,
 * just coming into focus, growing, falling from a little above, or word by word.
 */
export type SubtitleTransition = 'fade' | 'rise' | 'rise-blur' | 'blur' | 'zoom' | 'drop' | 'words'

/** How the synced subtitles over the dars player look. */
export interface SubtitleStyle {
  fontAr: string
  fontBn: string
  /** Percent of each script's base size, which itself follows the player width. */
  sizeAr: number
  sizeBn: number
  colorAr: string
  colorBn: string
  bold: boolean
  /** Which language's line comes first. */
  order: 'ar' | 'bn'
  stroke: boolean
  /** Outline thickness in px. */
  strokeWidth: number
  strokeColor: string
  shadow: boolean
  shadowColor: string
  /** 0–100 */
  shadowOpacity: number
  /** Blur of the outer shadow, in px as seen on a 960px-wide player. */
  shadowBlur: number
  /** Where the shadow falls, in px as seen on a 960px-wide player. */
  shadowX: number
  shadowY: number
  /**
   * One box around the cue, the same with feathered edges, a strip behind each line of text,
   * a shade rising from the bottom of the video, or none.
   */
  shape: 'box' | 'soft' | 'lines' | 'fade' | 'none'
  backgroundColor: string
  /** 0–100 */
  backgroundOpacity: number
  /** Blur behind the background, in px. */
  backgroundBlur: number
  /** How far the bottom shade reaches above the text, in percent of the text block's own height. */
  fadeHeight: number
  /** Which edge of the video the cue sits against: the bottom, the top, or the middle. */
  valign: 'top' | 'middle' | 'bottom'
  /**
   * Distance from that edge, in percent of the video height; for the middle, how far above (or, below zero) the center.
   */
  position: number
  /** How far the cue's column sits right (or, below zero, left) of the center, in percent of the player width. */
  offsetX: number
  align: 'center' | 'left' | 'right'
  /** Percent of the normal line height. */
  lineHeight: number
  /** Widest the cue may get, in percent of the player width. */
  width: number
  /** Show the upcoming line, dimmed, under the current one. */
  nextLine: boolean
  /** Whether a new line comes in with `transition`, or just appears. */
  fade: boolean
  transition: SubtitleTransition
  /** How long the entrance takes, in ms. */
  transitionMs: number
  /** Arabic and Bangla as two cues, each placed and styled on its own, instead of one cue with both lines. */
  separate: boolean
  /** While `separate`, what each language's cue does differently from the fields above; null follows them. */
  ar: CueOverride
  bn: CueOverride
}

/** The fields each language's cue can set for itself; fonts, sizes and colors are already one per language. */
export const CUE_KEYS = [
  'valign',
  'position',
  'offsetX',
  'align',
  'width',
  'lineHeight',
  'bold',
  'stroke',
  'strokeWidth',
  'strokeColor',
  'shadow',
  'shadowColor',
  'shadowOpacity',
  'shadowBlur',
  'shadowX',
  'shadowY',
  'shape',
  'backgroundColor',
  'backgroundOpacity',
  'backgroundBlur',
  'fadeHeight',
  'fade',
  'transition',
  'transitionMs',
] as const satisfies readonly (keyof SubtitleStyle)[]

export type CueKey = (typeof CUE_KEYS)[number]
export type CueOverride = { [K in CueKey]?: SubtitleStyle[K] | null }

/** The style one language's cue is drawn with: its own fields over the shared ones, when the two are apart. */
export function cueStyle(s: SubtitleStyle, lang: Lang): SubtitleStyle {
  if (!s.separate) return s
  return { ...s, ...Object.fromEntries(Object.entries(s[lang] ?? {}).filter(([, v]) => v != null)) }
}

/** Apply a change to a style; the per-language parts merge field by field rather than replacing each other. */
export function mergeSubtitle<T extends Partial<SubtitleStyle>>(style: T, patch: Partial<SubtitleStyle>): T {
  return {
    ...style,
    ...patch,
    ...(patch.ar ? { ar: { ...style.ar, ...patch.ar } } : {}),
    ...(patch.bn ? { bn: { ...style.bn, ...patch.bn } } : {}),
  }
}

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
  /** Book reader: the page fills the window with only the page controls over it. */
  fullscreen: boolean
  subtitles: 'ar' | 'bn' | 'both' | 'off'
  subtitle: SubtitleStyle
  /** Dars page: wide player with the transcript hidden. */
  theater: boolean
  playbackRate: number
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
  fullscreen: false,
  subtitles: 'bn',
  // the "outline" preset, a little larger and near the bottom
  subtitle: {
    fontAr: 'noto-naskh-arabic',
    fontBn: 'hind-siliguri',
    sizeAr: 130,
    sizeBn: 130,
    colorAr: '#ffffff',
    colorBn: '#ffffff',
    bold: true,
    order: 'ar',
    stroke: true,
    strokeWidth: 1.5,
    strokeColor: '#000000',
    shadow: true,
    shadowColor: '#000000',
    shadowOpacity: 90,
    shadowBlur: 10,
    shadowX: 0,
    shadowY: 2,
    shape: 'none',
    backgroundColor: '#000000',
    backgroundOpacity: 55,
    backgroundBlur: 0,
    fadeHeight: 120,
    valign: 'bottom',
    position: 5,
    offsetX: 0,
    align: 'center',
    lineHeight: 100,
    width: 90,
    nextLine: false,
    fade: true,
    transition: 'fade',
    transitionMs: 300,
    separate: false,
    ar: {},
    bn: {},
  },

  theater: false,
  playbackRate: 1,
}

/** Settings the dars page owns; the book reader leaves them alone when it resets. */
export const DARS_SETTING_KEYS = ['subtitles', 'subtitle', 'theater', 'playbackRate'] as const satisfies readonly (keyof ReaderSettings)[]

/**
 * The viewer's subtitle choices as saved: every field, null where they kept the dars's (or site's) style.
 * Every field is always written, because the account copy is merged key by key and a missing key would linger there.
 */
type StoredSubtitle = { [K in keyof SubtitleStyle]?: SubtitleStyle[K] | null }
type StoredSettings = Omit<Partial<ReaderSettings>, 'subtitle'> & { subtitle?: StoredSubtitle }

const SUBTITLE_KEYS = Object.keys(DEFAULT_SETTINGS.subtitle) as (keyof SubtitleStyle)[]
const UNSET_SUBTITLE = Object.fromEntries(SUBTITLE_KEYS.map((k) => [k, null])) as StoredSubtitle

/**
 * Only the subtitle fields the viewer set themselves. Saves from before per-dars styles held the whole style,
 * so there a field equal to the site default is taken as never touched, and the dars's own style shows through.
 */
function ownSubtitle(stored: StoredSubtitle | undefined): Partial<SubtitleStyle> {
  if (!stored) return {}
  const legacy = !('valign' in stored)
  return Object.fromEntries(Object.entries(stored).filter(([k, v]) => v != null && !(legacy && v === DEFAULT_SETTINGS.subtitle[k as keyof SubtitleStyle])))
}

/** The viewer's own fields over the dars's; each language's cue keeps the dars's fields the viewer didn't change. */
function layerSubtitle(base: SubtitleStyle, own: Partial<SubtitleStyle>): SubtitleStyle {
  return { ...base, ...own, ar: { ...base.ar, ...own.ar }, bn: { ...base.bn, ...own.bn } }
}

/**
 * Settings live in localStorage for everyone and are mirrored to the account when signed in.
 * `subtitleBase` and `subtitlesBase` are the dars's own subtitle style and languages:
 * they sit between the site default and the viewer's own choices.
 */
export function useReaderSettings({ subtitleBase, subtitlesBase }: { subtitleBase?: Partial<SubtitleStyle> | null; subtitlesBase?: ReaderSettings['subtitles'] | null } = {}) {
  const { data: user } = useUser()
  const { settingsCookie } = useRouteContext({ from: '__root__' })
  const [stored, setStored] = useLocal<StoredSettings>(GUEST_KEYS.settings, {}, settingsCookie as StoredSettings)
  const base = useMemo(() => layerSubtitle(DEFAULT_SETTINGS.subtitle, subtitleBase ?? {}), [subtitleBase])
  // subtitle style is nested, so options added later still get their defaults
  const settings: ReaderSettings = useMemo(
    () => ({ ...DEFAULT_SETTINGS, ...stored, subtitles: stored.subtitles ?? subtitlesBase ?? DEFAULT_SETTINGS.subtitles, subtitle: layerSubtitle(base, ownSubtitle(stored.subtitle)) }),
    [stored, base, subtitlesBase],
  )
  const timer = useRef<number | undefined>(undefined)
  const pulled = useRef<number | null>(null)
  const pending = useRef<StoredSettings>({})

  useEffect(() => writeSettingsCookie(stored), [stored])

  useEffect(() => {
    if (!user || pulled.current === user.id) return
    pulled.current = user.id
    api<{ settings: StoredSettings }>('/me/settings')
      .then(({ settings: remote }) => {
        if (remote && Object.keys(remote).length) setStored((prev) => ({ ...prev, ...remote }))
      })
      .catch(() => {})
  }, [user, setStored])

  const sync = useCallback(
    (patch: StoredSettings) => {
      if (!user) return
      pending.current = { ...pending.current, ...patch }
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => {
        const settings = pending.current
        pending.current = {}
        api('/me/settings', { method: 'PUT', body: { settings } }).catch(() => {})
      }, 800)
    },
    [user],
  )

  const update = useCallback(
    (patch: Partial<Omit<ReaderSettings, 'subtitle'>>) => {
      setStored((prev) => ({ ...prev, ...patch }))
      sync(patch)
    },
    [setStored, sync],
  )

  /** Change some subtitle fields; the rest keep following the dars's style. */
  const updateSubtitle = useCallback(
    (patch: Partial<SubtitleStyle>) => {
      setStored((prev) => {
        const subtitle = mergeSubtitle({ ...UNSET_SUBTITLE, ...ownSubtitle(prev.subtitle) } as Partial<SubtitleStyle>, patch) as StoredSubtitle
        sync({ subtitle })
        return { ...prev, subtitle }
      })
    },
    [setStored, sync],
  )

  /** Forget the viewer's own subtitle changes, back to the dars's style. */
  const resetSubtitle = useCallback(() => {
    setStored((prev) => ({ ...prev, subtitle: UNSET_SUBTITLE }))
    sync({ subtitle: UNSET_SUBTITLE })
  }, [setStored, sync])

  return { settings, update, updateSubtitle, resetSubtitle, subtitleBase: base }
}
