import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, BookMarked, BookOpen, CheckCircle2, CloudOff, Headphones, NotebookPen, Search, X } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { BookCard, ProgressBar } from '@/components/book-card'
import { BookJournal } from '@/components/book-journal'
import { ContinueListeningCard, DarsShelf, type DarsShelfEntry, inProgressDurus } from '@/components/dars-shelf'
import { ContinueCard, inProgressEntries, ResumeLink, type ShelfEntry, StatusChip } from '@/components/continue-card'
import { Ornament } from '@/components/brand'
import { PatternBackdrop } from '@/components/pattern'
import { BookGridSkeleton, EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useUser } from '@/lib/auth'
import { seo } from '@/lib/seo'
import { bnNum, DARS_STATUS_LABELS, STATUS_LABELS, STATUS_ORDER } from '@/lib/text'
import type { Book, BookStatus } from '@/lib/types'
import { groupAnnotations, useBookmarks, useDarsLibrary, useLibrary, useNotes } from '@/lib/user-data'
import { cn } from '@/lib/utils'

type View = 'books' | 'durus' | 'notes'
type Sort = 'recent' | 'title' | 'progress'

const isStatus = (value: unknown): value is BookStatus => STATUS_ORDER.includes(value as BookStatus)

export const Route = createFileRoute('/_site/my-library')({
  head: () => seo({ title: 'আমার লাইব্রেরি', noindex: true }),
  validateSearch: (search: Record<string, unknown>): { view?: Exclude<View, 'books'>; status?: BookStatus } => ({
    view: search.view === 'durus' || search.view === 'notes' ? search.view : undefined,
    status: isStatus(search.status) ? search.status : undefined,
  }),
  component: LibraryPage,
})

const SORTS: { value: Sort; label: string }[] = [
  { value: 'recent', label: 'সাম্প্রতিক' },
  { value: 'title', label: 'নাম' },
  { value: 'progress', label: 'অগ্রগতি' },
]

