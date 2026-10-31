import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { History, LayoutGrid, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AuthorCard } from '@/components/author-card'
import { Ornament } from '@/components/brand'
import { PatternBackdrop } from '@/components/pattern'
import { EmptyState } from '@/components/states'
import { Skeleton } from '@/components/ui/skeleton'
import { type Era, groupByEra } from '@/lib/author'
import { authorsQuery } from '@/lib/queries'
import { bnNum, stripDiacritics } from '@/lib/text'
import { pageTitle } from '@/lib/head'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_site/authors/')({
  head: () => pageTitle('আহলুল ইলম'),
  component: AuthorsPage,
})

type View = 'era' | 'grid'

const GRID = 'grid gap-5 sm:grid-cols-2 lg:grid-cols-3'

function AuthorsPage() {
  const { data, isLoading } = useQuery(authorsQuery(1, 500))
  const [filter, setFilter] = useState('')
  const [view, setView] = useState<View>('era')

  const all = data?.data ?? []
  const needle = stripDiacritics(filter.trim()).toLowerCase()
  const authors = all.filter(
    (a) => !needle || a.name_bn.includes(needle) || stripDiacritics(a.name_ar).includes(needle) || a.name_translit.toLowerCase().includes(needle),
  )
  const eras = groupByEra(authors)

  return (
    <>
      <section className="relative overflow-hidden">
        <PatternBackdrop opacity={0.2} />
        <div className="relative mx-auto max-w-4xl px-4 pt-14 pb-10 text-center md:pt-20 md:pb-14">
          <p lang="ar" dir="rtl" className="font-arabic text-xl text-gold md:text-2xl">
            الْعُلَمَاء
          </p>
          <h1 className="mt-1 text-4xl font-bold md:text-6xl">আহলুল ইলম</h1>
          <Ornament className="mt-5" />

          {/* By era | A–Z */}
          <nav className="mx-auto mt-7 flex w-fit items-center gap-1 rounded-full border bg-card/90 p-1 shadow-sm backdrop-blur-sm" aria-label="সাজানো">
            <ViewButton active={view === 'era'} onClick={() => setView('era')} icon={History} label="কালক্রম" />
            <ViewButton active={view === 'grid'} onClick={() => setView('grid')} icon={LayoutGrid} label="বর্ণানুক্রম" />
          </nav>

          <div className="relative mx-auto mt-6 max-w-2xl">
            <Search className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="আরবি, বাংলা বা ইংরেজি নামে খুঁজুন…"
              aria-label="খুঁজুন"
              className="h-12 w-full rounded-full border bg-card ps-12 pe-4 text-base shadow-sm outline-none placeholder:text-muted-foreground focus:border-gold focus:ring-3 focus:ring-gold/20"
            />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 md:py-14">
        {isLoading ? (
          <div className={GRID}>
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        ) : !authors.length ? (
          <EmptyState title="কোনো লেখক পাওয়া যায়নি" />
        ) : view === 'era' ? (
          <Chronology eras={eras} />
        ) : (
          <div className={GRID}>
            {[...authors]
              .sort((a, b) => a.name_bn.localeCompare(b.name_bn, 'bn'))
              .map((author) => (
                <AuthorCard key={author.id} author={author} />
              ))}
          </div>
        )}
      </div>
    </>
  )
}

function ViewButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof History; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition sm:px-6',
        active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  )
}

/** Short label for the era rail: "অষ্টম শতাব্দী" rather than the full section title. */
const shortTitle = (era: Era) => era.title_bn.replace(' হিজরি', '')

function Chronology({ eras }: { eras: Era[] }) {
  const active = useActiveSection(eras.map((era) => era.key))

  return (
    <div className="lg:grid lg:grid-cols-[13rem_1fr] lg:gap-10">
      {/* phones and tablets: a sticky strip of era chips */}
      <nav className="sticky top-16 z-20 -mx-4 mb-6 flex gap-2 overflow-x-auto border-b bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
        {eras.map((era) => (
          <a
            key={era.key}
            href={`#${era.key}`}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1 text-sm transition',
              active === era.key ? 'border-gold bg-gold/15 text-primary' : 'border-border text-muted-foreground',
            )}
          >
            {shortTitle(era)} <span className="text-xs opacity-70">{bnNum(era.authors.length)}</span>
          </a>
        ))}
      </nav>

      {/* desktop: a timeline rail */}
      <aside className="hidden lg:block">
        <nav className="sticky top-24">
          <p className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground">যুগ</p>
          <ol className="relative border-s border-gold/35">
            {eras.map((era) => {
              const isActive = active === era.key
              return (
                <li key={era.key}>
                  <a
                    href={`#${era.key}`}
                    className={cn(
                      'group relative flex items-center justify-between gap-2 py-2 ps-5 text-sm transition',
                      isActive ? 'font-semibold text-primary' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-1/2 -left-[5px] size-2.5 -translate-y-1/2 rotate-45 border border-gold transition',
                        isActive ? 'scale-125 bg-gold' : 'bg-background group-hover:bg-gold/40',
                      )}
                    />
                    {shortTitle(era)}
                    <span className="text-xs tabular-nums opacity-70">{bnNum(era.authors.length)}</span>
                  </a>
                </li>
              )
            })}
          </ol>
        </nav>
      </aside>

      <div className="space-y-14">
        {eras.map((era) => (
          <section key={era.key} id={era.key} className="scroll-mt-32 lg:scroll-mt-24">
            <header className="mb-6 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-gold/30 pb-3">
              <h2 className="text-2xl font-bold">{era.title_bn}</h2>
              <p lang="ar" dir="rtl" className="font-arabic text-lg text-gold">
                {era.title_ar}
              </p>
              <span className="ms-auto text-sm text-muted-foreground">{bnNum(era.authors.length)} জন</span>
            </header>
            <div className={GRID}>
              {era.authors.map((author) => (
                <AuthorCard key={author.id} author={author} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

/** The id of the section currently near the top of the viewport. */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState<string | undefined>(ids[0])
  const key = ids.join(',')

  useEffect(() => {
    const sections = key ? key.split(',').map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el) : []
    if (!sections.length) return
    setActive(sections[0].id)
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: '-96px 0px -60% 0px' },
    )
    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [key])

  return active
}
