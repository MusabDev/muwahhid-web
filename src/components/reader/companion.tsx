import { Highlighter, ListTree, Search, X, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { bnNum } from '@/lib/text'
import { cn } from '@/lib/utils'

export type CompanionTab = 'toc' | 'search' | 'notes'

export const COMPANION_TABS: { key: CompanionTab; label: string; icon: LucideIcon }[] = [
  { key: 'toc', label: 'সূচি', icon: ListTree },
  { key: 'search', label: 'সার্চ', icon: Search },
  { key: 'notes', label: 'নোট', icon: Highlighter },
]

/* how far the phone drawer must be pulled down before letting go closes it */
const DRAG_CLOSE_PX = 110
/* movement below this is a tap, so the tabs and buttons in the header keep working */
const DRAG_START_PX = 6

/**
 * The reader's single side companion for contents, search and notes.
 * A drawer from the bottom on phones, a floating card on tablets, and docked beside
 * the page on wide screens (the page makes room for it instead of being covered).
 * Each panel is kept once opened, so a search or a scrolled list survives switching tabs.
 */
export function Companion({
  tab,
  onTab,
  onClose,
  counts,
  book,
  panels,
}: {
  tab: CompanionTab | null
  onTab: (tab: CompanionTab) => void
  onClose: () => void
  counts?: Partial<Record<CompanionTab, number>>
  book?: { title: string; page: number; lastPage?: number | null }
  panels: Record<CompanionTab, ReactNode>
}) {
  const open = tab !== null
  const [visited, setVisited] = useState<Set<CompanionTab>>(() => new Set())
  const [lastTab, setLastTab] = useState<CompanionTab>('toc')
  const shown = tab ?? lastTab
  const tabRefs = useRef<Partial<Record<CompanionTab, HTMLButtonElement | null>>>({})
  const drag = useDrawerDrag(onClose)

  if (tab && (tab !== lastTab || !visited.has(tab))) {
    setLastTab(tab)
    if (!visited.has(tab)) setVisited(new Set(visited).add(tab))
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const onTabKey = (e: ReactKeyboardEvent) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const index = COMPANION_TABS.findIndex((t) => t.key === shown)
    const next = COMPANION_TABS[(index + step + COMPANION_TABS.length) % COMPANION_TABS.length].key
    onTab(next)
    tabRefs.current[next]?.focus()
  }

  const activeIndex = COMPANION_TABS.findIndex((t) => t.key === shown)
  const progress = book?.lastPage ? Math.min(1, book.page / book.lastPage) : null

  return (
    <>
      {/* the page stays visible and usable when docked, so only the overlay sizes get a backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        className={cn('fixed inset-0 z-40 bg-black/35 backdrop-blur-[2px] transition-opacity duration-300 xl:hidden', open ? 'opacity-100' : 'pointer-events-none opacity-0')}
      />
      <aside
        aria-label="সূচিপত্র, সার্চ ও নোট"
        inert={!open}
        style={drag.offset ? { translate: `0 ${drag.offset}px`, transition: 'none' } : undefined}
        className={cn(
          'fixed z-50 flex flex-col overflow-hidden border border-gold/25 bg-card text-card-foreground shadow-2xl transition-[translate,opacity] duration-300 ease-out',
          'inset-x-0 bottom-0 h-[85svh] rounded-t-3xl',
          'md:inset-x-auto md:start-4 md:top-[4.75rem] md:bottom-4 md:h-auto md:w-[380px] md:rounded-2xl',
          'xl:shadow-[0_20px_50px_-24px_oklch(0.15_0.03_50/0.55)]',
          open ? 'translate-y-0 md:translate-x-0' : 'translate-y-full opacity-0 md:-translate-x-[calc(100%+2rem)] md:translate-y-0',
        )}
      >
        <header {...drag.handlers} className="relative shrink-0 touch-none border-b border-gold/15 md:touch-auto">
          <div className="pattern-tint pointer-events-none absolute inset-0 text-gold opacity-[0.06]" />
          {/* grab handle for the phone drawer */}
          <div aria-hidden className="relative mx-auto mt-2 h-1.5 w-10 rounded-full bg-foreground/15 md:hidden" />

          <div className="relative flex items-start gap-2 px-4 pt-2.5 md:pt-3.5">
            <div className="min-w-0 flex-1">
              <p className="truncate font-heading text-[15px] leading-snug font-semibold">{book?.title}</p>
              {book && (
                <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                  পৃষ্ঠা {bnNum(book.page)}
                  {book.lastPage ? ` / ${bnNum(book.lastPage)}` : ''}
                </p>
              )}
            </div>
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="বন্ধ করুন" className="-me-1.5 shrink-0 text-muted-foreground">
              <X />
            </Button>
          </div>
          {progress !== null && (
            <div aria-hidden className="relative mx-4 mt-2 h-1 overflow-hidden rounded-full bg-foreground/[0.07]">
              <div className="h-full rounded-full bg-gold transition-[width] duration-500" style={{ width: `${progress * 100}%` }} />
            </div>
          )}

          <div role="tablist" aria-label="প্যানেল" onKeyDown={onTabKey} className="relative mx-3 mt-3 mb-3 grid grid-cols-3 rounded-xl bg-foreground/[0.05] p-1">
            {/* the sliding marker under the active tab */}
            <span
              aria-hidden
              className="absolute inset-y-1 start-1 w-[calc((100%-0.5rem)/3)] rounded-lg bg-card shadow-sm ring-1 ring-black/5 transition-transform duration-300 ease-out dark:ring-white/10"
              style={{ transform: `translateX(${activeIndex * 100}%)` }}
            />
            {COMPANION_TABS.map((t) => {
              const active = t.key === shown
              const count = counts?.[t.key]
              return (
                <button
                  key={t.key}
                  ref={(el) => {
                    tabRefs.current[t.key] = el
                  }}
                  type="button"
                  role="tab"
                  id={`companion-tab-${t.key}`}
                  aria-selected={active}
                  aria-controls={`companion-panel-${t.key}`}
                  tabIndex={active ? 0 : -1}
                  onClick={() => onTab(t.key)}
                  className={cn(
                    'relative z-10 flex h-9 items-center justify-center gap-1.5 rounded-lg text-[13px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                    active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <t.icon className={cn('size-4', active && 'text-primary')} />
                  {t.label}
                  {!!count && (
                    <span className={cn('min-w-[1.125rem] rounded-full px-1 text-[10.5px] leading-[1.125rem] tabular-nums', active ? 'bg-gold text-gold-foreground' : 'bg-foreground/10')}>
                      {bnNum(count)}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </header>

        {COMPANION_TABS.map((t) =>
          visited.has(t.key) ? (
            <div
              key={t.key}
              role="tabpanel"
              id={`companion-panel-${t.key}`}
              aria-labelledby={`companion-tab-${t.key}`}
              hidden={t.key !== shown}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] scrollbar-thin"
            >
              {panels[t.key]}
            </div>
          ) : null,
        )}
      </aside>
    </>
  )
}

/** Pull the phone drawer down by its header to close it; larger screens ignore the gesture. */
function useDrawerDrag(onClose: () => void) {
  const [offset, setOffset] = useState(0)
  const start = useRef<{ y: number; id: number; dragging: boolean } | null>(null)

  const end = () => {
    if (start.current?.dragging && offset > DRAG_CLOSE_PX) onClose()
    start.current = null
    setOffset(0)
  }

  const handlers = {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      if (e.pointerType === 'mouse' || window.matchMedia('(min-width: 768px)').matches) return
      start.current = { y: e.clientY, id: e.pointerId, dragging: false }
    },
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
      const s = start.current
      if (!s || s.id !== e.pointerId) return
      const dy = e.clientY - s.y
      if (!s.dragging) {
        if (dy < DRAG_START_PX) return
        /* only capture once it is clearly a drag, so a tap still clicks the tab under it */
        s.dragging = true
        e.currentTarget.setPointerCapture(e.pointerId)
      }
      setOffset(Math.max(0, dy))
    },
    onPointerUp: end,
    onPointerCancel: end,
  }

  return { offset, handlers }
}