function LibraryPage() {
  const { view = 'books', status } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: user } = useUser()
  const { entries, isLoading } = useLibrary()
  const { bookmarks, remove: removeBookmark } = useBookmarks()
  const { notes, remove: removeNote } = useNotes()
  const { entries: darsEntries, isLoading: durusLoading } = useDarsLibrary()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('recent')

  const shelf = useMemo(() => entries.filter((e): e is ShelfEntry => !!e.book && !!(e.status || e.last_page)), [entries])
  const count = (status: BookStatus) => shelf.filter((e) => e.status === status).length
  const inProgress = useMemo(() => inProgressEntries(shelf), [shelf])

  const durusShelf = useMemo(() => darsEntries.filter((e): e is DarsShelfEntry => !!e.dars && !!(e.status || e.position_seconds)), [darsEntries])
  const listening = useMemo(() => inProgressDurus(durusShelf), [durusShelf])
  const durusCount = (status: BookStatus) => durusShelf.filter((e) => e.status === status).length

  const notesCount = groupAnnotations(notes).length + bookmarks.length

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()
    const list = shelf.filter(
      (e) => (!status || e.status === status) && (!term || [e.book.title_bn, e.book.title_ar, e.book.title_translit, e.book.author?.name_bn].some((s) => s?.toLowerCase().includes(term))),
    )
    return list.sort((a, b) => {
      if (sort === 'title') return a.book.title_bn.localeCompare(b.book.title_bn, 'bn')
      if (sort === 'progress') return (b.progress ?? 0) - (a.progress ?? 0)
      return (b.last_read_at ?? '').localeCompare(a.last_read_at ?? '')
    })
  }, [shelf, status, query, sort])

  const visibleDurus = useMemo(() => {
    const term = query.trim().toLowerCase()
    const list = durusShelf.filter(
      (e) =>
        (!status || e.status === status) &&
        (!term || [e.dars.title_bn, e.dars.title_ar, e.dars.series?.title_bn, e.dars.series?.title_ar, e.dars.series?.author?.name_bn].some((s) => s?.toLowerCase().includes(term))),
    )
    return list.sort((a, b) => {
      if (sort === 'title') return (a.dars.series?.title_bn ?? '').localeCompare(b.dars.series?.title_bn ?? '', 'bn') || a.dars.number - b.dars.number
      if (sort === 'progress') return b.progress - a.progress
      return (b.last_played_at ?? '').localeCompare(a.last_played_at ?? '')
    })
  }, [durusShelf, status, query, sort])

  /* a new area starts unfiltered */
  const setView = (value: View) => {
    setQuery('')
    navigate({ search: { view: value === 'books' ? undefined : value }, replace: true, resetScroll: false })
  }
  const setStatus = (value: BookStatus | undefined) => navigate({ search: (prev) => ({ ...prev, status: value }), replace: true, resetScroll: false })

  const views: { value: View; label: string; count: number; icon: typeof BookMarked }[] = [
    { value: 'books', label: 'কিতাব', count: shelf.length, icon: BookMarked },
    { value: 'durus', label: 'দারস', count: durusShelf.length, icon: Headphones },
    { value: 'notes', label: 'নোট ও বুকমার্ক', count: notesCount, icon: NotebookPen },
  ]

  /* status chips for the open area, worded for reading or listening */
  const statusSource: { status: BookStatus | null }[] = view === 'durus' ? durusShelf : shelf
  const labels = view === 'durus' ? DARS_STATUS_LABELS : STATUS_LABELS
  const statusTabs: StatusTab[] = [
    { value: undefined, label: 'সব', count: statusSource.length },
    ...STATUS_ORDER.map((value) => ({ value: value as BookStatus, label: labels[value], count: statusSource.filter((e) => e.status === value).length })),
  ]

  /* guest notes carry no book of their own, so look it up on the shelf or a bookmark */
  const knownBooks = useMemo(() => {
    const map = new Map<number, Book>()
    for (const b of bookmarks) if (b.book) map.set(b.book_id, b.book)
    for (const e of shelf) map.set(e.book_id, e.book)
    return map
  }, [bookmarks, shelf])

  const clearSearch = (
    <Button variant="ghost" size="sm" className="mt-3" onClick={() => setQuery('')}>
      <X /> খোঁজ মুছুন
    </Button>
  )

  return (
    <>
      {/* Hero, with the area tabs along its bottom edge */}
      <section className="relative overflow-hidden border-b">
        <PatternBackdrop opacity={0.2} />
        <div className="relative mx-auto max-w-7xl px-4 pt-12 md:pt-16">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p lang="ar" dir="rtl" className="text-left font-arabic text-xl text-gold md:text-2xl">
                مَكْتَبَتِي
              </p>
              <h1 className="mt-1 text-4xl font-bold md:text-5xl">আমার লাইব্রেরি</h1>
              <p className="mt-3 max-w-xl text-muted-foreground">{user ? `আস-সালামু আলাইকুম, ${user.name}। ` : ''}কোন কিতাব কতদূর পড়লেন, কোন দারস কতটুকু শুনলেন, কী নোট রাখলেন, কোথায় বুকমার্ক করলেন, সব এখানেই পাবেন।</p>
              <Ornament className="mt-5 justify-start" />
            </div>

            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-[34rem]">
              <Stat icon={BookMarked} label="কিতাব" value={shelf.length} loading={isLoading} />
              <Stat icon={Headphones} label="দারস" value={durusShelf.length} loading={durusLoading} />
              <Stat icon={BookOpen} label="চলছে" value={count('reading') + durusCount('reading')} loading={isLoading || durusLoading} />
              <Stat icon={CheckCircle2} label="শেষ" value={count('completed') + durusCount('completed')} loading={isLoading || durusLoading} />
            </dl>
          </div>

          <nav aria-label="বিভাগ" className="-mx-4 mt-10 overflow-x-auto px-4 scrollbar-none">
            <div className="flex w-max gap-1">
              {views.map((v) => (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => setView(v.value)}
                  aria-pressed={view === v.value}
                  className={cn(
                    '-mb-px flex items-center gap-2 border-b-2 px-4 pt-2 pb-3 text-[15px] font-semibold whitespace-nowrap transition',
                    view === v.value ? 'border-gold text-foreground' : 'border-transparent text-muted-foreground hover:border-gold/40 hover:text-foreground',
                  )}
                >
                  <v.icon className="size-4 text-gold" />
                  {v.label}
                  <span className={cn('rounded-full px-1.5 text-[11px] leading-5 tabular-nums', view === v.value ? 'bg-gold/20 text-foreground' : 'bg-muted text-muted-foreground')}>{bnNum(v.count)}</span>
                </button>
              ))}
            </div>
          </nav>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 md:py-12">
        {!user && (
          <div className="mb-10 flex flex-col items-start gap-4 rounded-2xl border border-gold/40 bg-linear-to-r from-gold/15 via-gold/5 to-transparent p-5 sm:flex-row sm:items-center">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold/20">
              <CloudOff className="size-5 text-gold" />
            </span>
            <div className="flex-1">
              <p className="font-semibold">আপনার ডেটা শুধু এই ব্রাউজারে আছে</p>
              <p className="mt-0.5 text-sm text-muted-foreground">লগইন করলে লাইব্রেরি, দারসের অগ্রগতি, হাইলাইট ও বুকমার্ক আপনার অ্যাকাউন্টে যুক্ত হবে এবং সব ডিভাইসে পাবেন।</p>
            </div>
            <Button asChild className="rounded-full px-6">
              <Link to="/login">লগইন করুন</Link>
            </Button>
          </div>
        )}

        {/* Continue reading, on the books tab */}
        {view === 'books' && inProgress.length > 0 && (
          <section className="mb-12">
            <SectionLabel>পড়া চালিয়ে যান</SectionLabel>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {inProgress.map((entry, i) => (
                <ContinueCard key={entry.book_id} entry={entry} featured={i === 0 && inProgress.length > 1} />
              ))}
            </div>
          </section>
        )}

        {/* Continue listening, on the durus tab */}
        {view === 'durus' && listening.length > 0 && (
          <section className="mb-12">
            <SectionLabel>শোনা চালিয়ে যান</SectionLabel>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {listening.map((entry) => (
                <ContinueListeningCard key={entry.dars_id} entry={entry} />
              ))}
            </div>
          </section>
        )}

        {/* The open area's shelves, search and sort */}
        {view !== 'notes' && (
          <div className="sticky top-16 z-10 -mx-4 mb-8 border-b bg-background px-4 py-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <StatusTabs tabs={statusTabs} value={status} onChange={setStatus} />
              <SearchAndSort query={query} onQuery={setQuery} sort={sort} onSort={setSort} />
            </div>
          </div>
        )}

        {view === 'notes' ? (
          notes.length || bookmarks.length ? (
            <BookJournal notes={notes} bookmarks={bookmarks} knownBooks={knownBooks} onRemoveNote={removeNote} onRemoveBookmark={removeBookmark} />
          ) : (
            <EmptyState icon={NotebookPen} title="কোনো নোট বা বুকমার্ক নেই">
              পড়ার সময় লেখা নির্বাচন করে নোট যোগ করুন, অথবা বুকমার্ক বাটন থেকে পাতা সংরক্ষণ করুন।
            </EmptyState>
          )
        ) : view === 'durus' ? (
          durusLoading ? (
            <BookGridSkeleton />
          ) : visibleDurus.length ? (
            <DarsShelf entries={visibleDurus} />
          ) : query ? (
            <EmptyState icon={Search} title="কিছু পাওয়া যায়নি">
              “{query}” নামে আপনার লাইব্রেরিতে কোনো দারস নেই।
              {clearSearch}
            </EmptyState>
          ) : (
            <EmptyState icon={Headphones} title={status ? `“${DARS_STATUS_LABELS[status]}” তালিকায় কোনো দারস নেই` : 'কোনো দারস যোগ করা হয়নি'}>
              দারসের পাতায় “লাইব্রেরিতে যোগ করুন” থেকে দারস যোগ করুন। শোনা শুরু করলে দারসটি নিজে থেকেই এখানে চলে আসবে।
              <div className="mt-5">
                <Button asChild className="rounded-full px-6">
                  <Link to="/library" search={{ type: 'durus' }}>
                    দারস খুঁজুন <ArrowRight />
                  </Link>
                </Button>
              </div>
            </EmptyState>
          )
        ) : isLoading ? (
          <BookGridSkeleton />
        ) : visible.length ? (
          <div className="book-shelves">
            {visible.map((entry) => (
              <BookCard key={entry.book_id} book={entry.book} footer={<EntryFooter entry={entry} />} />
            ))}
          </div>
        ) : query ? (
          <EmptyState icon={Search} title="কিছু পাওয়া যায়নি">
            “{query}” নামে আপনার লাইব্রেরিতে কোনো কিতাব নেই।
            {clearSearch}
          </EmptyState>
        ) : (
          <EmptyState icon={BookMarked} title={status ? `“${STATUS_LABELS[status]}” তালিকায় কোনো কিতাব নেই` : 'আপনার লাইব্রেরি এখনো খালি'}>
            কিতাবের পাতায় “লাইব্রেরিতে যোগ করুন” থেকে কিতাব যোগ করুন। পড়া শুরু করলে কিতাবটি নিজে থেকেই এখানে চলে আসবে।
            <div className="mt-5">
              <Button asChild className="rounded-full px-6">
                <Link to="/library">
                  কিতাব খুঁজুন <ArrowRight />
                </Link>
              </Button>
            </div>
          </EmptyState>
        )}
      </div>
    </>
  )
}

