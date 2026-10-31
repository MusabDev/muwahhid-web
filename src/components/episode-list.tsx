import { Link } from '@tanstack/react-router'
import { AudioLines, CheckCircle2, Clock, Headphones, Play, ScrollText, Search, Video, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ProgressBar } from '@/components/book-card'
import { EmptyState } from '@/components/states'
import { bnNum, formatTime, stripDiacritics } from '@/lib/text'
import { darsLink } from '@/lib/links'
import type { Dars, DarsEntry } from '@/lib/types'
import { DARS_COMPLETED_AT, useDarsLibrary } from '@/lib/user-data'
import { cn } from '@/lib/utils'

const BN_TO_LATIN: Record<string, string> = { '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' }

function normalize(text: string) {
  return stripDiacritics(text)
    .replace(/[০-৯]/g, (d) => BN_TO_LATIN[d])
    .toLowerCase()
    .trim()
}

/** Two-digit episode number in Bangla numerals: ০১, ০২ … */
export function episodeNumber(n: number) {
  return bnNum(String(n).padStart(2, '0'))
}

/**
 * The episodes of a series as boxed rows. `currentId` marks the dars being played;
 * `compact` is the player sidebar's plainer row list.
 */
export function EpisodeList({ durus, seriesSlug, currentId, compact, searchable }: { durus: Dars[]; seriesSlug?: string; currentId?: number; compact?: boolean; searchable?: boolean }) {
  const [query, setQuery] = useState('')
  const { entries } = useDarsLibrary()
  const listened = useMemo(() => new Map(entries.map((e) => [e.dars_id, e])), [entries])

  const shown = useMemo(() => {
    const q = normalize(query)
    if (!q) return durus
    return durus.filter((d) => String(d.number) === q || normalize(`${d.title_bn} ${d.title_ar ?? ''}`).includes(q))
  }, [durus, query])

  return (
    <div>
      {searchable && (
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="নম্বর বা শিরোনাম দিয়ে খুঁজুন…"
            aria-label="দারস খুঁজুন"
            className="h-12 w-full rounded-xl border border-input bg-card/80 ps-11 pe-11 text-[15px] shadow-xs transition outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="মুছুন"
              className="absolute top-1/2 right-3 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      )}

      {shown.length ? (
        <ol className={compact ? 'divide-y divide-border/80' : 'mt-3 grid gap-3 md:grid-cols-2'}>
          {shown.map((dars) => (
            <li key={dars.id}>
              {compact ? (
                <EpisodeRow dars={dars} seriesSlug={seriesSlug} entry={listened.get(dars.id)} current={dars.id === currentId} />
              ) : (
                <EpisodeCard dars={dars} seriesSlug={seriesSlug} entry={listened.get(dars.id)} />
              )}
            </li>
          ))}
        </ol>
      ) : (
        <div className={cn('py-6', compact && 'border-y')}>
          <EmptyState title="কোনো দারস মেলেনি" />
        </div>
      )}
    </div>
  )
}

function listenState(entry?: DarsEntry) {
  const finished = entry?.status === 'completed' || (entry?.progress ?? 0) >= DARS_COMPLETED_AT
  return { finished, started: !finished && !!entry?.position_seconds }
}

/** A dars as a boxed row: framed number, titles, a quiet meta line and a play mark. */
function EpisodeCard({ dars, seriesSlug, entry }: { dars: Dars; seriesSlug?: string; entry?: DarsEntry }) {
  const { finished, started } = listenState(entry)
  return (
    <Link
      {...darsLink(dars, seriesSlug)}
      className={cn(
        'group relative flex h-full items-center gap-4 overflow-hidden rounded-xl border bg-card p-4 shadow-xs transition duration-200 hover:-translate-y-px hover:border-gold/60 hover:shadow-[0_10px_24px_-14px_oklch(0.3_0.05_50/0.45)]',
        started && 'border-gold/45',
      )}
    >
      <span
        className={cn(
          'flex size-12 shrink-0 items-center justify-center rounded-lg border font-heading text-xl leading-none tabular-nums transition-colors',
          finished
            ? 'border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400'
            : 'border-gold/40 bg-gold/10 text-primary group-hover:border-gold group-hover:bg-gold/20 dark:text-gold',
        )}
      >
        {episodeNumber(dars.number)}
      </span>

      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 leading-snug font-semibold text-balance transition-colors group-hover:text-primary">{dars.title_bn}</p>
        {dars.title_ar && (
          <p lang="ar" dir="rtl" className="line-clamp-1 text-left font-arabic text-sm text-muted-foreground">
            {dars.title_ar}
          </p>
        )}
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            {dars.media_type === 'video' ? <Video className="size-3.5 text-gold" /> : <Headphones className="size-3.5 text-gold" />}
            {dars.media_type === 'video' ? 'ভিডিও' : 'অডিও'}
          </span>
          {!!dars.duration_seconds && (
            <span className="flex items-center gap-1">
              <Clock className="size-3.5 text-gold" /> <span className="tabular-nums">{bnNum(formatTime(dars.duration_seconds))}</span>
            </span>
          )}
          {finished ? (
            <span className="flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="size-3.5" /> শোনা শেষ
            </span>
          ) : started ? (
            <span className="font-semibold text-primary tabular-nums dark:text-gold">{bnNum(formatTime(entry!.position_seconds))} পর্যন্ত শোনা</span>
          ) : (
            !!dars.segments_count && (
              <span className="flex items-center gap-1">
                <ScrollText className="size-3.5 text-gold" /> ট্রান্সক্রিপ্ট
              </span>
            )
          )}
        </p>
      </div>

      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-full transition',
          started ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground dark:bg-gold/15 dark:text-gold',
        )}
      >
        <Play className="size-4 translate-x-px fill-current" />
      </span>

      {/* listening progress runs along the bottom edge */}
      {started && (
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-[3px] bg-border/60">
          <span className="block h-full bg-gold" style={{ width: `${entry!.progress}%` }} />
        </span>
      )}
    </Link>
  )
}

