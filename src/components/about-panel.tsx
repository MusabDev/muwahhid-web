import { ChevronDown } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import { Markdown } from '@/components/markdown'
import { cn } from '@/lib/utils'

const COLLAPSED_HEIGHT = 288

/** An introduction in a gilt frame; long ones start folded with a fade and a "read more" toggle. */
export function AboutPanel({ title, arabic, text }: { title: string; arabic: string; text: string }) {
  const body = useRef<HTMLDivElement>(null)
  const [long, setLong] = useState(false)
  const [open, setOpen] = useState(false)

  useLayoutEffect(() => {
    if (body.current) setLong(body.current.scrollHeight > COLLAPSED_HEIGHT + 48)
  }, [text])

  const folded = long && !open

  return (
    <section className="relative rounded-xl border border-gold/40 bg-parchment p-6 shadow-sm md:p-8">
      <div aria-hidden className="pointer-events-none absolute inset-1.5 rounded-lg border border-gold/20" />
      <header className="relative mb-4 flex flex-wrap items-baseline gap-x-3">
        <h2 className="text-xl font-bold">{title}</h2>
        <p lang="ar" dir="rtl" className="font-arabic text-lg text-gold">
          {arabic}
        </p>
      </header>
      <div className="relative">
        <div ref={body} className={cn('overflow-hidden', folded && 'max-h-72')}>
          <Markdown text={text} className="leading-relaxed" />
        </div>
        {folded && <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-b from-transparent to-parchment" />}
      </div>
      {long && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="relative mt-3 flex items-center gap-1 text-sm font-semibold text-primary hover:text-gold"
        >
          {open ? 'কম দেখুন' : 'আরও পড়ুন'}
          <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
        </button>
      )}
    </section>
  )
}
