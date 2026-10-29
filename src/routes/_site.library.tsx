import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { BookOpen, Headphones, Loader2, Search, SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { BookCard } from '@/components/book-card'
import { Ornament } from '@/components/brand'
import { PatternBackdrop } from '@/components/pattern'
import { SeriesCard } from '@/components/series-card'
import { BookGridSkeleton, EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { pageTitle } from '@/lib/head'
import { categoriesQuery, statsQuery } from '@/lib/queries'
import { bnNum } from '@/lib/text'
import type { Book, DarsSeries, Paginated } from '@/lib/types'
import { cn } from '@/lib/utils'

type LibraryType = 'books' | 'durus'

interface LibrarySearch {
  type?: 'durus'
  q?: string
  category?: string
  sort?: 'title'
}

export const Route = createFileRoute('/_site/library')({
  head: () => pageTitle('লাইব্রেরি'),
  validateSearch: (search: Record<string, unknown>): LibrarySearch => ({
    type: search.type === 'durus' ? 'durus' : undefined,
    q: typeof search.q === 'string' && search.q.trim() ? search.q : undefined,
    category: typeof search.category === 'string' && search.category ? search.category : undefined,
    sort: search.sort === 'title' ? 'title' : undefined,
  }),
  component: LibraryPage,
})

const PER_PAGE = { books: 20, durus: 18 }

function LibraryPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const type: LibraryType = search.type ?? 'books'
  const { data: stats } = useQuery(statsQuery())

  const [input, setInput] = useState(search.q ?? '')
  useEffect(() => setInput(search.q ?? ''), [search.q])

  // Push the search term into the URL shortly after typing stops
  useEffect(() => {
    const term = input.trim() || undefined
    if (term === search.q) return
    const timer = window.setTimeout(() => navigate({ search: (prev) => ({ ...prev, q: term }), replace: true }), 300)
    return () => window.clearTimeout(timer)
  }, [input, search.q, navigate])

  const setType = (next: LibraryType) => navigate({ search: { type: next === 'durus' ? 'durus' : undefined, q: search.q } })

  return (
    <>
      <section className="relative overflow-hidden border-b">
        <PatternBackdrop opacity={0.2} />
        <div className="relative mx-auto max-w-4xl px-4 pt-14 pb-10 text-center md:pt-20 md:pb-14">
          <p lang="ar" dir="rtl" className="font-arabic text-xl text-gold md:text-2xl">
            الْمَكْتَبَة
          </p>
          <h1 className="mt-1 text-4xl font-bold md:text-6xl">লাইব্রেরি</h1>
          <Ornament className="mt-5" />

          {/* Books | Durus */}
          <nav className="mx-auto mt-7 flex w-fit items-center gap-1 rounded-full border bg-card/90 p-1 shadow-sm backdrop-blur-sm" aria-label="ধরন">
            {(
              [
                { value: 'books', label: 'কিতাব', icon: BookOpen, count: stats?.books },
                { value: 'durus', label: 'দারস', icon: Headphones, count: stats?.dars_series },
              ] as const
            ).map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setType(tab.value)}
                aria-pressed={type === tab.value}
                className={cn(
                  'flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition sm:px-6',
                  type === tab.value ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <tab.icon className="size-4" />
                {tab.label}
                {tab.count !== undefined && <span className={cn('text-xs font-normal', type === tab.value ? 'text-primary-foreground/75' : 'text-muted-foreground')}>{bnNum(tab.count)}</span>}
              </button>
            ))}
          </nav>

          {/* Search + filters */}
          <div className="mx-auto mt-6 flex max-w-2xl items-stretch gap-2.5">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={type === 'books' ? 'কিতাব বা লেখকের নাম…' : 'দারস বা শাইখের নাম…'}
                aria-label="খুঁজুন"
                className="h-12 w-full rounded-full border bg-card ps-12 pe-4 text-base shadow-sm outline-none placeholder:text-muted-foreground focus:border-gold focus:ring-3 focus:ring-gold/20"
              />
            </div>
            <FiltersButton type={type} category={search.category} sort={search.sort} onChange={(patch) => navigate({ search: (prev) => ({ ...prev, ...patch }) })} />
          </div>

          <ActiveFilters type={type} category={search.category} onClear={() => navigate({ search: (prev) => ({ ...prev, category: undefined }) })} />
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 md:py-14">{type === 'books' ? <BookResults search={search} /> : <DurusResults search={search} />}</div>
    </>
  )
}

/* ------------------------------------------------------------------ Filters */

