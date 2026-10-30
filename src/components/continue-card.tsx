import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { ProgressBar } from '@/components/book-card'
import { BookCover } from '@/components/book-cover'
import { PatternTint } from '@/components/pattern'
import { bnNum, STATUS_LABELS, timeAgo } from '@/lib/text'
import type { Book, BookStatus, LibraryEntry } from '@/lib/types'
import { cn } from '@/lib/utils'

export type ShelfEntry = LibraryEntry & { book: Book }

/** Status chip colours, so each shelf is recognisable at a glance. */
const STATUS_TONE: Record<BookStatus, string> = {
  reading: 'bg-primary/10 text-primary border-primary/25',
  read_later: 'bg-gold/15 text-foreground border-gold/40',
  on_hold: 'bg-muted text-muted-foreground border-border',
  completed: 'bg-emerald-600/10 text-emerald-700 border-emerald-600/25 dark:text-emerald-400',
  dropped: 'bg-muted text-muted-foreground/80 border-border',
}

export function StatusChip({ status, labels = STATUS_LABELS, className }: { status: BookStatus; labels?: Record<string, string>; className?: string }) {
  return <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium', STATUS_TONE[status], className)}>{labels[status]}</span>
}

/** Link to the page and sentence where the reader left off. */
export function ResumeLink({ entry, className, children }: { entry: ShelfEntry; className?: string; children: ReactNode }) {
  return (
    <Link
      to="/books/$slug/read/$page"
      params={{ slug: entry.book.slug, page: String(entry.last_page) }}
      hash={entry.last_sentence_id ? `s-${entry.last_sentence_id}` : undefined}
      className={className}
    >
      {children}
    </Link>
  )
}

/** Books still in progress, most recently opened first. */
export function inProgressEntries(entries: LibraryEntry[], limit = 3) {
  return entries
    .filter((e): e is ShelfEntry => !!e.book && !!e.last_page && e.status !== 'completed' && e.status !== 'dropped')
    .sort((a, b) => (b.last_read_at ?? '').localeCompare(a.last_read_at ?? ''))
    .slice(0, limit)
}

/** A "continue reading" card over the rosette pattern; the whole card resumes where the reader left off. */
export function ContinueCard({ entry, featured }: { entry: ShelfEntry; featured?: boolean }) {
  const percent = Math.round(entry.progress ?? 0)
  const when = timeAgo(entry.last_read_at)

  return (
    <ResumeLink
      entry={entry}
      className={cn(
        'group relative isolate flex items-center gap-3.5 overflow-hidden rounded-xl border bg-card p-3 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-gold/60 hover:shadow-[0_14px_30px_-14px_oklch(0.3_0.05_50/0.45)]',
        featured && 'lg:border-gold/50',
      )}
    >
      {/* background: rosette pattern, then a veil that keeps the text side clear */}
      <div aria-hidden className="pattern-tile pointer-events-none absolute inset-0 -z-10 opacity-[0.14] dark:hidden" />
      <PatternTint className="-z-10 hidden opacity-[0.06] dark:block" />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-r from-card/95 via-card/85 to-card/55" />
      {featured && <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 hidden bg-linear-to-br from-gold/12 to-transparent lg:block" />}

      <p
        lang="ar"
        dir="rtl"
        aria-hidden
        className="pointer-events-none absolute right-3 -bottom-2 left-20 -z-10 overflow-hidden text-right font-arabic text-4xl leading-[1.6] font-bold whitespace-nowrap text-primary/[0.07] select-none dark:text-gold/[0.08]"
      >
        {entry.book.title_ar}
      </p>

      <BookCover book={entry.book} className="w-14 shrink-0 transition-transform duration-300 group-hover:-rotate-2" />

      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-1 font-heading leading-snug font-bold transition-colors group-hover:text-primary">{entry.book.title_bn}</h3>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          পৃষ্ঠা {bnNum(entry.last_page!)}
          {when && <> · {when}</>}
        </p>
        <div className="mt-2.5 flex items-center gap-2">
          <ProgressBar value={percent} className="flex-1" />
          <span className="text-[11px] font-semibold tabular-nums">{bnNum(percent)}%</span>
        </div>
      </div>
    </ResumeLink>
  )
}