/* ------------------------------------------------------------------- Pieces */

interface StatusTab {
  value: BookStatus | undefined
  label: string
  count: number
}

/** The open area's status shelves as small chips. */
function StatusTabs({ tabs, value, onChange }: { tabs: StatusTab[]; value: BookStatus | undefined; onChange: (value: BookStatus | undefined) => void }) {
  return (
    <nav aria-label="তাক" className="-mx-4 overflow-x-auto px-4 scrollbar-none">
      <div className="flex w-max gap-1.5">
        {tabs.map((t) => (
          <button
            key={t.value ?? 'all'}
            type="button"
            onClick={() => onChange(t.value)}
            aria-pressed={value === t.value}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium whitespace-nowrap transition',
              value === t.value ? 'border-primary bg-primary text-primary-foreground shadow-sm' : 'bg-card text-muted-foreground hover:border-gold/60 hover:text-foreground',
            )}
          >
            {t.label}
            <span
              className={cn(
                'min-w-5 rounded-full px-1.5 text-center text-[11px] leading-5',
                value === t.value ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground',
              )}
            >
              {bnNum(t.count)}
            </span>
          </button>
        ))}
      </div>
    </nav>
  )
}

function SearchAndSort({ query, onQuery, sort, onSort }: { query: string; onQuery: (value: string) => void; sort: Sort; onSort: (value: Sort) => void }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative min-w-0 flex-1 lg:w-58 lg:flex-none">
        <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="লাইব্রেরিতে খুঁজুন…"
          aria-label="লাইব্রেরিতে খুঁজুন"
          className="h-10 w-full rounded-full border bg-card ps-10 pe-4 text-sm outline-none placeholder:text-muted-foreground focus:border-gold focus:ring-3 focus:ring-gold/20"
        />
      </div>
      <div className="flex shrink-0 rounded-full border bg-muted p-0.5" role="group" aria-label="সাজান">
        {SORTS.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => onSort(s.value)}
            aria-pressed={sort === s.value}
            className={cn('rounded-full px-3 py-1.5 text-xs transition', sort === s.value ? 'bg-card font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground')}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function Stat({ icon: Icon, label, value, loading }: { icon: typeof BookMarked; label: string; value: number; loading?: boolean }) {
  return (
    <div className="rounded-2xl border bg-card/90 px-4 py-3.5 shadow-sm backdrop-blur-sm">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5 text-gold" />
        {label}
      </dt>
      <dd className="mt-1 text-2xl font-bold tabular-nums">{loading ? <Skeleton className="h-7 w-8" /> : bnNum(value)}</dd>
    </div>
  )
}

function SectionLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-center gap-4">
      <h2 className="text-xl font-bold md:text-2xl">{children}</h2>
      <span className="h-px flex-1 bg-linear-to-r from-gold/50 to-transparent" />
      {action}
    </div>
  )
}

function EntryFooter({ entry }: { entry: ShelfEntry }) {
  const percent = Math.round(entry.progress ?? 0)
  return (
    <div className="space-y-2 pt-2">
      {entry.status && <StatusChip status={entry.status} />}
      {entry.last_page ? (
        <>
          <div className="flex items-center gap-2">
            <ProgressBar value={percent} className="flex-1" />
            <span className="text-[11px] text-muted-foreground tabular-nums">{bnNum(percent)}%</span>
          </div>
          <ResumeLink entry={entry} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
            পৃষ্ঠা {bnNum(entry.last_page)} থেকে পড়ুন <ArrowRight className="size-3" />
          </ResumeLink>
        </>
      ) : null}
    </div>
  )
}
