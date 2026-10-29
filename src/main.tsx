import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { ThemeProvider } from 'next-themes'
import { DirectionProvider } from '@/components/ui/direction'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { routeTree } from './routeTree.gen'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60 * 1000, refetchOnWindowFocus: false, retry: 1 },
  },
})

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  scrollRestoration: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <DirectionProvider dir="ltr">
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <RouterProvider router={router} />
            <Toaster position="top-center" richColors />
          </TooltipProvider>
        </QueryClientProvider>
      </DirectionProvider>
    </ThemeProvider>
  </StrictMode>,
)
