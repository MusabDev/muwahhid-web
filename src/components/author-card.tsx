import { Link } from '@tanstack/react-router'
import type { Author } from '@/lib/types'
import { AuthorAvatar } from '@/components/author-avatar'
import { deathLabel } from '@/lib/author'
import { bnNum } from '@/lib/text'
import { cn } from '@/lib/utils'

/**
 * An author laid out like the title page of an Arabic kitab: a gilt double frame with
 * corner pieces, the shamsa monogram on top, the Arabic name as the title and the
 * Bangla name beneath an ornamental rule.
 */
export function AuthorCard({ author, compact = false }: { author: Author; compact?: boolean }) {
  const books = author.books_count ?? 0
  const series = author.dars_series_count ?? 0
  const death = deathLabel(author)

  return (
    <Link
      to="/authors/$slug"
      params={{ slug: author.slug }}
      className={cn(
        'group relative flex flex-col items-center overflow-hidden rounded-md border border-gold/40 bg-parchment text-center shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-gold/80 hover:shadow-[0_14px_30px_-14px_oklch(0.3_0.05_50/0.55)]',
        compact ? 'px-3 pt-5 pb-4' : 'px-6 pt-7 pb-5',
      )}
    >
      {/* rosette lattice, faded out behind the text */}
      <div
        aria-hidden
        className="pattern-tint pointer-events-none absolute inset-0 text-gold opacity-[0.13] transition-opacity group-hover:opacity-[0.2]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_45%,var(--parchment)_35%,transparent_100%)]"
      />

      {/* gilt double frame */}
      <div aria-hidden className="pointer-events-none absolute inset-1.5 rounded-[3px] border border-gold/55">
        <div className="absolute inset-[3px] rounded-[2px] border border-gold/25" />
        <Corner className="absolute -top-px -left-px" />
        <Corner className="absolute -top-px -right-px -scale-x-100" />
        <Corner className="absolute -bottom-px -left-px -scale-y-100" />
        <Corner className="absolute -right-px -bottom-px -scale-100" />
      </div>

      {death && (
        <span
          className={cn(
            'absolute z-10 rounded-full border border-gold/40 bg-gold/10 font-medium text-primary tabular-nums',
            compact ? 'top-3 right-3 px-1.5 py-px text-[10px]' : 'top-4 right-4 px-2 py-0.5 text-xs',
          )}
        >
          {death}
        </span>
      )}

      <AuthorAvatar author={author} className={cn('relative transition-transform duration-500 group-hover:rotate-[22.5deg]', compact ? 'size-16' : 'size-20')} />

      <p
        lang="ar"
        dir="rtl"
        className={cn('relative mt-3 line-clamp-2 font-arabic leading-[1.6] font-bold text-balance text-primary', compact ? 'text-lg' : 'text-2xl')}
      >
        {author.name_ar}
      </p>

      <Rule className={cn('relative my-1.5 text-gold', compact ? 'w-16' : 'w-24')} />

      <p className={cn('relative line-clamp-2 font-heading font-semibold text-balance text-foreground', compact ? 'text-sm' : 'text-base')}>
        {author.name_bn}
      </p>
      {!compact && <p className="relative mt-0.5 text-xs text-muted-foreground italic">{author.name_translit}</p>}

      {!compact && (
        <div className="relative mt-auto flex items-center gap-2 pt-4 text-xs text-muted-foreground">
          <span>{bnNum(books)}টি কিতাব</span>
          {series > 0 && (
            <>
              <Diamond className="size-1.5 text-gold" />
              <span>{bnNum(series)}টি দারস সিরিজ</span>
            </>
          )}
        </div>
      )}
    </Link>
  )
}

function Corner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={cn('size-5 text-gold', className)} aria-hidden>
      <path d="M1 1h9M1 1v9" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <path d="M1 1 7.5 3.2 5 5 3.2 7.5Z" fill="currentColor" />
      <circle cx="11.5" cy="1.2" r="0.9" fill="currentColor" />
      <circle cx="1.2" cy="11.5" r="0.9" fill="currentColor" />
    </svg>
  )
}

function Rule({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 8" className={className} aria-hidden>
      <line x1="0" y1="4" x2="33" y2="4" stroke="currentColor" strokeWidth="0.8" />
      <line x1="47" y1="4" x2="80" y2="4" stroke="currentColor" strokeWidth="0.8" />
      <path d="M40 0.5 43.5 4 40 7.5 36.5 4Z" fill="currentColor" />
      <circle cx="35" cy="4" r="0.9" fill="currentColor" />
      <circle cx="45" cy="4" r="0.9" fill="currentColor" />
    </svg>
  )
}

function Diamond({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 8 8" className={className} aria-hidden>
      <path d="M4 0 8 4 4 8 0 4Z" fill="currentColor" />
    </svg>
  )
}
