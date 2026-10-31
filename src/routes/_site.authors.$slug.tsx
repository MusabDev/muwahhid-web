import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { BookOpen, ChevronDown, Feather, Headphones, Hourglass, ScrollText } from 'lucide-react'
import { type ReactNode, useLayoutEffect, useRef, useState } from 'react'
import { AuthorAvatar } from '@/components/author-avatar'
import { BookRow } from '@/components/book-card'
import { Ornament } from '@/components/brand'
import { Markdown } from '@/components/markdown'
import { PatternBackdrop } from '@/components/pattern'
import { SeriesCard } from '@/components/series-card'
import { CenterSpinner, EmptyState } from '@/components/states'
import { deathLabel } from '@/lib/author'
import { authorQuery, orNotFound } from '@/lib/queries'
import { breadcrumbLd, personLd, seo } from '@/lib/seo'
import { absoluteUrl, SITE_NAME } from '@/lib/site'
import { bnNum } from '@/lib/text'
import type { Author } from '@/lib/types'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_site/authors/$slug')({
  loader: ({ context, params }) => orNotFound(context.queryClient.ensureQueryData(authorQuery(params.slug))),
  head: ({ loaderData: author }) => {
    if (!author) return {}
    const path = `/authors/${author.slug}`
    const works = [...(author.books ?? []), ...(author.explained_books ?? [])]
    const head = seo({
      title: `${author.name_bn} (${author.name_ar}) — জীবনী, কিতাব ও দারস`,
      description: author.about_md ?? `${author.name_bn}-এর কিতাব ও দারস, আরবি মূলপাঠ ও বাংলা অনুবাদে।`,
      path,
      type: 'profile',
      jsonLd: [
        {
          '@type': 'ProfilePage',
          '@id': absoluteUrl(path),
          url: absoluteUrl(path),
          name: author.name_bn,
          inLanguage: 'bn',
          mainEntity: {
            ...personLd(author),
            ...(works.length ? { workExample: works.map((b) => ({ '@type': 'Book', name: b.title_bn, alternateName: b.title_ar, url: absoluteUrl(`/books/${b.slug}`) })) } : {}),
          },
        },
        breadcrumbLd([
          ['মূল পাতা', '/'],
          ['আহলুল ইলম', '/authors'],
          [author.name_bn, path],
        ]),
      ],
    })
    // each scholar has a feed of their newly added books and durus
    return { ...head, links: [...head.links, { rel: 'alternate', type: 'application/rss+xml', title: `${author.name_bn} — ${SITE_NAME}`, href: absoluteUrl(`${path}/rss.xml`) }] }
  },
  pendingComponent: CenterSpinner,
  component: AuthorPage,
})

