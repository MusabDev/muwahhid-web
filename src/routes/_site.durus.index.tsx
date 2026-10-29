import { createFileRoute, redirect } from '@tanstack/react-router'

/** Old address of the dars series list; durus now live in the library. */
export const Route = createFileRoute('/_site/durus/')({
  validateSearch: (search: Record<string, unknown>): { category?: string } => ({
    category: typeof search.category === 'string' && search.category ? search.category : undefined,
  }),
  beforeLoad: ({ search }) => {
    throw redirect({ to: '/library', search: { type: 'durus', category: search.category }, replace: true })
  },
})
