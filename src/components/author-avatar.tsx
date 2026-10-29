import { useId } from 'react'
import type { Author } from '@/lib/types'
import { BINDINGS, GOLD } from '@/components/book-cover'
import { arabicInitial, hashString } from '@/lib/text'
import { cn } from '@/lib/utils'

/** An eight-pointed star (two overlapping squares) centred in a 100×100 box. */
function starPoints(outer: number) {
  const inner = outer * (Math.SQRT1_2 / Math.cos(Math.PI / 8))
  return Array.from({ length: 16 }, (_, i) => {
    const angle = (i * Math.PI) / 8 - Math.PI / 2
    const r = i % 2 ? inner : outer
    return `${(50 + r * Math.cos(angle)).toFixed(2)},${(50 + r * Math.sin(angle)).toFixed(2)}`
  }).join(' ')
}

const OUTER_STAR = starPoints(48)
const INNER_STAR = starPoints(42.5)

/** A gilt shamsa medallion in the author's binding colour, with the first letter of their Arabic name. */
export function AuthorAvatar({ author, className }: { author: Pick<Author, 'name_translit' | 'name_ar'>; className?: string }) {
  const gradient = useId()
  const [h, c, l] = BINDINGS[hashString(author.name_translit) % BINDINGS.length]

  return (
    <div className={cn('@container relative size-14 shrink-0 drop-shadow-[0_4px_6px_oklch(0.2_0.03_50/0.35)]', className)} aria-hidden>
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full">
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={`oklch(${l + 0.07} ${c} ${h})`} />
            <stop offset="1" stopColor={`oklch(${l - 0.04} ${c} ${h})`} />
          </linearGradient>
        </defs>
        <polygon points={OUTER_STAR} fill={`url(#${gradient})`} stroke={GOLD} strokeWidth="2.2" strokeLinejoin="round" />
        <polygon points={INNER_STAR} fill="none" stroke={GOLD} strokeOpacity="0.45" strokeWidth="0.8" strokeLinejoin="round" />
        <circle cx="50" cy="50" r="27" fill="black" fillOpacity="0.12" stroke={GOLD} strokeOpacity="0.7" strokeWidth="1" />
        {[0, 90, 180, 270].map((deg) => (
          <circle key={deg} cx="50" cy="20" r="1.6" fill={GOLD} transform={`rotate(${deg + 45} 50 50)`} />
        ))}
      </svg>
      <span
        lang="ar"
        dir="rtl"
        className="absolute inset-0 flex items-center justify-center pt-[6cqw] font-arabic text-[38cqw] leading-none font-bold"
        style={{ color: '#e4c987', textShadow: '0 1px 0 rgb(0 0 0 / 0.4)' }}
      >
        {arabicInitial(author.name_ar)}
      </span>
    </div>
  )
}
