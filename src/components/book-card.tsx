import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { BookCover } from '@/components/book-cover'
import type { Book } from '@/lib/types'
import { cn } from '@/lib/utils'

export function BookCard({ book, footer, className }: { book: Book; footer?: ReactNode; className?: string }) {
  return (
    <div className={cn('group flex flex-col', className)}>
      <Link to="/books/$slug" params={{ slug: book.slug }} className="block transition-transform duration-300 group-hover:-translate-y-1.5">
        <BookCover book={book} />
      </Link>
      <div className="mt-3 space-y-0.5">
        <Link to="/books/$slug" params={{ slug: book.slug }} className="line-clamp-2 font-heading leading-snug font-semibold hover:text-primary">
          {book.title_bn}
        </Link>
        <p lang="ar" dir="rtl" className="line-clamp-1 text-right font-arabic text-[15px] text-muted-foreground">
          {book.title_ar}
        </p>
        {book.author && (
          <Link to="/authors/$slug" params={{ slug: book.author.slug }} className="line-clamp-1 text-xs text-muted-foreground hover:text-primary">
            {book.author.name_bn}
          </Link>
        )}
        {footer}
      </div>
    </div>
  )
}

/** A row of books standing on a wooden shelf. */
export function Shelf({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="grid grid-cols-2 gap-x-5 gap-y-10 px-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">{children}</div>
    </div>
  )
}

export function ShelfPlank() {
  return <div className="wood-panel mt-3 h-3 rounded-sm shadow-[0_6px_10px_-4px_oklch(0.2_0.03_50/0.6)]" />
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('h-1.5 overflow-hidden rounded-full bg-muted', className)}>
      <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  )
}
