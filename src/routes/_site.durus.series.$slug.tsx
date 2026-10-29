import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { BookOpen, Headphones, PlayCircle, Video } from 'lucide-react'
import { BookCover } from '@/components/book-cover'
import { Markdown } from '@/components/markdown'
import { CenterSpinner, EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { seriesQuery } from '@/lib/queries'
import { bnNum, formatTime } from '@/lib/text'
import { pageTitle } from '@/lib/head'

export const Route = createFileRoute('/_site/durus/series/$slug')({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(seriesQuery(params.slug)),
  head: ({ loaderData }) => pageTitle(loaderData?.title_bn, loaderData?.about_md),
  pendingComponent: CenterSpinner,
  component: SeriesPage,
})

function SeriesPage() {
  const { slug } = Route.useParams()
  const { data: series } = useQuery(seriesQuery(slug))
  if (!series) return <CenterSpinner />

  return (
    <>
      <section className="relative overflow-hidden border-b bg-card/70">
        <div className="pattern-star absolute inset-0 opacity-[0.1]" />
        <div className="relative mx-auto flex max-w-5xl flex-col gap-8 px-4 py-12 md:flex-row md:items-center">
          {series.book && (
            <Link to="/books/$slug" params={{ slug: series.book.slug }} className="mx-auto w-36 shrink-0 md:mx-0">
              <BookCover book={series.book} />
            </Link>
          )}
          <div className="flex-1">
            <p lang="ar" dir="rtl" className="font-arabic text-3xl text-primary">
              {series.title_ar}
            </p>
            <h1 className="mt-1 text-3xl font-bold">{series.title_bn}</h1>
            <p className="mt-1 text-sm text-muted-foreground italic">{series.title_translit}</p>
            {series.author && (
              <Link to="/authors/$slug" params={{ slug: series.author.slug }} className="mt-3 inline-block text-sm font-semibold hover:text-primary">
                {series.author.name_bn}
              </Link>
            )}
            <div className="mt-5 flex flex-wrap gap-3">
              {series.durus?.[0] && (
                <Button size="lg" asChild>
                  <Link to="/durus/$id" params={{ id: String(series.durus[0].id) }}>
                    <PlayCircle /> প্রথম দারস শুনুন
                  </Link>
                </Button>
              )}
              {series.book && (
                <Button size="lg" variant="outline" asChild>
                  <Link to="/books/$slug" params={{ slug: series.book.slug }}>
                    <BookOpen /> কিতাবটি পড়ুন
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-10 px-4 py-10">
        {series.about_md && <Markdown text={series.about_md} className="leading-relaxed" />}

        <section>
          <h2 className="mb-4 text-xl font-bold">দারসসমূহ {series.durus && <span className="text-base font-normal text-muted-foreground">({bnNum(series.durus.length)})</span>}</h2>
          {series.durus?.length ? (
            <ol className="divide-y overflow-hidden rounded-xl border bg-card shadow-sm">
              {series.durus.map((dars) => (
                <li key={dars.id}>
                  <Link to="/durus/$id" params={{ id: String(dars.id) }} className="group flex items-center gap-4 px-5 py-4 transition hover:bg-muted/60">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-gold/50 font-heading text-sm font-semibold text-primary">
                      {bnNum(dars.number)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold group-hover:text-primary">{dars.title_bn}</p>
                      {dars.title_ar && (
                        <p lang="ar" dir="rtl" className="text-right font-arabic text-sm text-muted-foreground">
                          {dars.title_ar}
                        </p>
                      )}
                    </div>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {dars.media_type === 'video' ? <Video className="size-4" /> : <Headphones className="size-4" />}
                      {dars.duration_seconds ? formatTime(dars.duration_seconds) : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState title="এই সিরিজে এখনো কোনো দারস নেই" />
          )}
        </section>
      </div>
    </>
  )
}
