import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, BookMarked, BookOpen, Bookmark as BookmarkIcon, CheckCircle2, CloudOff, Search, Trash2, X } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { BookCard, ProgressBar } from '@/components/book-card'
import { BookCover } from '@/components/book-cover'
import { ContinueCard, inProgressEntries, ResumeLink, type ShelfEntry, StatusChip } from '@/components/continue-card'
import { Ornament } from '@/components/brand'
import { PatternBackdrop } from '@/components/pattern'
import { BookGridSkeleton, EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useUser } from '@/lib/auth'
import { pageTitle } from '@/lib/head'
import { bnNum, STATUS_LABELS, STATUS_ORDER, timeAgo } from '@/lib/text'
import type { Book, Bookmark, BookStatus } from '@/lib/types'
import { useBookmarks, useLibrary } from '@/lib/user-data'
import { cn } from '@/lib/utils'

type Tab = BookStatus | 'all' | 'bookmarks'
type Sort = 'recent' | 'title' | 'progress'

export const Route = createFileRoute('/_site/my-library')({
  head: () => pageTitle('আমার লাইব্রেরি'),
  validateSearch: (search: Record<string, unknown>): { tab?: Exclude<Tab, 'all'> } => ({
    tab: typeof search.tab === 'string' ? (search.tab as Exclude<Tab, 'all'>) : undefined,
  }),
  component: LibraryPage,
})

const SORTS: { value: Sort; label: string }[] = [
  { value: 'recent', label: 'সাম্প্রতিক' },
  { value: 'title', label: 'নাম' },
  { value: 'progress', label: 'অগ্রগতি' },
]

