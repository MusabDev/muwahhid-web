import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { BookOpen, Mic, Plus, Users, UserSquare } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/form'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { bnNum } from '@/lib/text'
import type { Paginated } from '@/lib/types'

export const Route = createFileRoute('/admin/')({
  component: Dashboard,
})

function useCount(path: string) {
  return useQuery({ queryKey: ['admin', 'count', path], queryFn: () => api<Paginated<unknown>>(path, { query: { per_page: 1 } }) }).data?.meta.total
}

function Dashboard() {
  const stats = [
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
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/admin/books">
            <Plus /> নতুন কিতাব
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/admin/authors">
            <Plus /> নতুন লেখক
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/admin/series">
            <Plus /> নতুন দারস সিরিজ
          </Link>
        </Button>
      </div>
    </>
  )
}
