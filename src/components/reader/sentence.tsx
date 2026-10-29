import { memo } from 'react'
import { Markdown } from '@/components/markdown'
import type { Lang, Sentence as SentenceType } from '@/lib/types'
import { FootnoteRef } from './footnote-ref'
import { useReader } from './reader-context'

export const Sentence = memo(function Sentence({ sentence, lang }: { sentence: SentenceType; lang: Lang }) {
  const { settings, hoverId, activeId, flashId, setHoverId, onSentenceClick, onMarkClick, highlightsFor, annotationById, footnotes } = useReader()
  const text = lang === 'ar' ? sentence.text_ar_md : sentence.text_bn_md
  if (!text.trim()) return null

  return (
    <span
      id={`s-${sentence.id}-${lang}`}
      className="sentence"
      data-tt="book_sentence"
      data-tid={sentence.id}
      data-lang={lang}
      data-hover={hoverId === sentence.id}
      data-active={activeId === sentence.id}
      data-flash={flashId === sentence.id}
      onMouseEnter={() => setHoverId(sentence.id)}
      onMouseLeave={() => setHoverId(null)}
      onClick={(e) => {
        const mark = (e.target as HTMLElement).closest('mark[data-id]') as HTMLElement | null
        if (mark) {
          const annotation = annotationById(mark.dataset.id!)
          if (annotation) {
            onMarkClick(annotation, mark)
            return
          }
        }
        if (window.getSelection()?.isCollapsed !== false) onSentenceClick(sentence.id, lang, e.currentTarget)
      }}
    >
      <Markdown
        inline
        text={text}
        highlights={highlightsFor(sentence.id, lang)}
        stripMarks={lang === 'ar' && !settings.diacritics}
        renderFootnote={(marker, children) => (
          <FootnoteRef marker={marker} lang={lang} footnotes={footnotes[lang]}>
            {children}
          </FootnoteRef>
        )}
      />
    </span>
  )
})
