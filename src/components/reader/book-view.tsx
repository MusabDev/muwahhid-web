import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react'
import { Markdown } from '@/components/markdown'
import { arNum, bnNum } from '@/lib/text'
import type { Book, BookPage, Footnote, Lang } from '@/lib/types'
import { cn } from '@/lib/utils'
import { BlockList, groupBlocks, type Block } from './blocks'
import { useReader } from './reader-context'
import { sentencePx } from './settings-panel'

/** The printed page the PDF export uses (config/reader.php): A5 at 11pt body text. */
const SHEET_W_IN = 5.83
const BASE_PT = 11
const CSS_PX_PER_IN = 96
/** Like the PDF: shrink the type down to this much before carrying blocks to a continuation sheet. */
const MIN_FIT = 0.86
/**
 * Below this window width (Tailwind's lg: phones and tablets) the page flows instead of being a
 * fixed A5 sheet: full width, as tall as its text, in larger type. Keep in step with index.css.
 */
const FLOW_BELOW_PX = 1024
const FLOW_QUERY = `(max-width: ${FLOW_BELOW_PX - 0.02}px)`
/** The desk's side padding (sm:px-6) plus room for a scrollbar, between the window edge and the page. */
const DESK_GUTTER_PX = 48 + 20
/** Phones show one language (the route drops Arabic there); hide it in CSS too, so the server's first paint agrees. */
const PHONE_HIDDEN = 'phone-hidden'

/** One printed sheet of a book page: a run of its blocks, in type shrunk by `fit`. */
interface Part {
  from: number
  to: number
  fit: number
  /** The page's footnotes sit at the foot of its last sheet. */
  footnotes: boolean
  /** A single block taller than a whole sheet. */
  tall?: boolean
}

interface Layout {
  key: string
  parts: Part[]
  done: boolean
}

const initialLayout = (key: string, count: number): Layout => ({ key, parts: [{ from: 0, to: count, fit: 1, footnotes: true }], done: false })

const overflows = (sheet: HTMLElement) => sheet.scrollHeight > sheet.clientHeight + 1

/**
 * Port of the PDF export's fit() (book.blade.php): measure the last sheet; shrink its type a
 * little first, and only if it still doesn't fit, carry trailing blocks (and the footnotes) onto
 * a new sheet, then measure that one the same way. Each step runs before paint.
 */
function measure(sheet: HTMLElement, part: Part): Part[] | null {
  // React owns the inline --fit; put its value back after measuring
  const own = sheet.style.getPropertyValue('--fit')
  const restore = () => sheet.style.setProperty('--fit', own)
  let fit = 1
  sheet.style.setProperty('--fit', '1')
  while (overflows(sheet) && fit > MIN_FIT) {
    fit = Math.round((fit - 0.02) * 100) / 100
    sheet.style.setProperty('--fit', String(fit))
  }
  if (!overflows(sheet)) {
    restore()
    return fit === part.fit ? null : [{ ...part, fit }]
  }

  // too long even in smaller type: at full size, without the footnotes, how many blocks fit?
  sheet.style.setProperty('--fit', '1')
  const footnotes = sheet.querySelector<HTMLElement>('.sheet-footnotes')
  const text = sheet.querySelector<HTMLElement>('.sheet-text')
  const blocks = [...(text?.children ?? [])] as HTMLElement[]
  if (footnotes) footnotes.style.display = 'none'
  // detach trailing blocks (as the PDF moves them) so :last-child margins match; reattached right after
  let kept = blocks.length
  while (overflows(sheet) && kept > 1) blocks[--kept].remove()
  const tall = kept === 1 && overflows(sheet)
  text?.append(...blocks.slice(kept))
  if (footnotes) footnotes.style.removeProperty('display')
  restore()

  const cut = part.from + kept
  // nothing left to carry over (e.g. the footnotes alone overflow): let this sheet grow instead
  if (blocks.length === 0 || cut >= part.to && !part.footnotes) return [{ ...part, fit: 1, tall: true }]
  return [
    { from: part.from, to: cut, fit: 1, footnotes: false, tall },
    { from: cut, to: part.to, fit: 1, footnotes: part.footnotes },
  ]
}

/** Lay a language's blocks out over as many fixed-size sheets as they need. */
function useSheets(count: number, key: string) {
  const [layout, setLayout] = useState(() => initialLayout(key, count))
  const current = layout.key === key ? layout : initialLayout(key, count)
  const lastSheet = useRef<HTMLElement | null>(null)

  useLayoutEffect(() => {
    if (current.done || !lastSheet.current) return
    const parts = current.parts
    const last = parts[parts.length - 1]
    const result = measure(lastSheet.current, last)
    if (!result) return setLayout({ ...current, done: true })
    setLayout({ key, parts: [...parts.slice(0, -1), ...result], done: result.length === 1 })
  }, [current, key])

  return { parts: current.parts, lastSheet }
}

