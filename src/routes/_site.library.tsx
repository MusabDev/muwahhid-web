import { infiniteQueryOptions, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowDownAZ, BookOpen, Check, Clock, Headphones, Loader2, RotateCcw, Search, SlidersHorizontal, Tags, UserRound, X, type LucideIcon } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { AuthorAvatar } from '@/components/author-avatar'
import { BookCard } from '@/components/book-card'
import { Ornament } from '@/components/brand'
import { PatternBackdrop } from '@/components/pattern'
import { SeriesCard } from '@/components/series-card'
import { BookGridSkeleton, EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { authorsQuery, categoriesQuery, statsQuery } from '@/lib/queries'
import { breadcrumbLd, itemListLd, seo } from '@/lib/seo'
import { bnNum, stripDiacritics } from '@/lib/text'
import type { Author, Book, Category, DarsSeries, Paginated } from '@/lib/types'
import { cn } from '@/lib/utils'

type LibraryType = 'books' | 'durus'

interface LibrarySearch {
  type?: 'durus'
  q?: string
  category?: string
  author?: string
  sort?: 'title'
  /** First page of results shown; "load more" appends after it. Gives every page of the catalogue its own URL. */
  page?: number
}

export const Route = createFileRoute('/_site/library')({
  validateSearch: (search: Record<string, unknown>): LibrarySearch => {
    const page = Number(search.page)
    return {
      type: search.type === 'durus' ? 'durus' : undefined,
      q: typeof search.q === 'string' && search.q.trim() ? search.q : undefined,
      category: typeof search.category === 'string' && search.category ? search.category : undefined,
      author: typeof search.author === 'string' && search.author ? search.author : undefined,
      sort: search.sort === 'title' ? 'title' : undefined,
      page: Number.isInteger(page) && page > 1 ? page : undefined,
    }
  },
  loaderDeps: ({ search }) => search,
  loader: async ({ context: { queryClient }, deps: search }) => {
    const type: LibraryType = search.type ?? 'books'
    const [list, categories] = await Promise.all([
      queryClient.ensureInfiniteQueryData(libraryListQuery(type, search)),
      queryClient.ensureQueryData(categoriesQuery()).catch(() => []),
      queryClient.prefetchQuery(statsQuery()),
      queryClient.prefetchQuery({ ...authorsQuery(1, 500), staleTime: 10 * 60 * 1000 }),
    ])
    const first = list.pages[0]
    return {
      type,
      category: categories.find((c) => c.slug === search.category),
      items: first.data.map((item) => ({ slug: item.slug, title: item.title_bn })),
      currentPage: first.meta.current_page,
      lastPage: first.meta.last_page,
    }
  },
  head: ({ loaderData, match }) => {
    if (!loaderData) return {}
    const search = match.search
    const { type, category, currentPage, lastPage } = loaderData
    const noun = type === 'durus' ? 'দারস সিরিজ' : 'কিতাব'
    const base = type === 'durus' ? '/durus' : '/books'
    // sort is only an ordering of the same list, so it shares the canonical of the unsorted page
    const urlFor = (page?: number) => {
      const params = new URLSearchParams()
      if (search.type) params.set('type', search.type)
      if (search.category) params.set('category', search.category)
      if (search.author) params.set('author', search.author)
      if (page && page > 1) params.set('page', String(page))
      const qs = params.toString()
      return `/library${qs ? `?${qs}` : ''}`
    }
    const path = urlFor(currentPage)
    const title = [category?.name_bn, type === 'durus' ? 'দারস' : 'কিতাব', 'লাইব্রেরি'].filter(Boolean).join(' — ') + (currentPage > 1 ? ` (পৃষ্ঠা ${bnNum(currentPage)})` : '')
    return seo({
      title,
      description: category
        ? `${category.name_bn} বিষয়ের ${noun}: আরবি মূলপাঠ ও বাংলা অনুবাদ${type === 'durus' ? ', সাবটাইটেল ও ট্রান্সক্রিপ্টসহ' : ''}।`
        : type === 'durus'
          ? 'আহলুল ইলমের দারস সিরিজ: আরবি ও বাংলা সাবটাইটেল, পূর্ণ ট্রান্সক্রিপ্ট আর সময় ধরে লিংক।'
          : 'আহলুল ইলমের কিতাবসমূহ: আরবি মূলপাঠ ও বাংলা অনুবাদ পাশাপাশি, বাক্য ধরে ধরে পড়ুন বা পিডিএফ নামান।',
      path,
      // searches are endless near-duplicates; keep them out of the index but let their links be followed
      noindex: !!search.q,
      prev: currentPage > 1 ? urlFor(currentPage - 1) : null,
      next: currentPage < lastPage ? urlFor(currentPage + 1) : null,
      jsonLd: [
        { '@type': 'CollectionPage', name: title, url: path },
        itemListLd(loaderData.items.map((item) => ({ path: `${base}/${item.slug}`, name: item.title }))),
        breadcrumbLd([
          ['লাইব্রেরি', '/library'],
          ...(type === 'durus' ? [['দারস', '/library?type=durus'] as [string, string]] : []),
          ...(category ? [[category.name_bn, urlFor()] as [string, string]] : []),
        ]),
      ],
    })
  },
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
    const timer = window.setTimeout(() => navigate({ search: (prev) => ({ ...prev, q: term, page: undefined }), replace: true }), 300)
    return () => window.clearTimeout(timer)
  }, [input, search.q, navigate])

  // Category and author counts differ per type, so switching type starts the filters afresh
  const setType = (next: LibraryType) => navigate({ search: { type: next === 'durus' ? 'durus' : undefined, q: search.q, sort: search.sort } })
  const applyFilters = (patch: FilterPatch) => navigate({ search: (prev) => ({ ...prev, ...patch, page: undefined }) })

  return (
    <>
      <section className="relative overflow-hidden">
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
                placeholder={type === 'books' ? 'কিতাব বা লেখকের নাম…' : 'দারস বা শায়খের নাম…'}
                aria-label="খুঁজুন"
                className="h-12 w-full rounded-full border bg-card ps-12 pe-4 text-base shadow-sm outline-none placeholder:text-muted-foreground focus:border-gold focus:ring-3 focus:ring-gold/20"
              />
            </div>
            <FiltersButton type={type} search={search} onChange={applyFilters} />
          </div>

          <ActiveFilters type={type} search={search} onChange={applyFilters} />
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 md:py-14">{type === 'books' ? <BookResults search={search} /> : <DurusResults search={search} />}</div>
    </>
  )
}

