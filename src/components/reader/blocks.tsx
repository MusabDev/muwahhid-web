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

/**
 * Block spacing is in em and mirrors the PDF export's `.text` rules (book.blade.php),
 * so a page wraps and fills the same way on screen and in print. Styles live in index.css (.blk-*).
 */
export function BlockShell({ type, lang, children }: { type: BlockType; lang: Lang; children: ReactNode }) {
  switch (type) {
    case 'heading':
      return <h3 className={cn('blk-h', lang === 'ar' && 'blk-h-ar')}>{children}</h3>
    case 'quote':
      return <blockquote className="blk-quote">{children}</blockquote>
    case 'list_item':
      return <div className="blk-li">{children}</div>
    case 'poetry':
      return <div className="blk-poetry">{children}</div>
    default:
      /* a paragraph gap a little wider than the gap between lines, so each one stands apart */
      return <p className="blk-p">{children}</p>
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
