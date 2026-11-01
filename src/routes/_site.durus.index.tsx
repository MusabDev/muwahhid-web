import { createFileRoute } from '@tanstack/react-router'
import { LibraryPage, libraryHead, libraryLoader, validateLibrarySearch } from '@/components/library-page'

export const Route = createFileRoute('/_site/durus/')({
  validateSearch: validateLibrarySearch,
  loaderDeps: ({ search }) => search,
  loader: libraryLoader('durus'),
  head: libraryHead('durus'),
  component: DurusPage,
})

function DurusPage() {
  return <LibraryPage type="durus" search={Route.useSearch()} />
}
