import { createFileRoute, Link, Outlet } from '@tanstack/react-router'
import { ArrowLeft, BarChart3, BookOpen, ChevronDown, FileJson, LayoutDashboard, Menu, Mic, Plus, Shield, Tags, Users, UserSquare } from 'lucide-react'
import { useState } from 'react'
import { ConfirmHost } from '@/components/admin/form'
import { Brand } from '@/components/brand'
import { CenterSpinner, EmptyState } from '@/components/states'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useUser } from '@/lib/auth'
import { seo } from '@/lib/seo'

export const Route = createFileRoute('/admin')({
  head: () => seo({ title: 'অ্যাডমিন', noindex: true }),
  component: AdminLayout,
})

const NAV = [
  {
    label: 'সারসংক্ষেপ',
    items: [
      { to: '/admin', label: 'ড্যাশবোর্ড', icon: LayoutDashboard, exact: true },
      { to: '/admin/analytics', label: 'পরিসংখ্যান', icon: BarChart3 },
    ],
  },
  {
    label: 'কনটেন্ট',
    items: [
      { to: '/admin/books', label: 'কিতাব', icon: BookOpen },
      { to: '/admin/series', label: 'দারস সিরিজ', icon: Mic },
      { to: '/admin/authors', label: 'লেখক', icon: UserSquare },
      { to: '/admin/categories', label: 'বিষয়', icon: Tags },
    ],
  },
  {
    label: 'ব্যবস্থাপনা',
    items: [{ to: '/admin/users', label: 'ব্যবহারকারী', icon: Users }],
  },
] as const

function QuickAdd() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm">
          <Plus /> নতুন <ChevronDown className="opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>কিতাব</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link to="/admin/books" search={{ create: 'form' }}>
            <Plus /> নতুন কিতাব (ফর্ম)
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/admin/books" search={{ create: 'json' }}>
            <FileJson /> JSON থেকে কিতাব
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>দারস</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link to="/admin/series" search={{ create: 'form' }}>
            <Plus /> নতুন দারস সিরিজ
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/admin/series" search={{ create: 'json' }}>
            <FileJson /> JSON থেকে সিরিজ
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/admin/authors" search={{ create: 'form' }}>
            <UserSquare /> নতুন লেখক
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

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
    <nav className="flex flex-col gap-5">
      {NAV.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <div className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-gold/70">{group.label}</div>
          {group.items.map((item) => (
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
        </div>
      ))}
    </nav>
  )

  return (
    <div className="flex min-h-svh">
      <aside className="wood-panel sticky top-0 hidden h-svh w-60 shrink-0 flex-col gap-6 p-4 lg:flex">
        <Brand />
        <div className="text-xs font-semibold tracking-wider text-gold/80">অ্যাডমিন প্যানেল</div>
        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">{nav}</div>
        <Link to="/" className="flex items-center gap-2 text-sm text-wood-foreground/70 hover:text-wood-foreground">
          <ArrowLeft className="size-4" /> সাইটে ফিরুন
        </Link>
      </aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="wood-panel w-64 border-none p-4">
          <SheetTitle className="sr-only">মেনু</SheetTitle>
          <Brand className="mb-6" />
          {nav}
          <Link to="/" className="mt-6 flex items-center gap-2 text-sm text-wood-foreground/70 hover:text-wood-foreground">
            <ArrowLeft className="size-4" /> সাইটে ফিরুন
          </Link>
        </SheetContent>
      </Sheet>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="মেনু">
            <Menu />
          </Button>
          <span className="hidden text-sm text-muted-foreground sm:inline">
            স্বাগতম, <span className="font-semibold text-foreground">{user.name}</span>
          </span>
          <div className="ms-auto flex items-center gap-2">
            <QuickAdd />
            <ThemeToggle />
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">
          <Outlet />
        </main>
        <ConfirmHost />
      </div>
    </div>
  )
}
