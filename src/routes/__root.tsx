import type { QueryClient } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { createRootRouteWithContext, HeadContent, Link, Outlet, Scripts, type ErrorComponentProps } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { ThemeProvider } from 'next-themes'
import type { ReactNode } from 'react'
import amiriRegular from '@fontsource/amiri/files/amiri-arabic-400-normal.woff2?url'
import hindRegular from '@fontsource/hind-siliguri/files/hind-siliguri-bengali-400-normal.woff2?url'
import hindSemiBold from '@fontsource/hind-siliguri/files/hind-siliguri-bengali-600-normal.woff2?url'
import { StarMark } from '@/components/brand'
import { Button } from '@/components/ui/button'
import { DirectionProvider } from '@/components/ui/direction'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { seo } from '@/lib/seo'
import { readSettingsCookie } from '@/lib/settings-cookie'
import { API_ORIGIN, SITE_NAME, SITE_URL } from '@/lib/site'
import appCss from '../index.css?url'

interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: () => ({ settingsCookie: readSettingsCookie() }),
  head: () => {
    const base = seo()
    return {
      meta: [
        { charSet: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0, viewport-fit=cover' },
        { name: 'theme-color', content: '#4a2f1c' },
        { name: 'color-scheme', content: 'light dark' },
        { name: 'application-name', content: SITE_NAME },
        { name: 'apple-mobile-web-app-title', content: SITE_NAME },
        { name: 'format-detection', content: 'telephone=no' },
        // defaults; each route's head() overrides these by name/property
        ...base.meta,
      ],
      links: [
        { rel: 'preconnect', href: API_ORIGIN, crossOrigin: 'use-credentials' },
        { rel: 'preload', href: hindRegular, as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' },
        { rel: 'preload', href: hindSemiBold, as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' },
        { rel: 'preload', href: amiriRegular, as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' },
        { rel: 'stylesheet', href: appCss },
        { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
        { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'alternate', type: 'application/rss+xml', title: `${SITE_NAME} — নতুন কিতাব ও দারস`, href: `${SITE_URL}/rss.xml` },
        { rel: 'alternate', type: 'application/rss+xml', title: `${SITE_NAME} — কিতাব`, href: `${SITE_URL}/feeds/books.xml` },
        { rel: 'alternate', type: 'application/rss+xml', title: `${SITE_NAME} — দারস`, href: `${SITE_URL}/feeds/durus.xml` },
      ],
    }
  },
  shellComponent: RootDocument,
  component: RootLayout,
  notFoundComponent: NotFound,
  errorComponent: RootError,
})

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="bn" dir="ltr" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      {/* extensions (Grammarly etc.) add attributes to <body> before React loads */}
      <body suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <DirectionProvider dir="ltr">
            <TooltipProvider>
              {children}
              <Toaster position="top-center" richColors />
            </TooltipProvider>
          </DirectionProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}

function RootLayout() {
  return (
    <>
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

function RootError({ reset }: ErrorComponentProps) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <StarMark className="size-14 text-gold" />
      <h1 className="text-3xl font-bold">কিছু একটা সমস্যা হয়েছে</h1>
      <p className="text-muted-foreground">পাতাটি এই মুহূর্তে খোলা যাচ্ছে না। একটু পরে আবার চেষ্টা করুন।</p>
      <div className="flex gap-3">
        <Button onClick={reset}>আবার চেষ্টা করুন</Button>
        <Button variant="outline" asChild>
          <Link to="/">মূল পাতায় ফিরুন</Link>
        </Button>
      </div>
    </div>
  )
}
