import { stripDiacritics } from '@/lib/text'

const VARIANTS: Record<string, string> = { أ: 'ا', إ: 'ا', آ: 'ا', ٱ: 'ا', ى: 'ي', ئ: 'ي', ؤ: 'و', ة: 'ه' }
const DIACRITIC = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/

function normalizeChar(ch: string) {
  return (VARIANTS[ch] ?? ch).toLowerCase()
}

/**
 * Highlight the query inside text. For Arabic, matching ignores diacritics and
 * letter variants (mirroring the server's normalization) while showing the original text.
 */
export function HighlightText({ text, query, arabic = false }: { text: string; query: string; arabic?: boolean }) {
  const needle = (arabic ? stripDiacritics(query) : query).trim()
  if (!needle) return <>{text}</>

  const chars: string[] = []
  const map: number[] = []
  for (let i = 0; i < text.length; i++) {
    if (arabic && DIACRITIC.test(text[i])) continue
    chars.push(arabic ? normalizeChar(text[i]) : text[i].toLowerCase())
    map.push(i)
  }
  const haystack = chars.join('')
  const target = [...needle].map((c) => (arabic ? normalizeChar(c) : c.toLowerCase())).join('')

  const parts: React.ReactNode[] = []
  let cursor = 0
  let from = 0
  let index = haystack.indexOf(target, from)
  while (index !== -1 && target.length) {
    const start = map[index]
    const endIndex = index + target.length
    let end = endIndex < map.length ? map[endIndex] : text.length
    while (arabic && end < text.length && DIACRITIC.test(text[end])) end++
    if (start > cursor) parts.push(text.slice(cursor, start))
    parts.push(
      <mark key={start} className="rounded-sm bg-gold/35 px-0.5 text-inherit">
        {text.slice(start, end)}
      </mark>,
    )
    cursor = end
    from = endIndex
    index = haystack.indexOf(target, from)
  }
  if (cursor < text.length) parts.push(text.slice(cursor))
  return <>{parts}</>
}
