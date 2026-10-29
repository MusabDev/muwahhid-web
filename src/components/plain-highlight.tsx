import type { HighlightRange } from '@/components/markdown'
import { stripDiacritics } from '@/lib/text'

/** Render plain text with highlight ranges wrapped in <mark>. */
export function PlainHighlight({ text, ranges, strip = false }: { text: string; ranges: HighlightRange[]; strip?: boolean }) {
  const show = (value: string) => (strip ? stripDiacritics(value) : value)
  if (!ranges.length) return <>{show(text)}</>

  const cuts = new Set([0, text.length])
  for (const r of ranges) {
    cuts.add(Math.max(0, Math.min(text.length, r.start)))
    cuts.add(Math.max(0, Math.min(text.length, r.end)))
  }
  const points = [...cuts].sort((a, b) => a - b)
  return (
    <>
      {points.slice(0, -1).map((start, i) => {
        const end = points[i + 1]
        const covering = ranges.filter((r) => r.start <= start && r.end >= end)
        const value = show(text.slice(start, end))
        if (!covering.length) return <span key={start}>{value}</span>
        const top = covering[covering.length - 1]
        return (
          <mark key={start} className="hl" data-id={String(top.id)} data-color={top.color ?? 'yellow'} data-note={covering.some((r) => r.hasNote) ? 'true' : 'false'}>
            {value}
          </mark>
        )
      })}
    </>
  )
}
