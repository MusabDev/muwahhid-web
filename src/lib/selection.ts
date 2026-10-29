import { originalOffset } from './text'
import type { AnnotationTarget, Lang } from './types'

export interface TextTarget {
  type: AnnotationTarget
  id: number
  lang: Lang
}

/** The part of a selection that falls inside one annotatable element. */
export interface SelectionSegment {
  target: TextTarget
  start: number
  end: number
  text: string
}

export interface SelectionInfo {
  /** One entry per annotatable element the selection touches, in document order. */
  segments: SelectionSegment[]
  text: string
  rect: DOMRect
}

const TARGET_SELECTOR = '[data-tt][data-tid][data-lang]'

function readTarget(el: Element): TextTarget {
  const node = el as HTMLElement
  return { type: node.dataset.tt as AnnotationTarget, id: Number(node.dataset.tid), lang: node.dataset.lang as Lang }
}

function textNodes(root: Element) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => (node.parentElement?.closest('[data-fn]') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  })
  const nodes: Text[] = []
  while (walker.nextNode()) nodes.push(walker.currentNode as Text)
  return nodes
}

/** Character offset of a DOM boundary point within root, ignoring footnote markers. */
function offsetOf(root: Element, container: Node, offset: number) {
  const point = document.createRange()
  point.setStart(container, offset)
  let count = 0
  for (const node of textNodes(root)) {
    if (node === container) return count + offset
    if (point.comparePoint(node, node.length) <= 0) count += node.length
    else break
  }
  return count
}

/**
 * Describe the current selection inside `container`. The selection may span
 * several annotatable elements; each one it touches becomes a segment whose
 * offsets are against that element's plain text (mapped back through hidden
 * diacritics when needed).
 */
export function readSelection(container: HTMLElement, plainFor: (t: TextTarget) => string | undefined, diacriticsHidden: boolean): SelectionInfo | null {
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed || !selection.rangeCount) return null
  const range = selection.getRangeAt(0)
  if (!container.contains(range.commonAncestorContainer)) return null
  const text = selection.toString().trim()
  if (!text) return null
  const rect = range.getBoundingClientRect()

  const segments: SelectionSegment[] = []
  for (const el of container.querySelectorAll(TARGET_SELECTOR)) {
    if (!range.intersectsNode(el)) continue
    const target = readTarget(el)
    const plain = plainFor(target)
    if (!plain) continue

    const mapped = (n: number) => (diacriticsHidden && target.lang === 'ar' ? originalOffset(plain, n) : n)
    let start = el.contains(range.startContainer) ? mapped(offsetOf(el, range.startContainer, range.startOffset)) : 0
    let end = el.contains(range.endContainer) ? mapped(offsetOf(el, range.endContainer, range.endOffset)) : plain.length
    // Trim surrounding whitespace from the range
    while (start < end && /\s/.test(plain[start])) start++
    while (end > start && /\s/.test(plain[end - 1])) end--
    if (end > start) segments.push({ target, start, end, text: plain.slice(start, end) })
  }

  return { segments, text, rect }
}