/** Bump on every web font load, so sheets are measured again once the real fonts are in. */
function useFontsVersion() {
  const [version, setVersion] = useState(0)
  useEffect(() => {
    if (typeof document === 'undefined' || !document.fonts) return
    const bump = () => setVersion((v) => v + 1)
    document.fonts.ready.then(bump)
    document.fonts.addEventListener('loadingdone', bump)
    return () => document.fonts.removeEventListener('loadingdone', bump)
  }, [])
  return version
}

/** Whether the window is phone/tablet sized; false on the server (CSS makes the first paint right anyway). */
function useFlow() {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(FLOW_QUERY)
      media.addEventListener('change', onChange)
      return () => media.removeEventListener('change', onChange)
    },
    () => window.matchMedia(FLOW_QUERY).matches,
    () => false,
  )
}

/** Width the reader has for the page(s); null until measured. */
function useAvailableWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState<number | null>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.clientWidth)
    const observer = new ResizeObserver(() => setWidth(el.clientWidth))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

export function BookView({ book, page }: { book: Book; page: BookPage }) {
  const { settings } = useReader()
  const blocks = groupBlocks(page.sentences)
  const showAr = settings.showArabic
  const showBn = settings.showBangla
  const both = showAr && showBn
  const fonts = useFontsVersion()
  const flow = useFlow()
  const [wrapRef, available] = useAvailableWidth()

  const scale = settings.fontPt / BASE_PT
  const sheetPx = SHEET_W_IN * CSS_PX_PER_IN * scale
  const spread = both && !flow && (available == null || available >= sheetPx * 2)
  /* a desktop window too narrow for the page shrinks it to fit, so its lines still break as in print */
  const zoom = available && !flow ? Math.min(1, available / (spread ? sheetPx * 2 : sheetPx)) : 1
  /* phones and tablets lay both languages out in the same two-page row; CSS sets them side by side or stacked */
  const rows = both && (spread || flow)

  const key = [page.id, page.number, settings.fontPt, settings.leading, settings.fontAr, settings.fontBn, settings.diacritics, fonts, flow].join('|')
  const bn = useSheets(blocks.length, key)
  const ar = useSheets(blocks.length, key)

  const sheetStyle = { ['--s' as string]: scale, ['--flow-px' as string]: `${sentencePx(settings.fontPt)}px` } as CSSProperties
  const sheets = (lang: Lang, layout: ReturnType<typeof useSheets>) =>
    layout.parts.map((part, i) => (
      <PageSheet
        key={`${lang}-${part.from}`}
        ref={i === layout.parts.length - 1 ? (el) => void (layout.lastSheet.current = el) : undefined}
        book={book}
        page={page}
        lang={lang}
        blocks={blocks.slice(part.from, part.to)}
        part={part}
        style={sheetStyle}
        className={cn(!rows && 'sm:[box-shadow:var(--page-shadow)]', both && lang === 'ar' && PHONE_HIDDEN)}
      />
    ))
  const blank = (k: string) => <div key={k} aria-hidden className={cn('book-sheet', PHONE_HIDDEN)} style={sheetStyle} />

  let content
  if (rows) {
    /* Bangla on the left page, Arabic on the right — like an opened bilingual book (and the PDF) */
    const left = sheets('bn', bn)
    const right = sheets('ar', ar)
    content = Array.from({ length: Math.max(left.length, right.length) }, (_, i) => (
      <div key={i} className="book-row relative flex sm:[box-shadow:var(--page-shadow)]">
        {left[i] ?? blank(`bn-blank-${i}`)}
        {right[i] ?? blank(`ar-blank-${i}`)}
        {/* spine: a hairline rule fading out toward the top and bottom edges */}
        <div aria-hidden className="book-spine pointer-events-none absolute inset-y-8 left-1/2 w-px -translate-x-1/2 bg-linear-to-b from-transparent via-[var(--page-accent)]/40 to-transparent" />
      </div>
    ))
  } else {
    content = [...(showAr ? sheets('ar', ar) : []), ...(showBn ? sheets('bn', bn) : [])]
  }

  /*
   * The server can't know the window width, so its HTML assumes a wide desktop (a spread, no zoom).
   * CSS keeps that first paint right on phones and tablets (flowing pages) and on windows wide
   * enough for the spread; in between, the page stays invisible until it has been measured,
   * instead of showing the wrong layout for a moment.
   */
  const firstPaintFits = Math.ceil((both ? sheetPx * 2 : sheetPx) + DESK_GUTTER_PX)
  /* inline-size containment: the page's own width must not widen what is measured as available */
  return (
    <div ref={wrapRef} data-book-view="" data-measured={available != null || undefined} className="w-full [contain:inline-size]">
      {available == null && firstPaintFits > FLOW_BELOW_PX && (
        <style>{`@media (min-width: ${FLOW_BELOW_PX}px) and (max-width: ${firstPaintFits}px) { [data-book-view]:not([data-measured]) { visibility: hidden; } }`}</style>
      )}
      <div className={cn('mx-auto flex flex-col gap-6', flow ? 'w-full' : 'w-fit')} style={{ zoom }}>
        {content}
      </div>
    </div>
  )
}

