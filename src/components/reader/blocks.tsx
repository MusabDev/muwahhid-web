import type { ReactNode } from 'react'
import type { BlockType, Lang, Sentence as SentenceType } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Sentence } from './sentence'

export interface Block {
  type: BlockType
  sentences: SentenceType[]
}

/** Group consecutive sentences into paragraphs/quotes; headings, list items and poetry lines stand alone. */
export function groupBlocks(sentences: SentenceType[]): Block[] {
  const blocks: Block[] = []
  for (const sentence of sentences) {
    const last = blocks[blocks.length - 1]
    const joinable = last && !sentence.paragraph_break && last.type === sentence.block_type && (sentence.block_type === 'paragraph' || sentence.block_type === 'quote')
    if (joinable) last.sentences.push(sentence)
    else blocks.push({ type: sentence.block_type, sentences: [sentence] })
  }
  return blocks
}

export function BlockShell({ type, lang, children }: { type: BlockType; lang: Lang; children: ReactNode }) {
  switch (type) {
    case 'heading':
      return <h3 className={cn('my-4 text-center text-[1.2em] leading-snug font-bold text-[var(--page-ink)]', lang === 'ar' && 'text-[1.25em]')}>{children}</h3>
    case 'quote':
      return <blockquote className="my-3 border-s-[3px] border-[var(--page-accent)]/50 ps-4 text-[var(--page-ink)]">{children}</blockquote>
    case 'list_item':
      return (
        <div className="relative my-1.5 ps-6">
          <span className="absolute start-1 top-0 text-[var(--page-ink)]">◆</span>
          {children}
        </div>
      )
    case 'poetry':
      return <div className="my-1 text-center! italic">{children}</div>
    default:
      /* a paragraph gap a little wider than the gap between lines, so each one stands apart */
      return <p className="mb-[0.5em] last:mb-0">{children}</p>
  }
}

export function BlockList({ blocks, lang }: { blocks: Block[]; lang: Lang }) {
  return (
    <>
      {blocks.map((block) => (
        <BlockShell key={block.sentences[0].id} type={block.type} lang={lang}>
          {block.sentences.map((sentence, i) => (
            <span key={sentence.id}>
              {i > 0 && ' '}
              <Sentence sentence={sentence} lang={lang} />
            </span>
          ))}
        </BlockShell>
      ))}
    </>
  )
}
