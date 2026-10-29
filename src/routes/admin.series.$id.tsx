import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ExternalLink, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { DarsForm, SeriesForm } from '@/components/admin/entity-forms'
import { AdminPageHeader, confirmDelete, Panel, useAdminMutation } from '@/components/admin/form'
import { CenterSpinner } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { api } from '@/lib/api'
import { bnNum } from '@/lib/text'
import type { Dars, DarsSeries } from '@/lib/types'

export const Route = createFileRoute('/admin/series/$id')({
  component: AdminSeries,
})

function AdminSeries() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const [adding, setAdding] = useState(false)
  const { data: series } = useQuery({ queryKey: ['admin', 'series', id], queryFn: () => api<DarsSeries>(`/admin/dars-series/${id}`) })

  const save = useAdminMutation((values: Record<string, unknown>) => api(`/admin/dars-series/${id}`, { method: 'PUT', body: values }), { success: 'সংরক্ষিত হয়েছে', invalidate: [['admin'], ['dars-series']] })
  const destroy = useAdminMutation(() => api(`/admin/dars-series/${id}`, { method: 'DELETE' }), { success: 'মুছে ফেলা হয়েছে', invalidate: [['admin']], onSuccess: () => navigate({ to: '/admin/series' }) })
  const addDars = useAdminMutation((values: Record<string, unknown>) => api<Dars>(`/admin/dars-series/${id}/durus`, { method: 'POST', body: values }), {
    success: 'দারস যোগ হয়েছে',
    invalidate: [['admin']],
    onSuccess: (dars) => navigate({ to: '/admin/durus/$id', params: { id: String(dars.id) } }),
  })

  if (!series) return <CenterSpinner />
  const nextNumber = (series.durus?.reduce((max, d) => Math.max(max, d.number), 0) ?? 0) + 1

  return (
    <>
      <AdminPageHeader
        title={series.title_bn}
        description={series.title_ar}
        action={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/durus/series/$slug" params={{ slug: series.slug }} target="_blank">
                <ExternalLink /> সাইটে দেখুন
              </Link>
            </Button>
            <Button variant="destructive" onClick={() => confirmDelete('সিরিজটি ও এর সব দারস') && destroy.mutate(undefined)}>
              <Trash2 />
            </Button>
          </div>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Panel title="সিরিজের তথ্য">
          <SeriesForm key={series.id} initial={series} submitting={save.isPending} onSubmit={(v) => save.mutate(v)} />
        </Panel>
        <Panel
          title={`দারসসমূহ (${bnNum(series.durus?.length ?? 0)})`}
          action={
            <Button size="sm" onClick={() => setAdding(true)}>
              <Plus /> দারস যোগ
            </Button>
          }
        >
          <div className="divide-y">
            {series.durus?.map((dars) => (
              <Link key={dars.id} to="/admin/durus/$id" params={{ id: String(dars.id) }} className="flex items-center gap-3 py-2.5 hover:bg-muted/40">
                <span className="flex size-8 items-center justify-center rounded-full border border-gold/50 text-sm font-semibold">{bnNum(dars.number)}</span>
                <span className="flex-1 font-medium">{dars.title_bn}</span>
                <span className="text-xs text-muted-foreground">{bnNum(dars.segments_count ?? 0)} লাইন</span>
              </Link>
            ))}
          </div>
        </Panel>
      </div>
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>নতুন দারস</DialogTitle>
          </DialogHeader>
          <DarsForm initial={{ number: nextNumber }} submitting={addDars.isPending} onSubmit={(v) => addDars.mutate(v)} submitLabel="যোগ করুন" />
        </DialogContent>
      </Dialog>
    </>
  )
}
