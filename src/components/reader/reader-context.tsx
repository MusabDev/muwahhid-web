import { createContext, useContext } from 'react'
import type { HighlightRange } from '@/components/markdown'
import type { Annotation, Footnote, Lang } from '@/lib/types'
import type { ReaderSettings } from '@/lib/user-data'

export interface ReaderContextValue {
  settings: ReaderSettings
  hoverId: number | null
  activeId: number | null
  flashId: number | null
  setHoverId: (id: number | null) => void
  onSentenceClick: (id: number, lang: Lang, el: HTMLElement) => void
  onMarkClick: (annotation: Annotation, el: HTMLElement) => void
  highlightsFor: (sentenceId: number, lang: Lang) => HighlightRange[]
  annotationById: (id: string) => Annotation | undefined
  footnotes: { ar: Footnote[]; bn: Footnote[] }
}

export const ReaderContext = createContext<ReaderContextValue | null>(null)

export function useReader() {
  const ctx = useContext(ReaderContext)
  if (!ctx) throw new Error('useReader must be used inside ReaderContext')
  return ctx
}
