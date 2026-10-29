import { Link } from '@tanstack/react-router'
import { arNum, bnNum } from '@/lib/text'
import type { TocEntry } from '@/lib/types'
import { cn } from '@/lib/utils'

export function TocList({ slug, entries, currentPage, onNavigate, depth = 0 }: { slug: string; entries: TocEntry[]; currentPage?: number; onNavigate?: () => void; depth?: number }) {
  return (
    <ul className={cn('space-y-0.5', depth > 0 && 'ms-4 mt-0.5 border-s border-gold/30 ps-2')}>
      {entries.map((entry) => (
        <li key={entry.id}>
          <Link
            to="/books/$slug/read/$page"
            params={{ slug, page: String(entry.page_number) }}
            hash={entry.sentence_id ? `s-${entry.sentence_id}` : undefined}
            onClick={onNavigate}
            className={cn(
              'flex items-baseline gap-3 rounded-md px-2.5 py-2 transition-colors hover:bg-muted',
              currentPage === entry.page_number && 'bg-muted font-semibold text-primary',
            )}
          >
            <span className="min-w-0 flex-1">
              <span className="block leading-snug">{entry.title_bn}</span>
              <span lang="ar" dir="rtl" className="block text-left font-arabic text-[15px] leading-snug text-muted-foreground">
                {entry.title_ar}
              </span>
            </span>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums" title={arNum(entry.page_number)}>
              {bnNum(entry.page_number)}
            </span>
          </Link>
          {entry.children && entry.children.length > 0 && (
            <TocList slug={slug} entries={entry.children} currentPage={currentPage} onNavigate={onNavigate} depth={depth + 1} />
          )}
        </li>
      ))}
    </ul>
  )
}
