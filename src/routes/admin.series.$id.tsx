import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Download, ExternalLink, FileJson, Headphones, Plus, Trash2, Video } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { BulkBar, SelectBox, useSelection } from '@/components/admin/data-table'
import { DarsForm, SeriesForm } from '@/components/admin/entity-forms'
import { AdminPageHeader, confirmAction, confirmDelete, Panel, useAdminMutation } from '@/components/admin/form'
import { SeriesImportDialog } from '@/components/admin/imports'
import { CenterSpinner, EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { downloadJson } from '@/lib/admin/templates'
import { api } from '@/lib/api'
import { bnNum, formatTime } from '@/lib/text'
import type { Dars, DarsSeries } from '@/lib/types'

export const Route = createFileRoute('/admin/series/$id')({
  component: AdminSeries,
})

function AdminSeries() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const [adding, setAdding] = useState(false)
  const [importing, setImporting] = useState(false)
  const selection = useSelection()
  const bulkDelete = useAdminMutation(() => api<{ affected: number }>(`/admin/dars-series/${id}/durus/bulk`, { method: 'POST', body: { ids: selection.ids, action: 'delete' } }), {
    invalidate: [['admin'], ['dars-series']],
    onSuccess: ({ affected }) => {
      toast.success(`${bnNum(affected)}টি দারস মুছে ফেলা হয়েছে`)
      selection.clear()
    },
  })
  const { data: series } = useQuery({ queryKey: ['admin', 'series', id], queryFn: () => api<DarsSeries>(`/admin/dars-series/${id}`) })

  const save = useAdminMutation((values: Record<string, unknown>) => api(`/admin/dars-series/${id}`, { method: 'PUT', body: values }), { success: 'সংরক্ষিত হয়েছে', invalidate: [['admin'], ['dars-series']] })
  const destroy = useAdminMutation(() => api(`/admin/dars-series/${id}`, { method: 'DELETE' }), { success: 'মুছে ফেলা হয়েছে', invalidate: [['admin']], onSuccess: () => navigate({ to: '/admin/series' }) })
  const addDars = useAdminMutation((values: Record<string, unknown>) => api<Dars>(`/admin/dars-series/${id}/durus`, { method: 'POST', body: values }), {
    success: 'দারস যোগ হয়েছে',
    invalidate: [['admin']],
    onSuccess: (dars) => navigate({ to: '/admin/durus/$id', params: { id: String(dars.id) } }),
  })
  const exportJson = useAdminMutation(() => api<unknown>(`/admin/dars-series/${id}/export`), { onSuccess: (data) => series && downloadJson(`${series.slug}.json`, data) })

  if (!series) return <CenterSpinner />
  const durus = [...(series.durus ?? [])].sort((a, b) => a.number - b.number)
  const nextNumber = durus.reduce((max, d) => Math.max(max, d.number), 0) + 1

  return (
    <>
      <AdminPageHeader
        crumbs={[{ label: 'দারস সিরিজ', to: '/admin/series' }]}
        title={series.title_bn}
        description={<span className="font-arabic text-base">{series.title_ar}</span>}
        action={
          <>
            <Button variant="outline" asChild>
              <Link to="/durus/$slug" params={{ slug: series.slug }} target="_blank">
                <ExternalLink /> সাইটে দেখুন
              </Link>
            </Button>
            <Button variant="outline" onClick={() => exportJson.mutate(undefined)} disabled={exportJson.isPending}>
              <Download /> JSON এক্সপোর্ট
            </Button>
            <Button variant="destructive" size="icon" onClick={() => confirmDelete('সিরিজটি ও এর সব দারস').then((ok) => ok && destroy.mutate(undefined))} aria-label="মুছুন">
              <Trash2 />
            </Button>
          </>
        }
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <Panel title="সিরিজের তথ্য">
          <SeriesForm key={`${series.id}:${series.updated_at}`} initial={series} submitting={save.isPending} onSubmit={(v) => save.mutate(v)} />
        </Panel>
        <Panel
          title={`দারসসমূহ (${bnNum(durus.length)})`}
          action={
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setImporting(true)}>
                <FileJson /> JSON
              </Button>
              <Button size="sm" onClick={() => setAdding(true)}>
                <Plus /> দারস যোগ
              </Button>
            </div>
          }
        >
          {durus.length ? (
            <div className="-my-2">
              <div className="-mx-5 -mt-3 mb-1">
                <BulkBar count={selection.selected.size} onClear={selection.clear}>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={bulkDelete.isPending}
                    onClick={() =>
                      confirmAction({
                        title: `${bnNum(selection.selected.size)}টি দারস মুছে ফেলবেন?`,
                        description: 'দারসগুলোর ট্রান্সক্রিপ্ট ও হাইলাইটও মুছে যাবে; এটি আর ফেরানো যাবে না।',
                        confirmLabel: 'মুছে ফেলুন',
                        destructive: true,
                      }).then((ok) => ok && bulkDelete.mutate(undefined))
                    }
                  >
                    <Trash2 /> মুছুন
                  </Button>
                </BulkBar>
              </div>
              <label className="-mx-2 flex items-center gap-3 px-2 py-2 text-xs text-muted-foreground">
                <SelectBox
                  label="সব দারস"
                  checked={selection.selected.size === durus.length}
                  indeterminate={selection.selected.size > 0}
                  onChange={(on) => selection.toggle(durus.map((d) => d.id), on)}
                />
                সব নির্বাচন
              </label>
              <div className="divide-y border-t">
                {durus.map((dars) => (
                  <div key={dars.id} className="-mx-2 flex items-center gap-3 rounded-md px-2 hover:bg-muted/50">
                    <SelectBox label={`দারস ${bnNum(dars.number)}`} checked={selection.selected.has(dars.id)} onChange={(on) => selection.toggle([dars.id], on)} />
                    <Link to="/admin/durus/$id" params={{ id: String(dars.id) }} className="flex min-w-0 flex-1 items-center gap-3 py-2.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-gold/50 text-sm font-semibold">{bnNum(dars.number)}</span>
                      {dars.media_type === 'audio' ? <Headphones className="size-4 shrink-0 text-muted-foreground" /> : <Video className="size-4 shrink-0 text-muted-foreground" />}
                      <span className="min-w-0 flex-1 truncate font-medium">{dars.title_bn}</span>
                      {dars.duration_seconds ? <span className="hidden font-mono text-xs text-muted-foreground sm:inline">{formatTime(dars.duration_seconds)}</span> : null}
                      <span className={dars.segments_count ? 'text-xs text-muted-foreground' : 'text-xs text-gold'}>{dars.segments_count ? `${bnNum(dars.segments_count)} লাইন` : 'ট্রান্সক্রিপ্ট নেই'}</span>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState icon={Headphones} title="এখনো কোনো দারস নেই">
              <p>একটি একটি করে যোগ করুন, অথবা JSON ফাইল দিয়ে একসাথে সব দারস ও ট্রান্সক্রিপ্ট যোগ করুন।</p>
            </EmptyState>
          )}
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
      <SeriesImportDialog open={importing} onOpenChange={setImporting} series={series} />
    </>
  )
}
