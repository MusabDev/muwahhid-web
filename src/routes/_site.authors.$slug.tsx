import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { AuthorAvatar } from '@/components/author-avatar'
import { BookCard, Shelf, ShelfPlank } from '@/components/book-card'
import { SectionHeading } from '@/components/brand'
import { Markdown } from '@/components/markdown'
import { SeriesCard } from '@/components/series-card'
import { CenterSpinner, EmptyState } from '@/components/states'
import { authorQuery } from '@/lib/queries'
import { pageTitle } from '@/lib/head'

export const Route = createFileRoute('/_site/authors/$slug')({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(authorQuery(params.slug)),
  head: ({ loaderData }) => pageTitle(loaderData?.name_bn, loaderData?.about_md),
  pendingComponent: CenterSpinner,
  component: AuthorPage,
})

function AuthorPage() {
  const { slug } = Route.useParams()
  const { data: author } = useQuery(authorQuery(slug))
  if (!author) return <CenterSpinner />

  return (
    <>
      <section className="wood-panel relative overflow-hidden">
        <div className="pattern-star absolute inset-0 opacity-[0.08]" />
        <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 py-14 text-center md:flex-row md:text-start">
          <AuthorAvatar author={author} className="size-28 text-3xl ring-offset-wood" />
          <div>
            <p lang="ar" dir="rtl" className="font-arabic text-3xl text-gold">
              {author.name_ar}
            </p>
            <h1 className="mt-1 text-3xl font-bold text-wood-foreground">{author.name_bn}</h1>
            <p className="mt-1 text-sm text-wood-foreground/70 italic">{author.name_translit}</p>
          </div>
        </div>
        <div className="gold-rule opacity-70" />
      </section>

      <div className="mx-auto max-w-7xl space-y-16 px-4 py-12">
        {author.about_md && (
          <section className="mx-auto max-w-3xl rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="mb-3 text-lg font-bold">পরিচিতি</h2>
            <Markdown text={author.about_md} className="leading-relaxed" />
          </section>
        )}

        <section>
          <SectionHeading title="কিতাবসমূহ" />
          {author.books?.length ? (
            <>
              <Shelf>
                {author.books.map((book) => (
                  <BookCard key={book.id} book={{ ...book, author }} />
                ))}
              </Shelf>
              <ShelfPlank />
            </>
          ) : (
            <EmptyState title="এখনো কোনো কিতাব নেই" />
          )}
        </section>

        {!!author.dars_series?.length && (
          <section>
            <SectionHeading title="দারস সিরিজ" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {author.dars_series.map((series) => (
                <SeriesCard key={series.id} series={{ ...series, author }} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  )
}
