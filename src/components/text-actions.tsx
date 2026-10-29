import { Bookmark, Copy, Link2, Share2, StickyNote, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { ShareDialog, type ShareQuote } from '@/components/share-dialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { readSelection, type SelectionSegment, type TextTarget } from '@/lib/selection'
import type { Annotation } from '@/lib/types'
import { annotationGroup, quoteByLang, type NewAnnotation } from '@/lib/user-data'
import { cn } from '@/lib/utils'

export const HIGHLIGHT_COLORS = [
  { key: 'yellow', swatch: 'oklch(0.88 0.15 95)' },
  { key: 'green', swatch: 'oklch(0.82 0.13 150)' },
  { key: 'blue', swatch: 'oklch(0.8 0.1 240)' },
  { key: 'pink', swatch: 'oklch(0.8 0.12 0)' },
  { key: 'orange', swatch: 'oklch(0.82 0.13 60)' },
]

const SELECTION_DELAY_MS = 70

type Menu =
  | { kind: 'selection'; rect: DOMRect; segments: SelectionSegment[]; text: string }
  | { kind: 'mark'; rect: DOMRect; annotation: Annotation }

interface Options {
  containerRef: RefObject<HTMLElement | null>
  plainFor: (target: TextTarget) => string | undefined
  diacriticsHidden: boolean
  quoteFor: (target: TextTarget | null, selected?: string) => ShareQuote
  linkFor: (target: TextTarget) => string
  annotations: {
    list: Annotation[]
    /** Saves parts as given, in place of the exact existing parts in `replaces`. */
    create: (parts: NewAnnotation[], replaces?: Annotation['id'][]) => Promise<unknown>
    update: (id: Annotation['id'], patch: { color?: string | null; note?: string | null }) => Promise<void>
    remove: (id: Annotation['id']) => Promise<void>
  }
  onBookmark?: (target: TextTarget) => void
  fontAr: string
  fontBn: string
}

export function useTextActions(options: Options) {
  const [menu, setMenu] = useState<Menu | null>(null)
  const [noteFor, setNoteFor] = useState<NoteState | null>(null)
  const [share, setShare] = useState<ShareQuote | null>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const optionsRef = useRef(options)
  useLayoutEffect(() => {
    optionsRef.current = options
  })

  // Open the toolbar a moment after the user finishes selecting text; selecting again restarts the wait
  useEffect(() => {
    const container = options.containerRef.current
    if (!container) return
    let timer: number | undefined
    const cancel = () => window.clearTimeout(timer)
    const onUp = () => {
      cancel()
      timer = window.setTimeout(() => {
        const { plainFor, diacriticsHidden } = optionsRef.current
        const info = readSelection(container, plainFor, diacriticsHidden)
        if (info) setMenu({ kind: 'selection', ...info })
      }, SELECTION_DELAY_MS)
    }
    container.addEventListener('pointerdown', cancel)
    container.addEventListener('mouseup', onUp)
    container.addEventListener('touchend', onUp)
    container.addEventListener('keyup', onUp)
    return () => {
      cancel()
      container.removeEventListener('pointerdown', cancel)
      container.removeEventListener('mouseup', onUp)
      container.removeEventListener('touchend', onUp)
      container.removeEventListener('keyup', onUp)
    }
  }, [options.containerRef])

  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(null)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    const onPointer = (e: PointerEvent) => {
      if (!toolbarRef.current?.contains(e.target as Node)) close()
    }
    document.addEventListener('pointerdown', onPointer)
    window.addEventListener('scroll', close, { passive: true, capture: true })
    window.addEventListener('resize', close)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('scroll', close, { capture: true })
      window.removeEventListener('resize', close)
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [menu])

  const openForMark = useCallback((annotation: Annotation, el: HTMLElement) => {
    setMenu({ kind: 'mark', rect: el.getBoundingClientRect(), annotation })
  }, [])

  const close = () => {
    setMenu(null)
    window.getSelection()?.removeAllRanges()
  }

  /* a clicked highlight stands for every sentence it spans */
  const parts = menu?.kind === 'mark' ? annotationGroup(options.annotations.list, menu.annotation) : []
  const partTargets: TextTarget[] = menu?.kind === 'mark' ? parts.map((a) => ({ type: a.target_type, id: a.target_id, lang: a.lang })) : (menu?.segments.map((seg) => seg.target) ?? [])
  const quote = menu?.kind === 'mark' ? parts.map((a) => a.quote).join(' ') : menu?.segments.length === 1 ? menu.segments[0].text : (menu?.text ?? '')
  /* share and copy quote a single sentence against its translation; a wider span is quoted as is */
  const target: TextTarget | null = partTargets.length === 1 ? partTargets[0] : null
  /* link and bookmark point at the sentence the text starts in */
  const anchor: TextTarget | null = partTargets[0] ?? null

  const highlight = async (color: string) => {
    if (!menu) return
    if (menu.kind === 'mark') await options.annotations.update(menu.annotation.id, { color })
    else {
      const plan = planHighlight(menu.segments, options.annotations.list, options.plainFor)
      if (!plan.parts.length) {
        toast.info('কিতাবের লেখা থেকে অংশ নির্বাচন করুন')
        return
      }
      await saveHighlight(plan, color, null)
    }
    close()
  }

  const saveHighlight = (plan: HighlightPlan, color: string, note: string | null) => {
    const group_id = plan.parts.length > 1 ? newGroupId() : null
    return options.annotations.create([...plan.leftovers, ...plan.parts.map((part) => ({ ...part, color, note, group_id }))], plan.replaces)
  }

  const copyText = async () => {
    if (!menu) return
    const source = options.quoteFor(target).source
    await navigator.clipboard.writeText(`${quote}\n— ${source}`)
    toast.success('কপি হয়েছে')
    close()
  }

  const copyLink = async (target: TextTarget) => {
    await navigator.clipboard.writeText(options.linkFor(target))
    toast.success('লিংক কপি হয়েছে')
    close()
  }

  const openShare = () => {
    if (!menu) return
    setShare(options.quoteFor(target, quote))
    close()
  }

  const openNote = () => {
    if (!menu) return
    if (menu.kind === 'mark') setNoteFor({ annotation: menu.annotation, quote: quoteByLang(parts), note: menu.annotation.note ?? '' })
    else {
      const plan = planHighlight(menu.segments, options.annotations.list, options.plainFor)
      if (!plan.parts.length) {
        toast.info('কিতাবের লেখা থেকে অংশ নির্বাচন করুন')
        return
      }
      setNoteFor({ plan, quote: quoteByLang(plan.parts), note: '' })
    }
    close()
  }

  const toolbar =
    menu &&
    createPortal(
      <>
        <div
          ref={toolbarRef}
          role="toolbar"
          className="fixed z-50 flex items-center gap-1 rounded-xl border border-gold/40 bg-popover p-1.5 text-popover-foreground shadow-2xl animate-in fade-in zoom-in-95"
          style={{
            left: Math.min(Math.max(menu.rect.left + menu.rect.width / 2, 170), window.innerWidth - 170),
            top: menu.rect.top > 90 ? menu.rect.top - 10 : menu.rect.bottom + 10,
            /* `translate`, not `transform`: the zoom-in animation owns `transform` and would slide the toolbar in from off-centre */
            translate: menu.rect.top > 90 ? '-50% -100%' : '-50% 0',
            transformOrigin: menu.rect.top > 90 ? 'bottom center' : 'top center',
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="flex items-center gap-1 px-1">
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.key}
                type="button"
                aria-label={`হাইলাইট ${c.key}`}
                onClick={() => highlight(c.key)}
                className={cn('size-6 rounded-full border-2 border-white/70 shadow-sm transition hover:scale-115', menu.kind === 'mark' && menu.annotation.color === c.key && 'ring-2 ring-gold')}
                style={{ background: c.swatch }}
              />
            ))}
          </div>
          <span className="mx-0.5 h-6 w-px bg-border" />
          <ToolButton label="নোট" onClick={openNote} icon={StickyNote} />
          <ToolButton label="কপি" onClick={copyText} icon={Copy} />
          <ToolButton label="শেয়ার" onClick={openShare} icon={Share2} />
          {anchor && <ToolButton label="লিংক" onClick={() => copyLink(anchor)} icon={Link2} />}
          {menu.kind === 'selection' && anchor && options.onBookmark && (
            <ToolButton
              label="বুকমার্ক"
              icon={Bookmark}
              onClick={async () => {
                options.onBookmark!(anchor)
                /* a bookmarked passage is highlighted too, unless it already is */
                const plan = planHighlight(menu.segments, options.annotations.list, options.plainFor)
                if (plan.parts.length && !plan.replaces.length) await saveHighlight(plan, 'yellow', null)
                close()
              }}
            />
          )}
          {menu.kind === 'mark' && (
            <ToolButton
              label="মুছুন"
              icon={Trash2}
              className="text-destructive"
              onClick={async () => {
                await options.annotations.remove(menu.annotation.id)
                close()
              }}
            />
          )}
        </div>
      </>,
      document.body,
    )

  const dialogs = (
    <>
      <NoteDialog
        state={noteFor}
        onClose={() => setNoteFor(null)}
        onSave={async (note) => {
          if (noteFor?.annotation) await options.annotations.update(noteFor.annotation.id, { note })
          else if (noteFor?.plan) await saveHighlight(noteFor.plan, noteFor.plan.color ?? 'yellow', note)
          setNoteFor(null)
          toast.success('নোট সংরক্ষিত হয়েছে')
        }}
      />
      <ShareDialog quote={share} open={!!share} onOpenChange={(open) => !open && setShare(null)} fontAr={options.fontAr} fontBn={options.fontBn} />
    </>
  )

  return { openForMark, element: (
    <>
      {toolbar}
      {dialogs}
    </>
  ), openShare: setShare }
}

