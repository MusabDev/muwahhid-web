import { Link } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { BookCover } from '@/components/book-cover'
import { PatternTint } from '@/components/pattern'
import { isSharh } from '@/lib/book'
import { bnNum } from '@/lib/text'
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
        {book.author && (
          <Link to="/authors/$slug" params={{ slug: book.author.slug }} className="line-clamp-1 text-sm text-muted-foreground hover:text-primary">
            {book.author.name_bn}
          </Link>
        )}
        {isSharh(book) && (
          <Link to="/authors/$slug" params={{ slug: book.explainer!.slug }} className="line-clamp-1 text-xs text-muted-foreground/80 hover:text-primary">
            <span className="text-gold">ব্যাখ্যা: </span>
            {book.explainer!.name_bn}
          </Link>
        )}
        {footer}
      </div>
    </div>
  )
}

/** A book as a horizontal list item: a small cover beside its titles, with the Arabic title as a watermark. */
export function BookRow({ book, byline }: { book: Book; byline?: ReactNode }) {
  return (
    <Link
      to="/books/$slug"
      params={{ slug: book.slug }}
      className="group relative isolate flex gap-5 overflow-hidden rounded-2xl border bg-card p-3.5 pe-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-gold/60 hover:shadow-[0_14px_30px_-14px_oklch(0.3_0.05_50/0.45)]"
    >
      {/* background: rosette pattern, then a veil that keeps the text side clear */}
      <div aria-hidden className="pattern-tile pointer-events-none absolute inset-0 -z-10 opacity-[0.12] dark:hidden" />
      <PatternTint className="-z-10 hidden opacity-[0.05] dark:block" />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-r from-card/95 via-card/80 to-card/50" />

      {/* the Arabic title as a large watermark behind the content */}
      <p
        lang="ar"
        dir="rtl"
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-4 left-28 -z-10 -translate-y-[40%] overflow-hidden text-right font-arabic text-[3.6rem] leading-[1.5] font-bold whitespace-nowrap text-primary/[0.09] transition-colors duration-300 select-none group-hover:text-primary/[0.14] sm:left-32 dark:text-gold/[0.08] dark:group-hover:text-gold/[0.13]"
      >
        {book.title_ar}
      </p>

      <BookCover book={book} className="w-20 shrink-0 transition-transform duration-300 group-hover:-rotate-2 group-hover:scale-[1.03] sm:w-[5.5rem]" />

      <div className="flex min-w-0 flex-1 flex-col py-1">
        <h3 className="line-clamp-2 text-lg leading-snug font-bold transition-colors group-hover:text-primary">{book.title_bn}</h3>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground italic">{book.title_translit}</p>
        {byline && <p className="mt-1.5 line-clamp-1 text-sm text-muted-foreground">{byline}</p>}

        <div className="mt-auto flex items-center gap-2 pt-3 text-xs">
          {book.category && <span className="rounded-full border border-gold/35 bg-background/80 px-2.5 py-0.5 font-medium text-primary backdrop-blur-sm">{book.category.name_bn}</span>}
          {!!book.pages_count && <span className="text-muted-foreground">{bnNum(book.pages_count)} পৃষ্ঠা</span>}
          <span className="ms-auto flex size-8 items-center justify-center rounded-full border bg-background/70 text-muted-foreground transition group-hover:border-gold/60 group-hover:bg-primary group-hover:text-primary-foreground">
            <ArrowUpRight className="size-4" />
          </span>
        </div>
      </div>
    </Link>
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
