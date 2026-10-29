import { Bookmark, Copy, Link2, Share2, StickyNote, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { ShareDialog, type ShareQuote } from '@/components/share-dialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { readSelection, type TextTarget } from '@/lib/selection'
import type { Annotation } from '@/lib/types'
import type { NewAnnotation } from '@/lib/user-data'
import { cn } from '@/lib/utils'

export const HIGHLIGHT_COLORS = [
  { key: 'yellow', swatch: 'oklch(0.88 0.15 95)' },
  { key: 'green', swatch: 'oklch(0.82 0.13 150)' },
  { key: 'blue', swatch: 'oklch(0.8 0.1 240)' },
  { key: 'pink', swatch: 'oklch(0.8 0.12 0)' },
  { key: 'orange', swatch: 'oklch(0.82 0.13 60)' },
]

type Menu =
  | { kind: 'selection'; rect: DOMRect; target: TextTarget | null; start: number; end: number; text: string }
  | { kind: 'sentence'; rect: DOMRect; target: TextTarget }
  | { kind: 'mark'; rect: DOMRect; annotation: Annotation }

interface Options {
  containerRef: RefObject<HTMLElement | null>
  plainFor: (target: TextTarget) => string | undefined
  diacriticsHidden: boolean
  quoteFor: (target: TextTarget | null, selected?: string) => ShareQuote
  linkFor: (target: TextTarget) => string
  annotations: {
    create: (data: NewAnnotation) => Promise<unknown>
    update: (id: Annotation['id'], patch: { color?: string | null; note?: string | null }) => Promise<void>
    remove: (id: Annotation['id']) => Promise<void>
  }
  onBookmark?: (target: TextTarget) => void
  fontAr: string
  fontBn: string
}

export function useTextActions(options: Options) {
  const [menu, setMenu] = useState<Menu | null>(null)
  const [noteFor, setNoteFor] = useState<{ annotation?: Annotation; draft?: NewAnnotation } | null>(null)
  const [share, setShare] = useState<ShareQuote | null>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const optionsRef = useRef(options)
  useLayoutEffect(() => {
    optionsRef.current = options
  })

  // Open the toolbar after the user finishes selecting text
  useEffect(() => {
    const container = options.containerRef.current
    if (!container) return
    const onUp = () => {
      window.setTimeout(() => {
        const { plainFor, diacriticsHidden } = optionsRef.current
        const info = readSelection(container, plainFor, diacriticsHidden)
        if (info) setMenu({ kind: 'selection', ...info })
      }, 10)
    }
    container.addEventListener('mouseup', onUp)
    container.addEventListener('touchend', onUp)
    container.addEventListener('keyup', onUp)
    return () => {
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

  const openForSentence = useCallback((target: TextTarget, el: HTMLElement) => {
    setMenu((prev) => (prev?.kind === 'sentence' && prev.target.id === target.id && prev.target.lang === target.lang ? null : { kind: 'sentence', rect: el.getBoundingClientRect(), target }))
  }, [])

  const openForMark = useCallback((annotation: Annotation, el: HTMLElement) => {
    setMenu({ kind: 'mark', rect: el.getBoundingClientRect(), annotation })
  }, [])

  const close = () => {
    setMenu(null)
    window.getSelection()?.removeAllRanges()
  }

  const draftFrom = (m: Menu, color: string | null): NewAnnotation | null => {
    if (m.kind === 'mark') return null
    const target = m.target
    if (!target) return null
    const plain = options.plainFor(target) ?? ''
    const start = m.kind === 'selection' ? m.start : 0
    const end = m.kind === 'selection' ? m.end : plain.length
    if (end <= start) return null
    return { target_type: target.type, target_id: target.id, lang: target.lang, start_offset: start, end_offset: end, quote: plain.slice(start, end), color, note: null }
  }

  const highlight = async (color: string) => {
    if (!menu) return
    if (menu.kind === 'mark') {
      await options.annotations.update(menu.annotation.id, { color })
    } else {
      const draft = draftFrom(menu, color)
      if (!draft) {
        toast.info('একটি বাক্যের ভেতরের অংশ নির্বাচন করুন')
        return
      }
      await options.annotations.create(draft)
    }
    close()
  }

  const copyText = async () => {
    if (!menu) return
    let text = ''
    if (menu.kind === 'selection') text = menu.text
    else if (menu.kind === 'sentence') text = options.plainFor(menu.target) ?? ''
    else text = menu.annotation.quote
    const target = menu.kind === 'mark' ? null : menu.target
    const source = options.quoteFor(target).source
    await navigator.clipboard.writeText(`${text}\n— ${source}`)
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
    if (menu.kind === 'mark') {
      const t = { type: menu.annotation.target_type, id: menu.annotation.target_id, lang: menu.annotation.lang }
      setShare(options.quoteFor(t, menu.annotation.quote))
    } else if (menu.kind === 'selection') {
      setShare(options.quoteFor(menu.target, menu.text))
    } else {
      setShare(options.quoteFor(menu.target))
    }
    close()
  }

  const openNote = () => {
    if (!menu) return
    if (menu.kind === 'mark') setNoteFor({ annotation: menu.annotation })
    else {
      const draft = draftFrom(menu, 'yellow')
      if (!draft) {
        toast.info('একটি বাক্যের ভেতরের অংশ নির্বাচন করুন')
        return
      }
      setNoteFor({ draft })
    }
    close()
  }

  const target = menu && menu.kind !== 'mark' ? menu.target : menu ? { type: menu.annotation.target_type, id: menu.annotation.target_id, lang: menu.annotation.lang } : null

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
            transform: menu.rect.top > 90 ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
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
          {target && <ToolButton label="লিংক" onClick={() => copyLink(target)} icon={Link2} />}
          {menu.kind === 'sentence' && options.onBookmark && (
            <ToolButton
              label="বুকমার্ক"
              icon={Bookmark}
              onClick={() => {
                options.onBookmark!(menu.target)
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
          else if (noteFor?.draft) await options.annotations.create({ ...noteFor.draft, note })
          setNoteFor(null)
          toast.success('নোট সংরক্ষিত হয়েছে')
        }}
      />
      <ShareDialog quote={share} open={!!share} onOpenChange={(open) => !open && setShare(null)} fontAr={options.fontAr} fontBn={options.fontBn} />
    </>
  )

  const activeId = menu?.kind === 'sentence' ? menu.target.id : null

  return { openForSentence, openForMark, activeId, element: (
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

function NoteDialog({ state, onClose, onSave }: { state: { annotation?: Annotation; draft?: NewAnnotation } | null; onClose: () => void; onSave: (note: string | null) => Promise<void> }) {
  const [note, setNote] = useState('')
  const quote = state?.annotation?.quote ?? state?.draft?.quote ?? ''
  const lang = state?.annotation?.lang ?? state?.draft?.lang

  useEffect(() => {
    setNote(state?.annotation?.note ?? '')
  }, [state])

  return (
    <Dialog open={!!state} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>নোট</DialogTitle>
        </DialogHeader>
        <blockquote lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'} className={cn('rounded-lg border-s-4 border-gold bg-muted/60 px-4 py-3', lang === 'ar' ? 'font-arabic text-lg' : 'text-sm')}>
          {quote}
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
