import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useLocation, useNavigate } from '@tanstack/react-router'
import { ArrowRight, Bookmark, BookOpen, ChevronLeft, ChevronRight, ListTree, NotebookPen, Rows3, Search, Settings2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { StarMark } from '@/components/brand'
import type { HighlightRange } from '@/components/markdown'
import { BookView } from '@/components/reader/book-view'
import { NotesPanel } from '@/components/reader/notes-panel'
import { ReaderContext, type ReaderContextValue } from '@/components/reader/reader-context'
import { SearchPanel } from '@/components/reader/search-panel'
import { SentenceView } from '@/components/reader/sentence-view'
import { SettingsPanel } from '@/components/reader/settings-panel'
import { Spinner } from '@/components/states'
import { useTextActions } from '@/components/text-actions'
import { TocList } from '@/components/toc-list'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
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

type Panel = 'toc' | 'search' | 'notes' | null

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

  const [panel, setPanel] = useState<Panel>(null)
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

  return (
    <div
      data-reader-theme={settings.theme}
      className="min-h-svh bg-[var(--desk)]"
      style={{ ['--font-ar' as string]: `'${arabicFamily(settings.fontAr)}'`, ['--font-bn' as string]: settings.fontBn === 'hind-siliguri' ? "'Bangla Digits', 'Hind Siliguri'" : `'${banglaFamily(settings.fontBn)}'` }}
    >
      {settings.theme === 'paper' || settings.theme === 'sepia' ? <div className="wood-panel pointer-events-none fixed inset-0 opacity-100" /> : null}

      {/* Top bar */}
      <header className="sticky top-0 z-30">
        <div className="wood-panel border-b border-black/20 shadow-lg">
          <div className="mx-auto flex h-14 max-w-[1240px] items-center gap-1 px-2 sm:gap-2 sm:px-4">
            <BarButton label="কিতাবের পাতায় ফিরুন" asChild>
              <Link to="/books/$slug" params={{ slug }}>
                <ArrowRight className="rotate-180" />
              </Link>
            </BarButton>
            <BarButton label="সূচিপত্র" onClick={() => setPanel('toc')}>
              <ListTree />
            </BarButton>

            <div className="mx-1 min-w-0 flex-1 text-center">
              <div className="truncate font-heading text-sm font-semibold text-wood-foreground sm:text-base">{book?.title_bn}</div>
              <div className="truncate font-arabic text-xs text-gold/90">{book?.title_ar}</div>
            </div>

            <BarButton label="কিতাবে খুঁজুন" onClick={() => setPanel('search')}>
              <Search />
            </BarButton>
            <BarButton label={pageBookmark ? 'বুকমার্ক সরান' : 'এই পাতা বুকমার্ক করুন'} onClick={togglePageBookmark} className="max-sm:hidden">
              <Bookmark className={cn(pageBookmark && 'fill-gold text-gold')} />
            </BarButton>
            <BarButton label="বুকমার্ক ও নোট" onClick={() => setPanel('notes')}>
              <NotebookPen />
            </BarButton>
            <BarButton label={settings.mode === 'book' ? 'বাক্য মোড' : 'কিতাব মোড'} onClick={() => update({ mode: settings.mode === 'book' ? 'sentence' : 'book' })} className="max-sm:hidden">
              {settings.mode === 'book' ? <Rows3 /> : <BookOpen />}
            </BarButton>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="সেটিংস" className="text-wood-foreground hover:bg-white/10 hover:text-wood-foreground">
                  <Settings2 />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80">
                <SettingsPanel settings={settings} update={update} />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="gold-rule opacity-60" />
      </header>

      {/* Page */}
      <main ref={containerRef} className="relative px-2 py-6 sm:px-6 sm:py-10">
        <ReaderContext.Provider value={ctx}>
          {isLoading || !book ? (
            <div className="flex min-h-[70vh] items-center justify-center">
              <Spinner />
            </div>
          ) : isError || !page ? (
            <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-xl bg-[var(--page-bg)] p-10 text-center text-[var(--page-ink)]">
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
          <div className="mx-auto mb-3 flex w-fit items-center gap-1 rounded-full border border-white/10 bg-black/55 p-1 text-wood-foreground shadow-xl backdrop-blur-md">
            <Button variant="ghost" size="icon-lg" className="rounded-full hover:bg-white/10 hover:text-wood-foreground" disabled={!page.prev_page} onClick={() => goTo(page.prev_page)} aria-label="আগের পৃষ্ঠা">
              <ChevronLeft />
            </Button>
            <PageJump current={page.number} last={book.last_page ?? page.number} onGo={goTo} />
            <Button variant="ghost" size="icon-lg" className="rounded-full hover:bg-white/10 hover:text-wood-foreground" disabled={!page.next_page} onClick={() => goTo(page.next_page)} aria-label="পরের পৃষ্ঠা">
              <ChevronRight />
            </Button>
          </div>
        </nav>
      )}

      {actions.element}

      <Sheet open={panel !== null} onOpenChange={(open) => !open && setPanel(null)}>
        <SheetContent side={panel === 'toc' ? 'left' : 'right'} className="flex w-full flex-col sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-start">{panel === 'toc' ? 'সূচিপত্র' : panel === 'search' ? 'কিতাবে খুঁজুন' : 'বুকমার্ক ও নোট'}</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 px-4 pb-4">
            {panel === 'toc' && book && (
              <div className="h-full overflow-y-auto scrollbar-thin">
                {book.toc?.length ? <TocList slug={slug} entries={book.toc} currentPage={pageNumber} onNavigate={() => setPanel(null)} /> : <p className="text-sm text-muted-foreground">সূচিপত্র নেই</p>}
              </div>
            )}
            {panel === 'search' && <SearchPanel slug={slug} onNavigate={() => setPanel(null)} />}
            {panel === 'notes' && book && (
              <NotesPanel
                book={book}
                pageNumber={pageNumber}
                bookmarks={bookmarks.bookmarks}
                annotations={annotations}
                onAddBookmark={(label) => bookmarks.create({ book_id: book.id, page_number: pageNumber, sentence_id: null, label }, book)}
                onRenameBookmark={bookmarks.update}
                onRemoveBookmark={bookmarks.remove}
                onRemoveAnnotation={remove}
                onNavigate={() => setPanel(null)}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

const EMPTY: HighlightRange[] = []

function BarButton({ label, children, className, ...props }: { label: string; children: React.ReactNode; className?: string; onClick?: () => void; asChild?: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={label} className={cn('text-wood-foreground hover:bg-white/10 hover:text-wood-foreground', className)} {...props}>
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
        className="h-8 w-12 rounded-md border border-white/15 bg-white/10 text-center tabular-nums outline-none focus:border-gold"
      />
      <span className="text-wood-foreground/70">/ {bnNum(last)}</span>
    </form>
  )
}