function LibraryPage() {
  const { tab = 'all' } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: user } = useUser()
  const { entries, isLoading } = useLibrary()
  const { bookmarks, remove: removeBookmark } = useBookmarks()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('recent')

  const shelf = useMemo(() => entries.filter((e): e is ShelfEntry => !!e.book && !!(e.status || e.last_page)), [entries])
  const count = (status: BookStatus) => shelf.filter((e) => e.status === status).length

  const inProgress = useMemo(() => inProgressEntries(shelf), [shelf])

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()
    const list = shelf.filter(
      (e) =>
        (tab === 'all' || e.status === tab) &&
        (!term || [e.book.title_bn, e.book.title_ar, e.book.title_translit, e.book.author?.name_bn].some((s) => s?.toLowerCase().includes(term))),
    )
    return list.sort((a, b) => {
      if (sort === 'title') return a.book.title_bn.localeCompare(b.book.title_bn, 'bn')
      if (sort === 'progress') return (b.progress ?? 0) - (a.progress ?? 0)
      return (b.last_read_at ?? '').localeCompare(a.last_read_at ?? '')
    })
  }, [shelf, tab, query, sort])

  const setTab = (value: Tab) => navigate({ search: { tab: value === 'all' ? undefined : value }, replace: true, resetScroll: false })

  const tabs: { value: Tab; label: string; count: number; icon?: typeof BookmarkIcon }[] = [
    { value: 'all', label: 'সব কিতাব', count: shelf.length },
    ...STATUS_ORDER.map((status) => ({ value: status as Tab, label: STATUS_LABELS[status], count: count(status) })),
    { value: 'bookmarks', label: 'বুকমার্ক', count: bookmarks.length, icon: BookmarkIcon },
  ]

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <PatternBackdrop opacity={0.2} />
        <div className="relative mx-auto max-w-7xl px-4 pt-12 pb-10 md:pt-16 md:pb-12">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p lang="ar" dir="rtl" className="text-left font-arabic text-xl text-gold md:text-2xl">
                مَكْتَبَتِي
              </p>
              <h1 className="mt-1 text-4xl font-bold md:text-5xl">আমার লাইব্রেরি</h1>
              <p className="mt-3 max-w-xl text-muted-foreground">
                {user ? `আস-সালামু আলাইকুম, ${user.name}। ` : ''}আপনার পড়া কিতাব, অগ্রগতি ও বুকমার্ক — সব এক জায়গায়।
              </p>
              <Ornament className="mt-5 justify-start" />
            </div>

            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-[34rem]">
              <Stat icon={BookMarked} label="মোট কিতাব" value={shelf.length} loading={isLoading} />
              <Stat icon={BookOpen} label="পড়ছি" value={count('reading')} loading={isLoading} />
              <Stat icon={CheckCircle2} label="পড়া শেষ" value={count('completed')} loading={isLoading} />
              <Stat icon={BookmarkIcon} label="বুকমার্ক" value={bookmarks.length} />
            </dl>
          </div>
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
              <p className="mt-0.5 text-sm text-muted-foreground">লগইন করলে লাইব্রেরি, হাইলাইট ও বুকমার্ক আপনার অ্যাকাউন্টে যুক্ত হবে এবং সব ডিভাইসে পাবেন।</p>
            </div>
            <Button asChild className="rounded-full px-6">
              <Link to="/login">লগইন করুন</Link>
            </Button>
          </div>
        )}

        {/* Continue reading */}
        {inProgress.length > 0 && (
          <section className="mb-14">
            <SectionLabel>পড়া চালিয়ে যান</SectionLabel>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {inProgress.map((entry, i) => (
                <ContinueCard key={entry.book_id} entry={entry} featured={i === 0 && inProgress.length > 1} />
              ))}
            </div>
          </section>
        )}

        {/* Toolbar: shelves on the left, search and sort on the right */}
        <div className="sticky top-16 z-10 -mx-4 mb-8 border-b bg-background/85 px-4 py-3 backdrop-blur-md">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <nav aria-label="তাক" className="-mx-4 overflow-x-auto px-4 scrollbar-none">
              <div className="flex w-max gap-1.5">
                {tabs.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTab(t.value)}
                    aria-pressed={tab === t.value}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium whitespace-nowrap transition',
                      tab === t.value ? 'border-primary bg-primary text-primary-foreground shadow-sm' : 'bg-card text-muted-foreground hover:border-gold/60 hover:text-foreground',
                    )}
                  >
                    {t.icon && <t.icon className="size-3.5" />}
                    {t.label}
                    <span
                      className={cn(
                        'min-w-5 rounded-full px-1.5 text-center text-[11px] leading-5',
                        tab === t.value ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {bnNum(t.count)}
                    </span>
                  </button>
                ))}
              </div>
            </nav>

            {tab !== 'bookmarks' && (
              <div className="flex items-center gap-2">
                <div className="relative min-w-0 flex-1 lg:w-64 lg:flex-none">
                  <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
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
                      onClick={() => setSort(s.value)}
                      aria-pressed={sort === s.value}
                      className={cn('rounded-full px-3 py-1.5 text-xs transition', sort === s.value ? 'bg-card font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground')}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {tab === 'bookmarks' ? (
          <BookmarkList bookmarks={bookmarks} onRemove={removeBookmark} />
        ) : isLoading ? (
          <BookGridSkeleton />
        ) : visible.length ? (
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {visible.map((entry) => (
              <BookCard key={entry.book_id} book={entry.book} footer={<EntryFooter entry={entry} />} />
            ))}
          </div>
        ) : query ? (
          <EmptyState icon={Search} title="কিছু পাওয়া যায়নি">
            “{query}” নামে আপনার লাইব্রেরিতে কোনো কিতাব নেই।
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => setQuery('')}>
              <X /> খোঁজ মুছুন
            </Button>
          </EmptyState>
        ) : (
          <EmptyState icon={BookMarked} title={tab === 'all' ? 'আপনার লাইব্রেরি এখনো খালি' : `“${STATUS_LABELS[tab]}” তালিকায় কোনো কিতাব নেই`}>
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

/* ---------------------------------------------------------------- Bookmarks */

function BookmarkList({ bookmarks, onRemove }: { bookmarks: Bookmark[]; onRemove: (id: Bookmark['id']) => void }) {
  // Group by book so each kitab shows its own bookmarks together
  const groups = useMemo(() => {
    const map = new Map<string, { book?: Book; items: Bookmark[] }>()
    for (const bookmark of bookmarks) {
      const key = String(bookmark.book_id)
      const group = map.get(key) ?? { book: bookmark.book, items: [] }
      group.items.push(bookmark)
      map.set(key, group)
    }
    for (const group of map.values()) group.items.sort((a, b) => a.page_number - b.page_number)
    return [...map.values()]
  }, [bookmarks])

  if (!bookmarks.length) {
    return (
      <EmptyState icon={BookmarkIcon} title="কোনো বুকমার্ক নেই">
        পড়ার সময় উপরের বুকমার্ক বাটন থেকে পাতা বা বাক্য সংরক্ষণ করুন।
      </EmptyState>
    )
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {groups.map((group, i) => (
        <section key={group.book?.id ?? i} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <header className="flex items-center gap-4 border-b bg-muted/40 p-4">
            {group.book && <BookCover book={group.book} className="w-12 shrink-0" />}
            <div className="min-w-0 flex-1">
              {group.book ? (
                <Link to="/books/$slug" params={{ slug: group.book.slug }} className="line-clamp-1 font-heading font-bold hover:text-primary">
                  {group.book.title_bn}
                </Link>
              ) : (
                <p className="font-heading font-bold">অজানা কিতাব</p>
              )}
              <p className="text-xs text-muted-foreground">{bnNum(group.items.length)}টি বুকমার্ক</p>
            </div>
          </header>

          <ul className="divide-y">
            {group.items.map((bookmark) => (
              <li key={bookmark.id} className="group/row flex items-center gap-2 pe-2">
                {group.book ? (
                  <Link
                    to="/books/$slug/read/$page"
                    params={{ slug: group.book.slug, page: String(bookmark.page_number) }}
                    hash={bookmark.sentence_id ? `s-${bookmark.sentence_id}` : undefined}
                    className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 transition hover:bg-muted/60"
                  >
                    <BookmarkRowBody bookmark={bookmark} />
                  </Link>
                ) : (
                  <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3">
                    <BookmarkRowBody bookmark={bookmark} />
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="বুকমার্ক মুছুন"
                  className="size-8 shrink-0 text-muted-foreground opacity-100 hover:text-destructive sm:opacity-0 sm:group-hover/row:opacity-100 sm:focus-visible:opacity-100"
                  onClick={() => onRemove(bookmark.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function BookmarkRowBody({ bookmark }: { bookmark: Bookmark }) {
  return (
    <>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gold/15">
        <BookmarkIcon className="size-3.5 fill-gold text-gold" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{bookmark.label || `পৃষ্ঠা ${bnNum(bookmark.page_number)}`}</span>
        {bookmark.created_at && <span className="block text-xs text-muted-foreground">{timeAgo(bookmark.created_at)}</span>}
      </span>
      <span className="shrink-0 rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground tabular-nums">পৃ. {bnNum(bookmark.page_number)}</span>
    </>
  )
}
