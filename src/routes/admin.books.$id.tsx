import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Download, ExternalLink, FileJson, FileUp, ImagePlus, Plus, Trash2, WandSparkles } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { BookForm } from '@/components/admin/entity-forms'
import { AdminPageHeader, confirmDelete, Panel, useAdminMutation } from '@/components/admin/form'
import { BookImportDialog } from '@/components/admin/imports'
import { BOOK_GUIDE, FormatGuide } from '@/components/admin/json-import'
import { BookCover } from '@/components/book-cover'
import { CenterSpinner, EmptyState } from '@/components/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { BOOK_STARTER, downloadJson } from '@/lib/admin/templates'
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
  const [tab, setTab] = useState('info')
  const [importing, setImporting] = useState(false)

  const save = useAdminMutation((values: Record<string, unknown>) => api(`/admin/books/${id}`, { method: 'PUT', body: values }), { success: 'সংরক্ষিত হয়েছে', invalidate: [['admin'], ['book']] })
  const destroy = useAdminMutation(() => api(`/admin/books/${id}`, { method: 'DELETE' }), {
    success: 'কিতাব মুছে ফেলা হয়েছে',
    invalidate: [['admin']],
    onSuccess: () => navigate({ to: '/admin/books' }),
  })

  const exportJson = useAdminMutation(() => api<unknown>(`/admin/books/${id}/export`), { onSuccess: (data) => book && downloadJson(`${book.slug}.json`, data) })

  if (!book) return <CenterSpinner />

  return (
    <>
      <AdminPageHeader
        crumbs={[{ label: 'কিতাব', to: '/admin/books' }]}
        title={book.title_bn}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-arabic text-base">{book.title_ar}</span>
            <span>{book.author?.name_bn}</span>
            <Badge variant={book.is_published ? 'default' : 'secondary'}>{book.is_published ? 'প্রকাশিত' : 'খসড়া'}</Badge>
          </span>
        }
        action={
          <>
            <Button variant="outline" asChild>
              <Link to="/books/$slug" params={{ slug: book.slug }} target="_blank">
                <ExternalLink /> সাইটে দেখুন
              </Link>
            </Button>
            <Button variant="outline" onClick={() => exportJson.mutate(undefined)} disabled={exportJson.isPending}>
              <Download /> JSON এক্সপোর্ট
            </Button>
            <Button variant="destructive" size="icon" onClick={() => confirmDelete('কিতাবটি ও এর সব পৃষ্ঠা').then((ok) => ok && destroy.mutate(undefined))} aria-label="মুছুন">
              <Trash2 />
            </Button>
          </>
        }
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="info">তথ্য</TabsTrigger>
          <TabsTrigger value="pages">পৃষ্ঠা ({bnNum(book.pages_count ?? 0)})</TabsTrigger>
          <TabsTrigger value="toc">সূচিপত্র</TabsTrigger>
          <TabsTrigger value="import">ইমপোর্ট</TabsTrigger>
        </TabsList>
        <TabsContent value="info" className="mt-6">
          <div className="grid items-start gap-6 lg:grid-cols-[1fr_260px]">
            <Panel>
              <BookForm key={`${book.id}:${book.updated_at}`} initial={book} submitting={save.isPending} onSubmit={(v) => save.mutate(v)} />
            </Panel>
            <CoverPanel book={book} />
          </div>
        </TabsContent>
        <TabsContent value="pages" className="mt-6">
          <PagesPanel book={book} onImport={() => setImporting(true)} />
        </TabsContent>
        <TabsContent value="toc" className="mt-6">
          <TocPanel book={book} />
        </TabsContent>
        <TabsContent value="import" className="mt-6">
          <ImportPanel onImport={() => setImporting(true)} />
        </TabsContent>
      </Tabs>
      <BookImportDialog open={importing} onOpenChange={setImporting} book={book} />
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

function PagesPanel({ book, onImport }: { book: Book; onImport: () => void }) {
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
        <EmptyState icon={FileJson} title="এখনো কোনো পৃষ্ঠা নেই">
          <p>উপরে থেকে একটি একটি পৃষ্ঠা যোগ করুন, অথবা JSON/CSV ফাইল দিয়ে পুরো কিতাব একসাথে বসান।</p>
          <Button className="mt-4" onClick={onImport}>
            <FileUp /> ফাইল ইমপোর্ট
          </Button>
        </EmptyState>
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
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() => {
            try {
              setText(JSON.stringify(JSON.parse(text), null, 2))
            } catch (error) {
              toast.error(`JSON ঠিক নেই: ${error instanceof Error ? error.message : ''}`)
            }
          }}
        >
          <WandSparkles /> সাজান ও যাচাই
        </Button>
        <Button
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
      </div>
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

function ImportPanel({ onImport }: { onImport: () => void }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title="ফাইল থেকে কনটেন্ট">
        <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
          <li>নমুনা JSON নামিয়ে নিন (অথবা এই কিতাবের বর্তমান কনটেন্ট “JSON এক্সপোর্ট” করুন)।</li>
          <li>পৃষ্ঠা, বাক্য, টীকা ও সূচিপত্র পূরণ করুন।</li>
          <li>ফাইল দিন — ইমপোর্টের আগে কতগুলো পৃষ্ঠা/বাক্য যোগ হবে তা দেখানো হবে।</li>
        </ol>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={onImport}>
            <FileUp /> ফাইল ইমপোর্ট
          </Button>
          <Button variant="outline" onClick={() => downloadJson('muwahhid-book-starter.json', BOOK_STARTER)}>
            <Download /> নমুনা JSON
          </Button>
        </div>
      </Panel>
      <Panel title="ফরম্যাট">
        <FormatGuide rows={BOOK_GUIDE} />
        <p className="mt-4 mb-2 text-sm font-semibold">উদাহরণ (শুধু কনটেন্ট)</p>
        <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-[11px] leading-relaxed" dir="ltr">
          {JSON_EXAMPLE}
        </pre>
        <p className="mt-4 mb-2 text-sm font-semibold">CSV</p>
        <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-[11px]" dir="ltr">
          {`page,ar,bn,block_type,paragraph_break,footnote_lang,marker
1,"اعلم","জেনে রাখো",paragraph,1,,
1,"حاشية","",,,ar,1`}
        </pre>
      </Panel>
    </div>
  )
}
