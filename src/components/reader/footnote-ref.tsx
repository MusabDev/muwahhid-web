import type { ReactNode } from 'react'
import { arNum, bnNum } from '@/lib/text'
import type { Footnote, Lang } from '@/lib/types'

const FLASH_MS = 1800

/** Scroll to the footnote at the bottom of the page and briefly highlight it. */
function flashFootnote(lang: Lang, marker: string) {
  const el = document.getElementById(`fn-${lang}-${marker}`)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  el.removeAttribute('data-flash')
  void el.offsetWidth // restart the highlight when the same marker is clicked again
  el.setAttribute('data-flash', '')
  window.setTimeout(() => el.removeAttribute('data-flash'), FLASH_MS)
}

export function FootnoteRef({ marker, lang, footnotes }: { marker: string; lang: Lang; footnotes: Footnote[]; children?: ReactNode }) {
  const footnote = footnotes.find((f) => f.marker === marker)
  const label = (
    <sup className="fn-ref" data-fn="true">
      {lang === 'ar' ? arNum(marker) : bnNum(marker)}
    </sup>
  )
  if (!footnote) return label

  return (
    <button
      type="button"
      data-fn="true"
      onClick={(e) => {
        e.stopPropagation()
        flashFootnote(lang, marker)
      }}
      className="inline"
      aria-label={lang === 'ar' ? `حاشية ${marker}` : `টীকা ${marker}`}
    >
      {label}
    </button>
  )
}
