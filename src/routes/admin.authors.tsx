import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { DataTable } from '@/components/admin/data-table'
import { AuthorForm } from '@/components/admin/entity-forms'
import { AdminPageHeader, confirmDelete, useAdminMutation } from '@/components/admin/form'
import { AuthorAvatar } from '@/components/author-avatar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { api } from '@/lib/api'
import { bnNum } from '@/lib/text'
import type { Author } from '@/lib/types'

export const Route = createFileRoute('/admin/authors')({
  validateSearch: (search: Record<string, unknown>): { create?: 'form' } => ({ create: search.create === 'form' ? 'form' : undefined }),
  component: AdminAuthors,
})

function AdminAuthors() {
  const navigate = useNavigate({ from: '/admin/authors' })
  const { create } = Route.useSearch()
  const [editing, setEditing] = useState<Author | null>(null)
  const open = create === 'form' || !!editing
  const close = () => {
    setEditing(null)
    if (create) navigate({ search: {}, replace: true })
  }

  const save = useAdminMutation(
    (values: Record<string, unknown>) => (editing ? api(`/admin/authors/${editing.id}`, { method: 'PUT', body: values }) : api('/admin/authors', { method: 'POST', body: values })),
    { success: 'সংরক্ষিত হয়েছে', invalidate: [['admin'], ['authors']], onSuccess: close },
  )
  const destroy = useAdminMutation((id: number) => api(`/admin/authors/${id}`, { method: 'DELETE' }), { success: 'মুছে ফেলা হয়েছে', invalidate: [['admin'], ['authors']] })

  return (
    <>
      <AdminPageHeader
        title="লেখক"
        description="লেখক, শাইখ ও ব্যাখ্যাকারগণ"
        action={
          <Button onClick={() => navigate({ search: { create: 'form' }, replace: true })}>
            <Plus /> নতুন লেখক
          </Button>
        }
      />
      <DataTable<Author>
        path="/admin/authors"
        queryKey="authors"
        searchPlaceholder="নাম খুঁজুন…"
        columns={[
          {
            header: 'নাম',
            cell: (author) => (
              <div className="flex items-center gap-3">
                <AuthorAvatar author={author} className="size-9" />
                <div className="min-w-0">
                  <div className="truncate font-semibold">{author.name_bn}</div>
                  <div className="truncate font-arabic text-sm text-muted-foreground">{author.name_ar}</div>
                </div>
              </div>
            ),
          },
          { header: 'মৃত্যু', className: 'hidden sm:table-cell', cell: (author) => <span className="text-sm text-muted-foreground">{author.death_year_ah ? `${bnNum(author.death_year_ah)} হি.` : '—'}</span> },
          { header: 'কিতাব', className: 'hidden md:table-cell', cell: (author) => bnNum(author.books_count ?? 0) },
          { header: 'সিরিজ', className: 'hidden md:table-cell', cell: (author) => bnNum(author.dars_series_count ?? 0) },
        ]}
        actions={(author) => (
          <>
            <Button variant="ghost" size="icon-sm" onClick={() => setEditing(author)} aria-label="সম্পাদনা">
              <Pencil />
            </Button>
            <Button variant="ghost" size="icon-sm" asChild aria-label="সাইটে দেখুন">
              <Link to="/authors/$slug" params={{ slug: author.slug }} target="_blank">
                <ExternalLink />
              </Link>
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => confirmDelete(author.name_bn).then((ok) => ok && destroy.mutate(author.id))} aria-label="মুছুন">
              <Trash2 />
            </Button>
          </>
        )}
      />

      <Dialog open={open} onOpenChange={(next) => !next && close()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'লেখক সম্পাদনা' : 'নতুন লেখক'}</DialogTitle>
          </DialogHeader>
          {open && <AuthorForm key={editing?.id ?? 'new'} initial={editing ?? undefined} submitting={save.isPending} onSubmit={(v) => save.mutate(v)} />}
        </DialogContent>
      </Dialog>
    </>
  )
}