function FiltersButton({ type, category, sort, onChange }: { type: LibraryType; category?: string; sort?: 'title'; onChange: (patch: Partial<LibrarySearch>) => void }) {
  const { data: categories } = useQuery(categoriesQuery())
  const countOf = (c: { books_count?: number; dars_series_count?: number }) => (type === 'books' ? c.books_count : c.dars_series_count) ?? 0
  const shown = (categories ?? []).filter((c) => countOf(c) > 0 || c.slug === category)
  const active = (category ? 1 : 0) + (sort ? 1 : 0)

  const option = (selected: boolean) =>
    cn('flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition', selected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="ফিল্টার"
          className="relative flex h-12 shrink-0 items-center gap-2 rounded-full border bg-card px-5 text-base font-medium shadow-sm transition hover:bg-muted aria-expanded:border-gold"
        >
          <SlidersHorizontal className="size-4.5" />
          <span className="hidden sm:inline">ফিল্টার</span>
          {active > 0 && <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-gold text-[11px] font-bold text-gold-foreground">{bnNum(active)}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end" sideOffset={8} avoidCollisions={false} className="w-72 p-3">
        <p className="px-1 pb-2 text-xs font-semibold tracking-wide text-muted-foreground">সাজান</p>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          {(
            [
              { value: undefined, label: 'নতুন যুক্ত' },
              { value: 'title', label: 'নাম অনুযায়ী' },
            ] as const
          ).map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => onChange({ sort: s.value })}
              className={cn('rounded-md py-1.5 text-sm transition', sort === s.value ? 'bg-card font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground')}
            >
              {s.label}
            </button>
          ))}
        </div>

        <p className="px-1 pt-4 pb-2 text-xs font-semibold tracking-wide text-muted-foreground">বিষয়</p>
        <div className="max-h-[min(12rem,22vh)] space-y-0.5 overflow-y-auto scrollbar-thin">
          <button type="button" className={option(!category)} onClick={() => onChange({ category: undefined })}>
            সব বিষয়
          </button>
          {shown.map((c) => (
            <button key={c.id} type="button" className={option(category === c.slug)} onClick={() => onChange({ category: c.slug })}>
              <span>{c.name_bn}</span>
              <span className={cn('text-xs', category === c.slug ? 'text-primary-foreground/75' : 'text-muted-foreground')}>{bnNum(countOf(c))}</span>
            </button>
          ))}
        </div>

        {active > 0 && (
          <Button variant="ghost" size="sm" className="mt-3 w-full" onClick={() => onChange({ category: undefined, sort: undefined })}>
            ফিল্টার মুছুন
          </Button>
        )}
      </PopoverContent>
    </Popover>
  )
}

function ActiveFilters({ type, category, onClear }: { type: LibraryType; category?: string; onClear: () => void }) {
  const { data: categories } = useQuery(categoriesQuery())
  const current = categories?.find((c) => c.slug === category)
  if (!current) return null

  return (
    <div className="mt-4 flex justify-center">
      <button type="button" onClick={onClear} className="inline-flex items-center gap-1.5 rounded-full border border-gold/50 bg-gold/10 px-3 py-1 text-sm text-primary transition hover:bg-gold/20">
        {type === 'books' ? 'কিতাব' : 'দারস'}: <span className="font-semibold">{current.name_bn}</span>
        <X className="size-3.5" aria-label="সরান" />
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ Results */

function useLibraryList<T>(path: '/books' | '/dars-series', key: LibraryType, search: LibrarySearch) {
  return useInfiniteQuery({
    queryKey: ['library', key, { q: search.q, category: search.category, sort: search.sort }],
    queryFn: ({ pageParam }) =>
      api<Paginated<T>>(path, { query: { q: search.q, category: search.category, sort: search.sort, page: pageParam, per_page: PER_PAGE[key] } }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.current_page < last.meta.last_page ? last.meta.current_page + 1 : undefined),
  })
}

function ResultsHeader({ total, noun, query }: { total?: number; noun: string; query?: string }) {
  if (total === undefined) return <Skeleton className="mb-6 h-5 w-40" />
  return (
    <p className="mb-6 text-sm text-muted-foreground">
      {query ? (
        <>
          “<span className="font-semibold text-foreground">{query}</span>” — {bnNum(total)}টি {noun} পাওয়া গেছে
        </>
      ) : (
        <>
          মোট {bnNum(total)}টি {noun}
        </>
      )}
    </p>
  )
}

function LoadMore({ hasMore, loading, onClick }: { hasMore: boolean; loading: boolean; onClick: () => void }) {
  if (!hasMore) return null
  return (
    <div className="mt-12 flex justify-center">
      <Button variant="outline" size="lg" className="h-11 rounded-full px-8" onClick={onClick} disabled={loading}>
        {loading && <Loader2 className="animate-spin" />} আরও দেখুন
      </Button>
    </div>
  )
}

function BookResults({ search }: { search: LibrarySearch }) {
  const query = useLibraryList<Book>('/books', 'books', search)
  const books = query.data?.pages.flatMap((page) => page.data) ?? []

  return (
    <>
      <ResultsHeader total={query.data?.pages[0].meta.total} noun="কিতাব" query={search.q} />
      {query.isLoading ? (
        <BookGridSkeleton count={10} />
      ) : books.length ? (
        <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 lg:gap-x-7">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      ) : (
        <EmptyState icon={BookOpen} title="কোনো কিতাব পাওয়া যায়নি">
          অন্য নাম দিয়ে খুঁজুন বা ফিল্টার বদলে দেখুন।
        </EmptyState>
      )}
      <LoadMore hasMore={!!query.hasNextPage} loading={query.isFetchingNextPage} onClick={() => query.fetchNextPage()} />
    </>
  )
}

function DurusResults({ search }: { search: LibrarySearch }) {
  const query = useLibraryList<DarsSeries>('/dars-series', 'durus', search)
  const series = query.data?.pages.flatMap((page) => page.data) ?? []

  return (
    <>
      <ResultsHeader total={query.data?.pages[0].meta.total} noun="দারস সিরিজ" query={search.q} />
      {query.isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-60 rounded-2xl" />
          ))}
        </div>
      ) : series.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {series.map((item) => (
            <SeriesCard key={item.id} series={item} />
          ))}
        </div>
      ) : (
        <EmptyState icon={Headphones} title="কোনো দারস পাওয়া যায়নি">
          অন্য নাম দিয়ে খুঁজুন বা ফিল্টার বদলে দেখুন।
        </EmptyState>
      )}
      <LoadMore hasMore={!!query.hasNextPage} loading={query.isFetchingNextPage} onClick={() => query.fetchNextPage()} />
    </>
  )
}
