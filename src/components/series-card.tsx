import { Link } from '@tanstack/react-router'
import { ArrowUpRight, Headphones, Video } from 'lucide-react'
import { PatternTint } from '@/components/pattern'
import { bnNum, formatTime } from '@/lib/text'
import type { DarsSeries } from '@/lib/types'

export function SeriesCard({ series }: { series: DarsSeries }) {
  const isAudio = series.media_type === 'audio'
  const MediaIcon = isAudio ? Headphones : Video

  return (
    <Link
      to="/durus/series/$slug"
      params={{ slug: series.slug }}
      className="group relative isolate flex h-full min-h-60 flex-col overflow-hidden rounded-2xl border bg-card p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-gold/60 hover:shadow-[0_14px_30px_-14px_oklch(0.3_0.05_50/0.45)]"
    >
      {/* background: rosette pattern, then a soft veil so the text stays crisp */}
      <div aria-hidden className="pattern-tile pointer-events-none absolute inset-0 -z-10 opacity-[0.13] dark:hidden" />
      <PatternTint className="-z-10 hidden opacity-[0.05] dark:block" />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-b from-card/40 via-card/60 to-card/95" />

      {/* the Arabic title as a large watermark behind the content */}
      <p
        lang="ar"
        dir="rtl"
        aria-hidden
        className="pointer-events-none absolute top-[3.6rem] right-5 left-5 -z-10 overflow-hidden text-right font-arabic text-[3.4rem] leading-[1.15] font-bold whitespace-nowrap text-primary/[0.09] transition-colors duration-300 select-none group-hover:text-primary/[0.12] dark:text-gold/[0.08] dark:group-hover:text-gold/[0.12]"
      >
        {series.title_ar}
      </p>

      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/85 px-3 py-1 text-xs font-semibold tracking-wide shadow-xs backdrop-blur-sm">
          <MediaIcon className="size-3.5 text-gold" />
          {isAudio ? 'অডিও' : 'ভিডিও'}
        </span>
        {!!series.total_seconds && <span className="rounded-full bg-background/60 px-2 py-0.5 text-[13px] font-medium text-muted-foreground tabular-nums">{bnNum(formatTime(series.total_seconds))}</span>}
      </div>

      <div className="mt-auto pt-16">
        <h3 className="line-clamp-2 text-xl leading-snug font-bold text-foreground transition-colors group-hover:text-primary">{series.title_bn}</h3>
        {series.author && <p className="mt-1.5 line-clamp-1 text-sm text-muted-foreground">{series.author.name_bn}</p>}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-border/80 pt-3.5 text-sm">
        <span className="font-medium text-foreground/75">{series.durus_count !== undefined ? `${bnNum(series.durus_count)}টি দারস` : 'দারস সিরিজ'}</span>
        <span className="flex size-8 items-center justify-center rounded-full border bg-background/70 text-muted-foreground transition group-hover:border-gold/60 group-hover:bg-primary group-hover:text-primary-foreground">
          <ArrowUpRight className="size-4" />
        </span>
      </div>
    </Link>
  )
}
