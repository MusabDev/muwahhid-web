import { useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowDown, ArrowLeft, ArrowUp, Eye, Plus, Save, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AdminPageHeader, confirmDelete, Panel, useAdminMutation } from '@/components/admin/form'
import { Markdown } from '@/components/markdown'
import { CenterSpinner } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { bnNum } from '@/lib/text'
import type { BlockType, BookPage, Footnote, Lang, Sentence } from '@/lib/types'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/admin/pages/$id')({
  component: PageEditor,
})

const BLOCK_TYPES: { value: BlockType; label: string }[] = [
  { value: 'paragraph', label: 'অনুচ্ছেদ' },
  { value: 'heading', label: 'শিরোনাম' },
  { value: 'quote', label: 'উদ্ধৃতি' },
  { value: 'list_item', label: 'তালিকা' },
  { value: 'poetry', label: 'কবিতা' },
]

function PageEditor() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const queryKey = ['admin', 'page', id]
  const { data: page } = useQuery({ queryKey, queryFn: () => api<BookPage>(`/admin/pages/${id}`) })
  const [preview, setPreview] = useState(false)
  const [pageNumber, setPageNumber] = useState('')
  useEffect(() => setPageNumber(page ? String(page.number) : ''), [page])

  const invalidate: QueryKey[] = [queryKey, ['admin', 'book'], ['book']]
  const renumber = useAdminMutation((n: number) => api(`/admin/pages/${id}`, { method: 'PUT', body: { number: n } }), { success: 'পৃষ্ঠা নম্বর বদলানো হয়েছে', invalidate })
  const destroy = useAdminMutation(() => api(`/admin/pages/${id}`, { method: 'DELETE' }), {
    success: 'পৃষ্ঠা মুছে ফেলা হয়েছে',
    invalidate: [['admin']],
    onSuccess: () => page && navigate({ to: '/admin/books/$id', params: { id: String(page.book_id) } }),
  })
  const add = useAdminMutation((position: number | null) => api(`/admin/pages/${id}/sentences`, { method: 'POST', body: { text_ar_md: '…', text_bn_md: '…', position } }), { invalidate })
  const reorder = useAdminMutation((ids: number[]) => api(`/admin/pages/${id}/sentences/order`, { method: 'PUT', body: { ids } }), { invalidate })

  if (!page) return <CenterSpinner />

  const move = (index: number, delta: number) => {
    const ids = page.sentences.map((s) => s.id)
    const target = index + delta
    if (target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    reorder.mutate(ids)
  }

  return (
    <>
      <Link to="/admin/books/$id" params={{ id: String(page.book_id) }} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="size-4" /> কিতাবে ফিরুন
      </Link>
      <AdminPageHeader
        title={`পৃষ্ঠা ${bnNum(page.number)}`}
        description={`${bnNum(page.sentences.length)}টি বাক্য`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <form className="flex items-center gap-2" onSubmit={(e) => (e.preventDefault(), renumber.mutate(Number(pageNumber)))}>
              <Input type="number" min={0} value={pageNumber} onChange={(e) => setPageNumber(e.target.value)} className="h-8 w-20" />
              <Button type="submit" variant="outline" size="sm" disabled={Number(pageNumber) === page.number}>
                নম্বর বদলান
              </Button>
            </form>
            <Button variant={preview ? 'default' : 'outline'} size="sm" onClick={() => setPreview((p) => !p)}>
              <Eye /> প্রিভিউ
            </Button>
            <Button variant="destructive" size="sm" onClick={() => confirmDelete('পৃষ্ঠাটি') && destroy.mutate(undefined)}>
              <Trash2 />
            </Button>
          </div>
        }
      />

      <div className="space-y-3">
        {page.sentences.map((sentence, index) => (
          <SentenceEditor
            key={sentence.id + ':' + sentence.position}
            sentence={sentence}
            index={index}
            preview={preview}
            invalidate={invalidate}
            onMoveUp={() => move(index, -1)}
            onMoveDown={() => move(index, 1)}
            onInsertAfter={() => add.mutate(sentence.position + 1)}
            isLast={index === page.sentences.length - 1}
          />
        ))}
        <Button variant="outline" className="w-full border-dashed" onClick={() => add.mutate(null)}>
          <Plus /> বাক্য যোগ করুন
        </Button>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <FootnotesEditor pageId={page.id} lang="bn" footnotes={page.footnotes.bn} invalidate={invalidate} />
        <FootnotesEditor pageId={page.id} lang="ar" footnotes={page.footnotes.ar} invalidate={invalidate} />
      </div>
    </>
  )
}

