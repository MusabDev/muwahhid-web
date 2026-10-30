import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ExternalLink, FileUp, ImagePlus, Plus, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { BookForm } from '@/components/admin/entity-forms'
import { AdminPageHeader, confirmDelete, Field, Panel, useAdminMutation } from '@/components/admin/form'
import { BookCover } from '@/components/book-cover'
import { CenterSpinner } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { bnNum } from '@/lib/text'
import type { Book, BookPage, TocEntry } from '@/lib/types'

export const Route = createFileRoute('/admin/books/$id')({
  component: AdminBook,
})

function AdminBook() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { data: book } = useQuery({ queryKey: ['admin', 'book', id], queryFn: () => api<Book>(`/admin/books/${id}`) })

  const save = useAdminMutation((values: Record<string, unknown>) => api(`/admin/books/${id}`, { method: 'PUT', body: values }), { success: 'সংরক্ষিত হয়েছে', invalidate: [['admin'], ['book']] })
  const destroy = useAdminMutation(() => api(`/admin/books/${id}`, { method: 'DELETE' }), {
    success: 'কিতাব মুছে ফেলা হয়েছে',
    invalidate: [['admin']],
    onSuccess: () => navigate({ to: '/admin/books' }),
  })

  if (!book) return <CenterSpinner />

  return (
    <>
      <AdminPageHeader
        title={book.title_bn}
        description={book.title_ar}
        action={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/books/$slug" params={{ slug: book.slug }} target="_blank">
                <ExternalLink /> সাইটে দেখুন
              </Link>
            </Button>
            <Button variant="destructive" onClick={() => confirmDelete('কিতাবটি ও এর সব পৃষ্ঠা') && destroy.mutate(undefined)}>
              <Trash2 /> মুছুন
            </Button>
          </div>
        }
      />
      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">তথ্য</TabsTrigger>
          <TabsTrigger value="pages">পৃষ্ঠা ({bnNum(book.pages_count ?? 0)})</TabsTrigger>
          <TabsTrigger value="toc">সূচিপত্র</TabsTrigger>
          <TabsTrigger value="import">ইমপোর্ট</TabsTrigger>
        </TabsList>
        <TabsContent value="info" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
            <Panel>
              <BookForm key={book.id + book.slug} initial={book} submitting={save.isPending} onSubmit={(v) => save.mutate(v)} />
            </Panel>
            <CoverPanel book={book} />
          </div>
        </TabsContent>
        <TabsContent value="pages" className="mt-6">
          <PagesPanel book={book} />
        </TabsContent>
        <TabsContent value="toc" className="mt-6">
          <TocPanel book={book} />
        </TabsContent>
        <TabsContent value="import" className="mt-6">
          <ImportPanel book={book} />
        </TabsContent>
      </Tabs>
    </>
  )
}

function CoverPanel({ book }: { book: Book }) {
  const input = useRef<HTMLInputElement>(null)
  const upload = useAdminMutation(
    (file: File) => {
      const form = new FormData()
      form.append('cover', file)
      return api(`/admin/books/${book.id}/cover`, { method: 'POST', body: form })
    },
    { success: 'কভার আপলোড হয়েছে', invalidate: [['admin'], ['book']] },
  )
  const remove = useAdminMutation(() => api(`/admin/books/${book.id}/cover`, { method: 'DELETE' }), { success: 'কভার সরানো হয়েছে', invalidate: [['admin'], ['book']] })

  return (
    <Panel title="কভার">
      <BookCover book={book} className="mx-auto w-44" />
      <p className="mt-3 text-center text-xs text-muted-foreground">{book.cover_url ? 'আপলোড করা কভার' : 'কভার না থাকলে নিজে থেকে তৈরি কভার দেখানো হয়'}</p>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => e.target.files?.[0] && upload.mutate(e.target.files[0])} />
      <div className="mt-4 flex flex-col gap-2">
        <Button variant="outline" onClick={() => input.current?.click()} disabled={upload.isPending}>
          <ImagePlus /> কভার আপলোড
        </Button>
        {book.cover_url && (
          <Button variant="ghost" onClick={() => remove.mutate(undefined)}>
            কভার সরান
          </Button>
        )}
      </div>
    </Panel>
  )
}

