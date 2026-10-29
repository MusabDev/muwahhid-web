import { Link } from '@tanstack/react-router'
import { ChevronDown, ListTree } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { SectionHeading } from '@/components/brand'
import { EmptyState } from '@/components/states'
import { arNum, bnNum } from '@/lib/text'
import type { TocEntry } from '@/lib/types'
import { cn } from '@/lib/utils'

type Lang = 'bn' | 'ar'

/** The section the reader is in (the last entry starting on or before `page`) and its ancestors. */
function locate(entries: TocEntry[], page?: number): { activeId?: number; path: number[] } {
  if (page === undefined) return { path: [] }
  let found: { activeId?: number; path: number[] } = { path: [] }
  const walk = (list: TocEntry[], trail: number[]) => {
    for (const entry of list) {
      if (entry.page_number <= page) found = { activeId: entry.id, path: trail }
      if (entry.children?.length) walk(entry.children, [...trail, entry.id])
    }
  }
  walk(entries, [])
  return found
}

/** Open/closed state for the tree; the branch holding the reader's section starts open. */
function useTocTree(entries: TocEntry[], currentPage?: number) {
  const { activeId, path } = useMemo(() => locate(entries, currentPage), [entries, currentPage])
  const [open, setOpen] = useState<Set<number>>(() => new Set(path))
  const toggle = (id: number) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  return { activeId, open, toggle }
}

/** The bare tree, for the reader's contents panel. */
export function TocList({ slug, entries, currentPage, onNavigate }: { slug: string; entries: TocEntry[]; currentPage?: number; onNavigate?: () => void }) {
  const { activeId, open, toggle } = useTocTree(entries, currentPage)
  const listRef = useRef<HTMLOListElement>(null)

  /* bring the reader's section into view in a long contents list */
  useEffect(() => {
    listRef.current?.querySelector('[aria-current="location"]')?.scrollIntoView({ block: 'nearest' })
  }, [activeId])

  return (
    <ol ref={listRef} className="divide-y divide-border/70 overflow-hidden rounded-xl border bg-card">
      {entries.map((entry, index) => (
        <li key={entry.id}>
          <TocRow slug={slug} entry={entry} index={index} lang="bn" open={open} onToggle={toggle} depth={0} activeId={activeId} onNavigate={onNavigate} />
        </li>
      ))}
    </ol>
  )
}