function ToolButton({ label, icon: Icon, onClick, className }: { label: string; icon: typeof Copy; onClick: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} className={cn('flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-[10px] text-muted-foreground transition hover:bg-muted hover:text-foreground', className)}>
      <Icon className="size-4" />
      {label}
    </button>
  )
}

type NoteState = { annotation?: Annotation; plan?: HighlightPlan; quote: ReturnType<typeof quoteByLang>; note: string }

function NoteDialog({ state, onClose, onSave }: { state: NoteState | null; onClose: () => void; onSave: (note: string | null) => Promise<void> }) {
  const [note, setNote] = useState('')

  useEffect(() => {
    setNote(state?.note ?? '')
  }, [state])

  return (
    <Dialog open={!!state} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>নোট</DialogTitle>
        </DialogHeader>
        <blockquote className="space-y-2 rounded-lg border-s-4 border-gold bg-muted/60 px-4 py-3">
          {state?.quote.map((passage, i) => (
            <p key={i} lang={passage.lang} dir={passage.lang === 'ar' ? 'rtl' : 'ltr'} className={passage.lang === 'ar' ? 'font-arabic text-lg' : 'text-sm'}>
              {passage.text}
            </p>
          ))}
        </blockquote>
        <Textarea autoFocus value={note} onChange={(e) => setNote(e.target.value)} placeholder="আপনার চিন্তা বা ফায়দা লিখুন…" className="min-h-32" />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            বাতিল
          </Button>
          <Button onClick={() => onSave(note.trim() || null)}>সংরক্ষণ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const newGroupId = () => crypto.randomUUID()

interface HighlightPlan {
  /** The new highlight, one part per selected sentence; colour, note and group are filled in on save. */
  parts: Omit<NewAnnotation, 'color' | 'note' | 'group_id'>[]
  /** Existing parts the selection cuts into… */
  replaces: Annotation['id'][]
  /** …and what is left of them outside it. */
  leftovers: NewAnnotation[]
  /** Colour of what the selection covers, for a note added without picking one. */
  color: string | null
}

/**
 * Turn a selection into a new highlight of exactly the selected text. Older
 * highlights it overlaps are trimmed — or split in two — around it, keeping their
 * own colour, note and group, so highlights never stack.
 */
function planHighlight(segments: SelectionSegment[], list: Annotation[], plainFor: (target: TextTarget) => string | undefined): HighlightPlan {
  const replaces: Annotation['id'][] = []
  const leftovers: NewAnnotation[] = []
  let color: string | null = null

  for (const seg of segments) {
    const plain = plainFor(seg.target) ?? ''
    for (const a of list) {
      if (a.target_type !== seg.target.type || a.target_id !== seg.target.id || a.lang !== seg.target.lang) continue
      if (a.start_offset >= seg.end || a.end_offset <= seg.start) continue
      replaces.push(a.id)
      color ??= a.color
      const pieces = [trimRange(plain, a.start_offset, seg.start), trimRange(plain, seg.end, a.end_offset)].filter((r) => r !== null)
      /* a highlight cut in two stays one highlight */
      const group_id = a.group_id ?? (pieces.length > 1 ? newGroupId() : null)
      for (const [start, end] of pieces) {
        leftovers.push({ target_type: a.target_type, target_id: a.target_id, lang: a.lang, start_offset: start, end_offset: end, quote: plain.slice(start, end), color: a.color, note: a.note, group_id })
      }
    }
  }

  const parts = segments.map(({ target, start, end, text }) => ({ target_type: target.type, target_id: target.id, lang: target.lang, start_offset: start, end_offset: end, quote: text }))
  return { parts, replaces, leftovers, color }
}

/** The range without surrounding whitespace, or null when nothing is left. */
function trimRange(plain: string, start: number, end: number): [number, number] | null {
  while (start < end && /\s/.test(plain[start])) start++
  while (end > start && /\s/.test(plain[end - 1])) end--
  return end > start ? [start, end] : null
}
