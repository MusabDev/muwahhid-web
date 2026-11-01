import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, BookOpen, ChevronRight, FileText, ScrollText } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { AboutPanel } from '@/components/about-panel'
import { AuthorAvatar } from '@/components/author-avatar'
import { CategoryBadge } from '@/components/category-filter'
import { BookCard, ProgressBar, Shelf, ShelfPlank } from '@/components/book-card'
import { BookCover } from '@/components/book-cover'
import { JournalCard, journalGroups } from '@/components/book-journal'
import { SectionHeading } from '@/components/brand'
import { Markdown } from '@/components/markdown'
import { PdfDownload } from '@/components/pdf-download'
import { SeriesCard } from '@/components/series-card'
import { ShareButton } from '@/components/share-button'
import { CenterSpinner } from '@/components/states'
import { StatusMenu } from '@/components/status-menu'
import { TocSection } from '@/components/toc-list'
import { Button } from '@/components/ui/button'
import { isSharh } from '@/lib/book'
import { authorQuery, bookQuery, orNotFound } from '@/lib/queries'
import { bnNum } from '@/lib/text'
import type { Author, Book } from '@/lib/types'
import { useAnnotations, useBookmarks, useLibraryEntry } from '@/lib/user-data'
import { cn } from '@/lib/utils'
import { bookLd, breadcrumbLd, seo } from '@/lib/seo'
import { PatternBackdrop } from '@/components/pattern'
import { SITE_URL } from '@/lib/site'

export const Route = createFileRoute('/_site/books/$slug/')({
  loader: async ({ context, params }) => {
    const book = await orNotFound(context.queryClient.ensureQueryData(bookQuery(params.slug)))
    // the "more by this author" shelf is part of the page, so render it on the server too
    if (book.author) await context.queryClient.prefetchQuery(authorQuery(book.author.slug))
    return book
  },
  head: ({ loaderData: book }) => {
    if (!book) return {}
    const path = `/books/${book.slug}`
    const byline = [book.author?.name_bn, isSharh(book) ? book.explainer?.name_bn : null].filter(Boolean).join(' ও ')
    return seo({
      title: `${book.title_bn}${byline ? ` — ${byline}` : ''}`,
      description: book.about_md ?? `${book.title_ar} (${book.title_bn})${byline ? `, ${byline}` : ''}। আরবি মূলপাঠ ও বাংলা অনুবাদ পাশাপাশি, বাক্য ধরে ধরে পড়ুন বা পিডিএফ নামান।`,
      path,
      type: 'book',
      meta: [
        ...(book.author ? [{ property: 'book:author', content: `${SITE_URL}/authors/${book.author.slug}` }] : []),
        ...(book.updated_at ? [{ property: 'book:release_date', content: book.created_at ?? book.updated_at }] : []),
        ...(book.category ? [{ property: 'book:tag', content: book.category.name_bn }] : []),
      ],
      jsonLd: [
        bookLd(book),
        breadcrumbLd([
          ['লাইব্রেরি', '/library'],
          ...(book.category ? [[book.category.name_bn, `/library?category=${book.category.slug}`] as [string, string]] : []),
          [book.title_bn, path],
        ]),
      ],
    })
  },
  pendingComponent: CenterSpinner,
  component: BookPage,
})

