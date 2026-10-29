import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { BookOpen, FileText, Headphones, ListTree } from 'lucide-react'
import { AuthorAvatar } from '@/components/author-avatar'
import { ProgressBar } from '@/components/book-card'
import { BookCover } from '@/components/book-cover'
import { Ornament } from '@/components/brand'
import { Markdown } from '@/components/markdown'
import { PdfDownload } from '@/components/pdf-download'
import { SeriesCard } from '@/components/series-card'
import { CenterSpinner, EmptyState } from '@/components/states'
import { StatusMenu } from '@/components/status-menu'
import { TocList } from '@/components/toc-list'
import { Button } from '@/components/ui/button'
import { bookQuery } from '@/lib/queries'
import { bnNum } from '@/lib/text'
import { useLibraryEntry } from '@/lib/user-data'
import { pageTitle } from '@/lib/head'

export const Route = createFileRoute('/_site/books/$slug/')({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(bookQuery(params.slug)),
  head: ({ loaderData }) => pageTitle(loaderData?.title_bn, loaderData?.about_md),
  pendingComponent: CenterSpinner,
  component: BookPage,
})

function BookPage() {
  const { slug } = Route.useParams()
  const { data: book } = useQuery(bookQuery(slug))
  const { entry } = useLibraryEntry(book)

  if (!book) return <CenterSpinner />

  const startPage = book.first_page ?? 1
  const resumePage = entry?.last_page ?? null

  return (
    <>
      <section className="relative overflow-hidden border-b bg-card/70">
        <div className="pattern-star absolute inset-0 opacity-[0.1]" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[260px_1fr] md:py-16">
          <div className="mx-auto w-48 md:w-full">
            <BookCover book={book} className="shadow-[0_24px_40px_-12px_oklch(0.2_0.03_50/0.6)]" />
          </div>

          <div className="flex flex-col justify-center">
            <p lang="ar" dir="rtl" className="font-arabic text-3xl leading-relaxed font-bold text-primary md:text-4xl">
              {book.title_ar}
            </p>
            <h1 className="mt-2 text-2xl font-bold md:text-3xl">{book.title_bn}</h1>
            <p className="mt-1 text-sm text-muted-foreground italic">{book.title_translit}</p>

            {book.author && (
              <Link to="/authors/$slug" params={{ slug: book.author.slug }} className="mt-5 flex w-fit items-center gap-3 rounded-full border bg-background/60 py-1.5 ps-1.5 pe-4 hover:border-gold/60">
                <AuthorAvatar author={book.author} className="size-9 text-xs ring-1 ring-offset-1" />
                <span>
                  <span className="block text-sm font-semibold">{book.author.name_bn}</span>
                  <span lang="ar" className="block font-arabic text-xs text-muted-foreground">
                    {book.author.name_ar}
                  </span>
                </span>
              </Link>
            )}

            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {book.pages_count !== undefined && (
                <span className="flex items-center gap-1.5">
                  <FileText className="size-4 text-gold" /> {bnNum(book.pages_count)} পৃষ্ঠা
                </span>
              )}
              {!!book.toc?.length && (
                <span className="flex items-center gap-1.5">
                  <ListTree className="size-4 text-gold" /> {bnNum(book.toc.length)}টি অধ্যায়
                </span>
              )}
              {!!book.dars_series?.length && (
                <span className="flex items-center gap-1.5">
                  <Headphones className="size-4 text-gold" /> দারস রয়েছে
                </span>
              )}
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              {book.pages_count ? (
                <Button size="lg" className="h-11 px-6 text-base" asChild>
                  <Link
                    to="/books/$slug/read/$page"
                    params={{ slug: book.slug, page: String(resumePage ?? startPage) }}
                    hash={resumePage && entry?.last_sentence_id ? `s-${entry.last_sentence_id}` : undefined}
                  >
                    <BookOpen /> {resumePage ? `পড়া চালিয়ে যান · পৃষ্ঠা ${bnNum(resumePage)}` : 'পড়া শুরু করুন'}
                  </Link>
                </Button>
              ) : null}
              <StatusMenu book={book} />
              {!!book.pages_count && <PdfDownload book={book} />}
            </div>

            {entry && entry.progress > 0 && (
              <div className="mt-5 max-w-sm">
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>অগ্রগতি</span>
                  <span>{bnNum(Math.round(entry.progress))}%</span>
                </div>
                <ProgressBar value={entry.progress} />
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[1fr_380px]">
        <div className="space-y-10">
          <section>
            <h2 className="mb-4 text-xl font-bold">কিতাব পরিচিতি</h2>
            {book.about_md ? <Markdown text={book.about_md} className="leading-relaxed text-foreground/90" /> : <p className="text-muted-foreground">পরিচিতি যুক্ত করা হয়নি।</p>}
          </section>

          {!!book.dars_series?.length && (
            <section>
              <h2 className="mb-4 text-xl font-bold">এই কিতাবের দারস</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {book.dars_series.map((series) => (
                  <SeriesCard key={series.id} series={series} />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside>
          <div className="rounded-xl border bg-card p-5 shadow-sm lg:sticky lg:top-24">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <ListTree className="size-5 text-gold" /> সূচিপত্র
            </h2>
            <Ornament className="my-3 justify-start [&>span:first-child]:hidden" />
            {book.toc?.length ? (
              <div className="max-h-[60vh] overflow-y-auto pe-1 scrollbar-thin">
                <TocList slug={book.slug} entries={book.toc} />
              </div>
            ) : (
              <EmptyState title="সূচিপত্র নেই" />
            )}
          </div>
        </aside>
      </div>
    </>
  )
}