/** The book's table of contents as a section: heading, language switch and a collapsible tree. */
export function TocSection({ slug, entries, currentPage }: { slug: string; entries?: TocEntry[]; currentPage?: number }) {
  const [lang, setLang] = useState<Lang>('bn')
  const { open, toggle } = useTocTree(entries ?? [], currentPage)

  return (
    <section>
      <SectionHeading title="সূচিপত্র" action={!!entries?.length && <LangSwitch lang={lang} onChange={setLang} />} />
      {entries?.length ? (
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <ol key={lang} lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'} className="divide-y divide-border/70 animate-in duration-300 fade-in">
            {entries.map((entry, index) => (
              <li key={entry.id}>
                <TocRow slug={slug} entry={entry} index={index} lang={lang} open={open} onToggle={toggle} depth={0} />
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <EmptyState icon={ListTree} title="সূচিপত্র নেই" />
      )}
    </section>
  )
}

/** A single pill that flips between the Bangla and Arabic titles. */
function LangSwitch({ lang, onChange }: { lang: Lang; onChange: (lang: Lang) => void }) {
  const ar = lang === 'ar'
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ar}
      aria-label="আরবি শিরোনাম দেখান"
      onClick={() => onChange(ar ? 'bn' : 'ar')}
      className="relative grid shrink-0 grid-cols-2 items-center rounded-full border bg-card p-1 text-sm font-semibold shadow-xs transition hover:border-gold/60"
    >
      <span
        aria-hidden
        className={cn('absolute inset-y-1 start-1 w-[calc(50%-0.25rem)] rounded-full bg-primary shadow-sm transition-transform duration-300 ease-out', ar && 'translate-x-full')}
      />
      <span className={cn('relative z-10 px-3.5 py-1 text-center transition-colors', ar ? 'text-muted-foreground' : 'text-primary-foreground')}>বাংলা</span>
      <span lang="ar" className={cn('relative z-10 px-3.5 text-center font-arabic text-base leading-none transition-colors', ar ? 'text-primary-foreground' : 'text-muted-foreground')}>
        عربي
      </span>
    </button>
  )
}

function TocRow({
  slug,
  entry,
  index,
  lang,
  open,
  onToggle,
  depth,
  activeId,
  onNavigate,
}: {
  slug: string
  entry: TocEntry
  index: number
  lang: Lang
  open: Set<number>
  onToggle: (id: number) => void
  depth: number
  activeId?: number
  onNavigate?: () => void
}) {
  const children = entry.children ?? []
  const expanded = open.has(entry.id)
  const ar = lang === 'ar'
  const top = depth === 0
  const active = entry.id === activeId

  return (
    <>
      <div className={cn('group/row flex items-center gap-2 pe-3 transition-colors hover:bg-accent/40', top ? 'py-1 ps-4' : 'ps-3', active && 'bg-gold/10')}>
        <Link
          to="/books/$slug/read/$page"
          params={{ slug, page: String(entry.page_number) }}
          hash={entry.sentence_id ? `s-${entry.sentence_id}` : undefined}
          onClick={onNavigate}
          aria-current={active ? 'location' : undefined}
          className="flex min-w-0 flex-1 items-center gap-3.5 py-2.5"
        >
          {top ? (
            <span aria-hidden className="relative flex size-8 shrink-0 items-center justify-center">
              <span className="absolute inset-1 rotate-45 rounded-[5px] border border-gold/60 bg-gold/10 transition-colors group-hover/row:border-gold group-hover/row:bg-gold/25" />
              <span className="relative text-[13px] font-semibold text-primary tabular-nums">{ar ? arNum(index + 1) : bnNum(index + 1)}</span>
            </span>
          ) : (
            <svg viewBox="0 0 20 20" aria-hidden className="size-2.5 shrink-0 text-gold/70">
              <path d="M10 1 12.5 7.5 19 10 12.5 12.5 10 19 7.5 12.5 1 10 7.5 7.5Z" fill="currentColor" />
            </svg>
          )}
          <span
            className={cn(
              'min-w-0 leading-snug text-foreground transition-colors group-hover/row:text-primary',
              active && 'text-primary',
              ar ? 'font-arabic' : 'font-heading',
              top ? (ar ? 'text-xl font-bold' : 'text-[17px] font-semibold') : ar ? 'text-lg' : 'text-[15px] text-foreground/85',
            )}
          >
            {ar ? entry.title_ar : entry.title_bn}
          </span>
          {/* dotted leader, as on a printed contents page */}
          <span aria-hidden className="mb-1 min-w-6 flex-1 self-end border-b-2 border-dotted border-border" />
          <span className="shrink-0 text-sm font-medium text-muted-foreground tabular-nums transition-colors group-hover/row:text-primary">
            {ar ? arNum(entry.page_number) : bnNum(entry.page_number)}
          </span>
        </Link>
        {children.length > 0 ? (
          <button
            type="button"
            onClick={() => onToggle(entry.id)}
            aria-expanded={expanded}
            aria-label={expanded ? 'উপ-অধ্যায় লুকান' : 'উপ-অধ্যায় দেখুন'}
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-full border bg-background/70 text-muted-foreground transition hover:border-gold/60 hover:text-foreground',
              expanded && 'border-primary bg-primary text-primary-foreground hover:text-primary-foreground',
            )}
          >
            <ChevronDown className={cn('size-4 transition-transform duration-300', expanded && 'rotate-180')} />
          </button>
        ) : (
          <span aria-hidden className="size-8 shrink-0" />
        )}
      </div>

      {children.length > 0 && (
        <div className={cn('grid transition-[grid-template-rows] duration-300 ease-out', expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')} inert={!expanded}>
          <div className="overflow-hidden">
            <ol className={cn('border-s-2 border-gold/30 pb-2', top ? 'ms-8 bg-muted/30' : 'ms-4')}>
              {children.map((child, childIndex) => (
                <li key={child.id}>
                  <TocRow slug={slug} entry={child} index={childIndex} lang={lang} open={open} onToggle={onToggle} depth={depth + 1} activeId={activeId} onNavigate={onNavigate} />
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </>
  )
}
