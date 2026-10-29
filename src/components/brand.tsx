import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'

export function StarMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn('size-8', className)} aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
        <path d="M20 3 25 15 37 20 25 25 20 37 15 25 3 20 15 15Z" />
        <path d="M8 8 20 13 32 8 27 20 32 32 20 27 8 32 13 20Z" />
      </g>
      <circle cx="20" cy="20" r="3.2" fill="currentColor" />
    </svg>
  )
}

export function Brand({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn('flex items-center gap-2.5', className)}>
      <StarMark className="size-8 text-gold" />
      <span className="flex flex-col leading-none">
        <span className="font-heading text-lg font-bold tracking-wide">মুওয়াহহিদ</span>
        <span className="mt-0.5 font-arabic text-[15px] leading-tight text-gold">مُوَحِّد</span>
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
