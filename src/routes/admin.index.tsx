import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { BookOpen, Download, Eye, FileJson, Mic, Plus, Users, UserSquare, type LucideIcon } from 'lucide-react'
import { AdminPageHeader, Panel } from '@/components/admin/form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BOOK_STARTER, downloadJson, SERIES_STARTER } from '@/lib/admin/templates'
import { api } from '@/lib/api'
import { bnNum, timeAgo } from '@/lib/text'
import type { Book, DarsSeries, Paginated } from '@/lib/types'

export const Route = createFileRoute('/admin/')({
  component: Dashboard,
})

function useCount(path: string) {
  return useQuery({ queryKey: ['admin', 'count', path], queryFn: () => api<Paginated<unknown>>(path, { query: { per_page: 1 } }) }).data?.meta.total
}

function Dashboard() {
  const traffic = useQuery({
    queryKey: ['admin', 'analytics', '7d', undefined],
    queryFn: () => api<{ summary: { visitors: number; pageviews: number } }>('/admin/analytics', { query: { range: '7d' } }),
  }).data?.summary

  const stats = [
    { label: 'ভিজিটর (৭ দিন)', value: traffic?.visitors, icon: Users, to: '/admin/analytics' },
    { label: 'পেজভিউ (৭ দিন)', value: traffic?.pageviews, icon: Eye, to: '/admin/analytics' },
    { label: 'কিতাব', value: useCount('/admin/books'), icon: BookOpen, to: '/admin/books' },
    { label: 'লেখক', value: useCount('/admin/authors'), icon: UserSquare, to: '/admin/authors' },
    { label: 'দারস সিরিজ', value: useCount('/admin/dars-series'), icon: Mic, to: '/admin/series' },
    { label: 'ব্যবহারকারী', value: useCount('/admin/users'), icon: Users, to: '/admin/users' },
  ] as const

  return (
    <>
      <AdminPageHeader title="ড্যাশবোর্ড" description="কনটেন্ট ব্যবস্থাপনা" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className="rounded-xl border bg-card p-5 shadow-sm transition hover:border-gold/60">
            <s.icon className="size-5 text-gold" />
            <div className="mt-3 text-3xl font-bold">{s.value === undefined ? '—' : bnNum(s.value)}</div>
            <div className="text-sm text-muted-foreground">{s.label}</div>
          </Link>
        ))}
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="শুরু করুন" description="ফর্ম দিয়ে একটি একটি করে, অথবা JSON ফাইল দিয়ে একসাথে পুরো কিতাব বা সিরিজ যোগ করুন">
          <div className="grid gap-3 sm:grid-cols-2">
            <QuickAction to="/admin/books" create="form" icon={Plus} title="নতুন কিতাব" text="ফর্ম পূরণ করে কিতাব তৈরি, পরে পৃষ্ঠা যোগ" />
            <QuickAction to="/admin/books" create="json" icon={FileJson} title="JSON থেকে কিতাব" text="তথ্য, লেখক, পৃষ্ঠা, টীকা, সূচি — এক ফাইলে" />
            <QuickAction to="/admin/series" create="form" icon={Mic} title="নতুন দারস সিরিজ" text="সিরিজ তৈরি করে দারস যোগ" />
            <QuickAction to="/admin/series" create="json" icon={FileJson} title="JSON থেকে সিরিজ" text="সব দারস ও ট্রান্সক্রিপ্ট — এক ফাইলে" />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4 text-sm">
            <span className="text-muted-foreground">নমুনা ফাইল:</span>
            <Button size="sm" variant="outline" onClick={() => downloadJson('muwahhid-book-starter.json', BOOK_STARTER)}>
              <Download /> কিতাব JSON
            </Button>
            <Button size="sm" variant="outline" onClick={() => downloadJson('muwahhid-series-starter.json', SERIES_STARTER)}>
              <Download /> সিরিজ JSON
            </Button>
          </div>
        </Panel>
        <RecentPanel />
      </div>
    </>
  )
}

function QuickAction({ to, create, icon: Icon, title, text }: { to: '/admin/books' | '/admin/series'; create: 'form' | 'json'; icon: LucideIcon; title: string; text: string }) {
  return (
    <Link to={to} search={{ create }} className="group rounded-lg border bg-background p-4 transition hover:border-gold/60 hover:bg-muted/40">
      <Icon className="size-5 text-gold" />
      <div className="mt-2 font-semibold">{title}</div>
      <div className="text-xs text-muted-foreground">{text}</div>
    </Link>
  )
}

function RecentPanel() {
  const books = useQuery({ queryKey: ['admin', 'books', 'recent'], queryFn: () => api<Paginated<Book>>('/admin/books', { query: { per_page: 5 } }) }).data?.data
  const series = useQuery({ queryKey: ['admin', 'series', 'recent'], queryFn: () => api<Paginated<DarsSeries>>('/admin/dars-series', { query: { per_page: 5 } }) }).data?.data
  const rows = [
    ...(books ?? []).map((b) => ({ key: `b${b.id}`, kind: 'কিতাব', title: b.title_bn, published: b.is_published, at: b.created_at ?? null, link: { to: '/admin/books/$id', params: { id: String(b.id) } } as const })),
    ...(series ?? []).map((s) => ({ key: `s${s.id}`, kind: 'সিরিজ', title: s.title_bn, published: s.is_published, at: s.created_at ?? null, link: { to: '/admin/series/$id', params: { id: String(s.id) } } as const })),
  ]
    .sort((a, b) => (b.at ?? '').localeCompare(a.at ?? ''))
    .slice(0, 8)

  return (
    <Panel title="সাম্প্রতিক যোগ">
      {rows.length ? (
        <div className="-my-2 divide-y">
          {rows.map((row) => (
            <Link key={row.key} {...row.link} className="-mx-2 flex items-center gap-3 rounded-md px-2 py-2.5 hover:bg-muted/50">
              <span className="w-12 shrink-0 text-xs text-muted-foreground">{row.kind}</span>
              <span className="min-w-0 flex-1 truncate font-medium">{row.title}</span>
              {!row.published && <Badge variant="secondary">খসড়া</Badge>}
              <span className="hidden text-xs text-muted-foreground sm:inline">{timeAgo(row.at)}</span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">এখনো কিছু যোগ হয়নি।</p>
      )}
    </Panel>
  )
}
