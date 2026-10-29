import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { SeriesCard } from '@/components/series-card'
import { EmptyState, PageTitle } from '@/components/states'
import { Skeleton } from '@/components/ui/skeleton'
import { seriesListQuery } from '@/lib/queries'
import { pageTitle } from '@/lib/head'

export const Route = createFileRoute('/_site/durus/')({
  head: () => pageTitle('দারস সিরিজ'),
  component: DurusPage,
})

function DurusPage() {
  const { data, isLoading } = useQuery(seriesListQuery())

  return (
    <>
      <PageTitle title="দারস সিরিজ" arabic="الدُّرُوس">
        আরবি ও বাংলা সাবটাইটেলসহ কিতাবের ব্যাখ্যা শুনুন
      </PageTitle>
      <div className="mx-auto max-w-7xl px-4 py-10">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : data?.data.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.data.map((series) => (
              <SeriesCard key={series.id} series={series} />
            ))}
          </div>
        ) : (
          <EmptyState title="এখনো কোনো দারস যুক্ত হয়নি" />
        )}
      </div>
    </>
  )
}
