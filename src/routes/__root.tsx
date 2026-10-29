import type { QueryClient } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { createRootRouteWithContext, HeadContent, Link, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { StarMark } from '@/components/brand'
import { Button } from '@/components/ui/button'

interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFound,
})

function RootLayout() {
  return (
    <>
      <HeadContent />
      <Outlet />
      {import.meta.env.DEV && (
        <>
          <TanStackRouterDevtools position="bottom-right" />
          <ReactQueryDevtools buttonPosition="bottom-left" />
        </>
      )}
    </>
  )
}

function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <StarMark className="size-14 text-gold" />
      <h1 className="text-3xl font-bold">পাতাটি পাওয়া যায়নি</h1>
      <p className="text-muted-foreground">আপনি যে পাতাটি খুঁজছেন সেটি নেই বা সরানো হয়েছে।</p>
      <Button asChild>
        <Link to="/">মূল পাতায় ফিরুন</Link>
      </Button>
    </div>
  )
}
