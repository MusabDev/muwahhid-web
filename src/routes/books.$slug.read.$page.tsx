import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useLocation, useNavigate } from '@tanstack/react-router'
import { ArrowRight, Bookmark, BookOpen, ChevronLeft, ChevronRight, Maximize, Minimize, Rows3, Search, Settings2, Type } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Wordmark } from '@/components/brand'
import type { HighlightRange } from '@/components/markdown'
import { groupBlocks } from '@/components/reader/blocks'
import { BookView } from '@/components/reader/book-view'
import { ReaderContext, type ReaderContextValue } from '@/components/reader/reader-context'
import { SearchPanel } from '@/components/reader/search-panel'
import { SentenceView } from '@/components/reader/sentence-view'
import { clampFontSize, Kbd, LEADING, SettingsPanel } from '@/components/reader/settings-panel'
import { PatternTint } from '@/components/pattern'
import { Spinner } from '@/components/states'
import { useTextActions } from '@/components/text-actions'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { loadFont, readerFontVars } from '@/lib/fonts'
import { bookQuery, orNotFound, pageQuery } from '@/lib/queries'
import { bookId, breadcrumbLd, seo } from '@/lib/seo'
import { absoluteUrl } from '@/lib/site'
import type { TextTarget } from '@/lib/selection'
import { arNum, bnNum } from '@/lib/text'
import type { Annotation, Book, TocEntry } from '@/lib/types'
import { annotationGroup, useAnnotations, useBookmarks, useLibraryEntry, useReaderSettings } from '@/lib/user-data'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/books/$slug/read/$page')({
  loader: async ({ context: { queryClient }, params }) => {
    // the page text is fetched here, not only in the component, so it is in the server-rendered HTML
    const [book, page] = await Promise.all([
      orNotFound(queryClient.ensureQueryData(bookQuery(params.slug))),
      orNotFound(queryClient.ensureQueryData(pageQuery(params.slug, Number(params.page) || 1))),
    ])
    return { book, page }
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {}
    const { book, page } = loaderData
    const path = `/books/${book.slug}/read/${page.number}`
    const chapter = chapterAt(book, page.number)
    const pageLabel = `পৃষ্ঠা ${bnNum(page.number)}`
    const text = page.sentences.map((s) => s.text_bn_plain).join(' ')
    return seo({
      title: [book.title_bn, chapter?.title_bn, pageLabel].filter(Boolean).join(' — '),
      description: text || `${book.title_bn} (${book.title_ar}), ${pageLabel}: আরবি মূলপাঠ ও বাংলা অনুবাদ।`,
      path,
      type: 'article',
      prev: page.prev_page ? `/books/${book.slug}/read/${page.prev_page}` : null,
      next: page.next_page ? `/books/${book.slug}/read/${page.next_page}` : null,
      jsonLd: [
        {
          '@type': 'WebPage',
          '@id': absoluteUrl(path),
          url: absoluteUrl(path),
          name: `${book.title_bn} — ${pageLabel}`,
          inLanguage: ['ar', 'bn'],
          isPartOf: { '@type': 'Book', '@id': bookId(book.slug), name: book.title_bn, url: absoluteUrl(`/books/${book.slug}`) },
          ...(chapter ? { about: { '@type': 'Chapter', name: chapter.title_bn, alternateName: chapter.title_ar } } : {}),
          ...(book.updated_at ? { dateModified: book.updated_at } : {}),
        },
        breadcrumbLd([
          ['লাইব্রেরি', '/library'],
          [book.title_bn, `/books/${book.slug}`],
          ...(chapter ? [[chapter.title_bn, `/books/${book.slug}/read/${chapter.page_number}`] as [string, string]] : []),
          [pageLabel, path],
        ]),
      ],
    })
  },
  component: Reader,
})

