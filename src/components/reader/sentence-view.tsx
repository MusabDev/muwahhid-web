import { arNum, bnNum } from '@/lib/text'
import type { Book, BookPage } from '@/lib/types'
import { cn } from '@/lib/utils'
import { BlockShell } from './blocks'
import { Footnotes } from './book-view'
import { useReader } from './reader-context'
import { Sentence } from './sentence'

/** Each Arabic sentence beside its Bangla translation. */
export function SentenceView({ book, page }: { book: Book; page: BookPage }) {
  const { settings } = useReader()
  const both = settings.showArabic && settings.showBangla

  return (
    <article className="mx-auto w-full max-w-[1100px] rounded-[6px] bg-[var(--page-bg)] px-4 py-6 text-[var(--page-ink)] [box-shadow:var(--page-shadow)] sm:px-10 sm:py-8">
      <header className="mb-6 flex items-center justify-between gap-3 border-b-[3px] border-double border-[var(--page-edge)] pb-2 text-[12px] text-[var(--page-muted)]">
        <span className="truncate font-heading">{book.title_bn}</span>
        <span className="font-arabic text-[15px]">{book.title_ar}</span>
      </header>

      <div className="divide-y divide-[var(--page-edge)]/70">
        {page.sentences.map((sentence) => (
          <div key={sentence.id} className={cn('grid gap-x-10 gap-y-2 py-3.5', both && '@2xl:grid-cols-2')}>
            {settings.showArabic && (
              <div lang="ar" dir="rtl" className="reader-ar @2xl:order-2" style={{ fontSize: settings.fontSize * 1.22 }}>
                {sentence.block_type === 'paragraph' ? (
                  <Sentence sentence={sentence} lang="ar" />
                ) : (
                  <BlockShell type={sentence.block_type} lang="ar">
                    <Sentence sentence={sentence} lang="ar" />
                  </BlockShell>
                )}
              </div>
            )}
            {settings.showBangla && (
              <div lang="bn" className="reader-bn @2xl:order-1" style={{ fontSize: settings.fontSize }}>
                {sentence.block_type === 'paragraph' ? (
                  <Sentence sentence={sentence} lang="bn" />
                ) : (
                  <BlockShell type={sentence.block_type} lang="bn">
                    <Sentence sentence={sentence} lang="bn" />
                  </BlockShell>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className={cn('grid gap-x-10', both && '@2xl:grid-cols-2')}>
        {settings.showBangla && page.footnotes.bn.length > 0 && (
          <div lang="bn">
            <Footnotes footnotes={page.footnotes.bn} lang="bn" />
          </div>
        )}
        {settings.showArabic && page.footnotes.ar.length > 0 && (
          <div lang="ar" dir="rtl" className="@2xl:order-2">
            <Footnotes footnotes={page.footnotes.ar} lang="ar" />
          </div>
        )}
      </div>

      <footer className="mt-6 flex items-center justify-center gap-3 text-sm text-[var(--page-muted)]">
        <span className="h-px w-10 bg-[var(--page-edge)]" />
        {bnNum(page.number)} · <span className="font-arabic">{arNum(page.number)}</span>
        <span className="h-px w-10 bg-[var(--page-edge)]" />
      </footer>
    </article>
  )
}
