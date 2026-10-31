import { Link, useNavigate } from '@tanstack/react-router'
import { BookOpen, Library, LogIn, LogOut, Menu, Search, Settings, Shield, UserPlus, Users } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Brand } from '@/components/brand'
import { ThemeToggle } from '@/components/theme-toggle'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useAuthActions, useUser } from '@/lib/auth'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/library', label: 'লাইব্রেরি', icon: BookOpen },
  { to: '/authors', label: 'আহলুল ইলম', icon: Users },
  { to: '/my-library', label: 'আমার লাইব্রেরি', icon: Library, auth: true },
] as const

// Rosette tile intersected with a horizontal fade, so the pattern sits at the edges and clears behind the nav.
const HEADER_FADE = 'linear-gradient(90deg, black, transparent 28%, transparent 72%, black)'
const HEADER_PATTERN_MASK: React.CSSProperties = {
  maskImage: `url('/patterns/rosette-mask.svg'), ${HEADER_FADE}`,
  WebkitMaskImage: `url('/patterns/rosette-mask.svg'), ${HEADER_FADE}`,
  maskSize: '72px 72px, 100% 100%',
  WebkitMaskSize: '72px 72px, 100% 100%',
  maskRepeat: 'repeat, no-repeat',
  WebkitMaskRepeat: 'repeat, no-repeat',
  maskPosition: 'center',
  WebkitMaskPosition: 'center',
  maskMode: 'luminance, alpha',
  maskComposite: 'intersect',
  WebkitMaskComposite: 'source-in',
}

const iconButton ='border-white/15 bg-white/5 text-wood-foreground hover:bg-white/15 hover:text-wood-foreground'

function useNavItems() {
  const { data: user } = useUser()
  return NAV.filter((item) => !('auth' in item) || user)
}

function useScrolled(threshold = 8) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])
  return scrolled
}

