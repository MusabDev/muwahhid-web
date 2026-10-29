import { originalOffset } from './text'
import type { AnnotationTarget, Lang } from './types'

export interface TextTarget {
  type: AnnotationTarget
  id: number
  lang: Lang
}

export interface SelectionInfo {
  target: TextTarget | null
  start: number
  end: number
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
 * Describe the current selection inside `container`. When it lies within one
 * annotatable element, offsets are returned against that element's plain text
 * (mapped back through hidden diacritics when needed).
 */
export function readSelection(container: HTMLElement, plainFor: (t: TextTarget) => string | undefined, diacriticsHidden: boolean): SelectionInfo | null {
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed || !selection.rangeCount) return null
  const range = selection.getRangeAt(0)
  if (!container.contains(range.commonAncestorContainer)) return null
  const text = selection.toString().trim()
  if (!text) return null
  const rect = range.getBoundingClientRect()

  const startEl = (range.startContainer.nodeType === 1 ? (range.startContainer as Element) : range.startContainer.parentElement)?.closest(TARGET_SELECTOR)
  const endEl = (range.endContainer.nodeType === 1 ? (range.endContainer as Element) : range.endContainer.parentElement)?.closest(TARGET_SELECTOR)

  if (!startEl || startEl !== endEl) return { target: null, start: 0, end: 0, text, rect }

  const target = readTarget(startEl)
  let start = offsetOf(startEl, range.startContainer, range.startOffset)
  let end = offsetOf(startEl, range.endContainer, range.endOffset)
  const plain = plainFor(target)

  if (diacriticsHidden && plain && target.lang === 'ar') {
    start = originalOffset(plain, start)
    end = originalOffset(plain, end)
  }
  // Trim surrounding whitespace from the range
  if (plain) {
    while (start < end && /\s/.test(plain[start])) start++
    while (end > start && /\s/.test(plain[end - 1])) end--
  }
  if (end <= start) return null

  return { target, start, end, text: plain ? plain.slice(start, end) : text, rect }
}
