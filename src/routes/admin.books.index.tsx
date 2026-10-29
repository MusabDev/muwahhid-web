import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { BookForm } from '@/components/admin/entity-forms'
import { AdminPageHeader, Panel, useAdminMutation } from '@/components/admin/form'
import { BookCover } from '@/components/book-cover'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { bnNum } from '@/lib/text'
import type { Book, Paginated } from '@/lib/types'

export const Route = createFileRoute('/admin/books/')({
  component: AdminBooks,
})

function AdminBooks() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(false)
  const { data } = useQuery({ queryKey: ['admin', 'books', q], queryFn: () => api<Paginated<Book>>('/admin/books', { query: { q, per_page: 200 } }) })

  const create = useAdminMutation((values: Record<string, unknown>) => api<Book>('/admin/books', { method: 'POST', body: values }), {
    success: 'কিতাব তৈরি হয়েছে',
    invalidate: [['admin']],
    onSuccess: (book) => navigate({ to: '/admin/books/$id', params: { id: String(book.id) } }),
  })

  return (
    <>
      <AdminPageHeader
        title="কিতাব"
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus /> নতুন কিতাব
          </Button>
        }
      />
      <Panel>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="খুঁজুন…" className="mb-4 max-w-xs" />
        <div className="divide-y">
          {data?.data.map((book) => (
            <Link key={book.id} to="/admin/books/$id" params={{ id: String(book.id) }} className="flex items-center gap-4 py-3 hover:bg-muted/40">
              <BookCover book={book} className="w-10 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{book.title_bn}</div>
                <div className="font-arabic text-sm text-muted-foreground">{book.title_ar}</div>
                <div className="text-xs text-muted-foreground">{book.author?.name_bn}</div>
              </div>
              <div className="text-xs text-muted-foreground">{bnNum(book.pages_count ?? 0)} পৃষ্ঠা</div>
              <Badge variant={book.is_published ? 'default' : 'secondary'}>{book.is_published ? 'প্রকাশিত' : 'খসড়া'}</Badge>
            </Link>
          ))}
          {data && !data.data.length && <p className="py-6 text-center text-sm text-muted-foreground">কোনো কিতাব নেই</p>}
        </div>
      </Panel>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>নতুন কিতাব</DialogTitle>
          </DialogHeader>
          <BookForm submitting={create.isPending} onSubmit={(v) => create.mutate(v)} submitLabel="তৈরি করুন" />
        </DialogContent>
      </Dialog>
    </>
  )
}
