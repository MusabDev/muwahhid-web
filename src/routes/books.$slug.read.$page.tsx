import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useLocation, useNavigate } from '@tanstack/react-router'
import { ArrowRight, Bookmark, BookOpen, ChevronLeft, ChevronRight, ListTree, NotebookPen, Rows3, Search, Settings2, Type } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { StarMark } from '@/components/brand'
import type { HighlightRange } from '@/components/markdown'
import { BookView } from '@/components/reader/book-view'
import { Companion, type CompanionTab } from '@/components/reader/companion'
import { HighlightsPanel } from '@/components/reader/notes-panel'
import { ReaderContext, type ReaderContextValue } from '@/components/reader/reader-context'
import { SearchPanel } from '@/components/reader/search-panel'
import { SentenceView } from '@/components/reader/sentence-view'
import { clampFontSize, Kbd, LEADING, SettingsPanel } from '@/components/reader/settings-panel'
import { PatternTint } from '@/components/pattern'
import { EmptyState, Spinner } from '@/components/states'
import { useTextActions } from '@/components/text-actions'
import { TocList } from '@/components/toc-list'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { loadFont, readerFontVars } from '@/lib/fonts'
import { bookQuery, pageQuery } from '@/lib/queries'
import type { TextTarget } from '@/lib/selection'
import { bnNum } from '@/lib/text'
import { pageTitle } from '@/lib/head'
import type { Annotation } from '@/lib/types'
import { groupAnnotations, useAnnotations, useBookmarks, useLibraryEntry, useReaderSettings } from '@/lib/user-data'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/books/$slug/read/$page')({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(bookQuery(params.slug)),
  head: ({ loaderData, params }) => pageTitle(loaderData && `${loaderData.title_bn} · পৃষ্ঠা ${bnNum(params.page)}`),
  component: Reader,
})

