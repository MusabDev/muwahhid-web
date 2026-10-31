import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Search } from 'lucide-react'
import { useState } from 'react'
import { AuthorCard } from '@/components/author-card'
import { BookCard, Shelf, ShelfPlank } from '@/components/book-card'
import { Ornament, SectionHeading } from '@/components/brand'
import { ContinueCard, inProgressEntries } from '@/components/continue-card'
import { PatternBackdrop } from '@/components/pattern'
import { BookGridSkeleton, EmptyState } from '@/components/states'
import { SeriesCard } from '@/components/series-card'
import { Button } from '@/components/ui/button'
import { authorsQuery, booksQuery, seriesListQuery, statsQuery } from '@/lib/queries'
import { bnNum } from '@/lib/text'
import { useLibrary } from '@/lib/user-data'
import { organizationLd, seo, websiteLd } from '@/lib/seo'

export const Route = createFileRoute('/_site/')({
  // prefetch (not ensure) so one failing shelf doesn't take the whole home page down
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.prefetchQuery(statsQuery()),
      queryClient.prefetchQuery(booksQuery({ per_page: 12 })),
      queryClient.prefetchQuery(seriesListQuery()),
      queryClient.prefetchQuery(authorsQuery()),
    ]),
  head: () => seo({ path: '/', jsonLd: [websiteLd(), organizationLd()] }),
  component: Home,
})

function Home() {
  return (
    <>
      <Hero />
      <div className="mx-auto max-w-7xl space-y-20 px-4 pt-14">
        <ContinueReading />
        <NewBooks />
        <DurusSection />
        <AuthorsSection />
      </div>
    </>
  )
}

function Hero() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  return (
    <section className="relative overflow-hidden">
      <PatternBackdrop opacity={0.22} fade="hero" />
      <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 pt-20 pb-16 text-center md:pt-28 md:pb-20">
        <p lang="ar" dir="rtl" className="font-arabic text-2xl text-primary md:text-3xl">
          بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
        </p>
        <Ornament className="my-6" />
        <h1 className="text-3xl leading-tight font-bold text-foreground md:text-5xl md:leading-tight">
          আহলুল ইলমের কিতাব ও দারস,
          <br />
          <span className="text-primary">আরবি ও বাংলায়</span> পাশাপাশি
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
          প্রতিটি আরবি বাক্যের পাশেই তার বাংলা অনুবাদ, ঠিক কিতাবের পাতার মতো। পড়তে পড়তে হাইলাইট করুন, নোট লিখে রাখুন। দারসগুলোও শুনতে পারবেন আরবি-বাংলা সাবটাইটেলসহ।
        </p>

        <SiteStats />

        <form
          className="mt-9 flex w-full max-w-xl items-center gap-2 rounded-full border bg-card p-1.5 shadow-lg shadow-primary/5 focus-within:border-gold"
          onSubmit={(e) => {
            e.preventDefault()
            navigate({ to: '/search', search: { q: q.trim() } })
          }}
        >
          <Search className="ms-3 size-5 shrink-0 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="কিতাব, লেখক বা আরবি/বাংলা বাক্য…"
            className="h-10 min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
          />
          <Button type="submit" className="h-10 rounded-full px-5">
            খুঁজুন
          </Button>
        </form>

      </div>
    </section>
  )
}

/** One quiet line of totals under the hero text: books · translated pages · hours of durus. */
function SiteStats() {
  const { data } = useQuery(statsQuery())
  const count = (n: number) => bnNum(n.toLocaleString('en-IN'))

  const durus = !data
    ? null
    : data.durus_seconds >= 3600
      ? `${count(Math.round(data.durus_seconds / 3600))} ঘণ্টার দারস`
      : `${count(Math.max(data.durus_seconds > 0 ? 1 : 0, Math.round(data.durus_seconds / 60)))} মিনিটের দারস`

  const items = data ? [`${count(data.books)}টি কিতাব`, `${count(data.translated_pages)} অনূদিত পৃষ্ঠা`, durus] : null

  return (
    <p className="mt-7 min-h-6 text-sm tracking-wide text-muted-foreground sm:text-base">
      {items?.map((item, i) => (
        <span key={i}>
          {i > 0 && <span className="mx-2.5 text-gold/70">·</span>}
          {item}
        </span>
      ))}
    </p>
  )
}

function ContinueReading() {
  const { entries } = useLibrary()
  const reading = inProgressEntries(entries)
  if (!reading.length) return null

  return (
    <section>
      <SectionHeading title="পড়া চালিয়ে যান" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {reading.map((entry, i) => (
          <ContinueCard key={entry.book_id} entry={entry} featured={i === 0 && reading.length > 1} />
        ))}
      </div>
    </section>
  )
}

function NewBooks() {
  const { data, isLoading } = useQuery(booksQuery({ per_page: 12 }))

  return (
    <section>
      <SectionHeading
        title="নতুন কিতাব"
        subtitle="নতুন যোগ হওয়া কিতাব"
        action={
          <Button variant="ghost" asChild>
            <Link to="/library">
              সব দেখুন <ArrowLeft className="rotate-180" />
            </Link>
          </Button>
        }
      />
      {isLoading ? (
        <BookGridSkeleton />
      ) : data?.data.length ? (
        <>
          <Shelf>
            {data.data.slice(0, 6).map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </Shelf>
          <ShelfPlank />
        </>
      ) : (
        <EmptyState title="এখনো কোনো কিতাব যুক্ত হয়নি" />
      )}
    </section>
  )
}

function DurusSection() {
  const { data } = useQuery(seriesListQuery())
  if (!data?.data.length) return null

  return (
    <section>
      <SectionHeading
        title="দারস সিরিজ"
        subtitle="আরবি আর বাংলা সাবটাইটেলসহ শুনুন"
        action={
          <Button variant="ghost" asChild>
            <Link to="/library" search={{ type: 'durus' }}>
              সব দেখুন <ArrowLeft className="rotate-180" />
            </Link>
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.data.slice(0, 6).map((series) => (
          <SeriesCard key={series.id} series={series} />
        ))}
      </div>
    </section>
  )
}

function AuthorsSection() {
  const { data } = useQuery(authorsQuery())
  if (!data?.data.length) return null

  return (
    <section>
      <SectionHeading
        title="আহলুল ইলম"
        action={
          <Button variant="ghost" asChild>
            <Link to="/authors">
              সব দেখুন <ArrowLeft className="rotate-180" />
            </Link>
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {data.data.slice(0, 6).map((author) => (
          <AuthorCard key={author.id} author={author} compact />
        ))}
      </div>
    </section>
  )
}
