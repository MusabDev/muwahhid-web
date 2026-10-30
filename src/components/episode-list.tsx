import { Link } from '@tanstack/react-router'
import { AudioLines, CheckCircle2, Clock, Play, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ProgressBar } from '@/components/book-card'
import { EmptyState } from '@/components/states'
import { bnNum, formatTime, stripDiacritics } from '@/lib/text'
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
 * The episodes of a series as an editorial list: large serif number, title, a quiet meta line
 * and a play mark. `currentId` marks the dars being played; `compact` is the sidebar variant.
 */
export function EpisodeList({ durus, currentId, compact, searchable }: { durus: Dars[]; currentId?: number; compact?: boolean; searchable?: boolean }) {
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
        <div className="relative mb-2">
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
        <ol className={cn('divide-y divide-border/80', !compact && 'border-y border-border/80')}>
          {shown.map((dars) => (
            <li key={dars.id}>
              <EpisodeRow dars={dars} entry={listened.get(dars.id)} current={dars.id === currentId} compact={compact} />
            </li>
          ))}
        </ol>
      ) : (
        <div className="border-y py-6">
          <EmptyState title="কোনো দারস মেলেনি" />
        </div>
      )}
    </div>
  )
}

function EpisodeRow({ dars, entry, current, compact }: { dars: Dars; entry?: DarsEntry; current?: boolean; compact?: boolean }) {
  const finished = entry?.status === 'completed' || (entry?.progress ?? 0) >= DARS_COMPLETED_AT
  const started = !finished && !!entry?.position_seconds
  return (
    <Link
      to="/durus/$id"
      params={{ id: String(dars.id) }}
      aria-current={current ? 'page' : undefined}
      className={cn(
        'group relative flex items-center transition-colors',
        compact ? 'gap-3 px-4 py-3 hover:bg-muted/50' : 'gap-4 py-5 sm:gap-8 sm:py-6',
        current && compact && 'bg-gold/10 hover:bg-gold/15',
      )}
    >
      {current && compact && <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-gold" />}

      <span
        className={cn(
          'shrink-0 font-heading leading-none tabular-nums transition-colors',
          compact ? 'w-7 text-lg' : 'w-10 text-[1.7rem] sm:w-16 sm:text-[2rem]',
          current ? 'text-primary' : 'text-muted-foreground/45 group-hover:text-primary',
        )}
      >
        {episodeNumber(dars.number)}
      </span>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'leading-snug font-semibold text-balance transition-colors',
            compact ? 'line-clamp-2 text-sm' : 'text-[17px] sm:text-lg',
            current ? 'text-primary' : 'group-hover:text-primary',
          )}
        >
          {dars.title_bn}
        </p>
        {!compact && dars.title_ar && (
          <p lang="ar" dir="rtl" className="mt-0.5 line-clamp-1 text-left font-arabic text-[15px] text-muted-foreground">
            {dars.title_ar}
          </p>
        )}
        <p className={cn('flex flex-wrap items-center gap-x-4 gap-y-0.5 text-muted-foreground', compact ? 'mt-0.5 text-xs' : 'mt-1.5 text-[13px]')}>
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
          ) : started ? (
            <span className="tabular-nums">{bnNum(formatTime(entry!.position_seconds))} পর্যন্ত শোনা</span>
          ) : (
            !compact && !!dars.segments_count && <span className="font-semibold text-primary">ট্রান্সক্রিপ্টসহ</span>
          )}
        </p>
        {started && !current && <ProgressBar value={entry!.progress} className={cn('h-1', compact ? 'mt-1.5' : 'mt-2.5 max-w-xs')} />}
      </div>

      <span
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full border-2 transition',
          compact ? 'size-8 border-[1.5px]' : 'size-11',
          current
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-muted-foreground/35 text-muted-foreground/70 group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground',
        )}
      >
        {current ? <AudioLines className={compact ? 'size-3.5' : 'size-4'} /> : <Play className={cn('translate-x-px fill-current', compact ? 'size-3' : 'size-4')} />}
      </span>
    </Link>
  )
}