/** The deepest table-of-contents entry that starts on or before this page. */
function chapterAt(book: Book, pageNumber: number) {
  let found: TocEntry | undefined
  const walk = (entries: TocEntry[] = []) => {
    for (const entry of entries) {
      if (entry.page_number > pageNumber) return
      found = entry
      walk(entry.children)
    }
  }
  walk(book.toc)
  return found
}

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
  const { annotations, create, update: updateAnnotation, remove: removeAnnotation } = useAnnotations({ bookId: book?.id })
  const bookmarks = useBookmarks(book?.id)

  /* a bookmarked sentence and its highlight are one thing: removing the highlight drops its bookmark too */
  const remove = async (id: Annotation['id']) => {
    const annotation = annotations.find((a) => a.id === id)
    const parts = annotation ? annotationGroup(annotations, annotation) : []
    const sentenceIds = new Set(parts.filter((a) => a.target_type === 'book_sentence').map((a) => a.target_id))
    await removeAnnotation(id)
    await Promise.all(bookmarks.bookmarks.filter((b) => b.sentence_id && sentenceIds.has(b.sentence_id)).map((b) => bookmarks.remove(b.id)))
  }
  const { saveProgress } = useLibraryEntry(book)

  const [searchOpen, setSearchOpen] = useState(false)
  /* kept here so a search survives closing it to read a result */
  const [searchInput, setSearchInput] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const roomy = useMediaQuery(ROOMY)
  const chromeHidden = useAutoHide(!searchOpen && !settingsOpen)
  /* reading with nothing but the page: the bars drop away and the page fills the window; remembered like any other setting */
  const fullscreen = { on: settings.fullscreen, exit: () => update({ fullscreen: false }), toggle: () => update({ fullscreen: !settings.fullscreen }) }
  const exitVisible = useWakeOnActivity(fullscreen.on)
  const closeSearch = useCallback(() => setSearchOpen(false), [])
  /* Escape clears the box first, and only closes search once it is empty */
  const onSearchEscape = (e: KeyboardEvent) => {
    if (!searchInput) return
    e.preventDefault()
    setSearchInput('')
  }
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
  const { ref: swipeRef, handlers: swipeHandlers } = usePageSwipe({ prev: page?.prev_page, next: page?.next_page, onTurn: goTo, pageKey: page?.number })

  const sentenceMap = useMemo(() => new Map(page?.sentences.map((s) => [s.id, s]) ?? []), [page])
  /* sentences that open a new paragraph, heading or list item, as the reader lays them out */
  const blockStarts = useMemo(() => new Set(groupBlocks(page?.sentences ?? []).map((b) => b.sentences[0].id)), [page])

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

  const actions = useTextActions({
    containerRef,
    plainFor,
    diacriticsHidden: !settings.diacritics,
    fontAr: settings.fontAr,
    fontBn: settings.fontBn,
    /* everything selected here is on this page */
    annotations: { list: annotations, create: (parts, replaces) => create(parts.map((part) => ({ ...part, page_number: pageNumber })), replaces), update: updateAnnotation, remove },
    startsBlock: (t) => blockStarts.has(t.id),
    linkFor: (t) => `${window.location.origin}/books/${slug}/read/${pageNumber}#s-${t.id}`,
    sourceFor: (lang) => {
      /* a sharh is quoted under its explainer, whose words fill its pages */
      const by = book?.explainer ?? book?.author
      return lang === 'ar'
        ? { title: book?.title_ar ?? '', author: by?.name_ar, meta: `ص ${arNum(pageNumber)}` }
        : { title: book?.title_bn ?? '', author: by?.name_bn, meta: `পৃষ্ঠা ${bnNum(pageNumber)}` }
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
    onSentenceClick: actions.openForSentence,
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
      '/': () => setSearchOpen(true),
      b: () => void togglePageBookmark(),
      m: () => update({ mode: settings.mode === 'book' ? 'sentence' : 'book' }),
      /* both → Arabic only → Bangla only → both */
      l: () => update(languages === 'both' ? { showArabic: true, showBangla: false } : languages === 'ar' ? { showArabic: false, showBangla: true } : { showArabic: true, showBangla: true }),
      s: () => setSettingsOpen((o) => !o),
      f: fullscreen.toggle,
      ...(fullscreen.on && { Escape: fullscreen.exit }),
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
      className="relative isolate min-h-svh overflow-x-clip bg-[var(--desk)]"
      style={{
        ...readerFontVars(settings.fontAr, settings.fontBn),
        ['--reader-leading' as string]: LEADING[settings.leading],
        /* fullscreen: the page runs to every edge, so the desk takes the page's colour and the sheet loses its shadow */
        ...(fullscreen.on && { ['--desk' as string]: 'var(--page-bg)', ['--page-shadow' as string]: 'none' }),
      }}
    >
      {!fullscreen.on && <Desk />}

      {fullscreen.on && (
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label="ফুলস্ক্রিন থেকে বের হন"
          onClick={fullscreen.exit}
          className={cn(
            'fixed top-[calc(0.75rem+env(safe-area-inset-top))] right-3 z-40 rounded-full bg-[var(--page-ink)]/10 text-[var(--page-ink)] backdrop-blur-sm transition-opacity duration-500 hover:bg-[var(--page-ink)]/15 hover:text-[var(--page-ink)]',
            !exitVisible && 'pointer-events-none opacity-0',
          )}
        >
          <Minimize />
        </Button>
      )}

      {/* Top bar */}
      {!fullscreen.on && (
        <header className={cn('sticky top-0 z-30 transition-transform duration-300 ease-out', chromeHidden && '-translate-y-full')}>
          <div className="wood-panel relative overflow-hidden shadow-[0_2px_12px_oklch(0.15_0.03_50/0.4)]">
            <PatternTint className="opacity-[0.06]" />
            <div className="relative mx-auto flex h-14 max-w-[1400px] items-center gap-1 px-2 sm:gap-2 sm:px-4">
              <BarButton label="কিতাবের পাতায় ফিরুন" asChild>
                <Link to="/books/$slug" params={{ slug }}>
                  <ArrowRight className="rotate-180" />
                </Link>
              </BarButton>
              <Popover open={searchOpen && roomy} onOpenChange={setSearchOpen}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="কিতাবে সার্চ করুন" className="text-wood-foreground hover:bg-white/10 hover:text-wood-foreground data-[state=open]:bg-white/15 data-[state=open]:text-gold max-sm:hidden">
                        <Search />
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    কিতাবে সার্চ করুন <Kbd>/</Kbd>
                  </TooltipContent>
                </Tooltip>
                <PopoverContent
                  align="start"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                  onEscapeKeyDown={onSearchEscape}
                  className="max-h-[min(calc(100svh-5rem),40rem)] w-[26rem] max-w-[calc(100vw-2rem)] overflow-y-auto overscroll-contain bg-card p-3 scrollbar-thin"
                >
                  <SearchPanel slug={slug} input={searchInput} onInput={setSearchInput} onNavigate={closeSearch} />
                </PopoverContent>
              </Popover>
  
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
              <BarButton label="ফুলস্ক্রিন" shortcut="F" onClick={fullscreen.toggle}>
                <Maximize />
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
      )}

      <div>
        <main ref={containerRef} {...swipeHandlers} className={cn('@container relative [touch-action:pan-y_pinch-zoom]', fullscreen.on ? 'pb-28' : 'sm:px-6 sm:py-10')}>
          {book && (
            <h1 className="sr-only">
              {book.title_bn} ({book.title_ar}) — পৃষ্ঠা {bnNum(pageNumber)}
            </h1>
          )}
          <div ref={swipeRef}>
            <ReaderContext.Provider value={ctx}>
              {isLoading || !book ? (
                <div className="flex min-h-[70vh] items-center justify-center">
                  <Spinner />
                </div>
              ) : isError || !page ? (
                <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-xl bg-[var(--page-bg)] p-10 text-center text-[var(--page-ink)] [box-shadow:var(--page-shadow)]">
                  <Wordmark className="h-12 text-gold" />
                  <p className="text-lg font-semibold">এই পৃষ্ঠাটি পাওয়া যায়নি</p>
                  <Button onClick={() => goTo(book.first_page ?? 1)}>প্রথম পৃষ্ঠায় যান</Button>
                </div>
              ) : settings.mode === 'book' ? (
                <BookView book={book} page={page} />
              ) : (
                <SentenceView book={book} page={page} />
              )}
            </ReaderContext.Provider>
          </div>
        </main>

        {/* Page navigation */}
        {page && book && (
          <nav
            aria-label="পৃষ্ঠা ও নিয়ন্ত্রণ"
            className={cn(
              'bottom-0 z-20 flex items-center justify-center gap-2 px-2 pt-2 pb-[calc(1.25rem+env(safe-area-inset-bottom))] transition-transform duration-300 ease-out sm:pb-6',
              /* fullscreen: pinned to the bottom of the screen and always there */
              fullscreen.on ? 'pointer-events-none fixed inset-x-0 *:pointer-events-auto' : cn('sticky', chromeHidden && 'translate-y-[150%]'),
            )}
          >
            <div className={DOCK}>
              {/* on phones the dock carries the tools the slim top bar leaves out, within thumb reach; fullscreen keeps only the page controls */}
              {!fullscreen.on && (
                <>
                  <DockButton label="কিতাবে সার্চ করুন" active={searchOpen} onClick={() => setSearchOpen(true)} className="sm:hidden">
                    <Search />
                  </DockButton>
                  <span aria-hidden className="h-6 w-px bg-white/15 sm:hidden" />
                </>
              )}
              <PageTurn slug={slug} page={page.prev_page} label="আগের পৃষ্ঠা" rel="prev">
                <ChevronLeft />
              </PageTurn>
              <PageJump current={page.number} last={last} onGo={goTo} />
              <PageTurn slug={slug} page={page.next_page} label="পরের পৃষ্ঠা" rel="next">
                <ChevronRight />
              </PageTurn>
              {!fullscreen.on && (
                <>
                  <span aria-hidden className="h-6 w-px bg-white/15 sm:hidden" />
                  <DockButton label="পড়ার সেটিংস" active={settingsOpen} onClick={() => setSettingsOpen(true)} className="sm:hidden">
                    <Type />
                  </DockButton>
                </>
              )}
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

      {/* phones get search as a bottom sheet instead of the top bar popover */}
      <Sheet open={searchOpen && !roomy} onOpenChange={setSearchOpen}>
        <SheetContent
          side="bottom"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onEscapeKeyDown={onSearchEscape}
          className="h-[85svh] gap-0 rounded-t-2xl bg-card"
        >
          <div aria-hidden className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border" />
          <SheetHeader className="pb-1">
            <SheetTitle>কিতাবে সার্চ করুন</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] scrollbar-thin">
            <SearchPanel slug={slug} input={searchInput} onInput={setSearchInput} onNavigate={closeSearch} />
          </div>
        </SheetContent>
      </Sheet>
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

/** Starts true (the wide layout, with both languages in the HTML) on the server and first render, then follows the window. */
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(true)
  useEffect(() => {
    const media = window.matchMedia(query)
    const onChange = () => setMatches(media.matches)
    onChange()
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

/** True for a moment after the pointer moves or the screen is touched, so a control can show itself and then get out of the way. */
function useWakeOnActivity(enabled: boolean, ms = 2500) {
  const [awake, setAwake] = useState(true)
  useEffect(() => {
    if (!enabled) return
    let t = 0
    const wake = () => {
      setAwake(true)
      window.clearTimeout(t)
      t = window.setTimeout(() => setAwake(false), ms)
    }
    wake()
    const events = ['pointermove', 'touchstart', 'keydown'] as const
    events.forEach((e) => window.addEventListener(e, wake, { passive: true }))
    return () => {
      window.clearTimeout(t)
      events.forEach((e) => window.removeEventListener(e, wake))
    }
  }, [enabled, ms])
  return awake
}

const TURN_MS = 200

/**
 * Lets a sideways drag carry the page with the finger, like turning a leaf: past a quarter of the width (or a quick flick)
 * it slides off and the neighbour slides in from the side the finger came from; short of that it springs back.
 * Styles are written straight to the element so dragging never re-renders the page.
 */
function usePageSwipe({ prev, next, onTurn, pageKey }: { prev?: number | null; next?: number | null; onTurn: (n: number) => void; pageKey?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; t: number; width: number; axis: 'x' | 'y' | null; dx: number } | null>(null)
  /* the side the incoming page enters from: 1 is the right */
  const entering = useRef<1 | -1 | null>(null)
  const turning = useRef(false)

  const style = (transform = '', transition = '', opacity = '') => {
    const el = ref.current
    if (!el) return
    el.style.transform = transform
    el.style.transition = transition
    el.style.opacity = opacity
  }
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

  /* slide the new page in once it has rendered */
  useLayoutEffect(() => {
    turning.current = false
    const from = entering.current
    if (!from) return
    entering.current = null
    style(`translateX(${from * 30}%)`, '', '0')
    ref.current?.getBoundingClientRect()
    let clear = 0
    const frame = requestAnimationFrame(() => {
      style('translateX(0)', `transform ${TURN_MS + 20}ms ease-out, opacity ${TURN_MS + 20}ms ease-out`, '1')
      /* a lingering transform would trap fixed-position children */
      clear = window.setTimeout(() => style(), TURN_MS + 40)
    })
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(clear)
    }
  }, [pageKey])

  const end = () => {
    const d = drag.current
    drag.current = null
    if (!d || d.axis !== 'x') return
    const target = d.dx < 0 ? next : prev
    const flick = Math.abs(d.dx) > 50 && Math.abs(d.dx) / (Date.now() - d.t) > 0.4
    if (!target || (Math.abs(d.dx) < d.width * 0.25 && !flick)) {
      style('translateX(0)', `transform ${TURN_MS}ms ease-out`)
      window.setTimeout(() => !drag.current && !turning.current && style(), TURN_MS + 20)
      return
    }
    if (reducedMotion()) return onTurn(target)
    turning.current = true
    entering.current = d.dx < 0 ? 1 : -1
    style(`translateX(${d.dx < 0 ? -100 : 100}%)`, `transform ${TURN_MS}ms ease-in`)
    window.setTimeout(() => onTurn(target), TURN_MS)
  }

  const handlers = {
    onTouchStart: (e: React.TouchEvent) => {
      if (turning.current) return
      const t = e.touches[0]
      drag.current = e.touches.length === 1 ? { x: t.clientX, y: t.clientY, t: Date.now(), width: ref.current?.offsetWidth || window.innerWidth, axis: null, dx: 0 } : null
    },
    onTouchMove: (e: React.TouchEvent) => {
      const d = drag.current
      if (!d) return
      if (e.touches.length !== 1) {
        d.dx = 0
        return end()
      }
      const dx = e.touches[0].clientX - d.x
      const dy = e.touches[0].clientY - d.y
      if (!d.axis) {
        if (Math.hypot(dx, dy) < 10) return
        d.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
        /* scrolling, or extending a text selection */
        if (d.axis === 'y' || window.getSelection()?.toString()) {
          drag.current = null
          return
        }
      }
      d.dx = dx
      if (reducedMotion()) return
      /* no page that way: the edge gives a little and springs back */
      style(`translateX(${(dx < 0 ? next : prev) ? dx : dx * 0.25}px)`)
    },
    onTouchEnd: end,
    onTouchCancel: () => {
      if (drag.current) drag.current.dx = 0
      end()
    },
  }

  return { ref, handlers }
}

const EMPTY: HighlightRange[] = []

const DOCK = 'wood-panel flex w-fit items-center gap-1 rounded-full border border-gold/30 p-1 shadow-[0_12px_30px_-10px_oklch(0.15_0.03_50/0.6)]'

/** Previous/next page as a real link, so crawlers can walk the book page by page. */
function PageTurn({ slug, page, label, rel, children }: { slug: string; page: number | null; label: string; rel: 'prev' | 'next'; children: React.ReactNode }) {
  if (!page) {
    return (
      <DockButton label={label} disabled>
        {children}
      </DockButton>
    )
  }
  return (
    <DockButton label={label} asChild>
      <Link to="/books/$slug/read/$page" params={{ slug, page: String(page) }} rel={rel}>
        {children}
      </Link>
    </DockButton>
  )
}

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
