import { useMatches, useRouterState } from '@tanstack/react-router'
import { useEffect } from 'react'
import { trackPageView } from '@/lib/analytics'

/** Records a page view each time the router finishes a navigation to a new path. */
export function PageViewTracker() {
  const pathname = useRouterState({ select: (s) => s.resolvedLocation?.pathname })
  const routeId = useMatches({ select: (matches) => matches.at(-1)?.routeId })

  useEffect(() => {
    if (pathname) trackPageView(pathname, routeId)
  }, [pathname, routeId])

  return null
}
