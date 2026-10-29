import type { Element, ElementContent, Root, RootContent } from 'hast'
import { createContext, memo, useContext, type ComponentProps, type ReactNode } from 'react'
import ReactMarkdown, { type Components, type ExtraProps } from 'react-markdown'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import { stripDiacritics } from '@/lib/text'
import { cn } from '@/lib/utils'

export interface HighlightRange {
  id: string | number
  start: number
  end: number
  color: string | null
  hasNote: boolean
}

const FOOTNOTE = /\[\^([^\]]+)\]/g

function isFootnoteRef(node: Element) {
  return node.tagName === 'a' && typeof node.properties?.href === 'string' && node.properties.href.startsWith('#fn-')
}

/**
 * Wrap highlight ranges (offsets into the markdown-stripped text) in <mark> elements,
 * and optionally hide Arabic diacritics. Footnote markers do not count toward offsets.
 */
function rehypeMarks(options: { ranges: HighlightRange[]; strip: boolean }) {
  return (tree: Root) => {
    let offset = 0
    const { ranges, strip } = options

    const walk = (parent: Root | Element) => {
      const next: (RootContent | ElementContent)[] = []
      for (const child of parent.children) {
        if (child.type === 'element') {
          if (isFootnoteRef(child)) {
            child.properties = { ...child.properties, dataFn: 'true' }
          } else {
            walk(child)
          }
          next.push(child)
          continue
        }
        if (child.type !== 'text') {
          next.push(child)
          continue
        }

        const text = child.value
        const start = offset
        const end = start + text.length
        offset = end

        const cuts = new Set([0, text.length])
        for (const r of ranges) {
          if (r.start > start && r.start < end) cuts.add(r.start - start)
          if (r.end > start && r.end < end) cuts.add(r.end - start)
        }
        const points = [...cuts].sort((a, b) => a - b)

        for (let i = 0; i < points.length - 1; i++) {
          const segStart = start + points[i]
          const segEnd = start + points[i + 1]
          let value = text.slice(points[i], points[i + 1])
          if (strip) value = stripDiacritics(value)
          const covering = ranges.filter((r) => r.start <= segStart && r.end >= segEnd)
          if (!covering.length) {
            next.push({ type: 'text', value })
            continue
          }
          const top = covering[covering.length - 1]
          next.push({
            type: 'element',
            tagName: 'mark',
            properties: {
              className: ['hl'],
              dataId: String(top.id),
              dataColor: top.color ?? 'yellow',
              dataNote: covering.some((r) => r.hasNote) ? 'true' : 'false',
            },
            children: [{ type: 'text', value }],
          })
        }
      }
      parent.children = next as typeof parent.children
    }

    walk(tree)
  }
}

interface MarkdownProps {
  text: string
  inline?: boolean
  highlights?: HighlightRange[]
  stripMarks?: boolean
  className?: string
  renderFootnote?: (marker: string, children: ReactNode) => ReactNode
}

const FootnoteContext = createContext<MarkdownProps['renderFootnote']>(undefined)

function MarkdownLink({ href, children, node: _node, ...rest }: ComponentProps<'a'> & ExtraProps) {
  const renderFootnote = useContext(FootnoteContext)
  if (href?.startsWith('#fn-')) {
    const marker = decodeURIComponent(href.slice(4))
    const sup = (
      <sup className="fn-ref" data-fn="true">
        {children}
      </sup>
    )
    return renderFootnote ? renderFootnote(marker, sup) : sup
  }
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" {...rest}>
      {children}
    </a>
  )
}

/* Component types must stay the same between renders: a new one remounts the
   text underneath, which throws away the reader's text selection. */
const BLOCK_COMPONENTS: Components = { a: MarkdownLink }
const INLINE_COMPONENTS: Components = { a: MarkdownLink, p: ({ children }) => <>{children}</> }

export const Markdown = memo(function Markdown({ text, inline, highlights = [], stripMarks = false, className, renderFootnote }: MarkdownProps) {
  const source = text.replace(FOOTNOTE, (_, marker: string) => `[${marker}](#fn-${encodeURIComponent(marker)})`)

  const content = (
    <ReactMarkdown
      components={inline ? INLINE_COMPONENTS : BLOCK_COMPONENTS}
      rehypePlugins={[
        [rehypeSanitize, { ...defaultSchema, clobberPrefix: '' }],
        [rehypeMarks, { ranges: highlights, strip: stripMarks }],
      ]}
      disallowedElements={inline ? ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'blockquote', 'pre', 'img', 'table'] : ['img']}
      unwrapDisallowed
    >
      {source}
    </ReactMarkdown>
  )

  return (
    <FootnoteContext.Provider value={renderFootnote}>
      {inline ? <span className={cn('md', className)}>{content}</span> : <div className={cn('md space-y-3', className)}>{content}</div>}
    </FootnoteContext.Provider>
  )
})
