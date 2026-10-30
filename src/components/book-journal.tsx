import { Link } from '@tanstack/react-router'
import { Bookmark as BookmarkIcon, ChevronDown, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { BookCover } from '@/components/book-cover'
import { Button } from '@/components/ui/button'
import { bnNum, timeAgo } from '@/lib/text'
import type { Annotation, Book, Bookmark } from '@/lib/types'
import { groupAnnotations, quoteByLang } from '@/lib/user-data'
import { cn } from '@/lib/utils'

const NOTES_PREVIEW = 3

export interface JournalGroup {
  bookId: number
  book?: Book
  notes: Annotation[][]
  bookmarks: Bookmark[]
  latest: string
}

interface JournalProps {
  notes: Annotation[]
  bookmarks: Bookmark[]
  knownBooks: Map<number, Book>
  onRemoveNote: (id: Annotation['id']) => void
  onRemoveBookmark: (id: Bookmark['id']) => void
}

/** Notes and bookmarks gathered by book, most recently touched first. */
export function journalGroups(notes: Annotation[], bookmarks: Bookmark[], knownBooks = new Map<number, Book>()) {
  const map = new Map<number, JournalGroup>()
  const groupOf = (bookId: number, book: Book | undefined, createdAt = '') => {
    const group = map.get(bookId) ?? { bookId, book: book ?? knownBooks.get(bookId), notes: [], bookmarks: [], latest: '' }
    group.book ??= book
    if (createdAt > group.latest) group.latest = createdAt
    map.set(bookId, group)
    return group
  }
  for (const parts of groupAnnotations(notes)) groupOf(parts[0].book_id!, parts.find((p) => p.book)?.book, parts[0].created_at).notes.push(parts)
  for (const bookmark of bookmarks) groupOf(bookmark.book_id, bookmark.book, bookmark.created_at).bookmarks.push(bookmark)
  for (const group of map.values()) {
    group.notes.sort(([a], [b]) => (a.page_number ?? Infinity) - (b.page_number ?? Infinity) || (a.created_at ?? '').localeCompare(b.created_at ?? ''))
    group.bookmarks.sort((a, b) => a.page_number - b.page_number)
  }
  return [...map.values()].sort((a, b) => b.latest.localeCompare(a.latest))
}

/** Every kitab's notes and bookmarks, one card each. */
export function BookJournal({ notes, bookmarks, knownBooks, onRemoveNote, onRemoveBookmark }: JournalProps) {
  const groups = useMemo(() => journalGroups(notes, bookmarks, knownBooks), [notes, bookmarks, knownBooks])

  return (
    <div className="grid items-start gap-5 lg:grid-cols-2">
      {groups.map((group) => (
        <JournalCard key={group.bookId} group={group} onRemoveNote={onRemoveNote} onRemoveBookmark={onRemoveBookmark} />
      ))}
    </div>
  )
}

/** One kitab's notes and bookmarks; with `title`, the header names the card instead of the book (for use on the book's own page). */
export function JournalCard({ group, title, onRemoveNote, onRemoveBookmark }: { group: JournalGroup; title?: string } & Pick<JournalProps, 'onRemoveNote' | 'onRemoveBookmark'>) {
  const [expanded, setExpanded] = useState(false)
  const { book } = group
  const shownNotes = expanded ? group.notes : group.notes.slice(0, NOTES_PREVIEW)
  const counts = [group.notes.length && `${bnNum(group.notes.length)}টি নোট`, group.bookmarks.length && `${bnNum(group.bookmarks.length)}টি বুকমার্ক`].filter(Boolean).join(' · ')

  return (
    <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <header className="flex items-center gap-4 border-b bg-muted/40 p-4">
        {!title && book && <BookCover book={book} className="w-12 shrink-0" />}
        <div className="min-w-0 flex-1">
          {title ? (
            <h2 className="font-heading font-bold">{title}</h2>
          ) : book ? (
            <Link to="/books/$slug" params={{ slug: book.slug }} className="line-clamp-1 font-heading font-bold hover:text-primary">
              {book.title_bn}
            </Link>
          ) : (
            <p className="font-heading font-bold">অজানা কিতাব</p>
          )}
          <p className="text-xs text-muted-foreground">{counts}</p>
        </div>
      </header>

      {group.notes.length > 0 && (
        <div className="space-y-2.5 p-4">
          <ul className="space-y-2.5">
            {shownNotes.map((parts) => (
              <NoteCard key={parts[0].group_id ?? parts[0].id} parts={parts} book={book} onRemove={() => onRemoveNote(parts[0].id)} />
            ))}
          </ul>
          {group.notes.length > NOTES_PREVIEW && (
            <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => setExpanded((v) => !v)}>
              {expanded ? 'কম দেখুন' : `আরও ${bnNum(group.notes.length - NOTES_PREVIEW)}টি নোট`}
              <ChevronDown className={cn('transition-transform', expanded && 'rotate-180')} />
            </Button>
          )}
        </div>
      )}

      {group.bookmarks.length > 0 && (
        <ul className={cn('divide-y', group.notes.length > 0 && 'border-t')}>
          {group.bookmarks.map((bookmark) => (
            <li key={bookmark.id} className="group/row flex items-center gap-2 pe-2">
              {book ? (
                <Link
                  to="/books/$slug/read/$page"
                  params={{ slug: book.slug, page: String(bookmark.page_number) }}
                  hash={bookmark.sentence_id ? `s-${bookmark.sentence_id}` : undefined}
                  className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 transition hover:bg-muted/60"
                >
                  <BookmarkRowBody bookmark={bookmark} />
                </Link>
              ) : (
                <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3">
                  <BookmarkRowBody bookmark={bookmark} />
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                aria-label="বুকমার্ক মুছুন"
                className="size-8 shrink-0 text-muted-foreground opacity-100 hover:text-destructive sm:opacity-0 sm:group-hover/row:opacity-100 sm:focus-visible:opacity-100"
                onClick={() => onRemoveBookmark(bookmark.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function NoteCard({ parts, book, onRemove }: { parts: Annotation[]; book?: Book; onRemove: () => void }) {
  const [a] = parts
  const body = (
    <>
      <span className="line-clamp-3 block space-y-1 text-foreground/80">
        {quoteByLang(parts).map((passage, i) => (
          <span
            key={i}
            lang={passage.lang}
            dir={passage.lang === 'ar' ? 'rtl' : 'ltr'}
            className={cn('block', passage.lang === 'ar' ? 'font-arabic text-base leading-loose' : 'text-sm leading-relaxed')}
          >
            {passage.text}
          </span>
        ))}
      </span>
      {/* keep the note's own line breaks as written */}
      <span className="mt-2.5 block text-[15px] leading-relaxed break-words whitespace-pre-wrap text-black dark:text-white">{a.note}</span>
    </>
  )

  return (
    <li data-color={a.color ?? 'yellow'} className="hl-card group/note relative overflow-hidden rounded-xl border border-black/5 transition-shadow hover:shadow-sm dark:border-white/10">
      {book && a.page_number != null ? (
        <Link to="/books/$slug/read/$page" params={{ slug: book.slug, page: String(a.page_number) }} hash={`s-${a.target_id}`} className="block px-3.5 pt-3.5">
          {body}
        </Link>
      ) : (
        <div className="px-3.5 pt-3.5">{body}</div>
      )}
      <div className="mt-3 flex items-center gap-1 border-t border-foreground/10 px-2 py-1">
        {a.page_number != null && <span className="ms-1 shrink-0 rounded-md bg-card/70 px-2 py-0.5 text-xs font-medium tabular-nums">পৃষ্ঠা {bnNum(a.page_number)}</span>}
        <span className="ms-1.5 min-w-0 flex-1 truncate text-xs text-foreground/60">{timeAgo(a.created_at ?? null)}</span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="নোট মুছুন"
          className="text-foreground/60 hover:bg-foreground/5 hover:text-destructive [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/note:opacity-100 [@media(hover:hover)]:group-focus-within/note:opacity-100"
          onClick={onRemove}
        >
          <Trash2 />
        </Button>
      </div>
    </li>
  )
}

function BookmarkRowBody({ bookmark }: { bookmark: Bookmark }) {
  return (
    <>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gold/15">
        <BookmarkIcon className="size-3.5 fill-gold text-gold" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{bookmark.label || `পৃষ্ঠা ${bnNum(bookmark.page_number)}`}</span>
        {bookmark.created_at && <span className="block text-xs text-muted-foreground">{timeAgo(bookmark.created_at)}</span>}
      </span>
      <span className="shrink-0 rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground tabular-nums">পৃ. {bnNum(bookmark.page_number)}</span>
    </>
  )
}
