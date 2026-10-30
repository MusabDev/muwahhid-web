import { memo } from 'react'
import { Markdown } from '@/components/markdown'
import type { Lang, Sentence as SentenceType } from '@/lib/types'
import { FootnoteRef } from './footnote-ref'
import { useReader } from './reader-context'

export const Sentence = memo(function Sentence({ sentence, lang }: { sentence: SentenceType; lang: Lang }) {
  const { settings, flashId, onMarkClick, onSentenceClick, highlightsFor, annotationById, footnotes } = useReader()
  const text = lang === 'ar' ? sentence.text_ar_md : sentence.text_bn_md
  if (!text.trim()) return null

  return (
    <span
      id={`s-${sentence.id}-${lang}`}
      className="sentence"
      data-tt="book_sentence"
      data-tid={sentence.id}
      data-lang={lang}
      data-flash={flashId === sentence.id}
      onClick={(e) => {
        /* a click that ends a text selection is handled by the selection toolbar */
        if (window.getSelection()?.isCollapsed === false) return
        const target = e.target as HTMLElement
        const mark = target.closest('mark[data-id]') as HTMLElement | null
        const annotation = mark && annotationById(mark.dataset.id!)
        if (annotation) return onMarkClick(annotation, mark)
        /* footnote markers and links keep their own behaviour */
        if (target.closest('a, button')) return
        onSentenceClick({ type: 'book_sentence', id: sentence.id, lang }, e.currentTarget)
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