function PagesPanel({ book }: { book: Book }) {
  const navigate = useNavigate()
  const { data: pages } = useQuery({ queryKey: ['admin', 'book', String(book.id), 'pages'], queryFn: () => api<BookPage[]>(`/admin/books/${book.id}/pages`) })
  const next = pages?.length ? Math.max(...pages.map((p) => p.number)) + 1 : 1
  const [number, setNumber] = useState('')

  const create = useAdminMutation((n: number) => api<BookPage>(`/admin/books/${book.id}/pages`, { method: 'POST', body: { number: n } }), {
    invalidate: [['admin']],
    onSuccess: (page) => navigate({ to: '/admin/pages/$id', params: { id: String(page.id) } }),
  })

  return (
    <Panel
      title="পৃষ্ঠাসমূহ"
      action={
        <form className="flex items-center gap-2" onSubmit={(e) => (e.preventDefault(), create.mutate(Number(number) || next))}>
          <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder={String(next)} className="h-8 w-20" type="number" min={0} />
          <Button type="submit" size="sm">
            <Plus /> পৃষ্ঠা যোগ
          </Button>
        </form>
      }
    >
      {pages?.length ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-8">
          {pages.map((page) => (
            <Link key={page.id} to="/admin/pages/$id" params={{ id: String(page.id) }} className="rounded-lg border bg-background p-3 text-center transition hover:border-gold">
              <div className="text-lg font-bold">{bnNum(page.number)}</div>
              <div className="text-[11px] text-muted-foreground">{bnNum(page.sentences_count ?? 0)} বাক্য</div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">এখনো কোনো পৃষ্ঠা নেই। পৃষ্ঠা যোগ করুন অথবা “ইমপোর্ট” ট্যাব থেকে ফাইল আপলোড করুন।</p>
      )}
    </Panel>
  )
}

type TocInput = { title_ar: string; title_bn: string; page_number: number; sentence_id?: number | null; children?: TocInput[] }

function toInput(entries: TocEntry[] = []): TocInput[] {
  return entries.map((e) => ({
    title_ar: e.title_ar,
    title_bn: e.title_bn,
    page_number: e.page_number,
    ...(e.sentence_id ? { sentence_id: e.sentence_id } : {}),
    ...(e.children?.length ? { children: toInput(e.children) } : {}),
  }))
}

function TocPanel({ book }: { book: Book }) {
  const [text, setText] = useState(() => JSON.stringify(toInput(book.toc), null, 2))
  const save = useAdminMutation((toc: TocInput[]) => api(`/admin/books/${book.id}/toc`, { method: 'PUT', body: { toc } }), { success: 'সূচিপত্র সংরক্ষিত হয়েছে', invalidate: [['admin'], ['book']] })

  return (
    <Panel title="সূচিপত্র (JSON)">
      <p className="mb-3 text-sm text-muted-foreground">
        প্রতিটি অধ্যায়ে <code>title_ar</code>, <code>title_bn</code>, <code>page_number</code> দিন; উপ-অধ্যায় <code>children</code> এর ভেতরে।
      </p>
      <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-96 font-mono text-xs" dir="ltr" spellCheck={false} />
      <Button
        className="mt-3"
        disabled={save.isPending}
        onClick={() => {
          try {
            const parsed = JSON.parse(text)
            if (!Array.isArray(parsed)) throw new Error()
            save.mutate(parsed)
          } catch {
            toast.error('JSON ঠিক নেই, এটা একটা তালিকা ([...]) হতে হবে')
          }
        }}
      >
        সংরক্ষণ
      </Button>
    </Panel>
  )
}

const JSON_EXAMPLE = `{
  "pages": [
    {
      "number": 1,
      "sentences": [
        { "ar": "بِسْمِ اللَّهِ", "bn": "আল্লাহর নামে", "block_type": "heading" },
        { "ar": "اعْلَمْ **رَحِمَكَ اللَّهُ**[^1]", "bn": "জেনে রাখো...[^1]", "paragraph_break": true }
      ],
      "footnotes": {
        "ar": [{ "marker": "1", "text": "..." }],
        "bn": [{ "marker": "1", "text": "..." }]
      }
    }
  ],
  "toc": [{ "title_ar": "...", "title_bn": "...", "page": 1 }]
}`

function ImportPanel({ book }: { book: Book }) {
  const [file, setFile] = useState<File | null>(null)
  const [replace, setReplace] = useState(false)
  const run = useAdminMutation(
    () => {
      const form = new FormData()
      form.append('file', file!)
      form.append('replace', replace ? '1' : '0')
      return api<{ imported: { pages: number; sentences: number; footnotes: number; toc_entries: number } }>(`/admin/books/${book.id}/import`, { method: 'POST', body: form })
    },
    {
      invalidate: [['admin'], ['book']],
      onSuccess: ({ imported }) => toast.success(`ইমপোর্ট সম্পন্ন: ${bnNum(imported.pages)} পৃষ্ঠা, ${bnNum(imported.sentences)} বাক্য, ${bnNum(imported.footnotes)} টীকা`),
    },
  )

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title="ফাইল আপলোড">
        <div className="space-y-4">
          <Field label="JSON বা CSV ফাইল">
            <Input type="file" accept=".json,.csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </Field>
          <label className="flex items-start gap-3 text-sm">
            <Switch checked={replace} onCheckedChange={setReplace} className="mt-0.5" />
            <span>
              পুরনো কনটেন্ট মুছে নতুন করে বসান
              <span className="block text-xs text-destructive">সতর্কতা: পাঠকদের এই কিতাবের হাইলাইট ও নোটও মুছে যাবে</span>
            </span>
          </label>
          <Button disabled={!file || run.isPending} onClick={() => (!replace || confirmDelete('বর্তমান সব পৃষ্ঠা')) && run.mutate(undefined)}>
            <FileUp /> ইমপোর্ট
          </Button>
        </div>
      </Panel>
      <Panel title="ফরম্যাট">
        <p className="mb-2 text-sm font-semibold">JSON</p>
        <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-[11px] leading-relaxed" dir="ltr">
          {JSON_EXAMPLE}
        </pre>
        <p className="mt-4 mb-2 text-sm font-semibold">CSV</p>
        <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-[11px]" dir="ltr">
          {`page,ar,bn,block_type,paragraph_break,footnote_lang,marker
1,"اعلم","জেনে রাখো",paragraph,1,,
1,"حاشية","",,,ar,1`}
        </pre>
        <p className="mt-3 text-xs text-muted-foreground">
          block_type: paragraph, heading, quote, list_item, poetry · paragraph_break = এই বাক্য থেকে নতুন অনুচ্ছেদ শুরু
        </p>
      </Panel>
    </div>
  )
}
