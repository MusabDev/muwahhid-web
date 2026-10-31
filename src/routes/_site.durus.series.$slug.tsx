import { createFileRoute, redirect } from '@tanstack/react-router'

/** Series used to live at /durus/series/{slug}; old links are moved permanently. */
export const Route = createFileRoute('/_site/durus/series/$slug')({
  beforeLoad: ({ params }) => {
    throw redirect({ to: '/durus/$slug', params: { slug: params.slug }, statusCode: 301 })
  },
})
