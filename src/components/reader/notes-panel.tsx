import { useNavigate } from '@tanstack/react-router'
import { ArrowUpRight, Highlighter, Trash2 } from 'lucide-react'
import { useMemo } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { bnNum, timeAgo } from '@/lib/text'
import type { Annotation, Book } from '@/lib/types'
import { groupAnnotations, quoteByLang } from '@/lib/user-data'
import { cn } from '@/lib/utils'

/* actions stay visible on touch screens and fade in on hover where a pointer can hover */
const HOVER_ACTIONS = 'transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100'

interface HighlightsProps {
  book: Book
  annotations: Annotation[]
  onRemoveAnnotation: (id: Annotation['id']) => Promise<void>
  onNavigate: () => void
}


export function HighlightsPanel({ book, annotations, onRemoveAnnotation, onNavigate }: HighlightsProps) {
  const navigate = useNavigate()

  /* a highlight across several sentences is listed once, newest first */
  const highlights = useMemo(
    () => groupAnnotations(annotations).sort(([a], [b]) => (b.created_at ?? '').localeCompare(a.created_at ?? '')),
    [annotations],
  )

  const goToSentence = async (sentenceId: number, pageNumber?: number | null) => {
    try {
      /* highlights saved before pages were recorded look theirs up */
      const page = pageNumber ?? (await api<{ page_number: number }>(`/sentences/${sentenceId}`)).page_number
      onNavigate()
      navigate({ to: '/books/$slug/read/$page', params: { slug: book.slug, page: String(page) }, hash: `s-${sentenceId}` })
    } catch {
      toast.error('বাক্যটি আর পাওয়া যাচ্ছে না')
    }
  }

  if (!highlights.length) {
    return (
      <EmptyState icon={Highlighter} title="কোনো হাইলাইট নেই">
        লেখা নির্বাচন করে রং বেছে নিন বা নোট যোগ করুন।
      </EmptyState>
    )
  }

  return (
    <ul className="space-y-2.5">
      {highlights.map((parts) => (
        <HighlightCard key={parts[0].group_id ?? parts[0].id} parts={parts} onOpen={() => goToSentence(parts[0].target_id, parts[0].page_number)} onRemove={() => onRemoveAnnotation(parts[0].id)} />
      ))}
    </ul>
  )
}

function HighlightCard({ parts, onOpen, onRemove }: { parts: Annotation[]; onOpen: () => void; onRemove: () => void }) {
  const [a] = parts
  const when = timeAgo(a.created_at ?? null)

  return (
    <li data-color={a.color ?? 'yellow'} className="hl-card group relative overflow-hidden rounded-xl border border-black/5 transition-shadow hover:shadow-sm dark:border-white/10">
      <button type="button" onClick={onOpen} className="block w-full px-3.5 pt-3.5 text-start">
        <span className="line-clamp-6 block space-y-1">
          {quoteByLang(parts).map((passage, i) => (
            <span
              key={i}
              lang={passage.lang}
              dir={passage.lang === 'ar' ? 'rtl' : 'ltr'}
              className={cn('block', passage.lang === 'ar' ? 'font-arabic text-lg leading-loose' : 'text-[15px] leading-relaxed')}
            >
              {passage.text}
            </span>
          ))}
        </span>
        {a.note && (
          /* keep the note's own line breaks and blank lines as written */
          <span className="mt-3 block text-[15px] leading-relaxed break-words whitespace-pre-wrap text-black dark:text-white">{a.note}</span>
        )}
      </button>
      <div className="mt-3 flex items-center gap-1 border-t border-foreground/10 px-2 py-1">
        {a.page_number != null && <span className="ms-1 shrink-0 rounded-md bg-card/70 px-2 py-0.5 text-xs font-medium tabular-nums">পৃষ্ঠা {bnNum(a.page_number)}</span>}
        <span className="ms-1.5 min-w-0 flex-1 truncate text-xs text-foreground/60">{when}</span>
        <Button variant="ghost" size="icon-sm" aria-label="মুছুন" className={cn('text-foreground/60 hover:bg-foreground/5 hover:text-destructive', HOVER_ACTIONS)} onClick={onRemove}>
          <Trash2 />
        </Button>
        <Button variant="ghost" size="xs" className="text-foreground/70 hover:bg-foreground/5 hover:text-foreground" onClick={onOpen}>
          পাতায় যান <ArrowUpRight />
        </Button>
      </div>
    </li>
  )
}
