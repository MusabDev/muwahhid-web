import { Bookmark, Highlighter, ListTree, Search, X, type LucideIcon } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { bnNum } from '@/lib/text'
import { cn } from '@/lib/utils'

export type CompanionTab = 'toc' | 'search' | 'bookmarks' | 'notes'

export const COMPANION_TABS: { key: CompanionTab; label: string; title: string; icon: LucideIcon }[] = [
  { key: 'toc', label: 'সূচি', title: 'সূচিপত্র', icon: ListTree },
  { key: 'search', label: 'খুঁজুন', title: 'কিতাবে খুঁজুন', icon: Search },
  { key: 'bookmarks', label: 'বুকমার্ক', title: 'বুকমার্ক', icon: Bookmark },
  { key: 'notes', label: 'নোট', title: 'হাইলাইট ও নোট', icon: Highlighter },
]

/**
 * The reader's single side companion for contents, search, bookmarks and notes.
 * A drawer from the bottom on phones, a floating card on tablets, and docked beside
 * the page on wide screens (the page makes room for it instead of being covered).
 */
export function Companion({
  tab,
  onTab,
  onClose,
  counts,
  children,
}: {
  tab: CompanionTab | null
  onTab: (tab: CompanionTab) => void
  onClose: () => void
  counts?: Partial<Record<CompanionTab, number>>
  children: ReactNode
}) {
  const open = tab !== null

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      {/* the page stays visible and usable when docked, so only the overlay sizes get a backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        className={cn('fixed inset-0 z-40 bg-black/35 backdrop-blur-[2px] transition-opacity duration-300 xl:hidden', open ? 'opacity-100' : 'pointer-events-none opacity-0')}
      />
      <aside
        aria-label="সূচিপত্র, খোঁজ ও নোট"
        inert={!open}
        className={cn(
          'fixed z-50 flex flex-col overflow-hidden border border-gold/25 bg-card text-card-foreground shadow-2xl transition-[translate,opacity] duration-300 ease-out',
          'inset-x-0 bottom-0 h-[82svh] rounded-t-2xl',
          'md:inset-x-auto md:start-4 md:top-[4.75rem] md:bottom-4 md:h-auto md:w-[380px] md:rounded-2xl',
          'xl:shadow-[0_20px_50px_-24px_oklch(0.15_0.03_50/0.55)]',
          open ? 'translate-y-0 md:translate-x-0' : 'translate-y-full opacity-0 md:-translate-x-[calc(100%+2rem)] md:translate-y-0',
        )}
      >
        {/* grab handle for the phone drawer */}
        <div aria-hidden className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border md:hidden" />

        <div className="relative shrink-0 overflow-hidden border-b border-gold/20 bg-muted/40 px-3 pt-3 pb-3">
          <div className="pattern-tint pointer-events-none absolute inset-0 text-gold opacity-[0.07]" />
          <div className="relative mb-3 flex items-center gap-2 ps-1">
            <h2 className="min-w-0 flex-1 truncate font-heading text-base font-semibold">{COMPANION_TABS.find((t) => t.key === tab)?.title}</h2>
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="বন্ধ করুন" className="text-muted-foreground">
              <X />
            </Button>
          </div>
          <div role="tablist" className="relative grid grid-cols-4 gap-1 rounded-xl border bg-background/70 p-1 shadow-xs">
            {COMPANION_TABS.map((t) => {
              const active = t.key === tab
              const count = counts?.[t.key]
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onTab(t.key)}
                  className={cn(
                    'relative flex flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[12px] font-medium transition-colors',
                    active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                  )}
                >
                  <t.icon className="size-4" />
                  {t.label}
                  {!!count && (
                    <span className={cn('absolute end-1 top-0.5 min-w-4 rounded-full px-1 text-[10px] leading-4 tabular-nums', active ? 'bg-gold text-gold-foreground' : 'bg-gold/20 text-foreground')}>
                      {bnNum(count)}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 scrollbar-thin">
          {children}
        </div>
      </aside>
    </>
  )
}