function SentenceEditor({ sentence, index, preview, invalidate, onMoveUp, onMoveDown, onInsertAfter, isLast }: {
  sentence: Sentence
  index: number
  preview: boolean
  invalidate: QueryKey[]
  onMoveUp: () => void
  onMoveDown: () => void
  onInsertAfter: () => void
  isLast: boolean
}) {
  const [ar, setAr] = useState(sentence.text_ar_md)
  const [bn, setBn] = useState(sentence.text_bn_md)
  const [blockType, setBlockType] = useState<BlockType>(sentence.block_type)
  const [paragraphBreak, setParagraphBreak] = useState(sentence.paragraph_break)
  const dirty = ar !== sentence.text_ar_md || bn !== sentence.text_bn_md || blockType !== sentence.block_type || paragraphBreak !== sentence.paragraph_break

  const save = useAdminMutation(
    () => api(`/admin/sentences/${sentence.id}`, { method: 'PUT', body: { text_ar_md: ar, text_bn_md: bn, block_type: blockType, paragraph_break: paragraphBreak } }),
    { success: 'বাক্য সংরক্ষিত', invalidate },
  )
  const remove = useAdminMutation(() => api(`/admin/sentences/${sentence.id}`, { method: 'DELETE' }), { invalidate })

  return (
    <div className={cn('rounded-xl border bg-card p-3 shadow-sm', dirty && 'border-gold')} onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === 's' && (e.preventDefault(), save.mutate(undefined))}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-semibold">{bnNum(index + 1)}</span>
        <Select value={blockType} onValueChange={(v) => setBlockType(v as BlockType)}>
          <SelectTrigger size="sm" className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BLOCK_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch checked={paragraphBreak} onCheckedChange={setParagraphBreak} size="sm" /> নতুন অনুচ্ছেদ
        </label>
        <span className="text-[11px] text-muted-foreground">#{sentence.id}</span>
        <div className="ms-auto flex items-center gap-0.5">
          <Button variant="ghost" size="icon-sm" onClick={onMoveUp} disabled={index === 0} aria-label="উপরে">
            <ArrowUp />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onMoveDown} disabled={isLast} aria-label="নিচে">
            <ArrowDown />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onInsertAfter} aria-label="নিচে নতুন বাক্য">
            <Plus />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => confirmDelete('বাক্যটি') && remove.mutate(undefined)} aria-label="মুছুন">
            <Trash2 />
          </Button>
          <Button size="sm" disabled={!dirty || save.isPending} onClick={() => save.mutate(undefined)}>
            <Save /> সংরক্ষণ
          </Button>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Textarea value={bn} onChange={(e) => setBn(e.target.value)} className="min-h-20 text-[15px]" placeholder="বাংলা" />
          {preview && <Markdown inline text={bn} className="mt-2 block rounded-md bg-muted/50 p-2 text-sm" />}
        </div>
        <div className="md:order-first">
          <Textarea dir="rtl" lang="ar" value={ar} onChange={(e) => setAr(e.target.value)} className="min-h-20 font-arabic text-lg" placeholder="العربية" />
          {preview && <Markdown inline text={ar} className="mt-2 block rounded-md bg-muted/50 p-2 font-arabic text-lg" />}
        </div>
      </div>
    </div>
  )
}

function FootnotesEditor({ pageId, lang, footnotes, invalidate }: { pageId: number; lang: Lang; footnotes: Footnote[]; invalidate: QueryKey[] }) {
  const queryClient = useQueryClient()
  const [marker, setMarker] = useState('')
  const [text, setText] = useState('')
  const refresh = () => invalidate.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }))
  const create = useAdminMutation(() => api(`/admin/pages/${pageId}/footnotes`, { method: 'POST', body: { lang, marker, text_md: text } }), {
    success: 'টীকা যোগ হয়েছে',
    onSuccess: () => {
      setMarker('')
      setText('')
      refresh()
    },
  })
  const isAr = lang === 'ar'

  return (
    <Panel title={isAr ? 'আরবি টীকা (حاشية)' : 'বাংলা টীকা'}>
      <p className="mb-3 text-xs text-muted-foreground">
        বাক্যে <code>[^1]</code> লিখে টীকার সাথে যুক্ত করুন।
      </p>
      <div className="space-y-2">
        {footnotes.map((f) => (
          <FootnoteRow key={f.id} footnote={f} onChange={refresh} />
        ))}
      </div>
      <form className="mt-4 space-y-2 border-t pt-4" onSubmit={(e) => (e.preventDefault(), create.mutate(undefined))}>
        <div className="flex gap-2">
          <Input value={marker} onChange={(e) => setMarker(e.target.value)} placeholder="চিহ্ন (১)" className="w-24" required />
          <Button type="submit" size="lg" disabled={create.isPending || !text}>
            <Plus /> যোগ
          </Button>
        </div>
        <Textarea dir={isAr ? 'rtl' : 'ltr'} value={text} onChange={(e) => setText(e.target.value)} className={cn(isAr && 'font-arabic text-lg')} placeholder="টীকার লেখা (Markdown)" />
      </form>
    </Panel>
  )
}

function FootnoteRow({ footnote, onChange }: { footnote: Footnote; onChange: () => void }) {
  const [text, setText] = useState(footnote.text_md)
  const save = useAdminMutation(() => api(`/admin/footnotes/${footnote.id}`, { method: 'PUT', body: { text_md: text } }), { success: 'সংরক্ষিত', onSuccess: onChange })
  const remove = useAdminMutation(() => api(`/admin/footnotes/${footnote.id}`, { method: 'DELETE' }), { onSuccess: onChange })
  const isAr = footnote.lang === 'ar'

  return (
    <div className="flex items-start gap-2">
      <span className="mt-2 w-8 shrink-0 text-center text-sm font-semibold text-gold">[{footnote.marker}]</span>
      <Textarea dir={isAr ? 'rtl' : 'ltr'} value={text} onChange={(e) => setText(e.target.value)} className={cn('min-h-12 flex-1', isAr && 'font-arabic text-lg')} />
      <div className="flex flex-col gap-1">
        <Button size="icon-sm" variant="outline" disabled={text === footnote.text_md} onClick={() => save.mutate(undefined)} aria-label="সংরক্ষণ">
          <Save />
        </Button>
        <Button size="icon-sm" variant="ghost" onClick={() => confirmDelete('টীকাটি') && remove.mutate(undefined)} aria-label="মুছুন">
          <Trash2 />
        </Button>
      </div>
    </div>
  )
}
