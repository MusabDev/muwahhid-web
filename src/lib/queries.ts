import { queryOptions } from '@tanstack/react-query'
import { notFound } from '@tanstack/react-router'
import { api, ApiError } from './api'
import type { Author, Book, BookPage, Category, Dars, DarsSeries, GlobalSearchResult, Paginated, Sentence } from './types'

export const booksQuery = (params: { author?: string; category?: string; sort?: string; page?: number; per_page?: number } = {}) =>
  queryOptions({
    queryKey: ['books', params],
    queryFn: () => api<Paginated<Book>>('/books', { query: params }),
  })

export const bookQuery = (slug: string) =>
  queryOptions({
    queryKey: ['book', slug],
    queryFn: () => api<Book>(`/books/${slug}`),
  })

export const pageQuery = (slug: string, number: number) =>
  queryOptions({
    queryKey: ['book', slug, 'page', number],
    queryFn: () => api<BookPage>(`/books/${slug}/pages/${number}`),
    staleTime: 5 * 60 * 1000,
  })

export const authorsQuery = (page = 1, perPage = 60) =>
  queryOptions({
    queryKey: ['authors', page, perPage],
    queryFn: () => api<Paginated<Author>>('/authors', { query: { page, per_page: perPage } }),
  })

export const authorQuery = (slug: string) =>
  queryOptions({
    queryKey: ['author', slug],
    queryFn: () => api<Author>(`/authors/${slug}`),
  })

export const seriesListQuery = (params: { author?: string; category?: string; page?: number; per_page?: number } = {}) =>
  queryOptions({
    queryKey: ['dars-series', params],
    queryFn: () => api<Paginated<DarsSeries>>('/dars-series', { query: params }),
  })

export const seriesQuery = (slug: string) =>
  queryOptions({
    queryKey: ['dars-series', slug],
    queryFn: () => api<DarsSeries>(`/dars-series/${slug}`),
  })

export const darsQuery = (id: number) =>
  queryOptions({
    queryKey: ['dars', id],
    queryFn: () => api<Dars>(`/durus/${id}`),
  })

export const darsByNumberQuery = (seriesSlug: string, number: number) =>
  queryOptions({
    queryKey: ['dars', seriesSlug, number],
    queryFn: () => api<Dars>(`/dars-series/${seriesSlug}/durus/${number}`),
  })

export const categoriesQuery = () =>
  queryOptions({
    queryKey: ['categories'],
    queryFn: () => api<Category[]>('/categories'),
    staleTime: 10 * 60 * 1000,
  })

export const statsQuery = () =>
  queryOptions({
    queryKey: ['stats'],
    queryFn: () => api<{ books: number; dars_series: number; translated_pages: number; durus_seconds: number }>('/stats'),
    staleTime: 10 * 60 * 1000,
  })

export const searchQuery = (q: string) =>
  queryOptions({
    queryKey: ['search', q],
    queryFn: () => api<GlobalSearchResult>('/search', { query: { q } }),
    enabled: q.trim().length >= 2,
  })

export const sentenceQuery = (id: number) =>
  queryOptions({
    queryKey: ['sentence', id],
    queryFn: () => api<{ sentence: Sentence; book_slug: string; page_number: number }>(`/sentences/${id}`),
  })

/** Await a loader fetch and turn an API 404 into the router's not-found page (a real 404 status under SSR). */
export async function orNotFound<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) throw notFound()
    throw error
  }
}
