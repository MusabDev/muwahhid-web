import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Headphones, Plus } from 'lucide-react'
import { useState } from 'react'
import { SeriesForm } from '@/components/admin/entity-forms'
import { AdminPageHeader, Panel, useAdminMutation } from '@/components/admin/form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { api } from '@/lib/api'
import { bnNum } from '@/lib/text'
import type { DarsSeries, Paginated } from '@/lib/types'

export const Route = createFileRoute('/admin/series/')({
  component: AdminSeriesList,
})

function AdminSeriesList() {
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const { data } = useQuery({ queryKey: ['admin', 'series'], queryFn: () => api<Paginated<DarsSeries>>('/admin/dars-series', { query: { per_page: 200 } }) })
  const create = useAdminMutation((values: Record<string, unknown>) => api<DarsSeries>('/admin/dars-series', { method: 'POST', body: values }), {
    success: 'সিরিজ তৈরি হয়েছে',
    invalidate: [['admin']],
    onSuccess: (series) => navigate({ to: '/admin/series/$id', params: { id: String(series.id) } }),
  })

  return (
    <>
      <AdminPageHeader
        title="দারস সিরিজ"
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus /> নতুন সিরিজ
          </Button>
        }
      />
      <Panel>
        <div className="divide-y">
          {data?.data.map((series) => (
            <Link key={series.id} to="/admin/series/$id" params={{ id: String(series.id) }} className="flex items-center gap-4 py-3 hover:bg-muted/40">
              <div className="wood-panel flex size-10 items-center justify-center rounded-lg">
                <Headphones className="size-4 text-gold" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{series.title_bn}</div>
                <div className="font-arabic text-sm text-muted-foreground">{series.title_ar}</div>
              </div>
              <span className="text-xs text-muted-foreground">{bnNum(series.durus_count ?? 0)} দারস</span>
              <Badge variant={series.is_published ? 'default' : 'secondary'}>{series.is_published ? 'প্রকাশিত' : 'খসড়া'}</Badge>
            </Link>
          ))}
          {data && !data.data.length && <p className="py-6 text-center text-sm text-muted-foreground">কোনো সিরিজ নেই</p>}
        </div>
      </Panel>
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>নতুন দারস সিরিজ</DialogTitle>
          </DialogHeader>
          <SeriesForm submitting={create.isPending} onSubmit={(v) => create.mutate(v)} submitLabel="তৈরি করুন" />
        </DialogContent>
      </Dialog>
    </>
  )
}
