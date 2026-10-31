import type { Book } from '@/lib/types'
import { isSharh } from '@/lib/book'
import { hashString } from '@/lib/text'
import { cn } from '@/lib/utils'

/** Classic cloth-binding colours (hue, chroma, lightness), kept muted. */
export const BINDINGS = [
  [150, 0.055, 0.31], // forest green
  [25, 0.085, 0.31], // oxblood
  [255, 0.06, 0.29], // navy
  [50, 0.05, 0.28], // walnut brown
  [190, 0.045, 0.31], // slate teal
  [0, 0.07, 0.29], // claret
  [90, 0.02, 0.22], // charcoal
]

export const GOLD = '#cdad66'

/** Shrink long Arabic titles so they fit in three lines. */
function arabicSize(title: string) {
  const length = title.length
  if (length <= 10) return 'text-[14cqw]'
  if (length <= 18) return 'text-[11.5cqw]'
  if (length <= 30) return 'text-[9.5cqw]'
  return 'text-[8cqw]'
}

function banglaSize(title: string) {
  const length = title.length
  if (length <= 14) return 'text-[8cqw]'
  if (length <= 26) return 'text-[6.8cqw]'
  return 'text-[5.8cqw]'
}

type CoverBook = Pick<Book, 'title_ar' | 'title_bn' | 'cover_url' | 'author' | 'is_sharh' | 'explainer'>

/** `priority` is for the page's hero cover: loaded eagerly and first, as it is usually the largest paint. */
export function BookCover({ book, className, priority }: { book: CoverBook; className?: string; priority?: boolean }) {
  const frame = cn('group/cover relative aspect-[2/3] overflow-hidden rounded-r-[5px] rounded-l-[2px] shadow-[0_10px_22px_-8px_oklch(0.2_0.03_50/0.6)]', className)

  if (book.cover_url) {
    return (
      <div className={frame}>
        <img
          src={book.cover_url}
          alt={`${book.title_bn} — প্রচ্ছদ`}
          width={400}
          height={600}
          className="size-full object-cover"
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
        />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-[5%] bg-linear-to-r from-black/35 via-white/10 to-transparent" />
      </div>
    )
  }

  const [h, c, l] = BINDINGS[hashString(book.title_ar + book.title_bn) % BINDINGS.length]

  return (
    <div
      className={cn(frame, '@container')}
      style={{ background: `linear-gradient(180deg, oklch(${l + 0.025} ${c} ${h}), oklch(${l - 0.03} ${c} ${h}))` }}
      role="img"
      aria-label={book.title_bn}
    >
      {/* Quarter binding: a darker leather spine with a gold rule along its edge */}
      <div className="absolute inset-y-0 left-0 w-[9%] bg-linear-to-r from-black/45 via-black/30 to-black/20" />
      <div className="absolute inset-y-0 left-[9%] w-px opacity-70" style={{ background: GOLD }} />
      <div className="absolute inset-y-0 left-[9%] w-[3%] bg-linear-to-r from-black/20 to-transparent" />

      {/* Single fine gold frame with a hairline inside it */}
      <div className="absolute top-[4.5%] right-[6%] bottom-[4.5%] left-[15%] border" style={{ borderColor: `${GOLD}b3` }}>
        <div className="absolute inset-[2.2cqw] border" style={{ borderColor: `${GOLD}4d` }} />
      </div>

      {/* Gold rosette lattice inside the frame, faded out behind the titles */}
      <div
        className="absolute top-[6.5%] right-[8.5%] bottom-[6.5%] left-[17.5%]"
        style={{
          maskImage: 'radial-gradient(ellipse 68% 58% at 50% 55%, transparent 42%, black 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 68% 58% at 50% 55%, transparent 42%, black 100%)',
        }}
      >
        <div className="pattern-tint absolute inset-0 opacity-[0.16]" style={{ color: GOLD, maskSize: '26cqw 26cqw', WebkitMaskSize: '26cqw 26cqw', maskPosition: 'center', WebkitMaskPosition: 'center' }} />
      </div>

      {/* Fixed layout so covers line up on a shelf: the divider sits at the same height on every cover,
          the Arabic title (with its star) rests on it and the Bangla title hangs below it. */}
      <div className="absolute top-[11%] bottom-[53%] right-[10%] left-[19%] flex flex-col items-center justify-end gap-[3.5cqw] text-center">
        <Star className="w-[6.5cqw] shrink-0" />
        <p
          lang="ar"
          dir="rtl"
          className={cn('line-clamp-3 font-arabic leading-[1.45] font-bold text-balance', arabicSize(book.title_ar))}
          style={{ color: '#e4c987', textShadow: '0 1px 0 rgb(0 0 0 / 0.35)' }}
        >
          {book.title_ar}
        </p>
      </div>

      <Divider className="absolute top-[48.6%] left-[54.5%] w-[34cqw] -translate-x-1/2" />

      <div className="absolute top-[53.5%] right-[11%] left-[20%] text-center">
        <p className={cn('line-clamp-2 font-heading leading-[1.3] font-semibold text-balance text-[#f1e8d0]', banglaSize(book.title_bn))}>{book.title_bn}</p>
      </div>

      {book.author && (
        <div className={cn('absolute right-[11%] left-[20%] text-center @max-[110px]:hidden', isSharh(book) ? 'bottom-[12.5%]' : 'bottom-[10.5%]')}>
          <span className="mx-auto mb-[2.5cqw] block h-px w-[12cqw]" style={{ background: `${GOLD}99` }} />
          {isSharh(book) ? (
            <>
              <p className="line-clamp-2 font-heading text-[5cqw] leading-snug text-balance text-[#e8dcc0]/85">{book.author.name_bn}</p>
              <p className="mt-[1cqw] line-clamp-1 font-heading text-[4cqw] leading-snug text-[#e8dcc0]/60">
                <span className="text-[#cdad66]/80">ব্যাখ্যা: </span>
                {book.explainer!.name_bn}
              </p>
            </>
          ) : (
            <p className="line-clamp-2 font-heading text-[5cqw] leading-snug text-balance text-[#e8dcc0]/80">{book.author.name_bn}</p>
          )}
        </div>
      )}
    </div>
  )
}

function Star({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden>
      <g fill={GOLD}>
        <rect x="4" y="4" width="12" height="12" />
        <rect x="4" y="4" width="12" height="12" transform="rotate(45 10 10)" />
      </g>
      <circle cx="10" cy="10" r="2.2" fill="black" fillOpacity="0.35" />
    </svg>
  )
}

function Divider({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 8" className={className} aria-hidden>
      <line x1="0" y1="4" x2="33" y2="4" stroke={GOLD} strokeWidth="0.8" />
      <line x1="47" y1="4" x2="80" y2="4" stroke={GOLD} strokeWidth="0.8" />
      <path d="M40 0.5 43.5 4 40 7.5 36.5 4Z" fill={GOLD} />
      <circle cx="35" cy="4" r="0.9" fill={GOLD} />
      <circle cx="45" cy="4" r="0.9" fill={GOLD} />
    </svg>
  )
}
