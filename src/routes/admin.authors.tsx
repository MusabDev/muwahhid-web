import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { AuthorForm } from '@/components/admin/entity-forms'
import { AdminPageHeader, confirmDelete, Panel, useAdminMutation } from '@/components/admin/form'
import { AuthorAvatar } from '@/components/author-avatar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { bnNum } from '@/lib/text'
import type { Author, Paginated } from '@/lib/types'

export const Route = createFileRoute('/admin/authors')({
  component: AdminAuthors,
})

function AdminAuthors() {
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<Author | 'new' | null>(null)
  const { data } = useQuery({ queryKey: ['admin', 'authors', q], queryFn: () => api<Paginated<Author>>('/admin/authors', { query: { q, per_page: 200 } }) })

  const save = useAdminMutation(
    (values: Record<string, unknown>) =>
      editing && editing !== 'new' ? api(`/admin/authors/${editing.id}`, { method: 'PUT', body: values }) : api('/admin/authors', { method: 'POST', body: values }),
    { success: 'সংরক্ষিত হয়েছে', invalidate: [['admin'], ['authors']], onSuccess: () => setEditing(null) },
  )
  const destroy = useAdminMutation((id: number) => api(`/admin/authors/${id}`, { method: 'DELETE' }), { success: 'মুছে ফেলা হয়েছে', invalidate: [['admin']] })

  return (
    <>
      <AdminPageHeader
        title="লেখক"
        action={
          <Button onClick={() => setEditing('new')}>
            <Plus /> নতুন লেখক
          </Button>
        }
      />
      <Panel>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="খুঁজুন…" className="mb-4 max-w-xs" />
        <div className="divide-y">
          {data?.data.map((author) => (
            <div key={author.id} className="flex items-center gap-4 py-3">
              <AuthorAvatar author={author} className="size-10" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{author.name_bn}</div>
                <div className="font-arabic text-sm text-muted-foreground">{author.name_ar}</div>
              </div>
              <div className="hidden text-xs text-muted-foreground sm:block">
                {bnNum(author.books_count ?? 0)} কিতাব · {bnNum(author.dars_series_count ?? 0)} সিরিজ
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => setEditing(author)} aria-label="সম্পাদনা">
                <Pencil />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => confirmDelete(author.name_bn) && destroy.mutate(author.id)} aria-label="মুছুন">
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
      </Panel>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing === 'new' ? 'নতুন লেখক' : 'লেখক সম্পাদনা'}</DialogTitle>
          </DialogHeader>
          {editing && <AuthorForm key={editing === 'new' ? 'new' : editing.id} initial={editing === 'new' ? undefined : editing} submitting={save.isPending} onSubmit={(v) => save.mutate(v)} />}
        </DialogContent>
      </Dialog>
    </>
  )
}