function BookPage() {
  const { slug } = Route.useParams()
  const { data: book } = useQuery(bookQuery(slug))
  const { entry } = useLibraryEntry(book)

  if (!book) return <CenterSpinner />

  const sharh = isSharh(book)
  const startPage = book.first_page ?? 1
  const resumePage = entry?.last_page ?? null

  return (
    <>
      <section className="relative overflow-hidden">
        <PatternBackdrop opacity={0.16} />
        <div className="relative mx-auto max-w-6xl px-4 pt-6 pb-12 md:pb-16">
          <Breadcrumbs book={book} />

          <div className="mt-8 grid gap-10 md:grid-cols-[260px_1fr] md:gap-8">
            <div className="relative mx-auto w-48 md:w-full">
              <div aria-hidden className="absolute inset-x-[8%] -bottom-4 h-8 rounded-[50%] bg-black/25 blur-xl dark:bg-black/50" />
              <BookCover book={book} priority className="relative shadow-[0_24px_40px_-12px_oklch(0.2_0.03_50/0.6)]" />
            </div>

            <div className="flex min-w-0 flex-col items-center text-center md:items-start md:text-left">
              <div className="mb-4 flex flex-wrap justify-center gap-2 md:justify-start">
                {book.category && (
                  <Link to="/library" search={{ category: book.category.slug }} className="transition hover:opacity-80">
                    <CategoryBadge name={book.category.name_bn} />
                  </Link>
                )}
                {sharh && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/50 bg-gold/10 px-3 py-0.5 text-xs font-semibold text-primary">
                    <ScrollText className="size-3.5 text-gold" /> শারহ · ব্যাখ্যাগ্রন্থ
                  </span>
                )}
              </div>

              <p lang="ar" dir="rtl" className="font-arabic text-3xl leading-normal font-bold text-primary md:text-4xl">
                {book.title_ar}
              </p>
              <h1 className="mt-2 text-2xl leading-snug font-bold text-balance md:text-[2rem]">{book.title_bn}</h1>
              {book.title_translit && <p className="mt-1.5 text-base text-muted-foreground italic md:text-lg">{book.title_translit}</p>}

              {book.author && (
                <p className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 md:justify-start">
                  <Byline author={book.author} label={sharh ? 'মূল গ্রন্থকার' : 'লেখক'} />
                  {sharh && (
                    <>
                      <span aria-hidden className="text-gold">·</span>
                      <Byline author={book.explainer!} label="ব্যাখ্যাকার" />
                    </>
                  )}
                </p>
              )}

              <Stats book={book} />

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 md:justify-start">
                {book.pages_count ? (
                  <Button size="lg" className="h-11 w-full px-6 text-base lg:w-auto" asChild>
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
                <ShareButton title={book.title_bn} text={book.title_ar} />
              </div>

              {entry && entry.progress > 0 && (
                <div className="mt-6 w-full max-w-sm">
                  <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                    <span>আপনার অগ্রগতি</span>
                    <span className="font-medium text-foreground tabular-nums">{bnNum(Math.round(entry.progress))}%</span>
                  </div>
                  <ProgressBar value={entry.progress} />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-12 lg:grid-cols-[1fr_360px] lg:gap-8">
        <div className="min-w-0 space-y-14">
          {book.about_md && <AboutPanel title="কিতাব পরিচিতি" arabic="التعريف بالكتاب" text={book.about_md} />}

          <TocSection slug={book.slug} entries={book.toc} currentPage={resumePage ?? undefined} />

          {book.author && (
            <section>
              <SectionHeading title={sharh ? 'গ্রন্থকারদ্বয়' : 'লেখক পরিচিতি'} />
              <div className={cn('grid gap-4', sharh && 'md:grid-cols-2')}>
                <AuthorCard author={book.author} label={sharh ? 'মূল গ্রন্থকার' : undefined} />
                {sharh && <AuthorCard author={book.explainer!} label="ব্যাখ্যাকার" />}
              </div>
            </section>
          )}

          {!!book.dars_series?.length && (
            <section>
              <SectionHeading title="এই কিতাবের দারস" subtitle="অডিও ও ভিডিও ব্যাখ্যা সিরিজ" />
              <div className="grid gap-4 sm:grid-cols-2">
                {book.dars_series.map((series) => (
                  <SeriesCard key={series.id} series={series} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* a long notes card would run off screen, so the sidebar only sticks without it */}
        <aside className="min-w-0 space-y-6 lg:sticky lg:top-24 lg:self-start lg:has-data-journal:static">
          <DetailsCard book={book} />
          <MyJournal book={book} />
        </aside>
      </div>

      {book.author && <MoreByAuthor book={book} author={book.author} />}
    </>
  )
}

function Breadcrumbs({ book }: { book: Book }) {
  return (
    <nav aria-label="breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
      <Link to="/library" className="shrink-0 transition hover:text-primary">
        লাইব্রেরি
      </Link>
      {book.category && (
        <>
          <ChevronRight className="size-3.5 shrink-0 opacity-60" />
          <Link to="/library" search={{ category: book.category.slug }} className="shrink-0 transition hover:text-primary">
            {book.category.name_bn}
          </Link>
        </>
      )}
      <ChevronRight className="size-3.5 shrink-0 opacity-60" />
      <span aria-current="page" className="truncate font-medium text-foreground">
        {book.title_bn}
      </span>
    </nav>
  )
}

function Byline({ author, label }: { author: Author; label: string }) {
  return (
    <span>
      <span className="text-muted-foreground">{label}: </span>
      <Link to="/authors/$slug" params={{ slug: author.slug }} className="font-semibold transition-colors hover:text-primary">
        {author.name_bn}
      </Link>
    </span>
  )
}

/** Page count, set as one quiet line under the title. */
function Stats({ book }: { book: Book }) {
  if (!book.pages_count) return null
  return (
    <p className="mt-1.5 flex items-center gap-2 text-sm text-muted-foreground">
      <FileText className="size-4 text-gold" /> {bnNum(book.pages_count)} পৃষ্ঠা
    </p>
  )
}

function DetailsCard({ book }: { book: Book }) {
  const sharh = isSharh(book)
  const updated = book.updated_at ? new Date(book.updated_at).toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' }) : null

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <h2 className="mb-3 font-bold">কিতাবের তথ্য</h2>
      <dl className="divide-y text-sm">
        {book.author && (
          <DetailRow label={sharh ? 'মূল গ্রন্থকার' : 'লেখক'}>
            <Link to="/authors/$slug" params={{ slug: book.author.slug }} className="hover:text-primary">
              {book.author.name_bn}
            </Link>
          </DetailRow>
        )}
        {sharh && (
          <DetailRow label="ব্যাখ্যাকার">
            <Link to="/authors/$slug" params={{ slug: book.explainer!.slug }} className="hover:text-primary">
              {book.explainer!.name_bn}
            </Link>
          </DetailRow>
        )}
        {book.category && (
          <DetailRow label="বিষয়">
            <Link to="/library" search={{ category: book.category.slug }} className="hover:text-primary">
              {book.category.name_bn}
            </Link>
          </DetailRow>
        )}
        <DetailRow label="ধরন">{sharh ? 'ব্যাখ্যাগ্রন্থ (শারহ)' : 'মূল গ্রন্থ'}</DetailRow>
        {book.pages_count !== undefined && <DetailRow label="পৃষ্ঠা সংখ্যা">{bnNum(book.pages_count)}</DetailRow>}
        <DetailRow label="ভাষা">আরবি মূলপাঠ ও বাংলা অনুবাদ</DetailRow>
        {updated && <DetailRow label="সর্বশেষ হালনাগাদ">{updated}</DetailRow>}
      </dl>
    </div>
  )
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="text-end font-medium">{children}</dd>
    </div>
  )
}

/** The reader's own notes and bookmarks in this kitab; nothing when there are none. */
function MyJournal({ book }: { book: Book }) {
  const { annotations, remove: removeNote } = useAnnotations({ bookId: book.id })
  const { bookmarks, remove: removeBookmark } = useBookmarks(book.id)
  const notes = useMemo(() => annotations.filter((a) => a.note?.trim()), [annotations])
  const [group] = useMemo(() => journalGroups(notes, bookmarks, new Map([[book.id, book]])), [notes, bookmarks, book])

  if (!group) return null
  return (
    <div data-journal>
      <JournalCard group={group} title="আপনার নোট ও বুকমার্ক" onRemoveNote={removeNote} onRemoveBookmark={removeBookmark} />
    </div>
  )
}

function AuthorCard({ author, label }: { author: Author; label?: string }) {
  return (
    <div className="flex h-full flex-col rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <AuthorAvatar author={author} className="size-14" />
        <div className="min-w-0">
          {label && <p className="text-xs font-medium text-gold">{label}</p>}
          <p className="font-heading text-lg leading-snug font-bold">{author.name_bn}</p>
          <p lang="ar" dir="rtl" className="text-left font-arabic text-muted-foreground">
            {author.name_ar}
          </p>
        </div>
      </div>
      {author.about_md && <Markdown text={author.about_md} className="mt-4 line-clamp-4 text-sm leading-relaxed text-foreground/80" />}
      <Link
        to="/authors/$slug"
        params={{ slug: author.slug }}
        className="group mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold text-primary hover:underline"
      >
        সম্পূর্ণ পরিচিতি ও কিতাবসমূহ <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  )
}

/** Other books by the same author, shown on a shelf below the main content. */
function MoreByAuthor({ book, author }: { book: Book; author: Author }) {
  const { data } = useQuery(authorQuery(author.slug))
  const others = data?.books?.filter((other) => other.id !== book.id).slice(0, 6) ?? []
  if (!others.length) return null

  return (
    <section className="border-t bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <SectionHeading
          title={`${author.name_bn}-এর আরও কিতাব`}
          action={
            <Link to="/authors/$slug" params={{ slug: author.slug }} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline">
              সব দেখুন <ArrowRight className="size-3.5" />
            </Link>
          }
        />
        <Shelf>
          {others.map((other) => (
            <BookCard key={other.id} book={{ ...other, author }} />
          ))}
        </Shelf>
        <ShelfPlank />
      </div>
    </section>
  )
}
