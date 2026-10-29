import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { BookOpen, Headphones, Quote, Search, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AuthorAvatar } from '@/components/author-avatar'
import { BookCover } from '@/components/book-cover'
import { HighlightText } from '@/components/highlight-text'
import { SeriesCard } from '@/components/series-card'
import { EmptyState, Spinner } from '@/components/states'
import { Button } from '@/components/ui/button'
import { searchQuery } from '@/lib/queries'
import { bnNum, formatTime } from '@/lib/text'
import { pageTitle } from '@/lib/head'

export const Route = createFileRoute('/_site/search')({
  head: () => pageTitle('অনুসন্ধান'),
  validateSearch: (search: Record<string, unknown>): { q: string } => ({ q: typeof search.q === 'string' ? search.q : '' }),
  component: SearchPage,
})

function SearchPage() {
  const { q } = Route.useSearch()
  const navigate = Route.useNavigate()
  const [input, setInput] = useState(q)
  useEffect(() => setInput(q), [q])
  const { data, isFetching } = useQuery(searchQuery(q))
  const total = data ? data.books.length + data.authors.length + data.sentences.length + data.segments.length + data.dars_series.length : 0

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          navigate({ search: { q: input.trim() } })
        }}
        className="flex items-center gap-2 rounded-full border bg-card p-1.5 shadow-sm focus-within:border-gold"
      >
        <Search className="ms-3 size-5 text-muted-foreground" />
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="কিতাব, লেখক বা আরবি/বাংলা বাক্য লিখুন…"
          className="h-10 min-w-0 flex-1 bg-transparent text-base outline-none"
        />
        <Button type="submit" className="h-10 rounded-full px-5">
          খুঁজুন
        </Button>
      </form>
      <p className="mt-2 ps-4 text-xs text-muted-foreground">আরবিতে হরকত ছাড়া লিখলেও চলবে — যেমন “رحمك الله”</p>

      <div className="mt-10">
        {q.trim().length < 2 ? (
          <EmptyState icon={Search} title="কী খুঁজতে চান?">
            কমপক্ষে দুটি অক্ষর লিখুন।
          </EmptyState>
        ) : isFetching && !data ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : !total ? (
          <EmptyState icon={Search} title="কিছু পাওয়া যায়নি">
            অন্য শব্দ দিয়ে চেষ্টা করুন।
          </EmptyState>
        ) : (
          data && (
            <div className="space-y-12">
              {data.books.length > 0 && (
                <ResultSection icon={BookOpen} title="কিতাব" count={data.books.length}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {data.books.map((book) => (
                      <Link key={book.id} to="/books/$slug" params={{ slug: book.slug }} className="flex gap-4 rounded-xl border bg-card p-3 hover:border-gold/60">
                        <BookCover book={book} className="w-14 shrink-0" />
                        <div className="min-w-0 self-center">
                          <p className="font-heading font-semibold">{book.title_bn}</p>
                          <p lang="ar" className="font-arabic text-muted-foreground">
                            {book.title_ar}
                          </p>
                          <p className="text-xs text-muted-foreground">{book.author?.name_bn}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </ResultSection>
              )}

              {data.authors.length > 0 && (
                <ResultSection icon={Users} title="লেখক" count={data.authors.length}>
                  <div className="flex flex-wrap gap-3">
                    {data.authors.map((author) => (
                      <Link key={author.id} to="/authors/$slug" params={{ slug: author.slug }} className="flex items-center gap-3 rounded-full border bg-card py-1.5 ps-1.5 pe-5 hover:border-gold/60">
                        <AuthorAvatar author={author} className="size-10 text-sm ring-1 ring-offset-1" />
                        <span className="font-semibold">{author.name_bn}</span>
                      </Link>
                    ))}
                  </div>
                </ResultSection>
              )}

              {data.sentences.length > 0 && (
                <ResultSection icon={Quote} title="কিতাবের বাক্য" count={data.sentences.length}>
                  <div className="space-y-3">
                    {data.sentences.map((hit) => (
                      <Link
                        key={hit.sentence_id}
                        to="/books/$slug/read/$page"
                        params={{ slug: hit.book_slug, page: String(hit.page_number) }}
                        hash={`s-${hit.sentence_id}`}
                        className="block rounded-xl border bg-card p-4 transition hover:border-gold/60 hover:shadow-sm"
                      >
                        <p lang="ar" dir="rtl" className="font-arabic text-lg leading-loose">
                          <HighlightText text={hit.text_ar} query={hit.lang === 'ar' ? q : ''} arabic />
                        </p>
                        <p className="mt-1 leading-relaxed text-foreground/85">
                          <HighlightText text={hit.text_bn} query={hit.lang === 'bn' ? q : ''} />
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {hit.book_title_bn} · পৃষ্ঠা {bnNum(hit.page_number)}
                        </p>
                      </Link>
                    ))}
                  </div>
                </ResultSection>
              )}

              {(data.dars_series.length > 0 || data.segments.length > 0) && (
                <ResultSection icon={Headphones} title="দারস" count={data.dars_series.length + data.segments.length}>
                  {data.dars_series.length > 0 && (
                    <div className="mb-4 grid gap-3 sm:grid-cols-2">
                      {data.dars_series.map((series) => (
                        <SeriesCard key={series.id} series={series} />
                      ))}
                    </div>
                  )}
                  <div className="space-y-3">
                    {data.segments.map((hit) => (
                      <Link
                        key={hit.segment_id}
                        to="/durus/$id"
                        params={{ id: String(hit.dars_id) }}
                        search={{ t: formatTime(hit.start_time) }}
                        className="flex gap-4 rounded-xl border bg-card p-4 hover:border-gold/60"
                      >
                        <span className="h-fit shrink-0 rounded-md bg-secondary px-2 py-1 font-mono text-xs">{formatTime(hit.start_time)}</span>
                        <div className="min-w-0">
                          <p lang="ar" dir="rtl" className="font-arabic text-lg">
                            <HighlightText text={hit.text_ar} query={q} arabic />
                          </p>
                          <p className="text-foreground/85">
                            <HighlightText text={hit.text_bn} query={q} />
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            দারস {bnNum(hit.dars_number)} · {hit.dars_title_bn}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </ResultSection>
              )}
            </div>
          )
        )}
      </div>
    </div>
  )
}

function ResultSection({ icon: Icon, title, count, children }: { icon: typeof Search; title: string; count: number; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
        <Icon className="size-5 text-gold" /> {title}
        <span className="text-sm font-normal text-muted-foreground">({bnNum(count)})</span>
      </h2>
      {children}
    </section>
  )
}