export function SiteHeader() {
  const scrolled = useScrolled()
  const nav = useNavItems()

  return (
    <header className="sticky top-0 z-40">
      <a
        href="#main"
        className="sr-only rounded-md bg-gold px-3 py-2 text-sm font-semibold text-gold-foreground focus:not-sr-only focus:absolute focus:start-4 focus:top-3 focus:z-50"
      >
        মূল বিষয়বস্তুতে যান
      </a>
      <div
        className={cn(
          'wood-panel relative overflow-hidden transition-shadow duration-300 shadow-[0_2px_12px_oklch(0.15_0.03_50/0.4)]',
        )}
      >
        {/* Rosette pattern, strongest at the edges and faded out behind the nav */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-current text-gold opacity-[0.12]" style={HEADER_PATTERN_MASK} />
        {/* Warm lamp-glow behind the brand, plus a thin top highlight on the wood */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_40%_140%_at_12%_50%,oklch(0.76_0.11_78/0.14),transparent_70%)]"
        />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/15 to-transparent" />

        <div className={cn('relative mx-auto flex max-w-7xl items-center gap-4 px-4 transition-[height] duration-300', scrolled ? 'h-14' : 'h-16')}>
          <MobileMenu />

          <Brand />

          <nav className="ms-6 hidden items-center gap-1 md:flex">
            {nav.map((item) => (
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
            <Button variant="outline" size="icon" className={cn(iconButton, 'md:hidden')} asChild>
              <Link to="/search" search={{ q: '' }} aria-label="খুঁজুন">
                <Search />
              </Link>
            </Button>
            <ThemeToggle className={iconButton} />
            <UserMenu />
          </div>
        </div>
      </div>
      <div className="gold-rule opacity-70" />
    </header>
  )
}

function SearchForm({
  className,
  inputClassName,
  inputRef,
  hint,
  onSubmitted,
}: {
  className?: string
  inputClassName?: string
  inputRef?: React.Ref<HTMLInputElement>
  hint?: boolean
  onSubmitted?: () => void
}) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  return (
    <form
      role="search"
      className={cn('relative', className)}
      onSubmit={(e) => {
        e.preventDefault()
        if (!q.trim()) return
        navigate({ to: '/search', search: { q: q.trim() } })
        onSubmitted?.()
      }}
    >
      <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 opacity-60" />
      <input
        ref={inputRef}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="কিতাব, লেখক, বাক্য খুঁজুন…"
        aria-label="খুঁজুন"
        className={cn('peer h-9 w-full rounded-full border ps-9 pe-4 text-sm outline-none transition-all', inputClassName)}
      />
      {hint && (
        <kbd className="pointer-events-none absolute end-3 top-1/2 hidden -translate-y-1/2 rounded border border-white/20 px-1.5 font-mono text-[11px] leading-5 opacity-60 peer-focus:hidden lg:block">
          /
        </kbd>
      )}
    </form>
  )
}

function HeaderSearch() {
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.target as HTMLElement | null
      if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return
      e.preventDefault()
      ref.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <SearchForm
      inputRef={ref}
      hint
      onSubmitted={() => ref.current?.blur()}
      className="hidden text-wood-foreground md:block"
      inputClassName="w-44 border-white/15 bg-black/15 text-wood-foreground placeholder:text-wood-foreground/50 focus:w-60 focus:border-gold/70 focus:bg-black/25 lg:w-64 lg:pe-9 lg:focus:w-72"
    />
  )
}

function MobileMenu() {
  const [open, setOpen] = useState(false)
  const nav = useNavItems()
  const { data: user } = useUser()
  const { logout } = useAuthActions()
  const navigate = useNavigate()
  const close = () => setOpen(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="text-wood-foreground hover:bg-white/10 hover:text-wood-foreground md:hidden" aria-label="মেনু">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 gap-0 bg-background">
        <SheetHeader className="border-b">
          <SheetTitle className="sr-only">মেনু</SheetTitle>
          <div onClick={close}>
            <Brand />
          </div>
        </SheetHeader>

        <div className="p-4">
          <SearchForm onSubmitted={close} inputClassName="border-input bg-muted/50 focus:border-gold focus:bg-background" />
        </div>

        <nav className="flex flex-col gap-1 px-4">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={close}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-base hover:bg-muted"
              activeProps={{ className: 'bg-muted font-semibold text-primary' }}
            >
              <item.icon className="size-4 text-gold" />
              {item.label}
            </Link>
          ))}
          {user && (
            <Link
              to="/settings"
              onClick={close}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-base hover:bg-muted"
              activeProps={{ className: 'bg-muted font-semibold text-primary' }}
            >
              <Settings className="size-4 text-gold" />
              সেটিংস
            </Link>
          )}
          {user?.is_admin && (
            <Link to="/admin" onClick={close} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-base hover:bg-muted">
              <Shield className="size-4 text-gold" />
              অ্যাডমিন প্যানেল
            </Link>
          )}
        </nav>

        <div className="mt-auto border-t p-4">
          {user ? (
            <div className="flex items-center gap-3">
              <UserAvatar name={user.name} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{user.name}</div>
                <div className="truncate text-xs text-muted-foreground">{user.email}</div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="লগআউট"
                onClick={() => logout.mutate(undefined, { onSuccess: () => { close(); navigate({ to: '/' }) } })}
              >
                <LogOut />
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" asChild>
                <Link to="/register" onClick={close}>
                  <UserPlus /> নিবন্ধন
                </Link>
              </Button>
              <Button className="bg-gold text-gold-foreground hover:bg-gold/85" asChild>
                <Link to="/login" onClick={close}>
                  <LogIn /> লগইন
                </Link>
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function UserAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <Avatar className={className}>
      <AvatarFallback className="bg-gold font-semibold text-gold-foreground">{name.trim().charAt(0).toUpperCase() || '?'}</AvatarFallback>
    </Avatar>
  )
}

function UserMenu() {
  const { data: user } = useUser()
  const { logout } = useAuthActions()
  const navigate = useNavigate()

  if (!user) {
    return (
      <Button size="sm" className="ms-1 bg-gold text-gold-foreground hover:bg-gold/85" asChild>
        <Link to="/login">
          <LogIn /> <span className="hidden sm:inline">লগইন</span>
        </Link>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="অ্যাকাউন্ট"
          className="ms-1 rounded-full outline-none ring-gold/40 ring-offset-2 ring-offset-wood transition-shadow hover:ring-2 focus-visible:ring-2"
        >
          <UserAvatar name={user.name} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="font-semibold text-foreground">{user.name}</div>
          <div className="text-xs font-normal text-muted-foreground">{user.email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/settings">
            <Settings /> সেটিংস
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
  )
}
