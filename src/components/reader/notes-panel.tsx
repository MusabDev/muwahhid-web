import { useNavigate } from '@tanstack/react-router'
import { Bookmark as BookmarkIcon, BookmarkPlus, Highlighter, Pencil, StickyNote, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { bnNum } from '@/lib/text'
import type { Annotation, Book, Bookmark } from '@/lib/types'
import { cn } from '@/lib/utils'

interface BookmarksProps {
  book: Book
  pageNumber: number
  bookmarks: Bookmark[]
  onAddBookmark: (label: string | null) => Promise<void>
  onRenameBookmark: (id: Bookmark['id'], label: string | null) => Promise<void>
  onRemoveBookmark: (id: Bookmark['id']) => Promise<void>
  onNavigate: () => void
}

export function BookmarksPanel({ book, pageNumber, bookmarks, onAddBookmark, onRenameBookmark, onRemoveBookmark, onNavigate }: BookmarksProps) {
  const navigate = useNavigate()
  const [label, setLabel] = useState('')
  const [editing, setEditing] = useState<Bookmark['id'] | null>(null)
  const [editLabel, setEditLabel] = useState('')

  const sortedBookmarks = [...bookmarks].sort((a, b) => a.page_number - b.page_number)

  return (
    <div>
      <form
        className="mb-4 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault()
          await onAddBookmark(label.trim() || null)
          setLabel('')
          toast.success(`পৃষ্ঠা ${bnNum(pageNumber)} বুকমার্ক করা হয়েছে`)
        }}
      >
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={`পৃষ্ঠা ${bnNum(pageNumber)} — নাম (ঐচ্ছিক)`} className="h-9" />
        <Button type="submit" size="lg" className="shrink-0">
          <BookmarkPlus /> যোগ
        </Button>
      </form>
      {sortedBookmarks.length ? (
        <ul className="space-y-1.5">
          {sortedBookmarks.map((b) => (
            <li key={b.id} className={cn('group flex items-center gap-2 rounded-lg border bg-card px-3 py-2', b.page_number === pageNumber && 'border-gold/60')}>
              <BookmarkIcon className="size-4 shrink-0 fill-gold text-gold" />
              {editing === b.id ? (
                <form
                  className="flex-1"
                  onSubmit={async (e) => {
                    e.preventDefault()
                    await onRenameBookmark(b.id, editLabel.trim() || null)
                    setEditing(null)
                  }}
                >
                  <Input autoFocus value={editLabel} onChange={(e) => setEditLabel(e.target.value)} onBlur={() => setEditing(null)} className="h-7" />
                </form>
              ) : (
                <button
                  type="button"
                  className="min-w-0 flex-1 text-start"
                  onClick={() => {
                    onNavigate()
                    navigate({ to: '/books/$slug/read/$page', params: { slug: book.slug, page: String(b.page_number) }, hash: b.sentence_id ? `s-${b.sentence_id}` : undefined })
                  }}
                >
                  <span className="block truncate text-sm font-medium">{b.label || `পৃষ্ঠা ${bnNum(b.page_number)}`}</span>
                  <span className="block text-xs text-muted-foreground">
                    পৃষ্ঠা {bnNum(b.page_number)}
                    {b.sentence_id ? ' · বাক্য' : ''}
                  </span>
                </button>
              )}
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="নাম পরিবর্তন"
                className="opacity-60 group-hover:opacity-100"
                onClick={() => {
                  setEditing(b.id)
                  setEditLabel(b.label ?? '')
                }}
              >
                <Pencil />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label="মুছুন" className="opacity-60 group-hover:opacity-100" onClick={() => onRemoveBookmark(b.id)}>
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={BookmarkIcon} title="কোনো বুকমার্ক নেই">
          উপরের ঘরে নাম দিয়ে এই পাতা সংরক্ষণ করুন, অথবা কোনো বাক্যে চাপ দিয়ে বুকমার্ক করুন।
        </EmptyState>
      )}
    </div>
  )
}

interface HighlightsProps {
  book: Book
  annotations: Annotation[]
  onRemoveAnnotation: (id: Annotation['id']) => Promise<void>
  onNavigate: () => void
}

export function HighlightsPanel({ book, annotations, onRemoveAnnotation, onNavigate }: HighlightsProps) {
  const navigate = useNavigate()

  const goToSentence = async (sentenceId: number) => {
    try {
      const data = await api<{ page_number: number }>(`/sentences/${sentenceId}`)
      onNavigate()
      navigate({ to: '/books/$slug/read/$page', params: { slug: book.slug, page: String(data.page_number) }, hash: `s-${sentenceId}` })
    } catch {
      toast.error('বাক্যটি আর পাওয়া যাচ্ছে না')
    }
  }

  return (
    <div>
      {annotations.length ? (
        <ul className="space-y-2">
          {annotations.map((a) => (
            <li key={a.id} className="group rounded-lg border bg-card p-3">
              <button type="button" className="block w-full text-start" onClick={() => goToSentence(a.target_id)}>
                <span
                  lang={a.lang}
                  dir={a.lang === 'ar' ? 'rtl' : 'ltr'}
                  className={cn('block border-s-4 ps-2.5', a.lang === 'ar' ? 'font-arabic text-base leading-loose' : 'text-sm')}
                  style={{ borderColor: `var(--hl-${a.color ?? 'yellow'}, oklch(0.85 0.14 95))` }}
                >
                  {a.quote}
                </span>
                {a.note && (
                  <span className="mt-2 flex gap-1.5 text-sm text-muted-foreground">
                    <StickyNote className="mt-0.5 size-3.5 shrink-0 text-gold" />
                    {/* keep the note's own line breaks and blank lines as written */}
                    <span className="min-w-0 flex-1 break-words whitespace-pre-wrap">{a.note}</span>
                  </span>
                )}
              </button>
              <div className="mt-1 flex justify-end">
                <Button variant="ghost" size="xs" className="text-muted-foreground opacity-60 group-hover:opacity-100" onClick={() => onRemoveAnnotation(a.id)}>
                  <Trash2 /> মুছুন
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={Highlighter} title="কোনো হাইলাইট নেই">
          লেখা নির্বাচন করে রং বেছে নিন বা নোট যোগ করুন।
        </EmptyState>
      )}
    </div>
  )
}
