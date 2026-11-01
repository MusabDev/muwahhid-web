import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ExternalLink, FileJson, Headphones, Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { Combobox } from '@/components/admin/combobox'
import { DataTable } from '@/components/admin/data-table'
import { SeriesForm, useAuthorOptions } from '@/components/admin/entity-forms'
import { AdminPageHeader, useAdminMutation } from '@/components/admin/form'
import { SeriesImportDialog } from '@/components/admin/imports'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { api } from '@/lib/api'
import { bnNum, timeAgo } from '@/lib/text'
import type { DarsSeries } from '@/lib/types'

type CreateMode = 'form' | 'json'

export const Route = createFileRoute('/admin/series/')({
  validateSearch: (search: Record<string, unknown>): { create?: CreateMode } => ({
    create: search.create === 'form' || search.create === 'json' ? search.create : undefined,
  }),
  component: AdminSeriesList,
})

function AdminSeriesList() {
  const navigate = useNavigate({ from: '/admin/series/' })
  const { create: mode } = Route.useSearch()
  const setMode = (create?: CreateMode) => navigate({ search: { create }, replace: true })
  const authors = useAuthorOptions()
  const [authorId, setAuthorId] = useState('none')
  const [status, setStatus] = useState('none')

  const create = useAdminMutation((values: Record<string, unknown>) => api<DarsSeries>('/admin/dars-series', { method: 'POST', body: values }), {
    success: 'সিরিজ তৈরি হয়েছে',
    invalidate: [['admin']],
    onSuccess: (series) => navigate({ to: '/admin/series/$id', params: { id: String(series.id) } }),
  })

  return (
    <>
      <AdminPageHeader
        title="দারস সিরিজ"
        description="প্রতিটি সিরিজ একটি কিতাবের দারস; ভেতরে দারস ও ট্রান্সক্রিপ্ট"
        action={
          <>
            <Button variant="outline" onClick={() => setMode('json')}>
              <FileJson /> JSON ইমপোর্ট
            </Button>
            <Button onClick={() => setMode('form')}>
              <Plus /> নতুন সিরিজ
            </Button>
          </>
        }
      />

      <DataTable<DarsSeries>
        path="/admin/dars-series"
        queryKey="series"
        filters={{ author_id: authorId === 'none' ? undefined : authorId, is_published: status === 'none' ? undefined : status }}
        filterControls={
          <>
            <Combobox className="w-full sm:w-44" value={authorId} onChange={setAuthorId} none="সব শাইখ" options={authors.map((a) => ({ value: String(a.id), label: a.name_bn }))} />
            <Combobox
              className="w-full sm:w-36"
              value={status}
              onChange={setStatus}
              none="সব অবস্থা"
              options={[
                { value: '1', label: 'প্রকাশিত' },
                { value: '0', label: 'খসড়া' },
              ]}
            />
          </>
        }
        rowLink={(series) => ({ to: '/admin/series/$id', params: { id: String(series.id) } })}
        columns={[
          {
            header: 'সিরিজ',
            cell: (series) => (
              <div className="flex items-center gap-3">
                <div className="wood-panel flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <Headphones className="size-4 text-gold" />
                </div>
                <div className="min-w-0">
                  <div className="truncate font-semibold">{series.title_bn}</div>
                  <div className="truncate font-arabic text-sm text-muted-foreground">{series.title_ar}</div>
                </div>
              </div>
            ),
          },
          { header: 'শাইখ', className: 'hidden md:table-cell', cell: (series) => <span className="text-sm">{series.author?.name_bn}</span> },
          { header: 'দারস', className: 'hidden sm:table-cell', cell: (series) => bnNum(series.durus_count ?? 0) },
          { header: 'অবস্থা', cell: (series) => <Badge variant={series.is_published ? 'default' : 'secondary'}>{series.is_published ? 'প্রকাশিত' : 'খসড়া'}</Badge> },
          { header: 'হালনাগাদ', className: 'hidden xl:table-cell', cell: (series) => <span className="text-xs text-muted-foreground">{series.updated_at ? timeAgo(series.updated_at) : '—'}</span> },
        ]}
        actions={(series) => (
          <>
            <Button variant="ghost" size="icon-sm" asChild aria-label="সম্পাদনা">
              <Link to="/admin/series/$id" params={{ id: String(series.id) }}>
                <Pencil />
              </Link>
            </Button>
            <Button variant="ghost" size="icon-sm" asChild aria-label="সাইটে দেখুন">
              <Link to="/durus/$slug" params={{ slug: series.slug }} target="_blank">
                <ExternalLink />
              </Link>
            </Button>
          </>
        )}
        empty={
          <>
            কোনো সিরিজ নেই।{' '}
            <button type="button" className="font-medium text-foreground underline underline-offset-4" onClick={() => setMode('json')}>
              JSON থেকে ইমপোর্ট করুন
            </button>
          </>
        }
      />

      <Dialog open={mode === 'form'} onOpenChange={(open) => !open && setMode()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>নতুন দারস সিরিজ</DialogTitle>
          </DialogHeader>
          <SeriesForm submitting={create.isPending} onSubmit={(v) => create.mutate(v)} submitLabel="তৈরি করুন" />
        </DialogContent>
      </Dialog>
      <SeriesImportDialog open={mode === 'json'} onOpenChange={(open) => !open && setMode()} />
    </>
  )
}
