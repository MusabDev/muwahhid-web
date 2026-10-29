import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useLocation, useNavigate } from '@tanstack/react-router'
import { ArrowRight, Bookmark, BookOpen, ChevronLeft, ChevronRight, ListTree, NotebookPen, Rows3, Search, Settings2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { StarMark } from '@/components/brand'
import type { HighlightRange } from '@/components/markdown'
import { BookView } from '@/components/reader/book-view'
import { Companion, type CompanionTab } from '@/components/reader/companion'
import { BookmarksPanel, HighlightsPanel } from '@/components/reader/notes-panel'
import { ReaderContext, type ReaderContextValue } from '@/components/reader/reader-context'
import { SearchPanel } from '@/components/reader/search-panel'
import { SentenceView } from '@/components/reader/sentence-view'
import { SettingsPanel } from '@/components/reader/settings-panel'
import { PatternTint } from '@/components/pattern'
import { EmptyState, Spinner } from '@/components/states'
import { useTextActions } from '@/components/text-actions'
import { TocList } from '@/components/toc-list'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { arabicFamily, banglaFamily, loadFont } from '@/lib/fonts'
import { bookQuery, pageQuery } from '@/lib/queries'
import type { TextTarget } from '@/lib/selection'
import { bnNum } from '@/lib/text'
import { pageTitle } from '@/lib/head'
import type { Annotation, Lang } from '@/lib/types'
import { useAnnotations, useBookmarks, useLibraryEntry, useReaderSettings } from '@/lib/user-data'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/books/$slug/read/$page')({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(bookQuery(params.slug)),
  head: ({ loaderData, params }) => pageTitle(loaderData && `${loaderData.title_bn} · পৃষ্ঠা ${bnNum(params.page)}`),
  component: Reader,
})

const WIDE = '(min-width: 1280px)'

