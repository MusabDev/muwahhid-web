import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { MIM_PATH, MIM_STROKE, WORDMARK_BOX, WORDMARK_PATH, WORDMARK_STROKE } from '@/lib/logo'
import { cn } from '@/lib/utils'

/** The small logo: mim (م), the first letter of muwahhid, in the wordmark's Rakkas. For icons and tight spots. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn('size-8', className)} aria-hidden>
      <path d={MIM_PATH} fill="currentColor" stroke="currentColor" strokeWidth={MIM_STROKE} strokeLinejoin="round" />
    </svg>
  )
}

/**
 * الموحد set in Rakkas (SIL Open Font License), outlined to a single path so the logo never waits on a font.
 * The stroke thickens the letters slightly so the thin joins hold up at small sizes and from a distance.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <svg viewBox={WORDMARK_BOX.join(' ')} className={cn('h-9 w-auto', className)} aria-hidden>
      <path d={WORDMARK_PATH} fill="currentColor" stroke="currentColor" strokeWidth={WORDMARK_STROKE} strokeLinejoin="round" />
    </svg>
  )
}

/** The logo lockup: the Arabic wordmark beside the Bangla and English names. */
export function Brand({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn('flex items-center gap-3', className)}>
      <Wordmark className="h-9 shrink-0 text-gold" />
      <span aria-hidden className="h-8 w-px shrink-0 bg-current opacity-30" />
      <span className="flex flex-col leading-none">
        <span className="font-heading text-lg font-bold tracking-wide whitespace-nowrap">আল-মুওয়াহহিদ</span>
        <span className="mt-1 text-[10px] font-semibold tracking-[0.3em] uppercase opacity-60">Al-Muwahhid</span>
      </span>
    </Link>
  )
}

/** Small ornamental divider: line · star · line */
export function Ornament({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center gap-3 text-gold', className)} aria-hidden>
      <span className="h-px w-12 bg-linear-to-r from-transparent to-current" />
      <svg viewBox="0 0 20 20" className="size-3.5">
        <path d="M10 1 12.5 7.5 19 10 12.5 12.5 10 19 7.5 12.5 1 10 7.5 7.5Z" fill="currentColor" />
      </svg>
      <span className="h-px w-12 bg-linear-to-l from-transparent to-current" />
    </div>
  )
}

export function SectionHeading({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        <div className="mt-2 h-0.5 w-16 rounded bg-gold" />
      </div>
      {action}
    </div>
  )
}
