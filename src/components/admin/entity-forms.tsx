import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Field } from '@/components/admin/form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import type { Author, Book, Category, Dars, DarsSeries, Paginated } from '@/lib/types'

export function useAuthorOptions() {
  return useQuery({ queryKey: ['admin', 'authors', 'options'], queryFn: () => api<Paginated<Author>>('/admin/authors', { query: { per_page: 500 } }) }).data?.data ?? []
}

function useCategoryOptions() {
  return useQuery({ queryKey: ['admin', 'categories'], queryFn: () => api<Category[]>('/admin/categories') }).data ?? []
}

/** Category select; "none" maps to no category. */
function CategorySelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const categories = useCategoryOptions()
  return (
    <Field label="বিষয় (ক্যাটাগরি)">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">— বিষয় নেই —</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={String(c.id)}>
              {c.name_bn}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}

function useBookOptions() {
  return useQuery({ queryKey: ['admin', 'books', 'options'], queryFn: () => api<Paginated<Book>>('/admin/books', { query: { per_page: 500 } }) }).data?.data ?? []
}

function NameFields({ prefix, values, set, kind }: { prefix: 'name' | 'title'; values: Record<string, string>; set: (key: string, value: string) => void; kind: string }) {
  return (
    <>
      <Field label={`${kind} (আরবি)`}>
        <Input dir="rtl" lang="ar" className="font-arabic text-lg" required value={values[`${prefix}_ar`] ?? ''} onChange={(e) => set(`${prefix}_ar`, e.target.value)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={`${kind} (বাংলা)`}>
          <Input required value={values[`${prefix}_bn`] ?? ''} onChange={(e) => set(`${prefix}_bn`, e.target.value)} />
        </Field>
        <Field label="বাংলা উচ্চারণ / ইংরেজি বানান" hint="স্লাগ এখান থেকে তৈরি হয়">
          <Input required value={values[`${prefix}_translit`] ?? ''} onChange={(e) => set(`${prefix}_translit`, e.target.value)} />
        </Field>
      </div>
    </>
  )
}

type FormProps<T> = { initial?: Partial<T>; submitting: boolean; onSubmit: (data: Record<string, unknown>) => void; submitLabel?: string }

export function AuthorForm({ initial, submitting, onSubmit, submitLabel = 'সংরক্ষণ' }: FormProps<Author>) {
  const [values, setValues] = useState<Record<string, string>>({
    name_ar: initial?.name_ar ?? '',
    name_bn: initial?.name_bn ?? '',
    name_translit: initial?.name_translit ?? '',
    slug: initial?.slug ?? '',
    death_year_ah: initial?.death_year_ah ? String(initial.death_year_ah) : '',
    about_md: initial?.about_md ?? '',
  })
  const set = (key: string, value: string) => setValues((v) => ({ ...v, [key]: value }))

  return (
    <form className="space-y-4" onSubmit={(e) => (e.preventDefault(), onSubmit({ ...values, slug: values.slug || undefined, death_year_ah: values.death_year_ah ? Number(values.death_year_ah) : null }))}>
      <NameFields prefix="name" values={values} set={set} kind="নাম" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="স্লাগ (URL)" hint="খালি রাখলে নিজে থেকে তৈরি হবে">
          <Input value={values.slug} onChange={(e) => set('slug', e.target.value)} placeholder="ibn-taymiyyah" />
        </Field>
        <Field label="মৃত্যু সাল (হিজরি)" hint="জীবিত হলে খালি রাখুন">
          <Input type="number" min={1} max={1500} value={values.death_year_ah} onChange={(e) => set('death_year_ah', e.target.value)} placeholder="৭২৮" />
        </Field>
      </div>
      <Field label="পরিচিতি (Markdown)">
        <Textarea value={values.about_md} onChange={(e) => set('about_md', e.target.value)} className="min-h-28" />
      </Field>
      <Button type="submit" disabled={submitting}>
        {submitLabel}
      </Button>
    </form>
  )
}

export function BookForm({ initial, submitting, onSubmit, submitLabel = 'সংরক্ষণ' }: FormProps<Book>) {
  const authors = useAuthorOptions()
  const [values, setValues] = useState<Record<string, string>>({
    title_ar: initial?.title_ar ?? '',
    title_bn: initial?.title_bn ?? '',
    title_translit: initial?.title_translit ?? '',
    slug: initial?.slug ?? '',
    about_md: initial?.about_md ?? '',
    author_id: initial?.author?.id ? String(initial.author.id) : '',
    explainer_id: initial?.explainer?.id ? String(initial.explainer.id) : '',
    category_id: initial?.category?.id ? String(initial.category.id) : 'none',
  })
  const [published, setPublished] = useState(initial?.is_published ?? false)
  const [sharh, setSharh] = useState(initial?.is_sharh ?? false)
  const set = (key: string, value: string) => setValues((v) => ({ ...v, [key]: value }))

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => (
        e.preventDefault(),
        onSubmit({
          ...values,
          slug: values.slug || undefined,
          author_id: Number(values.author_id),
          category_id: values.category_id === 'none' ? null : Number(values.category_id),
          is_sharh: sharh,
          explainer_id: sharh && values.explainer_id ? Number(values.explainer_id) : null,
          is_published: published,
        })
      )}
    >
      <NameFields prefix="title" values={values} set={set} kind="শিরোনাম" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={sharh ? 'মূল গ্রন্থকার (মতনের লেখক)' : 'লেখক'}>
          <Select value={values.author_id} onValueChange={(v) => set('author_id', v)} required>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="লেখক বেছে নিন" />
            </SelectTrigger>
            <SelectContent>
              {authors.map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>
                  {a.name_bn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <CategorySelect value={values.category_id} onChange={(v) => set('category_id', v)} />
      </div>
      <Field label="স্লাগ (URL)" hint="খালি রাখলে নিজে থেকে তৈরি হবে">
        <Input value={values.slug} onChange={(e) => set('slug', e.target.value)} />
      </Field>
      <div className="space-y-3 rounded-lg border bg-muted/40 p-3">
        <label className="flex items-start gap-3 text-sm">
          <Switch checked={sharh} onCheckedChange={setSharh} className="mt-0.5" />
          <span>
            এটি একটি শারহ (ব্যাখ্যাগ্রন্থ)
            <span className="block text-xs text-muted-foreground">উপরের লেখক হবেন মূল গ্রন্থকার; নিচে ব্যাখ্যাকার বেছে নিন</span>
          </span>
        </label>
        {sharh && (
          <Field label="ব্যাখ্যাকার (শারিহ)">
            <Select value={values.explainer_id} onValueChange={(v) => set('explainer_id', v)}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder="ব্যাখ্যাকার বেছে নিন" />
              </SelectTrigger>
              <SelectContent>
                {authors.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.name_bn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
      </div>
      <Field label="পরিচিতি (Markdown)">
        <Textarea value={values.about_md} onChange={(e) => set('about_md', e.target.value)} className="min-h-28" />
      </Field>
      <label className="flex items-center gap-3 text-sm">
        <Switch checked={published} onCheckedChange={setPublished} /> প্রকাশিত (সবাই দেখতে পাবে)
      </label>
      <Button type="submit" disabled={submitting || !values.author_id || (sharh && !values.explainer_id)}>
        {submitLabel}
      </Button>
    </form>
  )
}

export function SeriesForm({ initial, submitting, onSubmit, submitLabel = 'সংরক্ষণ' }: FormProps<DarsSeries>) {
  const authors = useAuthorOptions()
  const books = useBookOptions()
  const [values, setValues] = useState<Record<string, string>>({
    title_ar: initial?.title_ar ?? '',
    title_bn: initial?.title_bn ?? '',
    title_translit: initial?.title_translit ?? '',
    slug: initial?.slug ?? '',
    about_md: initial?.about_md ?? '',
    author_id: initial?.author?.id ? String(initial.author.id) : '',
    book_id: initial?.book_id ? String(initial.book_id) : 'none',
    category_id: initial?.category?.id ? String(initial.category.id) : 'none',
  })
  const [published, setPublished] = useState(initial?.is_published ?? false)
  const set = (key: string, value: string) => setValues((v) => ({ ...v, [key]: value }))

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => (
        e.preventDefault(),
        onSubmit({ ...values, slug: values.slug || undefined, author_id: Number(values.author_id), book_id: values.book_id === 'none' ? null : Number(values.book_id), category_id: values.category_id === 'none' ? null : Number(values.category_id), is_published: published })
      )}
    >
      <NameFields prefix="title" values={values} set={set} kind="কিতাবের নাম" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="শাইখ / লেখক">
          <Select value={values.author_id} onValueChange={(v) => set('author_id', v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="বেছে নিন" />
            </SelectTrigger>
            <SelectContent>
              {authors.map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>
                  {a.name_bn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="সংশ্লিষ্ট কিতাব (ঐচ্ছিক)">
          <Select value={values.book_id} onValueChange={(v) => set('book_id', v)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— নেই —</SelectItem>
              {books.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>
                  {b.title_bn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <CategorySelect value={values.category_id} onChange={(v) => set('category_id', v)} />
        <Field label="স্লাগ (URL)">
          <Input value={values.slug} onChange={(e) => set('slug', e.target.value)} />
        </Field>
      </div>
      <Field label="পরিচিতি (Markdown)">
        <Textarea value={values.about_md} onChange={(e) => set('about_md', e.target.value)} />
      </Field>
      <label className="flex items-center gap-3 text-sm">
        <Switch checked={published} onCheckedChange={setPublished} /> প্রকাশিত
      </label>
      <Button type="submit" disabled={submitting || !values.author_id}>
        {submitLabel}
      </Button>
    </form>
  )
}

export function DarsForm({ initial, submitting, onSubmit, submitLabel = 'সংরক্ষণ' }: FormProps<Dars>) {
  const [values, setValues] = useState<Record<string, string>>({
    number: initial?.number !== undefined ? String(initial.number) : '',
    title_bn: initial?.title_bn ?? '',
    title_ar: initial?.title_ar ?? '',
    media_type: initial?.media_type ?? 'video',
    media_url: initial?.media_url ?? '',
    duration_seconds: initial?.duration_seconds ? String(initial.duration_seconds) : '',
  })
  const set = (key: string, value: string) => setValues((v) => ({ ...v, [key]: value }))

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => (
        e.preventDefault(),
        onSubmit({ ...values, number: Number(values.number), duration_seconds: values.duration_seconds ? Number(values.duration_seconds) : null, title_ar: values.title_ar || null })
      )}
    >
      <div className="grid gap-4 sm:grid-cols-[100px_1fr]">
        <Field label="নম্বর">
          <Input type="number" min={0} required value={values.number} onChange={(e) => set('number', e.target.value)} />
        </Field>
        <Field label="শিরোনাম (বাংলা)">
          <Input required value={values.title_bn} onChange={(e) => set('title_bn', e.target.value)} />
        </Field>
      </div>
      <Field label="শিরোনাম (আরবি, ঐচ্ছিক)">
        <Input dir="rtl" className="font-arabic" value={values.title_ar} onChange={(e) => set('title_ar', e.target.value)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
        <Field label="ধরন">
          <Select value={values.media_type} onValueChange={(v) => set('media_type', v)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="video">ভিডিও</SelectItem>
              <SelectItem value="audio">অডিও</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="মিডিয়া লিংক" hint="YouTube লিংক বা সরাসরি mp3/mp4 ফাইলের লিংক">
          <Input type="url" required value={values.media_url} onChange={(e) => set('media_url', e.target.value)} />
        </Field>
      </div>
      <Field label="সময়কাল (সেকেন্ড, ঐচ্ছিক)">
        <Input type="number" min={0} value={values.duration_seconds} onChange={(e) => set('duration_seconds', e.target.value)} className="w-40" />
      </Field>
      <Button type="submit" disabled={submitting}>
        {submitLabel}
      </Button>
    </form>
  )
}
