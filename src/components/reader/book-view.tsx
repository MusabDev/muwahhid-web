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
      {/* edge to edge on phones; a sheet resting on the desk from there up */}
      <div className={cn('relative grid sm:[box-shadow:var(--page-shadow)]', both && '@3xl:grid-cols-2')}>
        {/* Bangla on the left page, Arabic on the right — like an opened bilingual book */}
        {showBn && <PageSheet book={book} page={page} lang="bn" blocks={blocks} side={both ? 'left' : 'single'} />}
        {showAr && <PageSheet book={book} page={page} lang="ar" blocks={blocks} side={both ? 'right' : 'single'} />}
        {/* spine: a hairline rule fading out toward the top and bottom edges */}
        {both && <div aria-hidden className="pointer-events-none absolute inset-y-8 left-1/2 hidden w-px -translate-x-1/2 bg-linear-to-b from-transparent via-[var(--page-accent)]/40 to-transparent @3xl:block" />}
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
        'relative flex min-h-[calc(100svh-3.75rem)] flex-col bg-[var(--page-bg)] px-5 pb-8 text-[var(--page-ink)] sm:min-h-[78vh] sm:px-10 sm:pb-10',
        // stacked on narrow screens: a faded rule separates the two pages instead
        side === 'right' && "@max-3xl:order-first @max-3xl:after:absolute @max-3xl:after:inset-x-8 @max-3xl:after:bottom-0 @max-3xl:after:h-px @max-3xl:after:bg-linear-to-r @max-3xl:after:from-transparent @max-3xl:after:via-[var(--page-accent)]/40 @max-3xl:after:to-transparent @max-3xl:after:content-['']",
      )}
    >
      {/* running head: title at the reading start, page number in a bookmark tab hanging from the top edge at the end */}
      <header className="mb-6 flex items-end gap-3">
        <span className={cn('min-w-0 flex-1 truncate border-b border-[var(--page-accent)]/45 pb-1 font-semibold text-[var(--page-muted)]', isAr ? 'font-arabic text-[15px]' : 'font-heading text-[13px]')}>
          {isAr ? book.title_ar : book.title_bn}
        </span>
        <span className="relative grid h-14 w-11 shrink-0 place-items-center pb-2.5 sm:h-16">
          <svg viewBox="0 0 44 64" preserveAspectRatio="none" className="absolute inset-0 size-full text-[var(--page-accent)]" aria-hidden>
            <path d="M3 0 V50 L22 62 L41 50 V0" fill="var(--page-hover)" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          </svg>
          <span className={cn('relative tabular-nums text-[var(--page-accent)]', isAr ? 'font-arabic text-[15px]' : 'text-[13px] font-semibold')}>{isAr ? arNum(page.number) : bnNum(page.number)}</span>
        </span>
      </header>

      <div className={cn('flex-1', isAr ? 'reader-ar' : 'reader-bn')} style={{ fontSize: isAr ? settings.fontSize * 1.22 : settings.fontSize }}>
        <BlockList blocks={blocks} lang={lang} />
      </div>

      {footnotes.length > 0 && <Footnotes footnotes={footnotes} lang={lang} />}
    </article>
  )
}

export function Footnotes({ footnotes, lang }: { footnotes: Footnote[]; lang: Lang }) {
  const { settings } = useReader()
  const isAr = lang === 'ar'
  return (
    <section
      aria-label={isAr ? 'الحواشي' : 'পাদটীকা'}
      className={cn('mt-6 text-[var(--page-ink)]/80 !leading-[calc(1.75*var(--reader-leading,1))]', isAr ? 'reader-ar' : 'reader-bn')}
      /* footnotes are 6/7 of the text they annotate */
      style={{ fontSize: settings.fontSize * (isAr ? 1.22 : 1) * (6 / 7) }}
    >
      {/* short print-style separator rule, anchored to the reading start */}
      <div className="mb-2.5 h-px w-1/3 max-w-44 bg-[var(--page-accent)]/50" />
      <ol className="space-y-[0.35em]">
        {footnotes.map((f) => (
          <li
            key={f.id}
            id={`fn-${lang}-${f.marker}`}
            className="-mx-2 flex scroll-mt-24 gap-1 rounded-[3px] px-2 transition-colors duration-700 data-[flash]:bg-[var(--page-active)] data-[flash]:duration-150"
          >
            <span className="shrink-0 font-semibold text-[var(--page-accent)] tabular-nums">({isAr ? arNum(f.marker) : bnNum(f.marker)})</span>
            <Markdown text={f.text_md} className="min-w-0 flex-1 [&_p]:m-0 [&_p+p]:mt-1" />
          </li>
        ))}
      </ol>
    </section>
  )
}
