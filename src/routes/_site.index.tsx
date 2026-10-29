import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, BookOpen, Headphones, Languages, Search } from 'lucide-react'
import { useState } from 'react'
import { AuthorAvatar } from '@/components/author-avatar'
import { BookCard, ProgressBar, Shelf, ShelfPlank } from '@/components/book-card'
import { BookCover } from '@/components/book-cover'
import { Ornament, SectionHeading } from '@/components/brand'
import { BookGridSkeleton, EmptyState } from '@/components/states'
import { SeriesCard } from '@/components/series-card'
import { Button } from '@/components/ui/button'
import { authorsQuery, booksQuery, seriesListQuery } from '@/lib/queries'
import { bnNum } from '@/lib/text'
import { useLibrary } from '@/lib/user-data'
import { pageTitle } from '@/lib/head'

export const Route = createFileRoute('/_site/')({
  head: () => pageTitle(),
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
    <section className="wood-panel relative overflow-hidden">
      <div className="pattern-star absolute inset-0 opacity-[0.09]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,oklch(0.15_0.03_45/0.55))]" />
      <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 py-20 text-center md:py-28">
        <p lang="ar" dir="rtl" className="font-arabic text-2xl text-gold md:text-3xl">
          بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
        </p>
        <Ornament className="my-6" />
        <h1 className="text-3xl leading-tight font-bold text-wood-foreground md:text-5xl md:leading-tight">
          আলিমদের কিতাব ও দারস,
          <br />
          <span className="text-gold">আরবি ও বাংলায়</span> পাশাপাশি
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-wood-foreground/80 md:text-lg">
          প্রতিটি আরবি বাক্যের পাশে তার বাংলা অনুবাদ — কিতাবের পাতার মতো করে পড়ুন, হাইলাইট ও নোট রাখুন, আর দারস শুনুন আরবি-বাংলা সাবটাইটেলসহ।
        </p>

        <form
          className="mt-9 flex w-full max-w-xl items-center gap-2 rounded-full border border-gold/40 bg-parchment/95 p-1.5 shadow-xl"
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

        <div className="mt-10 grid w-full max-w-3xl grid-cols-1 gap-3 text-start sm:grid-cols-3">
          {[
            { icon: Languages, title: 'বাক্যে বাক্যে অনুবাদ', text: 'আরবি বাক্যে চাপ দিলে বাংলা অংশটি আলোকিত হয়' },
            { icon: BookOpen, title: 'কিতাবের মতো পাঠ', text: 'ডানে আরবি, বামে বাংলা — পাতা ও টীকাসহ' },
            { icon: Headphones, title: 'সাবটাইটেলসহ দারস', text: 'শুনতে শুনতে আরবি ও বাংলা লেখা দেখুন' },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-white/10 bg-black/15 p-4 backdrop-blur-sm">
              <f.icon className="mb-2 size-5 text-gold" />
              <div className="font-semibold text-wood-foreground">{f.title}</div>
              <div className="mt-1 text-sm text-wood-foreground/70">{f.text}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="gold-rule relative opacity-70" />
    </section>
  )
}

function ContinueReading() {
  const { entries } = useLibrary()
  const reading = entries.filter((e) => e.book && e.last_page && e.status !== 'completed' && e.status !== 'dropped').slice(0, 3)
  if (!reading.length) return null

  return (
    <section>
      <SectionHeading title="পড়া চালিয়ে যান" />
      <div className="grid gap-4 md:grid-cols-3">
        {reading.map((entry) => (
          <Link
            key={entry.book_id}
            to="/books/$slug/read/$page"
            params={{ slug: entry.book!.slug, page: String(entry.last_page) }}
            hash={entry.last_sentence_id ? `s-${entry.last_sentence_id}` : undefined}
            className="group flex gap-4 rounded-xl border bg-card p-3 shadow-sm transition hover:border-gold/60 hover:shadow-md"
          >
            <BookCover book={entry.book!} className="w-16 shrink-0" />
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
              <div className="line-clamp-1 font-heading font-semibold group-hover:text-primary">{entry.book!.title_bn}</div>
              <div className="text-xs text-muted-foreground">পৃষ্ঠা {bnNum(entry.last_page ?? 1)}</div>
              <ProgressBar value={entry.progress} />
            </div>
          </Link>
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
        subtitle="সম্প্রতি যুক্ত হওয়া কিতাবসমূহ"
        action={
          <Button variant="ghost" asChild>
            <Link to="/books">
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
        subtitle="আরবি ও বাংলা সাবটাইটেলসহ ব্যাখ্যা"
        action={
          <Button variant="ghost" asChild>
            <Link to="/durus">
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
        title="লেখকগণ"
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
          <Link
            key={author.id}
            to="/authors/$slug"
            params={{ slug: author.slug }}
            className="group flex flex-col items-center rounded-xl border bg-card p-5 text-center transition hover:border-gold/60 hover:shadow-md"
          >
            <AuthorAvatar author={author} className="size-16 text-lg" />
            <p className="mt-3 line-clamp-2 text-sm font-semibold group-hover:text-primary">{author.name_bn}</p>
            <p lang="ar" dir="rtl" className="mt-0.5 line-clamp-1 font-arabic text-sm text-muted-foreground">
              {author.name_ar}
            </p>
          </Link>
        ))}
      </div>
    </section>
  )
}
