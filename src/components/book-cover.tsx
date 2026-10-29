import type { Book } from '@/lib/types'
import { hashString } from '@/lib/text'
import { cn } from '@/lib/utils'

/** Deep cloth-binding colours (hue, chroma, lightness). */
const BINDINGS = [
  [28, 0.12, 0.36], // maroon
  [150, 0.07, 0.34], // green
  [255, 0.07, 0.32], // navy
  [50, 0.08, 0.34], // brown
  [190, 0.06, 0.33], // teal
  [330, 0.08, 0.33], // plum
  [75, 0.08, 0.4], // ochre
]

export function BookCover({ book, className }: { book: Pick<Book, 'title_ar' | 'title_bn' | 'cover_url' | 'author'>; className?: string }) {
  const frame = cn('group/cover relative aspect-[2/3] overflow-hidden rounded-r-md rounded-l-sm shadow-[0_8px_18px_-6px_oklch(0.2_0.03_50/0.55)]', className)

  if (book.cover_url) {
    return (
      <div className={frame}>
        <img src={book.cover_url} alt={book.title_bn} className="size-full object-cover" loading="lazy" />
        <Spine />
      </div>
    )
  }

  const [h, c, l] = BINDINGS[hashString(book.title_ar + book.title_bn) % BINDINGS.length]
  const bg = `oklch(${l} ${c} ${h})`
  const bgDark = `oklch(${l - 0.08} ${c} ${h})`

  return (
    <div className={cn(frame, '@container')} style={{ background: `radial-gradient(ellipse at 50% 35%, ${bg}, ${bgDark})` }}>
      <div className="pattern-star absolute inset-0 opacity-25" />
      <div className="absolute inset-[6%] rounded-[2px] border border-[oklch(0.78_0.11_80/0.7)]">
        <div className="absolute inset-[3%] border border-[oklch(0.78_0.11_80/0.35)]" />
      </div>
      <div className="relative flex h-full flex-col items-center justify-center gap-[5cqw] px-[13%] text-center text-[oklch(0.9_0.06_85)]">
        <svg viewBox="0 0 20 20" className="w-[9cqw] text-[oklch(0.78_0.11_80)]">
          <path d="M10 1 12.5 7.5 19 10 12.5 12.5 10 19 7.5 12.5 1 10 7.5 7.5Z" fill="currentColor" />
        </svg>
        <p lang="ar" dir="rtl" className="font-arabic text-[12cqw] leading-[1.35] font-bold text-[oklch(0.86_0.1_82)]">
          {book.title_ar}
        </p>
        <p className="font-heading text-[7.5cqw] leading-snug">{book.title_bn}</p>
        {book.author && <p className="mt-[3cqw] text-[5.5cqw] opacity-80">{book.author.name_bn}</p>}
      </div>
      <Spine />
    </div>
  )
}

function Spine() {
  return (
    <div className="pointer-events-none absolute inset-y-0 left-0 w-[6%] bg-linear-to-r from-black/35 via-white/10 to-transparent" />
  )
}
