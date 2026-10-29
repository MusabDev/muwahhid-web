import { Markdown } from '@/components/markdown'
import { arNum, bnNum } from '@/lib/text'
import type { Book, BookPage, Footnote, Lang } from '@/lib/types'
import { cn } from '@/lib/utils'
import { BlockList, groupBlocks } from './blocks'
import { useReader } from './reader-context'

export function BookView({ book, page }: { book: Book; page: BookPage }) {
  const { settings } = useReader()
  const blocks = groupBlocks(page.sentences)
  const showAr = settings.showArabic
  const showBn = settings.showBangla
  const both = showAr && showBn

  return (
    <div className={cn('mx-auto w-full', both ? 'max-w-[1180px]' : 'max-w-[680px]')}>
      <div className={cn('relative grid rounded-[6px] shadow-[0_30px_60px_-20px_oklch(0.08_0.02_50/0.75)]', both && 'lg:grid-cols-2')}>
        {/* Bangla on the left page, Arabic on the right — like an opened bilingual book */}
        {showBn && <PageSheet book={book} page={page} lang="bn" blocks={blocks} side={both ? 'left' : 'single'} />}
        {showAr && <PageSheet book={book} page={page} lang="ar" blocks={blocks} side={both ? 'right' : 'single'} />}
        {both && <div className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-px -translate-x-1/2 bg-black/15 lg:block" />}
      </div>
    </div>
  )
}

function PageSheet({ book, page, lang, blocks, side }: { book: Book; page: BookPage; lang: Lang; blocks: ReturnType<typeof groupBlocks>; side: 'left' | 'right' | 'single' }) {
  const { settings } = useReader()
  const isAr = lang === 'ar'
  const footnotes = page.footnotes[lang]

  return (
    <article
      lang={lang}
      dir={isAr ? 'rtl' : 'ltr'}
      className={cn(
        'relative flex min-h-[78vh] flex-col bg-[var(--page-bg)] px-6 pt-6 pb-5 text-[var(--page-ink)] sm:px-10 sm:pt-8',
        side === 'left' && 'max-lg:rounded-b-[6px] lg:rounded-s-[6px]',
        side === 'right' && 'max-lg:order-first max-lg:rounded-t-[6px] lg:rounded-e-[6px]',
        side === 'single' && 'rounded-[6px]',
        side !== 'single' && 'max-lg:border-b max-lg:border-[var(--page-edge)]',
      )}
    >
      {/* gutter shading toward the spine */}
      {side === 'left' && <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-10 bg-linear-to-l from-black/10 to-transparent lg:block" />}
      {side === 'right' && <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-10 bg-linear-to-r from-black/10 to-transparent lg:block" />}

      <header className="mb-6 flex items-center justify-between gap-3 border-b border-double border-[var(--page-edge)] pb-2 text-[12px] text-[var(--page-muted)]" style={{ borderBottomWidth: 3 }}>
        <span className={cn('truncate', isAr ? 'font-arabic text-[15px]' : 'font-heading')}>{isAr ? book.title_ar : book.title_bn}</span>
        <span className={cn('truncate', isAr ? 'font-arabic text-[14px]' : '')}>{isAr ? book.author?.name_ar : book.author?.name_bn}</span>
      </header>

      <div className={cn('flex-1', isAr ? 'reader-ar' : 'reader-bn')} style={{ fontSize: isAr ? settings.fontSize * 1.22 : settings.fontSize }}>
        <BlockList blocks={blocks} lang={lang} />
      </div>

      {footnotes.length > 0 && <Footnotes footnotes={footnotes} lang={lang} />}

      <footer className="mt-6 flex items-center justify-center gap-3 text-[var(--page-muted)]">
        <span className="h-px w-10 bg-[var(--page-edge)]" />
        <span className={cn('text-sm', isAr && 'font-arabic text-base')}>{isAr ? arNum(page.number) : bnNum(page.number)}</span>
        <span className="h-px w-10 bg-[var(--page-edge)]" />
      </footer>
    </article>
  )
}

export function Footnotes({ footnotes, lang }: { footnotes: Footnote[]; lang: Lang }) {
  const { settings } = useReader()
  const isAr = lang === 'ar'
  return (
    <section className={cn('mt-6 border-t border-[var(--page-edge)] pt-3 text-[var(--page-ink)]/85', isAr ? 'reader-ar' : 'reader-bn')} style={{ fontSize: (isAr ? settings.fontSize * 1.22 : settings.fontSize) * 0.78 }}>
      <div className="mb-1 h-px w-24 bg-[var(--page-muted)]/50" />
      {footnotes.map((f) => (
        <div key={f.id} id={`fn-${lang}-${f.marker}`} className="flex gap-2 leading-relaxed">
          <span className="shrink-0 font-semibold text-[var(--page-accent)]">({isAr ? arNum(f.marker) : bnNum(f.marker)})</span>
          <Markdown text={f.text_md} className="min-w-0 flex-1 [&_p]:m-0" />
        </div>
      ))}
    </section>
  )
}
