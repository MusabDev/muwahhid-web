import { createFileRoute, Link } from '@tanstack/react-router'
import { BookMarked, Bookmark as BookmarkIcon, CloudOff } from 'lucide-react'
import { BookCard, ProgressBar } from '@/components/book-card'
import { BookGridSkeleton, EmptyState, PageTitle } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useUser } from '@/lib/auth'
import { bnNum, STATUS_LABELS, STATUS_ORDER } from '@/lib/text'
import type { BookStatus } from '@/lib/types'
import { useBookmarks, useLibrary } from '@/lib/user-data'
import { pageTitle } from '@/lib/head'

export const Route = createFileRoute('/_site/my-library')({
  head: () => pageTitle('আমার লাইব্রেরি'),
  validateSearch: (search: Record<string, unknown>): { tab?: BookStatus | 'all' | 'bookmarks' } => ({
    tab: typeof search.tab === 'string' ? (search.tab as BookStatus) : undefined,
  }),
  component: LibraryPage,
})

function LibraryPage() {
  const { tab = 'all' } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: user } = useUser()
  const { entries, isLoading } = useLibrary()
  const { bookmarks } = useBookmarks()

  const withBooks = entries.filter((e) => e.book && (e.status || e.last_page))
  const filtered = tab === 'all' ? withBooks : withBooks.filter((e) => e.status === tab)
  const count = (status: string) => withBooks.filter((e) => e.status === status).length

  return (
    <>
      <PageTitle title="আমার লাইব্রেরি" arabic="مَكْتَبَتِي" />
      <div className="mx-auto max-w-7xl px-4 py-10">
        {!user && (
          <div className="mb-8 flex flex-col items-start gap-3 rounded-xl border border-gold/40 bg-gold/10 p-4 sm:flex-row sm:items-center">
            <CloudOff className="size-5 shrink-0 text-gold" />
            <p className="flex-1 text-sm">
              আপনার লাইব্রেরি, হাইলাইট ও বুকমার্ক এখন শুধু এই ব্রাউজারে সংরক্ষিত। লগইন করলে সবকিছু আপনার অ্যাকাউন্টে যুক্ত হবে এবং সব ডিভাইসে পাবেন।
            </p>
            <Button size="sm" asChild>
              <Link to="/login">লগইন করুন</Link>
            </Button>
          </div>
        )}

        <Tabs value={tab} onValueChange={(value) => navigate({ search: { tab: value === 'all' ? undefined : (value as BookStatus) } })}>
          <div className="-mx-4 overflow-x-auto px-4 pb-2">
            <TabsList className="h-auto w-max">
              <TabsTrigger value="all">সব ({bnNum(withBooks.length)})</TabsTrigger>
              {STATUS_ORDER.map((status) => (
                <TabsTrigger key={status} value={status}>
                  {STATUS_LABELS[status]} ({bnNum(count(status))})
                </TabsTrigger>
              ))}
              <TabsTrigger value="bookmarks">
                <BookmarkIcon className="size-3.5" /> বুকমার্ক ({bnNum(bookmarks.length)})
              </TabsTrigger>
            </TabsList>
          </div>
        </Tabs>

        <div className="mt-8">
          {tab === 'bookmarks' ? (
            bookmarks.length ? (
              <ul className="divide-y overflow-hidden rounded-xl border bg-card">
                {bookmarks.map((bookmark) => (
                  <li key={bookmark.id}>
                    {bookmark.book ? (
                      <Link
                        to="/books/$slug/read/$page"
                        params={{ slug: bookmark.book.slug, page: String(bookmark.page_number) }}
                        hash={bookmark.sentence_id ? `s-${bookmark.sentence_id}` : undefined}
                        className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/60"
                      >
                        <BookmarkIcon className="size-4 shrink-0 fill-gold text-gold" />
                        <span className="flex-1">
                          <span className="block font-semibold">{bookmark.label || `পৃষ্ঠা ${bnNum(bookmark.page_number)}`}</span>
                          <span className="block text-xs text-muted-foreground">{bookmark.book.title_bn}</span>
                        </span>
                        <span className="text-xs text-muted-foreground">পৃষ্ঠা {bnNum(bookmark.page_number)}</span>
                      </Link>
                    ) : (
                      <div className="px-5 py-3.5 text-sm text-muted-foreground">
                        {bookmark.label || 'বুকমার্ক'} · পৃষ্ঠা {bnNum(bookmark.page_number)}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={BookmarkIcon} title="কোনো বুকমার্ক নেই">
                পড়ার সময় উপরের বুকমার্ক বাটন থেকে পাতা বা বাক্য সংরক্ষণ করুন।
              </EmptyState>
            )
          ) : isLoading ? (
            <BookGridSkeleton />
          ) : filtered.length ? (
            <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {filtered.map((entry) => (
                <BookCard
                  key={entry.book_id}
                  book={entry.book!}
                  footer={
                    <div className="space-y-1.5 pt-2">
                      {entry.status && <span className="inline-block rounded-full bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground">{STATUS_LABELS[entry.status]}</span>}
                      {entry.last_page ? (
                        <>
                          <ProgressBar value={entry.progress} />
                          <Link
                            to="/books/$slug/read/$page"
                            params={{ slug: entry.book!.slug, page: String(entry.last_page) }}
                            hash={entry.last_sentence_id ? `s-${entry.last_sentence_id}` : undefined}
                            className="block text-xs font-semibold text-primary hover:underline"
                          >
                            পৃষ্ঠা {bnNum(entry.last_page)} থেকে পড়ুন →
                          </Link>
                        </>
                      ) : null}
                    </div>
                  }
                />
              ))}
            </div>
          ) : (
            <EmptyState icon={BookMarked} title="এখানে এখনো কোনো কিতাব নেই">
              কিতাবের পাতায় “লাইব্রেরিতে যোগ করুন” থেকে কিতাব যোগ করুন। পড়া শুরু করলে কিতাবটি নিজে থেকেই এখানে চলে আসবে।
            </EmptyState>
          )}
        </div>
      </div>
    </>
  )
}