function Reader() {
  const { slug, page: pageParam } = Route.useParams()
  const pageNumber = Number(pageParam) || 1
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const containerRef = useRef<HTMLDivElement>(null)

  const { data: book } = useQuery(bookQuery(slug))
  const { data: page, isLoading, isError } = useQuery(pageQuery(slug, pageNumber))
  const { settings, update } = useReaderSettings()
  const { annotations, create, update: updateAnnotation, remove } = useAnnotations({ bookId: book?.id })
  const bookmarks = useBookmarks(book?.id)
  const { saveProgress } = useLibraryEntry(book)

  const [panel, setPanel] = useState<CompanionTab | null>(null)
  const docked = useMediaQuery(WIDE)
  const togglePanel = (tab: CompanionTab) => setPanel((current) => (current === tab ? null : tab))
  const closePanel = useCallback(() => setPanel(null), [])
  /* when docked beside the page the companion stays open while the reader moves around */
  const afterNavigate = () => !docked && setPanel(null)
  const [hoverId, setHoverId] = useState<number | null>(null)
  const [flashId, setFlashId] = useState<number | null>(null)

  /* Fonts load lazily when chosen */
  useEffect(() => {
    loadFont(settings.fontAr)
    loadFont(settings.fontBn)
  }, [settings.fontAr, settings.fontBn])

  /* Prefetch neighbouring pages */
  useEffect(() => {
    if (page?.next_page) queryClient.prefetchQuery(pageQuery(slug, page.next_page))
    if (page?.prev_page) queryClient.prefetchQuery(pageQuery(slug, page.prev_page))
  }, [page, slug, queryClient])

  /* Jump to #s-{id} (sentence links, search results, TOC) and flash it */
  useEffect(() => {
    if (!page) return
    const match = location.hash.match(/^#?s-(\d+)$/)
    if (!match) {
      window.scrollTo({ top: 0 })
      return
    }
    const id = Number(match[1])
    const t = window.setTimeout(() => {
      document.querySelector(`[data-tt="book_sentence"][data-tid="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setFlashId(id)
    }, 80)
    const clear = window.setTimeout(() => setFlashId(null), 2600)
    return () => {
      window.clearTimeout(t)
      window.clearTimeout(clear)
    }
  }, [page, location.hash])

  /* Save reading progress automatically */
  useEffect(() => {
    if (!page || !book) return
    const first = book.first_page ?? 1
    const last = book.last_page ?? first
    const progress = last > first ? ((page.number - first) / (last - first)) * 100 : 100
    const hashId = location.hash.match(/s-(\d+)/)?.[1]
    const t = window.setTimeout(() => {
      saveProgress(page.number, hashId ? Number(hashId) : (page.sentences[0]?.id ?? null), Math.round(progress * 100) / 100).catch(() => {})
    }, 1200)
    return () => window.clearTimeout(t)
    // saveProgress identity changes with local state; only page changes should trigger a save
  }, [page?.number, book?.id])

  const goTo = useCallback((n: number | null | undefined) => n != null && navigate({ to: '/books/$slug/read/$page', params: { slug, page: String(n) } }), [navigate, slug])

  /* Arrow keys turn pages */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'ArrowRight') goTo(page?.next_page)
      if (e.key === 'ArrowLeft') goTo(page?.prev_page)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [page, goTo])

  const sentenceMap = useMemo(() => new Map(page?.sentences.map((s) => [s.id, s]) ?? []), [page])

  const highlightMap = useMemo(() => {
    const map = new Map<string, HighlightRange[]>()
    for (const a of annotations) {
      if (a.target_type !== 'book_sentence') continue
      const key = `${a.target_id}:${a.lang}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push({ id: a.id, start: a.start_offset, end: a.end_offset, color: a.color, hasNote: !!a.note })
    }
    return map
  }, [annotations])

  const plainFor = useCallback((t: TextTarget) => {
    const s = sentenceMap.get(t.id)
    return s ? (t.lang === 'ar' ? s.text_ar_plain : s.text_bn_plain) : undefined
  }, [sentenceMap])

  const source = book && page ? `${book.title_bn}, পৃষ্ঠা ${bnNum(page.number)}` : ''

  const actions = useTextActions({
    containerRef,
    plainFor,
    diacriticsHidden: !settings.diacritics,
    fontAr: settings.fontAr,
    fontBn: settings.fontBn,
    annotations: { create, update: updateAnnotation, remove },
    linkFor: (t) => `${window.location.origin}/books/${slug}/read/${pageNumber}#s-${t.id}`,
    quoteFor: (t, selected) => {
      const s = t ? sentenceMap.get(t.id) : undefined
      if (!s) {
        const isArabic = /[؀-ۿ]/.test(selected ?? '')
        return { ar: isArabic ? (selected ?? '') : '', bn: isArabic ? '' : (selected ?? ''), source }
      }
      return {
        ar: t?.lang === 'ar' && selected ? selected : s.text_ar_plain,
        bn: t?.lang === 'bn' && selected ? selected : s.text_bn_plain,
        source,
      }
    },
    onBookmark: async (t) => {
      if (!book) return
      await bookmarks.create({ book_id: book.id, page_number: pageNumber, sentence_id: t.id, label: (plainFor({ ...t, lang: 'bn' }) ?? '').slice(0, 60) || null }, book)
      toast.success('বাক্যটি বুকমার্ক করা হয়েছে')
    },
  })

  const annotationIndex = useMemo(() => new Map(annotations.map((a) => [String(a.id), a])), [annotations])

  const ctx: ReaderContextValue = {
    settings,
    hoverId,
    activeId: actions.activeId,
    flashId,
    setHoverId,
    onSentenceClick: (id: number, lang: Lang, el: HTMLElement) => actions.openForSentence({ type: 'book_sentence', id, lang }, el),
    onMarkClick: (annotation: Annotation, el: HTMLElement) => actions.openForMark(annotation, el),
    highlightsFor: (id, lang) => highlightMap.get(`${id}:${lang}`) ?? EMPTY,
    annotationById: (id) => annotationIndex.get(id),
    footnotes: page?.footnotes ?? { ar: [], bn: [] },
  }

  const pageBookmark = bookmarks.bookmarks.find((b) => b.page_number === pageNumber && !b.sentence_id)

  const togglePageBookmark = async () => {
    if (!book) return
    if (pageBookmark) {
      await bookmarks.remove(pageBookmark.id)
      toast('বুকমার্ক সরানো হয়েছে')
    } else {
      await bookmarks.create({ book_id: book.id, page_number: pageNumber, sentence_id: null, label: null }, book)
      toast.success(`পৃষ্ঠা ${bnNum(pageNumber)} বুকমার্ক করা হয়েছে`)
    }
  }

  const first = book?.first_page ?? 1
  const last = book?.last_page ?? first
  const progress = page && last > first ? Math.min(100, Math.max(0, ((page.number - first) / (last - first)) * 100)) : page ? 100 : 0

  return (
    <div
      data-reader-theme={settings.theme}
      className="relative isolate min-h-svh bg-[var(--desk)]"
      style={{ ['--font-ar' as string]: `'${arabicFamily(settings.fontAr)}'`, ['--font-bn' as string]: settings.fontBn === 'hind-siliguri' ? "'Bangla Digits', 'Hind Siliguri'" : `'${banglaFamily(settings.fontBn)}'` }}
    >
      <Desk />

      {/* Top bar */}
      <header className="sticky top-0 z-30">
        <div className="wood-panel relative overflow-hidden shadow-[0_2px_12px_oklch(0.15_0.03_50/0.4)]">
          <PatternTint className="opacity-[0.06]" />
          <div className="relative mx-auto flex h-14 max-w-[1400px] items-center gap-1 px-2 sm:gap-2 sm:px-4">
            <BarButton label="কিতাবের পাতায় ফিরুন" asChild>
              <Link to="/books/$slug" params={{ slug }}>
                <ArrowRight className="rotate-180" />
              </Link>
            </BarButton>
            <BarButton label="সূচিপত্র" active={panel === 'toc'} onClick={() => togglePanel('toc')}>
              <ListTree />
            </BarButton>
            <BarButton label="কিতাবে খুঁজুন" active={panel === 'search'} onClick={() => togglePanel('search')} className="max-sm:hidden">
              <Search />
            </BarButton>

            <div className="mx-1 flex min-w-0 flex-1 flex-col items-center text-center">
              <div className="flex max-w-full items-center gap-2">
                <StarMark className="size-3.5 shrink-0 text-gold max-sm:hidden" />
                <span className="truncate font-heading text-sm font-semibold text-wood-foreground sm:text-base">{book?.title_bn}</span>
                <StarMark className="size-3.5 shrink-0 text-gold max-sm:hidden" />
              </div>
              <div className="max-w-full truncate font-arabic text-xs text-gold/90">{book?.title_ar}</div>
            </div>

            <BarButton label={pageBookmark ? 'বুকমার্ক সরান' : 'এই পাতা বুকমার্ক করুন'} onClick={togglePageBookmark}>
              <Bookmark className={cn(pageBookmark && 'fill-gold text-gold')} />
            </BarButton>
            <BarButton label="বুকমার্ক ও নোট" active={panel === 'bookmarks' || panel === 'notes'} onClick={() => setPanel((p) => (p === 'bookmarks' || p === 'notes' ? null : 'bookmarks'))} className="max-sm:hidden">
              <NotebookPen />
            </BarButton>
            <BarButton label={settings.mode === 'book' ? 'বাক্য মোড' : 'কিতাব মোড'} onClick={() => update({ mode: settings.mode === 'book' ? 'sentence' : 'book' })} className="max-md:hidden">
              {settings.mode === 'book' ? <Rows3 /> : <BookOpen />}
            </BarButton>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="সেটিংস" className="text-wood-foreground hover:bg-white/10 hover:text-wood-foreground data-[state=open]:bg-white/15 data-[state=open]:text-gold">
                  <Settings2 />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80">
                <SettingsPanel settings={settings} update={update} />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="gold-rule opacity-70" />
        {/* how far through the book this page is */}
        <div className="h-0.5 bg-black/10" role="progressbar" aria-label="পড়ার অগ্রগতি" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-gold transition-[width] duration-500 ease-out" style={{ width: `${progress}%` }} />
        </div>
      </header>

      {/* Page — on wide screens it makes room for the docked companion */}
      <div className={cn('transition-[padding] duration-300 ease-out', panel && 'xl:ps-[404px]')}>
        <main ref={containerRef} className="@container relative px-2 py-6 sm:px-6 sm:py-10">
          <ReaderContext.Provider value={ctx}>
            {isLoading || !book ? (
              <div className="flex min-h-[70vh] items-center justify-center">
                <Spinner />
              </div>
            ) : isError || !page ? (
              <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-xl bg-[var(--page-bg)] p-10 text-center text-[var(--page-ink)] [box-shadow:var(--page-shadow)]">
                <StarMark className="size-10 text-gold" />
                <p className="text-lg font-semibold">এই পৃষ্ঠাটি পাওয়া যায়নি</p>
                <Button onClick={() => goTo(book.first_page ?? 1)}>প্রথম পৃষ্ঠায় যান</Button>
              </div>
            ) : settings.mode === 'book' ? (
              <BookView book={book} page={page} />
            ) : (
              <SentenceView book={book} page={page} />
            )}
          </ReaderContext.Provider>
        </main>

        {/* Page navigation */}
        {page && book && (
          <nav className="sticky bottom-0 z-20 pb-[env(safe-area-inset-bottom)]">
            <div className="wood-panel mx-auto mb-3 flex w-fit items-center gap-1 rounded-full border border-gold/30 p-1 shadow-[0_12px_30px_-10px_oklch(0.15_0.03_50/0.6)]">
              <Button variant="ghost" size="icon-lg" className="rounded-full text-wood-foreground hover:bg-white/10 hover:text-gold" disabled={!page.prev_page} onClick={() => goTo(page.prev_page)} aria-label="আগের পৃষ্ঠা">
                <ChevronLeft />
              </Button>
              <PageJump current={page.number} last={last} onGo={goTo} />
              <Button variant="ghost" size="icon-lg" className="rounded-full text-wood-foreground hover:bg-white/10 hover:text-gold" disabled={!page.next_page} onClick={() => goTo(page.next_page)} aria-label="পরের পৃষ্ঠা">
                <ChevronRight />
              </Button>
            </div>
          </nav>
        )}
      </div>

      {actions.element}

      <Companion tab={panel} onTab={setPanel} onClose={closePanel} counts={{ bookmarks: bookmarks.bookmarks.length, notes: annotations.length }}>
        {panel === 'toc' && book && (book.toc?.length ? <TocList slug={slug} entries={book.toc} currentPage={pageNumber} onNavigate={afterNavigate} /> : <EmptyState icon={ListTree} title="সূচিপত্র নেই" />)}
        {panel === 'search' && <SearchPanel slug={slug} onNavigate={afterNavigate} />}
        {panel === 'bookmarks' && book && (
          <BookmarksPanel
            book={book}
            pageNumber={pageNumber}
            bookmarks={bookmarks.bookmarks}
            onAddBookmark={(label) => bookmarks.create({ book_id: book.id, page_number: pageNumber, sentence_id: null, label }, book)}
            onRenameBookmark={bookmarks.update}
            onRemoveBookmark={bookmarks.remove}
            onNavigate={afterNavigate}
          />
        )}
        {panel === 'notes' && book && <HighlightsPanel book={book} annotations={annotations} onRemoveAnnotation={remove} onNavigate={afterNavigate} />}
      </Companion>
    </div>
  )
}

/** The surface the page rests on: the home hero's rosette pattern under a soft pool of light, darker toward the edges. */
function Desk() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      {/* stone-toned tile on the light themes, gold line version on the dark ones — as in the hero */}
      <div className="pattern-tile absolute inset-0 opacity-(--desk-tile-opacity)" />
      <div className="pattern-tint absolute inset-0 text-[var(--desk-pattern)] opacity-(--desk-pattern-opacity)" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_50%_at_50%_40%,var(--desk-glow)_15%,transparent_100%)] opacity-80" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,var(--desk-edge)_100%)]" />
    </div>
  )
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const media = window.matchMedia(query)
    const onChange = () => setMatches(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [query])
  return matches
}

const EMPTY: HighlightRange[] = []

function BarButton({ label, children, className, active, ...props }: { label: string; children: React.ReactNode; className?: string; active?: boolean; onClick?: () => void; asChild?: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={label}
          aria-pressed={active}
          className={cn('text-wood-foreground hover:bg-white/10 hover:text-wood-foreground', active && 'bg-white/15 text-gold hover:text-gold', className)}
          {...props}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function PageJump({ current, last, onGo }: { current: number; last: number; onGo: (n: number) => void }) {
  const [value, setValue] = useState(bnNum(current))
  useEffect(() => setValue(bnNum(current)), [current])

  return (
    <form
      className="flex items-center gap-1.5 px-2 text-sm"
      onSubmit={(e) => {
        e.preventDefault()
        const n = Number(value.replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d))))
        if (n) onGo(n)
      }}
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        inputMode="numeric"
        aria-label="পৃষ্ঠা নম্বর"
        className="h-8 w-12 rounded-md border border-white/15 bg-black/20 text-center text-wood-foreground tabular-nums outline-none focus:border-gold"
      />
      <span className="text-wood-foreground/70">/ {bnNum(last)}</span>
    </form>
  )
}
