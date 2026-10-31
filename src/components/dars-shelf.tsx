import { Link } from '@tanstack/react-router'
import { darsLink } from '@/lib/links'
import { ArrowRight, AudioLines, Headphones, Play, Video } from 'lucide-react'
import { ProgressBar } from '@/components/book-card'
import { StatusChip } from '@/components/continue-card'
import { episodeNumber } from '@/components/episode-list'
import { PatternTint } from '@/components/pattern'
import { bnNum, DARS_STATUS_LABELS, formatTime, timeAgo } from '@/lib/text'
import type { Dars, DarsEntry } from '@/lib/types'
import { DARS_COMPLETED_AT } from '@/lib/user-data'

export type DarsShelfEntry = DarsEntry & { dars: Dars }

/** Durus still being listened to, most recently played first. */
export function inProgressDurus(entries: DarsEntry[], limit = 3) {
  return entries
    .filter(
      (e): e is DarsShelfEntry =>
        !!e.dars && e.position_seconds > 0 && e.progress < DARS_COMPLETED_AT && e.status !== 'completed' && e.status !== 'dropped',
    )
    .sort((a, b) => (b.last_played_at ?? '').localeCompare(a.last_played_at ?? ''))
    .slice(0, limit)
}

/** A "continue listening" card; opening the dars resumes from the saved position. */
export function ContinueListeningCard({ entry }: { entry: DarsShelfEntry }) {
  const { dars } = entry
  const when = timeAgo(entry.last_played_at)
  const Icon = dars.media_type === 'video' ? Video : Headphones

  return (
    <Link
      {...darsLink(dars)}
      className="group relative isolate flex items-center gap-3.5 overflow-hidden rounded-xl border bg-card p-3 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-gold/60 hover:shadow-[0_14px_30px_-14px_oklch(0.3_0.05_50/0.45)]"
    >
      <div aria-hidden className="pattern-tile pointer-events-none absolute inset-0 -z-10 opacity-[0.14] dark:hidden" />
      <PatternTint className="-z-10 hidden opacity-[0.06] dark:block" />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-r from-card/95 via-card/85 to-card/55" />

      <span className="wood-panel relative flex size-14 shrink-0 flex-col items-center justify-center rounded-lg text-gold">
        <Icon className="size-4 opacity-80" />
        <span className="mt-0.5 font-heading text-lg leading-none tabular-nums">{episodeNumber(dars.number)}</span>
      </span>

      <div className="min-w-0 flex-1">
        {dars.series && <p className="truncate text-[11px] font-semibold text-muted-foreground">{dars.series.title_bn}</p>}
        <h3 className="line-clamp-1 font-heading leading-snug font-bold transition-colors group-hover:text-primary">{dars.title_bn}</h3>
        <p className="mt-0.5 truncate text-xs text-muted-foreground tabular-nums">
          {bnNum(formatTime(entry.position_seconds))}
          {!!dars.duration_seconds && <> / {bnNum(formatTime(dars.duration_seconds))}</>}
          {when && <> · {when}</>}
        </p>
        <ProgressBar value={entry.progress} className="mt-2" />
      </div>
    </Link>
  )
}

/** Every saved dars as a card grid, in the style of the continue cards above it. */
export function DarsShelf({ entries }: { entries: DarsShelfEntry[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {entries.map((entry) => (
        <DarsCard key={entry.dars_id} entry={entry} />
      ))}
    </div>
  )
}

function DarsCard({ entry }: { entry: DarsShelfEntry }) {
  const { dars } = entry
  const finished = entry.status === 'completed' || entry.progress >= DARS_COMPLETED_AT
  const started = !finished && entry.position_seconds > 0
  const when = timeAgo(entry.last_played_at)
  const isVideo = dars.media_type === 'video'
  const MediaIcon = isVideo ? Video : Headphones

  return (
    <Link
      {...darsLink(dars)}
      className="group relative isolate flex h-full flex-col overflow-hidden rounded-2xl border bg-card p-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-gold/60 hover:shadow-[0_14px_30px_-14px_oklch(0.3_0.05_50/0.45)]"
    >
      {/* background: rosette pattern, then a veil so the text stays crisp */}
      <div aria-hidden className="pattern-tile pointer-events-none absolute inset-0 -z-10 opacity-[0.13] dark:hidden" />
      <PatternTint className="-z-10 hidden opacity-[0.05] dark:block" />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-b from-card/40 via-card/70 to-card/95" />

      {/* the series's Arabic title as a watermark */}
      {dars.series?.title_ar && (
        <p
          lang="ar"
          dir="rtl"
          aria-hidden
          className="pointer-events-none absolute top-12 right-4 left-4 -z-10 overflow-hidden text-right font-arabic text-[2.6rem] leading-[1.2] font-bold whitespace-nowrap text-primary/[0.08] transition-colors duration-300 select-none group-hover:text-primary/[0.12] dark:text-gold/[0.08] dark:group-hover:text-gold/[0.12]"
        >
          {dars.series.title_ar}
        </p>
      )}

      <div className="flex items-start justify-between gap-3">
        <span className="font-heading text-4xl leading-none text-gold tabular-nums">{episodeNumber(dars.number)}</span>
        <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/85 px-2.5 py-0.5 text-[11px] font-semibold shadow-xs backdrop-blur-sm">
          <MediaIcon className="size-3 text-gold" />
          {isVideo ? 'ভিডিও' : 'অডিও'}
          {!!dars.duration_seconds && <span className="font-normal text-muted-foreground tabular-nums">· {bnNum(formatTime(dars.duration_seconds))}</span>}
        </span>
      </div>

      <div className="mt-6">
        {dars.series && <p className="line-clamp-1 text-xs font-semibold text-muted-foreground">{dars.series.title_bn}</p>}
        <h3 className="mt-0.5 line-clamp-2 font-heading text-lg leading-snug font-bold transition-colors group-hover:text-primary">{dars.title_bn}</h3>
        {dars.series?.author && <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{dars.series.author.name_bn}</p>}
      </div>

      <div className="mt-auto space-y-2.5 pt-4">
        <div className="flex items-center gap-2">
          {entry.status && <StatusChip status={entry.status} labels={DARS_STATUS_LABELS} />}
          {when && <span className="ms-auto text-[11px] text-muted-foreground">{when}</span>}
        </div>
        {started && (
          <div className="flex items-center gap-2">
            <ProgressBar value={entry.progress} className="flex-1" />
            <span className="text-[11px] text-muted-foreground tabular-nums">{bnNum(Math.round(entry.progress))}%</span>
          </div>
        )}
        <div className="flex items-center justify-between gap-3 border-t border-border/80 pt-3 text-xs font-semibold text-primary">
          <span className="flex items-center gap-1">
            {finished ? 'আবার শুনুন' : started ? <>{bnNum(formatTime(entry.position_seconds))} থেকে শুনুন</> : 'শুনুন'}
            <ArrowRight className="size-3" />
          </span>
          <span className="flex size-8 items-center justify-center rounded-full border bg-background/70 text-muted-foreground transition group-hover:border-gold/60 group-hover:bg-primary group-hover:text-primary-foreground">
            {finished ? <AudioLines className="size-3.5" /> : <Play className="size-3.5 translate-x-px fill-current" />}
          </span>
        </div>
      </div>
    </Link>
  )
}
