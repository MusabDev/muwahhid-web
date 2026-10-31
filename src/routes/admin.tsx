import { createFileRoute, Link, Outlet } from '@tanstack/react-router'
import { ArrowLeft, BookOpen, LayoutDashboard, Menu, Mic, Shield, Tags, Users, UserSquare } from 'lucide-react'
import { useState } from 'react'
import { Brand } from '@/components/brand'
import { CenterSpinner, EmptyState } from '@/components/states'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useUser } from '@/lib/auth'
import { seo } from '@/lib/seo'

export const Route = createFileRoute('/admin')({
  head: () => seo({ title: 'অ্যাডমিন', noindex: true }),
  component: AdminLayout,
})

const NAV = [
  { to: '/admin', label: 'ড্যাশবোর্ড', icon: LayoutDashboard, exact: true },
  { to: '/admin/books', label: 'কিতাব', icon: BookOpen },
  { to: '/admin/categories', label: 'বিষয়', icon: Tags },
  { to: '/admin/authors', label: 'লেখক', icon: UserSquare },
  { to: '/admin/series', label: 'দারস সিরিজ', icon: Mic },
  { to: '/admin/users', label: 'ব্যবহারকারী', icon: Users },
] as const

function AdminLayout() {
  const { data: user, isLoading } = useUser()
  const [open, setOpen] = useState(false)

  if (isLoading) return <CenterSpinner />
  if (!user?.is_admin) {
    return (
      <div className="mx-auto max-w-md px-4 py-24">
        <EmptyState icon={Shield} title="শুধু অ্যাডমিনদের জন্য">
          <p>এই পাতা দেখতে অ্যাডমিন অ্যাকাউন্টে লগইন করুন।</p>
          <Button className="mt-4" asChild>
            <Link to="/login" search={{ redirect: '/admin' }}>
              লগইন
            </Link>
          </Button>
        </EmptyState>
      </div>
    )
  }

  const nav = (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          activeOptions={{ exact: 'exact' in item }}
          onClick={() => setOpen(false)}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-wood-foreground/80 transition hover:bg-white/10 hover:text-wood-foreground"
          activeProps={{ className: 'bg-white/10 font-semibold text-wood-foreground!' }}
        >
          <item.icon className="size-4 text-gold" />
          {item.label}
        </Link>
      ))}
    </nav>
  )

  return (
    <div className="flex min-h-svh">
      <aside className="wood-panel sticky top-0 hidden h-svh w-60 shrink-0 flex-col gap-6 p-4 lg:flex">
        <Brand />
        <div className="text-xs font-semibold tracking-wider text-gold/80">অ্যাডমিন প্যানেল</div>
        {nav}
        <Link to="/" className="mt-auto flex items-center gap-2 text-sm text-wood-foreground/70 hover:text-wood-foreground">
          <ArrowLeft className="size-4" /> সাইটে ফিরুন
        </Link>
      </aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="wood-panel w-64 border-none p-4">
          <SheetTitle className="sr-only">মেনু</SheetTitle>
          <Brand className="mb-6" />
          {nav}
        </SheetContent>
      </Sheet>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="মেনু">
            <Menu />
          </Button>
          <span className="text-sm text-muted-foreground">
            স্বাগতম, <span className="font-semibold text-foreground">{user.name}</span>
          </span>
          <ThemeToggle className="ms-auto" />
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
