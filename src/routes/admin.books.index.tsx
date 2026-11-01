import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ExternalLink, FileJson, Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { PublishableBulkActions } from '@/components/admin/bulk-actions'
import { Combobox } from '@/components/admin/combobox'
import { DataTable } from '@/components/admin/data-table'
import { BookForm, useAuthorOptions, useCategoryOptions } from '@/components/admin/entity-forms'
import { AdminPageHeader, useAdminMutation } from '@/components/admin/form'
import { BookImportDialog } from '@/components/admin/imports'
import { BookCover } from '@/components/book-cover'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { api } from '@/lib/api'
import { bnNum, timeAgo } from '@/lib/text'
import type { Book } from '@/lib/types'

type CreateMode = 'form' | 'json'

export const Route = createFileRoute('/admin/books/')({
  validateSearch: (search: Record<string, unknown>): { create?: CreateMode } => ({
    create: search.create === 'form' || search.create === 'json' ? search.create : undefined,
  }),
  component: AdminBooks,
})

function AdminBooks() {
  const navigate = useNavigate({ from: '/admin/books/' })
  const { create: mode } = Route.useSearch()
  const setMode = (create?: CreateMode) => navigate({ search: { create }, replace: true })
  const authors = useAuthorOptions()
  const categories = useCategoryOptions()
  const [authorId, setAuthorId] = useState('none')
  const [categoryId, setCategoryId] = useState('none')
  const [status, setStatus] = useState('none')

  const create = useAdminMutation((values: Record<string, unknown>) => api<Book>('/admin/books', { method: 'POST', body: values }), {
    success: 'কিতাব তৈরি হয়েছে',
    invalidate: [['admin']],
    onSuccess: (book) => navigate({ to: '/admin/books/$id', params: { id: String(book.id) } }),
  })

  return (
    <>
      <AdminPageHeader
        title="কিতাব"
        description="সব কিতাব, পৃষ্ঠা ও প্রকাশের অবস্থা"
        action={
          <>
            <Button variant="outline" onClick={() => setMode('json')}>
              <FileJson /> JSON ইমপোর্ট
            </Button>
            <Button onClick={() => setMode('form')}>
              <Plus /> নতুন কিতাব
            </Button>
          </>
        }
      />

      <DataTable<Book>
        path="/admin/books"
        queryKey="books"
        filters={{
          author_id: authorId === 'none' ? undefined : authorId,
          category_id: categoryId === 'none' ? undefined : categoryId,
          is_published: status === 'none' ? undefined : status,
        }}
        filterControls={
          <>
            <Combobox className="w-full sm:w-44" value={authorId} onChange={setAuthorId} none="সব লেখক" options={authors.map((a) => ({ value: String(a.id), label: a.name_bn }))} />
            <Combobox className="w-full sm:w-40" value={categoryId} onChange={setCategoryId} none="সব বিষয়" options={categories.map((c) => ({ value: String(c.id), label: c.name_bn }))} />
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
        rowLink={(book) => ({ to: '/admin/books/$id', params: { id: String(book.id) } })}
        bulkActions={(ids, clear) => <PublishableBulkActions path="/admin/books/bulk" ids={ids} clear={clear} noun="কিতাব" deleteNote="কিতাবগুলোর সব পৃষ্ঠা, প্রচ্ছদ ও পিডিএফ মুছে যাবে; এটি আর ফেরানো যাবে না।" />}
        columns={[
          {
            header: 'কিতাব',
            cell: (book) => (
              <div className="flex items-center gap-3">
                <BookCover book={book} className="w-9 shrink-0" />
                <div className="min-w-0">
                  <div className="truncate font-semibold">{book.title_bn}</div>
                  <div className="truncate font-arabic text-sm text-muted-foreground">{book.title_ar}</div>
                </div>
              </div>
            ),
          },
          { header: 'লেখক', className: 'hidden md:table-cell', cell: (book) => <span className="text-sm">{book.author?.name_bn}</span> },
          { header: 'বিষয়', className: 'hidden lg:table-cell', cell: (book) => <span className="text-sm text-muted-foreground">{book.category?.name_bn ?? '—'}</span> },
          { header: 'পৃষ্ঠা', className: 'hidden sm:table-cell', cell: (book) => bnNum(book.pages_count ?? 0) },
          {
            header: 'অবস্থা',
            cell: (book) => <Badge variant={book.is_published ? 'default' : 'secondary'}>{book.is_published ? 'প্রকাশিত' : 'খসড়া'}</Badge>,
          },
          { header: 'হালনাগাদ', className: 'hidden xl:table-cell', cell: (book) => <span className="text-xs text-muted-foreground">{book.updated_at ? timeAgo(book.updated_at) : '—'}</span> },
        ]}
        actions={(book) => (
          <>
            <Button variant="ghost" size="icon-sm" asChild aria-label="সম্পাদনা">
              <Link to="/admin/books/$id" params={{ id: String(book.id) }}>
                <Pencil />
              </Link>
            </Button>
            <Button variant="ghost" size="icon-sm" asChild aria-label="সাইটে দেখুন">
              <Link to="/books/$slug" params={{ slug: book.slug }} target="_blank">
                <ExternalLink />
              </Link>
            </Button>
          </>
        )}
        empty={
          <>
            কোনো কিতাব নেই।{' '}
            <button type="button" className="font-medium text-foreground underline underline-offset-4" onClick={() => setMode('json')}>
              JSON থেকে ইমপোর্ট করুন
            </button>
          </>
        }
      />

      <Dialog open={mode === 'form'} onOpenChange={(open) => !open && setMode()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>নতুন কিতাব</DialogTitle>
          </DialogHeader>
          <BookForm submitting={create.isPending} onSubmit={(v) => create.mutate(v)} submitLabel="তৈরি করুন" />
        </DialogContent>
      </Dialog>
      <BookImportDialog open={mode === 'json'} onOpenChange={(open) => !open && setMode()} />
    </>
  )
}