function PageSheet({
  ref,
  book,
  page,
  lang,
  blocks,
  part,
  style,
  className,
}: {
  ref?: (el: HTMLElement | null) => void
  book: Book
  page: BookPage
  lang: Lang
  blocks: Block[]
  part: Part
  style: CSSProperties
  className?: string
}) {
  const isAr = lang === 'ar'
  const footnotes = part.footnotes ? page.footnotes[lang] : []

  return (
    <article ref={ref} lang={lang} dir={isAr ? 'rtl' : 'ltr'} data-tall={part.tall || undefined} className={cn('book-sheet', lang, className)} style={{ ...style, ['--fit' as string]: part.fit }}>
      {/* running head: title at the reading start, page number in a bookmark tab hanging from the top edge at the end */}
      <header className="running-head">
        <span className="running-title">{isAr ? book.title_ar : book.title_bn}</span>
        <span className="page-tab">
          <svg viewBox="0 0 44 64" preserveAspectRatio="none" aria-hidden>
            <path d="M3 0 V50 L22 62 L41 50 V0" fill="var(--page-hover)" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          </svg>
          <span>{isAr ? arNum(page.number) : bnNum(page.number)}</span>
        </span>
      </header>

      <div className={cn('sheet-text', isAr ? 'reader-ar' : 'reader-bn')}>
        <BlockList blocks={blocks} lang={lang} />
      </div>

      {footnotes.length > 0 && <Footnotes footnotes={footnotes} lang={lang} />}
    </article>
  )
}

/**
 * A page's footnotes under a short print-style rule. In the book view the sheet sizes them
 * (.sheet-footnotes); sentence view passes its own text size in `fontPx`.
 */
export function Footnotes({ footnotes, lang, fontPx }: { footnotes: Footnote[]; lang: Lang; fontPx?: number }) {
  const isAr = lang === 'ar'
  return (
    <section
      aria-label={isAr ? 'الحواشي' : 'পাদটীকা'}
      className={cn(
        isAr ? 'reader-ar' : 'reader-bn',
        fontPx == null ? 'sheet-footnotes' : 'mt-6 text-[var(--page-ink)]/80 !leading-[calc(1.75*var(--reader-leading,1))]',
      )}
      /* footnotes are 6/7 of the text they annotate */
      style={fontPx == null ? undefined : { fontSize: fontPx * (isAr ? 1.22 : 1) * (6 / 7) }}
    >
      {/* short print-style separator rule, anchored to the reading start */}
      <div className={fontPx == null ? 'sheet-footnotes-rule' : 'mb-2.5 h-px w-1/3 max-w-44 bg-[var(--page-accent)]/50'} />
      <ol className={fontPx == null ? undefined : 'space-y-[0.35em]'}>
        {footnotes.map((f) => (
          <li
            key={f.id}
            id={`fn-${lang}-${f.marker}`}
            className="sheet-footnote -mx-2 flex scroll-mt-24 gap-[0.3em] rounded-[3px] px-2 transition-colors duration-700 data-[flash]:bg-[var(--page-active)] data-[flash]:duration-150"
          >
            <span className="shrink-0 font-semibold text-[var(--page-accent)] tabular-nums">({isAr ? arNum(f.marker) : bnNum(f.marker)})</span>
            {/* the PDF flattens a footnote into one run of text; the book view does too, so it fills the page the same */}
            <Markdown inline={fontPx == null} text={f.text_md} className="min-w-0 flex-1 [&_p]:m-0 [&_p+p]:mt-1" />
          </li>
        ))}
      </ol>
    </section>
  )
}
