import type { ReactNode } from 'react'
import { Markdown } from '@/components/markdown'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { Footnote, Lang } from '@/lib/types'

export function FootnoteRef({ marker, lang, footnotes, children }: { marker: string; lang: Lang; footnotes: Footnote[]; children: ReactNode }) {
  const footnote = footnotes.find((f) => f.marker === marker)
  if (!footnote) return <>{children}</>

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" data-fn="true" onClick={(e) => e.stopPropagation()} className="inline" aria-label={`টীকা ${marker}`}>
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        className="w-80 max-w-[90vw] border-[var(--page-edge)] bg-[var(--page-bg)] text-[var(--page-ink)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1.5 text-xs font-semibold text-[var(--page-accent)]">{lang === 'ar' ? `حاشية (${marker})` : `টীকা (${marker})`}</div>
        <div lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'} className={lang === 'ar' ? 'reader-ar text-lg' : 'reader-bn text-[15px]'}>
          <Markdown text={footnote.text_md} />
        </div>
      </PopoverContent>
    </Popover>
  )
}
