import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { BookOpen, ChevronRight, Headphones, PlayCircle, Video } from 'lucide-react'
import { AuthorAvatar } from '@/components/author-avatar'
import { ProgressBar } from '@/components/book-card'
import { BookCover } from '@/components/book-cover'
import { SectionHeading } from '@/components/brand'
import { CategoryBadge } from '@/components/category-filter'
import { HeroStats, type HeroStat } from '@/components/hero-stats'
import { EpisodeList, episodeNumber } from '@/components/episode-list'
import { Markdown } from '@/components/markdown'
import { ShareButton } from '@/components/share-button'
import { DarsSeriesStatusMenu } from '@/components/status-menu'
import { CenterSpinner, EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { seriesQuery } from '@/lib/queries'
import { bnNum, formatTime } from '@/lib/text'
import type { DarsSeries } from '@/lib/types'
import { useDarsSeriesProgress } from '@/lib/user-data'
import { cn } from '@/lib/utils'
import { pageTitle } from '@/lib/head'
import { PatternBackdrop } from '@/components/pattern'

export const Route = createFileRoute('/_site/durus/series/$slug')({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(seriesQuery(params.slug)),
  head: ({ loaderData }) => pageTitle(loaderData && [loaderData.title_bn, loaderData.author?.name_bn].filter(Boolean).join(' - '), loaderData?.about_md),
  pendingComponent: CenterSpinner,
  component: SeriesPage,
})

function SeriesPage() {
  const { slug } = Route.useParams()
  const { data: series } = useQuery(seriesQuery(slug))
  const { progress, completed, resume } = useDarsSeriesProgress(series)
  if (!series) return <CenterSpinner />

  const durus = series.durus ?? []
  const totalSeconds = seriesSeconds(series)
  const isAudio = durus.length ? durus.every((d) => d.media_type === 'audio') : series.media_type === 'audio'

  return (
    <>
      <section className="relative overflow-hidden border-b">
        <PatternBackdrop opacity={0.16} />
        {/* the Arabic title as a quiet watermark across the hero */}
        <p
          lang="ar"
          dir="rtl"
          aria-hidden
          className="pointer-events-none absolute -right-6 bottom-6 hidden max-w-[70%] overflow-hidden font-arabic text-[7rem] leading-none font-bold whitespace-nowrap text-primary/[0.05] select-none md:block dark:text-gold/[0.05]"
        >
          {series.title_ar}
        </p>

        <div className="relative mx-auto max-w-6xl px-4 pt-6 pb-12 md:pb-16">
          <Breadcrumbs series={series} />

          <div className={cn('mt-8 grid gap-10 md:gap-12', series.book && 'md:grid-cols-[260px_1fr]')}>
            {series.book && (
              <Link to="/books/$slug" params={{ slug: series.book.slug }} className="relative mx-auto w-48 transition hover:-translate-y-0.5 md:w-full">
                <div aria-hidden className="absolute inset-x-[8%] -bottom-4 h-8 rounded-[50%] bg-black/25 blur-xl dark:bg-black/50" />
                <BookCover book={series.book} className="relative shadow-[0_24px_40px_-12px_oklch(0.2_0.03_50/0.6)]" />
              </Link>
            )}

            <div className="flex min-w-0 flex-col items-center text-center md:items-start md:text-left">
              <div className="mb-3 flex flex-wrap justify-center gap-2 md:justify-start">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/50 bg-gold/10 px-3 py-0.5 text-xs font-semibold text-primary">
                  {isAudio ? <Headphones className="size-3.5 text-gold" /> : <Video className="size-3.5 text-gold" />}
                  {isAudio ? 'অডিও দারস' : 'ভিডিও দারস'}
                </span>
                {series.category && (
                  <Link to="/library" search={{ type: 'durus', category: series.category.slug }} className="transition hover:opacity-80">
                    <CategoryBadge name={series.category.name_bn} />
                  </Link>
                )}
              </div>

              <p lang="ar" dir="rtl" className="font-arabic text-3xl leading-relaxed font-bold text-primary md:text-4xl">
                {series.title_ar}
              </p>
              <h1 className="mt-1 text-2xl leading-snug font-bold text-balance md:text-[2rem]">{series.title_bn}</h1>
              {series.title_translit && <p className="mt-1.5 text-sm text-muted-foreground italic">{series.title_translit}</p>}

              {series.author && (
                <Link to="/authors/$slug" params={{ slug: series.author.slug }} className="group mt-6 flex items-center gap-3 text-start">
                  <AuthorAvatar author={series.author} className="size-10" />
                  <span className="min-w-0">
                    <span className="block text-xs text-muted-foreground">দারস প্রদান করেছেন</span>
                    <span className="block font-semibold transition-colors group-hover:text-primary">{series.author.name_bn}</span>
                  </span>
                </Link>
              )}

              <Stats series={series} />

              <div className="mt-7 flex flex-wrap items-center justify-center gap-3 md:justify-start">
                {(resume ?? durus[0]) && (
                  <Button size="lg" className="h-11 px-6 text-base shadow-sm" asChild>
                    <Link to="/durus/$id" params={{ id: String((resume ?? durus[0]).id) }}>
                      <PlayCircle /> {resume ? `শোনা চালিয়ে যান · দারস ${episodeNumber(resume.number)}` : 'প্রথম দারস শুরু করুন'}
                    </Link>
                  </Button>
                )}
                {!!durus.length && <DarsSeriesStatusMenu series={series} />}
                {series.book && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon-lg" aria-label="কিতাবটি পড়ুন" asChild>
                        <Link to="/books/$slug" params={{ slug: series.book.slug }}>
                          <BookOpen />
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>কিতাবটি পড়ুন</TooltipContent>
                  </Tooltip>
                )}
                <ShareButton title={series.title_bn} text={series.title_ar} />
              </div>

              {progress > 0 && (
                <div className="mt-6 w-full max-w-sm">
                  <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                    <span>
                      আপনার অগ্রগতি · {bnNum(completed)}/{bnNum(durus.length)} দারস শেষ
                    </span>
                    <span className="font-medium text-foreground tabular-nums">{bnNum(Math.round(progress))}%</span>
                  </div>
                  <ProgressBar value={progress} />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-12">
        {series.about_md && (
          <section>
            <SectionHeading title="সিরিজ পরিচিতি" />
            <Markdown text={series.about_md} className="max-w-3xl text-[17px] leading-relaxed text-foreground/90" />
          </section>
        )}

        <section>
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] text-gold">সংকলন</p>
              <h2 className="mt-1.5 font-heading text-3xl font-bold">সকল দারস</h2>
            </div>
            {!!durus.length && (
              <span className="pb-1 text-sm text-muted-foreground">
                {bnNum(durus.length)}টি দারস{totalSeconds > 0 && ` · মোট ${bnNum(formatTime(totalSeconds))}`}
              </span>
            )}
          </div>
          {durus.length ? <EpisodeList durus={durus} searchable={durus.length > 4} /> : <EmptyState title="এই সিরিজে এখনো কোনো দারস নেই" />}
        </section>
      </div>
    </>
  )
}

function Breadcrumbs({ series }: { series: DarsSeries }) {
  return (
    <nav aria-label="breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
      <Link to="/library" search={{ type: 'durus' }} className="shrink-0 transition hover:text-primary">
        দারস
      </Link>
      {series.category && (
        <>
          <ChevronRight className="size-3.5 shrink-0 opacity-60" />
          <Link to="/library" search={{ type: 'durus', category: series.category.slug }} className="shrink-0 transition hover:text-primary">
            {series.category.name_bn}
          </Link>
        </>
      )}
      <ChevronRight className="size-3.5 shrink-0 opacity-60" />
      <span aria-current="page" className="truncate font-medium text-foreground">
        {series.title_bn}
      </span>
    </nav>
  )
}

function seriesSeconds(series: DarsSeries) {
  return (series.durus ?? []).reduce((sum, d) => sum + (d.duration_seconds ?? 0), 0) || series.total_seconds || 0
}

/** The series' key figures, set inline under the title. */
function Stats({ series }: { series: DarsSeries }) {
  const durus = series.durus ?? []
  const seconds = seriesSeconds(series)
  const transcribed = durus.filter((d) => d.segments_count).length

  const items: HeroStat[] = [{ value: bnNum(durus.length), label: 'দারস' }]
  if (seconds) items.push({ value: bnNum(formatTime(seconds)), label: 'মোট সময়' })
  if (durus.length) items.push({ value: transcribed === durus.length ? 'সম্পূর্ণ' : `${bnNum(transcribed)}/${bnNum(durus.length)}`, label: 'ট্রান্সক্রিপ্ট' })
  items.push({ value: 'আরবি · বাংলা', label: 'ভাষা' })
  return <HeroStats items={items} />
}
