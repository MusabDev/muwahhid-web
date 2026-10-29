import type { Book } from './types'

export function isSharh(book: Pick<Book, 'is_sharh' | 'explainer'>): boolean {
  return !!book.is_sharh && !!book.explainer
}