/* ------------------------------------------------------------------ Filters */

type FilterPatch = Partial<Pick<LibrarySearch, 'category' | 'author' | 'sort'>>

const SORTS = [
  { value: undefined, label: 'নতুন যুক্ত', icon: Clock },
  { value: 'title', label: 'নাম অনুযায়ী', icon: ArrowDownAZ },
] as const

/** Category and author lists trimmed to those that have something of the current type. */
function useFilterOptions(type: LibraryType, search: LibrarySearch) {
  const { data: categories } = useQuery(categoriesQuery())
  const { data: authors } = useQuery({ ...authorsQuery(1, 500), staleTime: 10 * 60 * 1000 })

  const categoryCount = (c: Category) => (type === 'books' ? c.books_count : c.dars_series_count) ?? 0
  const authorCount = (a: Author) => (type === 'books' ? a.books_count : a.dars_series_count) ?? 0

  return {
    categories: (categories ?? []).filter((c) => categoryCount(c) > 0 || c.slug === search.category).map((c) => ({ ...c, count: categoryCount(c) })),
    authors: (authors?.data ?? []).filter((a) => authorCount(a) > 0 || a.slug === search.author).map((a) => ({ ...a, count: authorCount(a) })),
    currentCategory: categories?.find((c) => c.slug === search.category),
    currentAuthor: authors?.data.find((a) => a.slug === search.author),
  }
}

