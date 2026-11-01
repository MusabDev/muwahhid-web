import { createFileRoute, redirect } from '@tanstack/react-router'
import { LibraryPage, libraryHead, libraryLoader, validateLibrarySearch, type LibrarySearch } from '@/components/library-page'

export const Route = createFileRoute('/_site/library')({
  // ?type=durus is the old address of the dars list, which now lives at /durus
  validateSearch: (search: Record<string, unknown>): LibrarySearch & { type?: 'durus' } => ({
    ...validateLibrarySearch(search),
    type: search.type === 'durus' ? 'durus' : undefined,
  }),
  beforeLoad: ({ search: { type, ...search } }) => {
    if (type) throw redirect({ to: '/durus', search, replace: true, statusCode: 301 })
  },
  loaderDeps: ({ search: { type: _, ...search } }) => search,
  loader: libraryLoader('books'),
  head: libraryHead('books'),
  component: BooksPage,
})

function BooksPage() {
  return <LibraryPage type="books" search={Route.useSearch()} />
}