/** The player sidebar's row: number, title, a quiet meta line and a play mark. */
function EpisodeRow({ dars, seriesSlug, entry, current }: { dars: Dars; seriesSlug?: string; entry?: DarsEntry; current?: boolean }) {
  const { finished, started } = listenState(entry)
  return (
    <Link
      {...darsLink(dars, seriesSlug)}
      aria-current={current ? 'page' : undefined}
      className={cn('group relative flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50', current && 'bg-gold/10 hover:bg-gold/15')}
    >
      {current && <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-gold" />}

      <span
        className={cn(
          'w-7 shrink-0 font-heading text-lg leading-none tabular-nums transition-colors',
          current ? 'text-primary' : 'text-muted-foreground/45 group-hover:text-primary',
        )}
      >
        {episodeNumber(dars.number)}
      </span>

      <div className="min-w-0 flex-1">
        <p className={cn('line-clamp-2 text-sm leading-snug font-semibold text-balance transition-colors', current ? 'text-primary' : 'group-hover:text-primary')}>
          {dars.title_bn}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
          <span>{dars.media_type === 'video' ? 'ভিডিও' : 'অডিও'}</span>
          {!!dars.duration_seconds && (
            <span className="flex items-center gap-1">
              <Clock className="size-3.5 opacity-70" /> <span className="tabular-nums">{bnNum(formatTime(dars.duration_seconds))}</span>
            </span>
          )}
          {current ? (
            <span className="font-semibold text-gold">এখন চলছে</span>
          ) : finished ? (
            <span className="flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="size-3.5" /> শোনা শেষ
            </span>
          ) : (
            started && <span className="tabular-nums">{bnNum(formatTime(entry!.position_seconds))} পর্যন্ত শোনা</span>
          )}
        </p>
        {started && !current && <ProgressBar value={entry!.progress} className="mt-1.5 h-1" />}
      </div>

      <span
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-full border-[1.5px] transition',
          current
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-muted-foreground/35 text-muted-foreground/70 group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground',
        )}
      >
        {current ? <AudioLines className="size-3.5" /> : <Play className="size-3 translate-x-px fill-current" />}
      </span>
    </Link>
  )
}
