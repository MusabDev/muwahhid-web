import { createFileRoute, redirect } from '@tanstack/react-router'

/** Old address of the book list; books now live in the library. */
export const Route = createFileRoute('/_site/books/')({
  validateSearch: (search: Record<string, unknown>): { category?: string; sort?: 'title' } => ({
    category: typeof search.category === 'string' && search.category ? search.category : undefined,
    sort: search.sort === 'title' ? 'title' : undefined,
  }),
  beforeLoad: ({ search }) => {
    throw redirect({ to: '/library', search: { category: search.category, sort: search.sort }, replace: true, statusCode: 301 })
  },
})
