import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { BookCard, Shelf, ShelfPlank } from '@/components/book-card'
import { BookGridSkeleton, EmptyState, PageTitle } from '@/components/states'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { booksQuery } from '@/lib/queries'
import { bnNum } from '@/lib/text'
import { pageTitle } from '@/lib/head'

interface BooksSearch {
  page?: number
  sort?: 'latest' | 'title'
}

export const Route = createFileRoute('/_site/books/')({
  head: () => pageTitle('কিতাবসমূহ'),
  validateSearch: (search: Record<string, unknown>): BooksSearch => ({
    page: Number(search.page) > 1 ? Number(search.page) : undefined,
    sort: search.sort === 'title' ? 'title' : undefined,
  }),
  component: BooksPage,
})

function BooksPage() {
  const { page = 1, sort } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data, isLoading } = useQuery(booksQuery({ page, sort, per_page: 24 }))
  const books = data?.data ?? []
  const rows = Array.from({ length: Math.ceil(books.length / 6) }, (_, i) => books.slice(i * 6, i * 6 + 6))

  return (
    <>
      <PageTitle title="কিতাবসমূহ" arabic="الْمَكْتَبَة">
        {data && <span>মোট {bnNum(data.meta.total)}টি কিতাব</span>}
      </PageTitle>
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-8 flex items-center justify-end gap-3">
          <span className="text-sm text-muted-foreground">সাজান:</span>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={sort ?? 'latest'}
            onValueChange={(value) => value && navigate({ search: { sort: value === 'title' ? 'title' : undefined } })}
          >
            <ToggleGroupItem value="latest">নতুন</ToggleGroupItem>
            <ToggleGroupItem value="title">নাম</ToggleGroupItem>
          </ToggleGroup>
        </div>

        {isLoading ? (
          <BookGridSkeleton count={12} />
        ) : books.length ? (
          <div className="space-y-12">
            {rows.map((row, i) => (
              <div key={i}>
                <Shelf>
                  {row.map((book) => (
                    <BookCard key={book.id} book={book} />
                  ))}
                </Shelf>
                <ShelfPlank />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="কোনো কিতাব পাওয়া যায়নি" />
        )}

        {data && data.meta.last_page > 1 && (
          <div className="mt-12 flex items-center justify-center gap-3">
            <Button variant="outline" disabled={page <= 1} asChild={page > 1}>
              <Link to="/books" search={{ sort, page: page - 1 }}>
                <ChevronLeft /> আগের
              </Link>
            </Button>
            <span className="text-sm text-muted-foreground">
              {bnNum(page)} / {bnNum(data.meta.last_page)}
            </span>
            <Button variant="outline" disabled={page >= data.meta.last_page} asChild={page < data.meta.last_page}>
              <Link to="/books" search={{ sort, page: page + 1 }}>
                পরের <ChevronRight />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </>
  )
}
