import { Bookmark, Copy, Link2, Share2, StickyNote, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { ShareDialog, type ShareQuote, type ShareSource } from '@/components/share-dialog'
import { Button } from '@/components/ui/button'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { readSelection, type SelectionSegment, type TextTarget } from '@/lib/selection'
import type { Annotation, Lang } from '@/lib/types'
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
/* a tap within this long of closing the menu only closed it */
const TAP_DISMISS_MS = 500

type Menu =
  /* `sentence` is set when a whole sentence was tapped; it is tinted while the menu is open */
  | { kind: 'selection'; rect: DOMRect; segments: SelectionSegment[]; text: string; sentence?: HTMLElement }
  | { kind: 'mark'; rect: DOMRect; annotation: Annotation }

interface Options {
  containerRef: RefObject<HTMLElement | null>
  plainFor: (target: TextTarget) => string | undefined
  diacriticsHidden: boolean
  /** The book or dars the text is from, worded in the given language. */
  sourceFor: (lang: Lang) => ShareSource
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
  /* when a tap last closed the menu, so that same tap does not open another one */
  const dismissedAt = useRef(0)
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
      if (toolbarRef.current?.contains(e.target as Node)) return
      dismissedAt.current = e.timeStamp
      close()
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

  /* event time stamps and performance.now() share a clock */
  const justDismissed = () => performance.now() - dismissedAt.current < TAP_DISMISS_MS

  const openForMark = useCallback((annotation: Annotation, el: HTMLElement) => {
    if (justDismissed()) return
    setMenu({ kind: 'mark', rect: el.getBoundingClientRect(), annotation })
  }, [])

  /** A tap on a sentence offers the toolbar for the whole sentence, as if it had been selected. */
  const openForSentence = useCallback((target: TextTarget, el: HTMLElement) => {
    if (justDismissed()) return
    const plain = optionsRef.current.plainFor(target) ?? ''
    const range = trimRange(plain, 0, plain.length)
    if (!range) return
    const text = plain.slice(...range)
    setMenu({ kind: 'selection', rect: el.getBoundingClientRect(), segments: [{ target, start: range[0], end: range[1], text }], text, sentence: el })
  }, [])

  useEffect(() => {
    const el = menu?.kind === 'selection' ? menu.sentence : undefined
    if (!el) return
    el.dataset.active = 'true'
    return () => {
      delete el.dataset.active
    }
  }, [menu])

  const close = () => {
    setMenu(null)
    window.getSelection()?.removeAllRanges()
  }

  /* a clicked highlight stands for every sentence it spans */
  const parts = menu?.kind === 'mark' ? annotationGroup(options.annotations.list, menu.annotation) : []
  const partTargets: TextTarget[] = menu?.kind === 'mark' ? parts.map((a) => ({ type: a.target_type, id: a.target_id, lang: a.lang })) : (menu?.segments.map((seg) => seg.target) ?? [])
  const quote = menu?.kind === 'mark' ? parts.map((a) => a.quote).join(' ') : menu?.segments.length === 1 ? menu.segments[0].text : (menu?.text ?? '')
  /* the language of the quoted text: its sentences' own, or guessed from the script when they mix */
  const quoteLang: Lang = partTargets.length && partTargets.every((t) => t.lang === partTargets[0].lang) ? partTargets[0].lang : /[\u0600-\u06FF]/.test(quote) ? 'ar' : 'bn'
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
    const { title, meta } = options.sourceFor(quoteLang)
    await navigator.clipboard.writeText(`${quote}\n— ${[title, meta].filter(Boolean).join(', ')}`)
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
    setShare({ text: quote, lang: quoteLang, source: options.sourceFor(quoteLang) })
    close()
  }

  const openNote = () => {
    if (!menu) return
    const container = options.containerRef.current ?? undefined
    if (menu.kind === 'mark') {
      const mark = container?.querySelector(`mark[data-id="${CSS.escape(String(menu.annotation.id))}"]`)
      const anchor = mark ? { getBoundingClientRect: () => mark.getBoundingClientRect(), contextElement: mark } : fixedAnchor(menu.rect)
      setNoteFor({ annotation: menu.annotation, quote: quoteByLang(parts), note: menu.annotation.note ?? '', anchor })
    } else {
      const plan = planHighlight(menu.segments, options.annotations.list, options.plainFor)
      if (!plan.parts.length) {
        toast.info('কিতাবের লেখা থেকে অংশ নির্বাচন করুন')
        return
      }
      /* pin to the tapped sentence, or to a copy of the selected range since the selection itself is cleared */
      const selection = window.getSelection()
      const range = !menu.sentence && selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null
      const anchor = menu.sentence
        ? { getBoundingClientRect: () => menu.sentence!.getBoundingClientRect(), contextElement: menu.sentence }
        : range
          ? { getBoundingClientRect: () => range.getBoundingClientRect(), contextElement: container }
          : fixedAnchor(menu.rect)
      setNoteFor({ plan, quote: quoteByLang(plan.parts), note: '', anchor, sentence: menu.sentence })
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
      <NotePopover
        state={noteFor}
        onClose={() => setNoteFor(null)}
        onDismiss={(at) => {
          dismissedAt.current = at
        }}
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

  return { openForMark, openForSentence, element: (
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

type NoteState = {
  annotation?: Annotation
  plan?: HighlightPlan
  quote: ReturnType<typeof quoteByLang>
  note: string
  anchor: NoteAnchor
  sentence?: HTMLElement
}

/** Something the note popover can be pinned to: the tapped sentence, the clicked mark or the selected range. */
type NoteAnchor = { getBoundingClientRect(): DOMRect; contextElement?: Element }

function NotePopover({
  state,
  onClose,
  onDismiss,
  onSave,
}: {
  state: NoteState | null
  onClose: () => void
  /** A tap outside closed it, at this time. */
  onDismiss: (at: number) => void
  onSave: (note: string | null) => Promise<void>
}) {
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const anchorRef = useRef<NoteAnchor>({ getBoundingClientRect: () => new DOMRect() })
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  /* set while rendering, so the popover measures the right place as it opens */
  if (state) anchorRef.current = state.anchor

  useEffect(() => {
    setNote(state?.note ?? '')
    if (state) requestAnimationFrame(() => textareaRef.current?.focus({ preventScroll: true }))
  }, [state])

  /* the tapped sentence stays tinted while its note is being written */
  useEffect(() => {
    const el = state?.sentence
    if (!el) return
    el.dataset.active = 'true'
    return () => {
      delete el.dataset.active
    }
  }, [state])

  const dirty = note !== (state?.note ?? '')
  const save = async () => {
    setSaving(true)
    try {
      await onSave(note.trim() || null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Popover open={!!state} onOpenChange={(open) => !open && onClose()}>
      <PopoverAnchor virtualRef={anchorRef} />
      <PopoverContent
        side="bottom"
        sideOffset={10}
        collisionPadding={16}
        className="w-[min(24rem,calc(100vw-2rem))] gap-0 rounded-xl border border-gold/30 p-0 shadow-2xl ring-0"
        onOpenAutoFocus={(e) => {
          /* focus is handled below, also for a note that was already showing */
          e.preventDefault()
        }}
        /* a tap outside closes it, unless that would throw away what was typed */
        onInteractOutside={(e) => {
          if (dirty) e.preventDefault()
          else onDismiss(e.detail.originalEvent.timeStamp)
        }}
      >
        <div className="flex items-center gap-2 border-b px-3.5 py-2.5">
          <StickyNote className="size-4 text-gold" />
          <span className="flex-1 text-sm font-medium">{state?.note ? 'নোট সম্পাদনা' : 'নোট যোগ করুন'}</span>
        </div>
        {state && (
          <div className="mx-3.5 mt-3 line-clamp-2 border-s-[3px] border-gold/70 ps-2.5 text-[13px] leading-relaxed text-muted-foreground">
            {state.quote.map((passage, i) => (
              <span key={i} lang={passage.lang} dir={passage.lang === 'ar' ? 'rtl' : 'ltr'} className={cn(passage.lang === 'ar' && 'font-arabic text-[15px]')}>
                {i > 0 && ' '}
                {passage.text}
              </span>
            ))}
          </div>
        )}
        <div className="p-3.5 pt-3">
          <Textarea
            ref={textareaRef}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                void save()
              }
            }}
            placeholder="আপনার চিন্তা বা ফায়দা লিখুন…"
            className="max-h-[40svh] min-h-28 resize-none text-[15px] leading-relaxed"
          />
          <div className="mt-2.5 flex items-center justify-end gap-2">
            <span className="me-auto hidden text-[11px] text-muted-foreground [@media(hover:hover)]:inline">⌘/Ctrl + Enter</span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              বাতিল
            </Button>
            <Button size="sm" disabled={saving} onClick={save}>
              সংরক্ষণ
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

const newGroupId = () => crypto.randomUUID()

const fixedAnchor = (rect: DOMRect): NoteAnchor => ({ getBoundingClientRect: () => rect })

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
