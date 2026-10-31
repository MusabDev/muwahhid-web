import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { ApiError } from '@/lib/api'
import { routeTree } from './routeTree.gen'

/** A new router and query cache per request on the server, so no data is shared between visitors. */
export function getRouter() {
  // A 401 anywhere means the session ended (expired, signed out elsewhere, password changed): drop the cached user.
  const onUnauthenticated = (error: unknown) => {
    if (error instanceof ApiError && error.status === 401 && queryClient.getQueryData(['user'])) {
      queryClient.setQueryData(['user'], null)
      queryClient.removeQueries({ queryKey: ['me'] })
    }
  }

  const queryClient: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError: onUnauthenticated }),
    mutationCache: new MutationCache({ onError: onUnauthenticated }),
    defaultOptions: {
      queries: { staleTime: 60 * 1000, refetchOnWindowFocus: false, retry: 1 },
    },
  })

  const router = createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
  })

  setupRouterSsrQueryIntegration({ router, queryClient })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