function FilterLabel({ icon: Icon, children, action }: { icon: LucideIcon; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-1 pb-2">
      <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground">
        <Icon className="size-3.5" />
        {children}
      </p>
      {action}
    </div>
  )
}

function FiltersButton({ type, search, onChange }: { type: LibraryType; search: LibrarySearch; onChange: (patch: FilterPatch) => void }) {
  const { categories, authors } = useFilterOptions(type, search)
  const [authorQuery, setAuthorQuery] = useState('')
  const active = [search.category, search.author, search.sort].filter(Boolean).length
  const personNoun = type === 'books' ? 'লেখক' : 'শায়খ'

  const needle = stripDiacritics(authorQuery.trim().toLowerCase())
  const matchedAuthors = needle
    ? authors.filter((a) => [a.name_bn, a.name_translit, stripDiacritics(a.name_ar)].some((name) => name.toLowerCase().includes(needle)))
    : authors

  const chip = (selected: boolean) =>
    cn(
      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition',
      selected ? 'border-primary bg-primary text-primary-foreground shadow-sm' : 'bg-card hover:border-gold/60 hover:bg-gold/5',
    )

  return (
    <Popover onOpenChange={(open) => !open && setAuthorQuery('')}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="ফিল্টার"
          className={cn(
            'relative flex h-12 shrink-0 items-center gap-2 rounded-full border bg-card px-5 text-base font-medium shadow-sm transition hover:bg-muted aria-expanded:border-gold aria-expanded:ring-3 aria-expanded:ring-gold/20',
            active > 0 && 'border-gold/60',
          )}
        >
          <SlidersHorizontal className="size-4.5" />
          <span className="hidden sm:inline">ফিল্টার</span>
          {active > 0 && (
            <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-gold text-[11px] font-bold text-gold-foreground ring-2 ring-background">
              {bnNum(active)}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end" sideOffset={8} avoidCollisions={false} collisionPadding={16} className="max-h-(--radix-popover-content-available-height) w-[min(24rem,calc(100vw-2rem))] gap-0 overflow-hidden rounded-2xl p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="font-semibold">ফিল্টার ও সাজানো</p>
          {active > 0 && (
            <button
              type="button"
              onClick={() => onChange({ category: undefined, author: undefined, sort: undefined })}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
            >
              <RotateCcw className="size-3.5" /> রিসেট
            </button>
          )}
        </div>

        <div className="max-h-[34rem] min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 scrollbar-thin">
          <section>
            <FilterLabel icon={ArrowDownAZ}>সাজান</FilterLabel>
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
              {SORTS.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  aria-pressed={search.sort === s.value}
                  onClick={() => onChange({ sort: s.value })}
                  className={cn(
                    'flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm transition',
                    search.sort === s.value ? 'bg-card font-semibold text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <s.icon className="size-3.5" />
                  {s.label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <FilterLabel icon={Tags}>বিষয়</FilterLabel>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" aria-pressed={!search.category} className={chip(!search.category)} onClick={() => onChange({ category: undefined })}>
                সব বিষয়
              </button>
              {categories.map((c) => (
                <button key={c.id} type="button" aria-pressed={search.category === c.slug} className={chip(search.category === c.slug)} onClick={() => onChange({ category: c.slug })}>
                  {c.name_bn}
                  <span className={cn('text-xs tabular-nums', search.category === c.slug ? 'text-primary-foreground/75' : 'text-muted-foreground')}>{bnNum(c.count)}</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <FilterLabel icon={UserRound}>{personNoun}</FilterLabel>
            {authors.length > 6 && (
              <div className="relative mb-2">
                <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={authorQuery}
                  onChange={(e) => setAuthorQuery(e.target.value)}
                  placeholder={`${personNoun}ের নাম খুঁজুন…`}
                  aria-label={`${personNoun} খুঁজুন`}
                  className="h-9 w-full rounded-lg border bg-card ps-9 pe-3 text-sm outline-none placeholder:text-muted-foreground focus:border-gold focus:ring-3 focus:ring-gold/20"
                />
              </div>
            )}
            <div className="max-h-56 space-y-0.5 overflow-y-auto rounded-xl border bg-card/50 p-1 scrollbar-thin">
              {!needle && <AuthorOption label={type === 'books' ? 'সব লেখক' : 'সকল আহলুল ইলম'} selected={!search.author} onClick={() => onChange({ author: undefined })} />}
              {matchedAuthors.map((a) => (
                <AuthorOption key={a.id} author={a} label={a.name_bn} count={a.count} selected={search.author === a.slug} onClick={() => onChange({ author: a.slug })} />
              ))}
              {needle && !matchedAuthors.length && <p className="px-3 py-6 text-center text-sm text-muted-foreground">কোনো {personNoun} পাওয়া যায়নি</p>}
            </div>
          </section>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function AuthorOption({ author, label, count, selected, onClick }: { author?: Author; label: string; count?: number; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn('flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-start text-sm transition', selected ? 'bg-primary/10 text-foreground' : 'hover:bg-muted')}
    >
      {author ? (
        <AuthorAvatar author={author} className="size-8 drop-shadow-none" />
      ) : (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <UserRound className="size-4" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className={cn('block truncate', selected && 'font-semibold')}>{label}</span>
        {author && (
          <span lang="ar" dir="rtl" className="block truncate text-left font-arabic text-xs text-muted-foreground">
            {author.name_ar}
          </span>
        )}
      </span>
      {count !== undefined && <span className="text-xs text-muted-foreground tabular-nums">{bnNum(count)}</span>}
      <Check className={cn('size-4 shrink-0 text-primary', !selected && 'invisible')} />
    </button>
  )
}

interface FilterChip {
  key: string
  label: string
  value: string
  clear: FilterPatch
}

function ActiveFilters({ type, search, onChange }: { type: LibraryType; search: LibrarySearch; onChange: (patch: FilterPatch) => void }) {
  const { currentCategory, currentAuthor } = useFilterOptions(type, search)
  const chips: (FilterChip | false | undefined)[] = [
    currentCategory && { key: 'category', label: 'বিষয়', value: currentCategory.name_bn, clear: { category: undefined } },
    currentAuthor && { key: 'author', label: type === 'books' ? 'লেখক' : 'শায়খ', value: currentAuthor.name_bn, clear: { author: undefined } },
  ]
  const shown = chips.filter((chip): chip is FilterChip => !!chip)

  if (!shown.length) return null

  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
      {shown.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => onChange(chip.clear)}
          className="group inline-flex items-center gap-1.5 rounded-full border border-gold/50 bg-gold/10 py-1 ps-3 pe-2 text-sm text-primary transition hover:border-gold hover:bg-gold/20"
        >
          <span className="text-primary/70">{chip.label}:</span>
          <span className="font-semibold">{chip.value}</span>
          <span className="flex size-4.5 items-center justify-center rounded-full transition group-hover:bg-gold/25">
            <X className="size-3.5" aria-label="সরান" />
          </span>
        </button>
      ))}
      {shown.length > 1 && (
        <button
          type="button"
          onClick={() => onChange({ category: undefined, author: undefined })}
          className="px-2 py-1 text-sm text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline"
        >
          সব মুছুন
        </button>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ Results */

function libraryListQuery(key: LibraryType, search: LibrarySearch) {
  const path = key === 'durus' ? '/dars-series' : '/books'
  return infiniteQueryOptions({
    queryKey: ['library', key, { q: search.q, category: search.category, author: search.author, sort: search.sort, page: search.page }],
    queryFn: ({ pageParam }) =>
      api<Paginated<Book | DarsSeries>>(path, { query: { q: search.q, category: search.category, author: search.author, sort: search.sort, page: pageParam, per_page: PER_PAGE[key] } }),
    initialPageParam: search.page ?? 1,
    getNextPageParam: (last) => (last.meta.current_page < last.meta.last_page ? last.meta.current_page + 1 : undefined),
  })
}

function useLibraryList<T>(key: LibraryType, search: LibrarySearch) {
  const query = useInfiniteQuery(libraryListQuery(key, search))
  return { ...query, items: (query.data?.pages.flatMap((page) => page.data) ?? []) as T[] }
}

function ResultsHeader({ total, noun, query }: { total?: number; noun: string; query?: string }) {
  if (total === undefined) return <Skeleton className="mb-6 h-5 w-40" />
  return (
    <p className="mb-6 text-sm text-muted-foreground">
      {query ? (
        <>
          “<span className="font-semibold text-foreground">{query}</span>” খুঁজে {bnNum(total)}টি {noun} পাওয়া গেছে
        </>
      ) : (
        <>
          মোট {bnNum(total)}টি {noun}
        </>
      )}
    </p>
  )
}

/**
 * Appends the next page in place, but is a real link to ?page=N so crawlers (and new tabs) reach every page of the catalogue.
 * Pages before a deep-linked start are offered the same way.
 */
function LoadMore({ search, nextPage, loading, onClick }: { search: LibrarySearch; nextPage?: number; loading: boolean; onClick: () => void }) {
  const firstPage = search.page ?? 1
  if (!nextPage && firstPage === 1) return null
  return (
    <div className="mt-12 flex flex-wrap justify-center gap-3">
      {firstPage > 1 && (
        <Button variant="ghost" size="lg" className="h-11 rounded-full px-6" asChild>
          <Link to="/library" search={{ ...search, page: firstPage > 2 ? firstPage - 1 : undefined }} rel="prev">
            আগের পৃষ্ঠা
          </Link>
        </Button>
      )}
      {nextPage && (
        <Button variant="outline" size="lg" className="h-11 rounded-full px-8" disabled={loading} asChild>
          <Link
            to="/library"
            search={{ ...search, page: nextPage }}
            rel="next"
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
              e.preventDefault()
              onClick()
            }}
          >
            {loading && <Loader2 className="animate-spin" />} আরও দেখুন
          </Link>
        </Button>
      )}
    </div>
  )
}

/** Books stand in rows on wooden shelves, one plank per grid row. */
function BookResults({ search }: { search: LibrarySearch }) {
  const query = useLibraryList<Book>('books', search)
  const books = query.items

  return (
    <>
      <ResultsHeader total={query.data?.pages[0].meta.total} noun="কিতাব" query={search.q} />
      {query.isLoading ? (
        <BookGridSkeleton count={10} />
      ) : books.length ? (
        <div className="book-shelves">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      ) : (
        <EmptyState icon={BookOpen} title="কোনো কিতাব পাওয়া যায়নি">
          অন্য নাম দিয়ে খুঁজুন বা ফিল্টার বদলে দেখুন।
        </EmptyState>
      )}
      <LoadMore search={search} nextPage={query.hasNextPage ? (query.data?.pages.at(-1)?.meta.current_page ?? 0) + 1 : undefined} loading={query.isFetchingNextPage} onClick={() => query.fetchNextPage()} />
    </>
  )
}

function DurusResults({ search }: { search: LibrarySearch }) {
  const query = useLibraryList<DarsSeries>('durus', search)
  const series = query.items

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
      <LoadMore search={search} nextPage={query.hasNextPage ? (query.data?.pages.at(-1)?.meta.current_page ?? 0) + 1 : undefined} loading={query.isFetchingNextPage} onClick={() => query.fetchNextPage()} />
    </>
  )
}
