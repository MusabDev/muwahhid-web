import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { AuthorAvatar } from '@/components/author-avatar'
import { EmptyState, PageTitle } from '@/components/states'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { authorsQuery } from '@/lib/queries'
import { bnNum } from '@/lib/text'
import { pageTitle } from '@/lib/head'

export const Route = createFileRoute('/_site/authors/')({
  head: () => pageTitle('লেখকগণ'),
  component: AuthorsPage,
})

function AuthorsPage() {
  const { data, isLoading } = useQuery(authorsQuery())
  const [filter, setFilter] = useState('')
  const needle = filter.trim().toLowerCase()
  const authors = (data?.data ?? []).filter(
    (a) => !needle || a.name_bn.includes(filter) || a.name_ar.includes(filter) || a.name_translit.toLowerCase().includes(needle),
  )

  return (
    <>
      <PageTitle title="লেখকগণ" arabic="الْعُلَمَاء" />
      <div className="mx-auto max-w-7xl px-4 py-10">
        <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="নাম দিয়ে খুঁজুন…" className="mb-8 h-10 max-w-sm bg-card" />
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : authors.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {authors.map((author) => (
              <Link
                key={author.id}
                to="/authors/$slug"
                params={{ slug: author.slug }}
                className="group flex items-center gap-4 rounded-xl border bg-card p-5 shadow-sm transition hover:border-gold/60 hover:shadow-md"
              >
                <AuthorAvatar author={author} className="size-16 text-lg" />
                <div className="min-w-0">
                  <p className="font-heading font-semibold group-hover:text-primary">{author.name_bn}</p>
                  <p lang="ar" dir="rtl" className="font-arabic text-muted-foreground">
                    {author.name_ar}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {bnNum(author.books_count ?? 0)}টি কিতাব · {bnNum(author.dars_series_count ?? 0)}টি দারস সিরিজ
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="কোনো লেখক পাওয়া যায়নি" />
        )}
      </div>
    </>
  )
}
