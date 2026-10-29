import { Link, useNavigate } from '@tanstack/react-router'
import { BookMarked, BookOpen, Library, LogIn, LogOut, Menu, Search, Shield, User as UserIcon, Users } from 'lucide-react'
import { useState } from 'react'
import { Brand } from '@/components/brand'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useAuthActions, useUser } from '@/lib/auth'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/library', label: 'লাইব্রেরি', icon: BookOpen },
  { to: '/authors', label: 'লেখক', icon: Users },
  { to: '/my-library', label: 'আমার লাইব্রেরি', icon: Library },
] as const

export function SiteHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40">
      <div className="wood-panel shadow-[0_2px_12px_oklch(0.15_0.03_50/0.4)]">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-wood-foreground hover:bg-white/10 hover:text-wood-foreground md:hidden" aria-label="মেনু">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-background">
              <SheetHeader>
                <SheetTitle className="text-start">মেনু</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4">
                {NAV.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-base hover:bg-muted"
                    activeProps={{ className: 'bg-muted font-semibold text-primary' }}
                  >
                    <item.icon className="size-4 text-gold" />
                    {item.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>

          <Brand />

          <nav className="ms-6 hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="relative rounded-md px-3 py-2 text-[15px] text-wood-foreground/80 transition-colors hover:text-wood-foreground"
                activeProps={{ className: cn('text-wood-foreground! font-semibold after:absolute after:inset-x-3 after:-bottom-[13px] after:h-0.5 after:rounded after:bg-gold') }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ms-auto flex items-center gap-1.5">
            <HeaderSearch />
            <ThemeToggle className="border-white/15 bg-white/5 text-wood-foreground hover:bg-white/15 hover:text-wood-foreground" />
            <UserMenu />
          </div>
        </div>
      </div>
      <div className="gold-rule opacity-70" />
    </header>
  )
}

function HeaderSearch() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  return (
    <form
      className="relative hidden lg:block"
      onSubmit={(e) => {
        e.preventDefault()
        if (q.trim()) navigate({ to: '/search', search: { q: q.trim() } })
      }}
    >
      <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-wood-foreground/60" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="কিতাব, লেখক, বাক্য খুঁজুন…"
        className="h-9 w-64 rounded-full border border-white/15 bg-black/15 ps-9 pe-4 text-sm text-wood-foreground outline-none placeholder:text-wood-foreground/50 focus:border-gold/70 focus:bg-black/25"
      />
    </form>
  )
}

function UserMenu() {
  const { data: user } = useUser()
  const { logout } = useAuthActions()
  const navigate = useNavigate()
  const iconButton = 'border-white/15 bg-white/5 text-wood-foreground hover:bg-white/15 hover:text-wood-foreground'

  return (
    <>
      <Button variant="outline" size="icon" className={cn(iconButton, 'lg:hidden')} asChild>
        <Link to="/search" search={{ q: '' }} aria-label="খুঁজুন">
          <Search />
        </Link>
      </Button>
      {user ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className={iconButton} aria-label="অ্যাকাউন্ট">
              <UserIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="font-semibold text-foreground">{user.name}</div>
              <div className="text-xs font-normal text-muted-foreground">{user.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/my-library">
                <BookMarked /> আমার লাইব্রেরি
              </Link>
            </DropdownMenuItem>
            {user.is_admin && (
              <DropdownMenuItem asChild>
                <Link to="/admin">
                  <Shield /> অ্যাডমিন প্যানেল
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout.mutate(undefined, { onSuccess: () => navigate({ to: '/' }) })}>
              <LogOut /> লগআউট
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button size="sm" className="ms-1 bg-gold text-gold-foreground hover:bg-gold/85" asChild>
          <Link to="/login">
            <LogIn /> <span className="hidden sm:inline">লগইন</span>
          </Link>
        </Button>
      )}
    </>
  )
}