function AuthorPage() {
  const { slug } = Route.useParams()
  const { data: author } = useQuery(authorQuery(slug))
  if (!author) return <CenterSpinner />

  const books = author.books ?? []
  const explained = author.explained_books ?? []
  const series = author.dars_series ?? []
  const death = deathLabel(author)

  return (
    <>
      <section className="relative overflow-hidden">
        <PatternBackdrop opacity={0.2} />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 pt-12 pb-10 text-center md:pt-16 md:pb-12">
          <Link to="/authors" className="flex items-center gap-1.5 text-sm font-medium text-gold transition-colors hover:text-primary">
            <Feather className="size-4" />
            লেখক
          </Link>
          <AuthorAvatar author={author} className="mt-5 size-24 md:size-28" />
          <p lang="ar" dir="rtl" className="mt-5 font-arabic text-3xl leading-snug text-gold md:text-4xl">
            {author.name_ar}
          </p>
          <h1 className="mt-1 text-3xl font-bold text-balance md:text-5xl">{author.name_bn}</h1>
          <p className="mt-2 text-sm text-muted-foreground italic">{author.name_translit}</p>
          <Ornament className="mt-5" />

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {death && <Stat icon={Hourglass}>{death}</Stat>}
            {!!books.length && (
              <Stat icon={BookOpen} href="#books">
                {bnNum(books.length)}টি কিতাব
              </Stat>
            )}
            {!!explained.length && (
              <Stat icon={ScrollText} href="#sharh">
                {bnNum(explained.length)}টি শারহ
              </Stat>
            )}
            {!!series.length && (
              <Stat icon={Headphones} href="#durus">
                {bnNum(series.length)}টি দারস সিরিজ
              </Stat>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-16 px-4 py-10 md:py-14">
        {author.about_md && <About author={author} />}

        {(!!books.length || !explained.length) && (
          <Section id="books" title="কিতাবসমূহ" arabic="المؤلفات" count={books.length}>
            {books.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {books.map((book) => (
                  <BookRow
                    key={book.id}
                    book={{ ...book, author }}
                    byline={
                      book.explainer && (
                        <>
                          <span className="text-gold">ব্যাখ্যা: </span>
                          {book.explainer.name_bn}
                        </>
                      )
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyState title="এখনো কোনো কিতাব নেই" />
            )}
          </Section>
        )}

        {!!explained.length && (
          <Section id="sharh" title="ব্যাখ্যাগ্রন্থ (শারহ)" arabic="الشروح" subtitle="অন্য কিতাবের উপর এই লেখকের ব্যাখ্যা" count={explained.length}>
            <div className="grid gap-4 md:grid-cols-2">
              {explained.map((book) => (
                <BookRow
                  key={book.id}
                  book={{ ...book, explainer: author }}
                  byline={
                    book.author && (
                      <>
                        <span className="text-gold">মূল: </span>
                        {book.author.name_bn}
                      </>
                    )
                  }
                />
              ))}
            </div>
          </Section>
        )}

        {!!series.length && (
          <Section id="durus" title="দারস সিরিজ" arabic="الدروس" count={series.length}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {series.map((s) => (
                <SeriesCard key={s.id} series={{ ...s, author }} />
              ))}
            </div>
          </Section>
        )}
      </div>
    </>
  )
}

function Stat({ icon: Icon, href, children }: { icon: typeof BookOpen; href?: string; children: ReactNode }) {
  const className = 'flex items-center gap-1.5 rounded-full border bg-card/90 px-3.5 py-1.5 text-sm shadow-sm backdrop-blur-sm'
  const content = (
    <>
      <Icon className="size-4 text-gold" />
      {children}
    </>
  )
  return href ? (
    <a href={href} className={cn(className, 'transition hover:border-gold/60 hover:text-primary')}>
      {content}
    </a>
  ) : (
    <span className={className}>{content}</span>
  )
}

function Section({ id, title, arabic, subtitle, count, children }: { id: string; title: string; arabic: string; subtitle?: string; count: number; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <header className="mb-6 border-b border-gold/30 pb-3">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 className="text-2xl font-bold">{title}</h2>
          <p lang="ar" dir="rtl" className="font-arabic text-lg text-gold">
            {arabic}
          </p>
          {count > 0 && <span className="ms-auto text-sm text-muted-foreground">{bnNum(count)}টি</span>}
        </div>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </header>
      {children}
    </section>
  )
}

const COLLAPSED_HEIGHT = 288

/** The biography in a gilt frame; long ones start folded with a fade and a "read more" toggle. */
function About({ author }: { author: Author }) {
  const body = useRef<HTMLDivElement>(null)
  const [long, setLong] = useState(false)
  const [open, setOpen] = useState(false)

  useLayoutEffect(() => {
    if (body.current) setLong(body.current.scrollHeight > COLLAPSED_HEIGHT + 48)
  }, [author.about_md])

  const folded = long && !open

  return (
    <section className="relative rounded-xl border border-gold/40 bg-parchment p-6 shadow-sm md:p-8">
      <div aria-hidden className="pointer-events-none absolute inset-1.5 rounded-lg border border-gold/20" />
      <header className="relative mb-4 flex flex-wrap items-baseline gap-x-3">
        <h2 className="text-xl font-bold">পরিচিতি</h2>
        <p lang="ar" dir="rtl" className="font-arabic text-lg text-gold">
          ترجمة المؤلف
        </p>
      </header>
      <div className="relative">
        <div ref={body} className={cn('overflow-hidden', folded && 'max-h-72')}>
          <Markdown text={author.about_md!} className="leading-relaxed" />
        </div>
        {folded && <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-b from-transparent to-parchment" />}
      </div>
      {long && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="relative mt-3 flex items-center gap-1 text-sm font-semibold text-primary hover:text-gold"
        >
          {open ? 'কম দেখুন' : 'আরও পড়ুন'}
          <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
        </button>
      )}
    </section>
  )
}
