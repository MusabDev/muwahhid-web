import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { BookOpen, ChevronRight, Headphones, PlayCircle, Video } from 'lucide-react'
import { ProgressBar } from '@/components/book-card'
import { BookCover } from '@/components/book-cover'
import { SectionHeading } from '@/components/brand'
import { CategoryBadge } from '@/components/category-filter'
import { EpisodeList, episodeNumber } from '@/components/episode-list'
import { Markdown } from '@/components/markdown'
import { ShareButton } from '@/components/share-button'
import { DarsSeriesStatusMenu } from '@/components/status-menu'
import { CenterSpinner, EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { api } from '@/lib/api'
import { darsLink } from '@/lib/links'
import { podcastEpisodes, podcastPath } from '@/lib/podcast'
import { orNotFound, seriesQuery } from '@/lib/queries'
import { breadcrumbLd, isoDuration, personLd, seo } from '@/lib/seo'
import { absoluteUrl } from '@/lib/site'
import { bnNum, formatTime, stripMarkdown } from '@/lib/text'
import type { Dars, DarsSeries } from '@/lib/types'
import { useDarsSeriesProgress } from '@/lib/user-data'
import { cn } from '@/lib/utils'
import { PatternBackdrop } from '@/components/pattern'

export const Route = createFileRoute('/_site/durus/$slug/')({
  // old dars links were /durus/{id}: send them, permanently, to /durus/{series}/{number}
  beforeLoad: async ({ params }) => {
    if (!/^\d+$/.test(params.slug)) return
    const dars = await orNotFound(api<Dars>(`/durus/${params.slug}`))
    if (dars.series) throw redirect({ to: '/durus/$slug/$number', params: { slug: dars.series.slug, number: String(dars.number) }, statusCode: 301 })
  },
  loader: ({ context, params }) => orNotFound(context.queryClient.ensureQueryData(seriesQuery(params.slug))),
  head: ({ loaderData: series }) => {
    if (!series) return {}
    const path = `/durus/${series.slug}`
    const durus = series.durus ?? []
    const seconds = seriesSeconds(series)
    const head = seo({
      title: `${series.title_bn}${series.author ? ` — ${series.author.name_bn}` : ''} | দারস সিরিজ`,
      description: series.about_md ?? `${series.title_ar} (${series.title_bn}): ${bnNum(durus.length)}টি দারস, আরবি ও বাংলা সাবটাইটেল এবং পূর্ণ ট্রান্সক্রিপ্টসহ।`,
      path,
      jsonLd: [
        {
          '@type': 'CreativeWorkSeries',
          '@id': `${absoluteUrl(path)}#series`,
          url: absoluteUrl(path),
          name: series.title_bn,
          alternateName: [series.title_ar, series.title_translit].filter(Boolean),
          ...(series.about_md ? { description: stripMarkdown(series.about_md) } : {}),
          inLanguage: ['ar', 'bn'],
          isAccessibleForFree: true,
          ...(series.author ? { author: personLd(series.author) } : {}),
          ...(series.book ? { about: { '@type': 'Book', name: series.book.title_bn, url: absoluteUrl(`/books/${series.book.slug}`) } } : {}),
          ...(series.category ? { genre: series.category.name_bn } : {}),
          ...(isoDuration(seconds) ? { timeRequired: isoDuration(seconds) } : {}),
          hasPart: durus.map((d) => ({
            '@type': d.media_type === 'video' ? 'VideoObject' : 'AudioObject',
            name: d.title_bn,
            position: d.number,
            url: absoluteUrl(`${path}/${d.number}`),
          })),
        },
        breadcrumbLd([
          ['দারস', '/durus'],
          ...(series.category ? [[series.category.name_bn, `/durus?category=${series.category.slug}`] as [string, string]] : []),
          [series.title_bn, path],
        ]),
      ],
    })
    // an audio series doubles as a podcast
    if (podcastEpisodes(series).length) head.links.push({ rel: 'alternate', type: 'application/rss+xml', title: `${series.title_bn} (পডকাস্ট)`, href: absoluteUrl(podcastPath(series.slug)) })
    return head
  },
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
              <div className="mb-4 flex flex-wrap justify-center gap-2 md:justify-start">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/50 bg-gold/10 px-3 py-0.5 text-xs font-semibold text-primary">
                  {isAudio ? <Headphones className="size-3.5 text-gold" /> : <Video className="size-3.5 text-gold" />}
                  {isAudio ? 'অডিও দারস' : 'ভিডিও দারস'}
                </span>
                {series.category && (
                  <Link to="/durus" search={{ category: series.category.slug }} className="transition hover:opacity-80">
                    <CategoryBadge name={series.category.name_bn} />
                  </Link>
                )}
              </div>

              <p lang="ar" dir="rtl" className="font-arabic text-3xl leading-normal font-bold text-primary md:text-4xl">
                {series.title_ar}
              </p>
              <h1 className="mt-2 text-2xl leading-snug font-bold text-balance md:text-[2rem]">{series.title_bn}</h1>
              {series.title_translit && <p className="mt-1.5 text-base text-muted-foreground italic md:text-lg">{series.title_translit}</p>}

              {series.author && (
                <p className="mt-4">
                  <span className="text-muted-foreground">মুদাররিস: </span>
                  <Link to="/authors/$slug" params={{ slug: series.author.slug }} className="font-semibold transition-colors hover:text-primary">
                    {series.author.name_bn}
                  </Link>
                </p>
              )}

              <Stats series={series} />

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 md:justify-start">
                {(resume ?? durus[0]) && (
                  <Button size="lg" className="h-11 w-full px-6 text-base lg:w-auto" asChild>
                    <Link {...darsLink(resume ?? durus[0], series.slug)}>
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
          {durus.length ? <EpisodeList durus={durus} seriesSlug={series.slug} searchable={durus.length > 4} /> : <EmptyState title="এই সিরিজে এখনো কোনো দারস নেই" />}
        </section>
      </div>
    </>
  )
}

function Breadcrumbs({ series }: { series: DarsSeries }) {
  return (
    <nav aria-label="breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
      <Link to="/durus" className="shrink-0 transition hover:text-primary">
        দারস
      </Link>
      {series.category && (
        <>
          <ChevronRight className="size-3.5 shrink-0 opacity-60" />
          <Link to="/durus" search={{ category: series.category.slug }} className="shrink-0 transition hover:text-primary">
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

/** Dars count, set as one quiet line under the title. */
function Stats({ series }: { series: DarsSeries }) {
  const count = series.durus?.length ?? 0
  if (!count) return null
  return (
    <p className="mt-1.5 flex items-center gap-2 text-sm text-muted-foreground">
      <Headphones className="size-4 text-gold" /> {bnNum(count)}টি দারস
    </p>
  )
}