const WIDE = '(min-width: 1280px)'
/* below this the top bar slims down and the bottom dock carries the controls */
const ROOMY = '(min-width: 640px)'

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
  const [settingsOpen, setSettingsOpen] = useState(false)
  const docked = useMediaQuery(WIDE)
  const roomy = useMediaQuery(ROOMY)
  const chromeHidden = useAutoHide(!panel && !settingsOpen)
  const togglePanel = (tab: CompanionTab) => setPanel((current) => (current === tab ? null : tab))
  const closePanel = useCallback(() => setPanel(null), [])
  /* when docked beside the page the companion stays open while the reader moves around */
  const afterNavigate = () => !docked && setPanel(null)
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

  /* Keyboard: arrows turn pages, single letters open the reader's tools */
  const keyActions = useRef<Record<string, () => void>>({})
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return
      const target = e.target as HTMLElement | null
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target?.isContentEditable) return
      /* sliders, menus and dialogs use arrows and letters themselves */
      if (target?.closest('[role=slider], [role=listbox], [role=menu], [role=dialog], [data-radix-popper-content-wrapper]')) return
      const action = keyActions.current[e.key.length === 1 ? e.key.toLowerCase() : e.key]
      if (!action) return
      e.preventDefault()
      action()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  /* Swipe sideways on touch screens to turn pages */
  const touch = useRef<{ x: number; y: number; t: number } | null>(null)
  const onTouchStart = (e: React.TouchEvent) => {
    touch.current = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() } : null
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touch.current
    touch.current = null
    if (!start || !page) return
    const dx = e.changedTouches[0].clientX - start.x
    const dy = e.changedTouches[0].clientY - start.y
    if (Math.abs(dx) < 70 || Math.abs(dy) > Math.abs(dx) * 0.5 || Date.now() - start.t > 600) return
    if (window.getSelection()?.toString()) return
    goTo(dx < 0 ? page.next_page : page.prev_page)
  }

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
    /* everything selected here is on this page */
    annotations: { list: annotations, create: (parts, replaces) => create(parts.map((part) => ({ ...part, page_number: pageNumber })), replaces), update: updateAnnotation, remove },
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

  /* phones have room for one language only: "both" shows the Bangla */
  const readerSettings = !roomy && settings.showArabic && settings.showBangla ? { ...settings, showArabic: false } : settings

  const ctx: ReaderContextValue = {
    settings: readerSettings,
    flashId,
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

  const languages = settings.showArabic && settings.showBangla ? 'both' : settings.showArabic ? 'ar' : 'bn'
  useEffect(() => {
    keyActions.current = {
      ArrowRight: () => goTo(page?.next_page),
      ArrowLeft: () => goTo(page?.prev_page),
      t: () => togglePanel('toc'),
      '/': () => setPanel('search'),
      n: () => togglePanel('notes'),
      b: () => void togglePageBookmark(),
      m: () => update({ mode: settings.mode === 'book' ? 'sentence' : 'book' }),
      /* both → Arabic only → Bangla only → both */
      l: () => update(languages === 'both' ? { showArabic: true, showBangla: false } : languages === 'ar' ? { showArabic: false, showBangla: true } : { showArabic: true, showBangla: true }),
      s: () => setSettingsOpen((o) => !o),
      '+': () => update({ fontSize: clampFontSize(settings.fontSize + 1) }),
      '=': () => update({ fontSize: clampFontSize(settings.fontSize + 1) }),
      '-': () => update({ fontSize: clampFontSize(settings.fontSize - 1) }),
    }
  })

  const first = book?.first_page ?? 1
  const last = book?.last_page ?? first
  const progress = page && last > first ? Math.min(100, Math.max(0, ((page.number - first) / (last - first)) * 100)) : page ? 100 : 0

  return (
    <div
      data-reader-theme={settings.theme}
      className="relative isolate min-h-svh bg-[var(--desk)]"
      style={{ ...readerFontVars(settings.fontAr, settings.fontBn), ['--reader-leading' as string]: LEADING[settings.leading] }}
    >
      <Desk />

      {/* Top bar */}
      <header className={cn('sticky top-0 z-30 transition-transform duration-300 ease-out', chromeHidden && '-translate-y-full')}>
        <div className="wood-panel relative overflow-hidden shadow-[0_2px_12px_oklch(0.15_0.03_50/0.4)]">
          <PatternTint className="opacity-[0.06]" />
          <div className="relative mx-auto flex h-14 max-w-[1400px] items-center gap-1 px-2 sm:gap-2 sm:px-4">
            <BarButton label="কিতাবের পাতায় ফিরুন" asChild>
              <Link to="/books/$slug" params={{ slug }}>
                <ArrowRight className="rotate-180" />
              </Link>
            </BarButton>
            <BarButton label="সূচিপত্র" shortcut="T" active={panel === 'toc'} onClick={() => togglePanel('toc')} className="max-sm:hidden">
              <ListTree />
            </BarButton>
            <BarButton label="কিতাবে সার্চ করুন" shortcut="/" active={panel === 'search'} onClick={() => togglePanel('search')} className="max-sm:hidden">
              <Search />
            </BarButton>

            <div className="mx-1 flex min-w-0 flex-1 flex-col items-center text-center">
              <span className="max-w-full truncate font-heading text-sm font-semibold text-wood-foreground sm:text-base">
                {book?.title_bn}
                {book?.title_ar && (
                  <span className="font-arabic font-normal text-wood-foreground/75">
                    {' '}(<bdi>{book.title_ar}</bdi>)
                  </span>
                )}
              </span>
              {book?.author?.name_bn && <span className="max-w-full truncate text-xs text-gold/90">{book.author.name_bn}</span>}
            </div>

            <BarButton label={pageBookmark ? 'বুকমার্ক সরান' : 'এই পাতা বুকমার্ক করুন'} shortcut="B" active={!!pageBookmark} onClick={togglePageBookmark}>
              <Bookmark className={cn(pageBookmark && 'fill-gold text-gold')} />
            </BarButton>
            <BarButton label="হাইলাইট ও নোট" shortcut="N" active={panel === 'notes'} onClick={() => togglePanel('notes')} className="max-sm:hidden">
              <NotebookPen />
            </BarButton>
            <BarButton label={settings.mode === 'book' ? 'বাক্য মোড' : 'কিতাব মোড'} shortcut="M" onClick={() => update({ mode: settings.mode === 'book' ? 'sentence' : 'book' })} className="max-md:hidden">
              {settings.mode === 'book' ? <Rows3 /> : <BookOpen />}
            </BarButton>
            <Popover open={settingsOpen && roomy} onOpenChange={setSettingsOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="পড়ার সেটিংস" className="text-wood-foreground hover:bg-white/10 hover:text-wood-foreground data-[state=open]:bg-white/15 data-[state=open]:text-gold max-sm:hidden">
                      <Settings2 />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  পড়ার সেটিংস <Kbd>S</Kbd>
                </TooltipContent>
              </Tooltip>
              <PopoverContent align="end" className="max-h-[calc(100svh-5rem)] w-80 overflow-y-auto scrollbar-thin">
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
        <main ref={containerRef} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className="@container relative sm:px-6 sm:py-10">
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
          <nav
            aria-label="পৃষ্ঠা ও নিয়ন্ত্রণ"
            className={cn('sticky bottom-0 z-20 flex items-center justify-center gap-2 px-2 pt-2 pb-[calc(1.25rem+env(safe-area-inset-bottom))] transition-transform duration-300 ease-out sm:pb-6', chromeHidden && 'translate-y-[150%]')}
          >
            <div className={DOCK}>
              {/* on phones the dock carries the tools the slim top bar leaves out, within thumb reach */}
              <DockButton label="সূচি, সার্চ ও নোট" active={!!panel} onClick={() => setPanel((p) => (p ? null : 'toc'))} className="sm:hidden">
                <ListTree />
              </DockButton>
              <span aria-hidden className="h-6 w-px bg-white/15 sm:hidden" />
              <DockButton label="আগের পৃষ্ঠা" disabled={!page.prev_page} onClick={() => goTo(page.prev_page)}>
                <ChevronLeft />
              </DockButton>
              <PageJump current={page.number} last={last} onGo={goTo} />
              <DockButton label="পরের পৃষ্ঠা" disabled={!page.next_page} onClick={() => goTo(page.next_page)}>
                <ChevronRight />
              </DockButton>
              <span aria-hidden className="h-6 w-px bg-white/15 sm:hidden" />
              <DockButton label="পড়ার সেটিংস" active={settingsOpen} onClick={() => setSettingsOpen(true)} className="sm:hidden">
                <Type />
              </DockButton>
            </div>
          </nav>
        )}
      </div>

      {actions.element}

      {/* phones get settings as a bottom sheet instead of the top bar popover */}
      <Sheet open={settingsOpen && !roomy} onOpenChange={setSettingsOpen}>
        <SheetContent side="bottom" className="max-h-[85svh] gap-0 overflow-y-auto rounded-t-2xl pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div aria-hidden className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border" />
          <SheetHeader className="pb-2">
            <SheetTitle>পড়ার সেটিংস</SheetTitle>
          </SheetHeader>
          <div className="px-4">
            <SettingsPanel settings={settings} update={update} allowBoth={false} />
          </div>
        </SheetContent>
      </Sheet>

      <Companion tab={panel} onTab={setPanel} onClose={closePanel} counts={{ notes: groupAnnotations(annotations).length }}>
        {panel === 'toc' && book && (book.toc?.length ? <TocList slug={slug} entries={book.toc} currentPage={pageNumber} onNavigate={afterNavigate} /> : <EmptyState icon={ListTree} title="সূচিপত্র নেই" />)}
        {panel === 'search' && <SearchPanel slug={slug} onNavigate={afterNavigate} />}
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

/** Slides the reader's bars away while reading down the page; scrolling up, or reaching the top or end, brings them back. */
function useAutoHide(enabled: boolean) {
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    if (!enabled) return
    let last = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      const nearEnd = window.innerHeight + y >= document.documentElement.scrollHeight - 48
      if (y < 80 || nearEnd) setHidden(false)
      else if (y > last + 10) setHidden(true)
      else if (y < last - 10) setHidden(false)
      if (Math.abs(y - last) > 10) last = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      setHidden(false)
    }
  }, [enabled])
  return enabled && hidden
}

const EMPTY: HighlightRange[] = []

const DOCK = 'wood-panel flex w-fit items-center gap-1 rounded-full border border-gold/30 p-1 shadow-[0_12px_30px_-10px_oklch(0.15_0.03_50/0.6)]'

function DockButton({ label, shortcut, children, className, active, ...props }: React.ComponentProps<typeof Button> & { label: string; shortcut?: string; active?: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label={label}
          aria-pressed={active}
          className={cn('rounded-full text-wood-foreground hover:bg-white/10 hover:text-gold', active && 'bg-white/15 text-gold', className)}
          {...props}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {label}
        {shortcut && <Kbd>{shortcut}</Kbd>}
      </TooltipContent>
    </Tooltip>
  )
}

function BarButton({ label, shortcut, children, className, active, ...props }: { label: string; shortcut?: string; children: React.ReactNode; className?: string; active?: boolean; onClick?: () => void; asChild?: boolean }) {
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
      <TooltipContent>
        {label}
        {shortcut && <Kbd>{shortcut}</Kbd>}
      </TooltipContent>
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
