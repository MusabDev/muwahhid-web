import type { Author } from '@/lib/types'
import { hashString, initials } from '@/lib/text'
import { cn } from '@/lib/utils'

export function AuthorAvatar({ author, className }: { author: Pick<Author, 'name_translit' | 'name_ar'>; className?: string }) {
  const hue = [28, 50, 75, 150, 190, 255, 330][hashString(author.name_translit) % 7]

  return (
    <div
      className={cn('relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full font-heading font-semibold text-[oklch(0.95_0.03_85)] ring-2 ring-gold/50 ring-offset-2 ring-offset-background', className)}
      style={{ background: `linear-gradient(135deg, oklch(0.5 0.09 ${hue}), oklch(0.34 0.08 ${hue}))` }}
      aria-hidden
    >
      <div className="pattern-star absolute inset-0 opacity-20" />
      <span className="relative text-[1.05em] tracking-wide">{initials(author.name_translit) || author.name_ar.slice(0, 1)}</span>
    </div>
  )
}
