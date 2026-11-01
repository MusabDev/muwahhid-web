import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Combobox } from '@/components/admin/combobox'
import { Field, FormActions, FormSection, useAdminMutation } from '@/components/admin/form'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { guessMediaType } from '@/lib/admin/templates'
import { api } from '@/lib/api'
import { formatTime, parseTime } from '@/lib/text'
import type { Author, Book, Category, Dars, DarsSeries, Paginated } from '@/lib/types'

export function useAuthorOptions() {
  return useQuery({ queryKey: ['admin', 'authors', 'options'], queryFn: () => api<Paginated<Author>>('/admin/authors', { query: { per_page: 500 } }) }).data?.data ?? []
}

export function useCategoryOptions() {
  return useQuery({ queryKey: ['admin', 'categories'], queryFn: () => api<Category[]>('/admin/categories') }).data ?? []
}

function useBookOptions() {
  return useQuery({ queryKey: ['admin', 'books', 'options'], queryFn: () => api<Paginated<Book>>('/admin/books', { query: { per_page: 500 } }) }).data?.data ?? []
}

/** Same rule as Laravel's Str::slug for Latin text: used to preview the auto slug. */
export function slugify(text: string) {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Searchable author picker with an inline "new author" form. */
export function AuthorSelect({ value, onChange, placeholder = 'লেখক বেছে নিন' }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  const authors = useAuthorOptions()
  const [creating, setCreating] = useState(false)
  const create = useAdminMutation((values: Record<string, unknown>) => api<Author>('/admin/authors', { method: 'POST', body: values }), {
    success: 'লেখক যোগ হয়েছে',
    invalidate: [['admin', 'authors'], ['authors']],
    onSuccess: (author) => {
      onChange(String(author.id))
      setCreating(false)
    },
  })

  return (
    <>
      <Combobox
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        options={authors.map((a) => ({ value: String(a.id), label: a.name_bn, hint: a.name_translit }))}
        onCreate={() => setCreating(true)}
        createLabel="নতুন লেখক যোগ করুন"
      />
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>নতুন লেখক</DialogTitle>
          </DialogHeader>
          <AuthorForm submitting={create.isPending} onSubmit={(v) => create.mutate(v)} submitLabel="যোগ করুন" />
        </DialogContent>
      </Dialog>
    </>
  )
}

function CategorySelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const categories = useCategoryOptions()
  return (
    <Field label="বিষয় (ক্যাটাগরি)">
      <Combobox value={value} onChange={onChange} none="— বিষয় নেই —" options={categories.map((c) => ({ value: String(c.id), label: c.name_bn, hint: c.name_ar ?? undefined }))} />
    </Field>
  )
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
        <Field label="ইংরেজি বানান (Transliteration)" hint="স্লাগ এখান থেকে তৈরি হয়">
          <Input required dir="ltr" value={values[`${prefix}_translit`] ?? ''} onChange={(e) => set(`${prefix}_translit`, e.target.value)} />
        </Field>
      </div>
    </>
  )
}

function SlugField({ value, onChange, source, placeholder }: { value: string; onChange: (value: string) => void; source: string; placeholder?: string }) {
  const auto = slugify(source)
  return (
    <Field label="স্লাগ (URL)" hint={value ? undefined : auto ? <>খালি রাখলে হবে: <code dir="ltr">{auto}</code></> : 'খালি রাখলে নিজে থেকে তৈরি হবে'}>
      <Input dir="ltr" value={value} onChange={(e) => onChange(e.target.value)} placeholder={auto || placeholder} />
    </Field>
  )
}

function PublishSwitch({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 rounded-lg border p-3 text-sm">
      <Switch checked={checked} onCheckedChange={onChange} className="mt-0.5" />
      <span>
        প্রকাশিত
        <span className="block text-xs text-muted-foreground">{checked ? 'সবাই সাইটে দেখতে পাবে' : 'খসড়া: শুধু অ্যাডমিনরা দেখতে পাবে'}</span>
      </span>
    </label>
  )
}

/** Local form state plus a flag for whether it differs from where it started. */
function useFormValues<T extends Record<string, unknown>>(initial: T) {
  const [start] = useState(() => JSON.stringify(initial))
  const [values, setValues] = useState(initial)
  const set = <K extends keyof T>(key: K, value: T[K]) => setValues((v) => ({ ...v, [key]: value }))
  return { values, set, dirty: JSON.stringify(values) !== start }
}

type FormProps<T> = { initial?: Partial<T>; submitting: boolean; onSubmit: (data: Record<string, unknown>) => void; submitLabel?: string }

export function AuthorForm({ initial, submitting, onSubmit, submitLabel = 'সংরক্ষণ' }: FormProps<Author>) {
  const { values, set, dirty } = useFormValues({
    name_ar: initial?.name_ar ?? '',
    name_bn: initial?.name_bn ?? '',
    name_translit: initial?.name_translit ?? '',
    slug: initial?.slug ?? '',
    death_year_ah: initial?.death_year_ah ? String(initial.death_year_ah) : '',
    about_md: initial?.about_md ?? '',
  })

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onSubmit({ ...values, slug: values.slug || undefined, death_year_ah: values.death_year_ah ? Number(values.death_year_ah) : null })
      }}
    >
      <FormSection title="নাম">
        <NameFields prefix="name" values={values} set={(k, v) => set(k as keyof typeof values, v)} kind="নাম" />
      </FormSection>
      <FormSection title="অন্যান্য">
        <div className="grid gap-4 sm:grid-cols-2">
          <SlugField value={values.slug} onChange={(v) => set('slug', v)} source={values.name_translit} placeholder="ibn-taymiyyah" />
          <Field label="মৃত্যু সাল (হিজরি)" hint="জীবিত হলে খালি রাখুন">
            <Input type="number" min={1} max={1500} value={values.death_year_ah} onChange={(e) => set('death_year_ah', e.target.value)} placeholder="৭২৮" />
          </Field>
        </div>
        <Field label="পরিচিতি (Markdown)">
          <Textarea value={values.about_md} onChange={(e) => set('about_md', e.target.value)} className="min-h-28" />
        </Field>
      </FormSection>
      <FormActions dirty={!!initial && dirty}>
        <Button type="submit" disabled={submitting}>
          {submitLabel}
        </Button>
      </FormActions>
    </form>
  )
}

export function BookForm({ initial, submitting, onSubmit, submitLabel = 'সংরক্ষণ' }: FormProps<Book>) {
  const { values, set, dirty } = useFormValues({
    title_ar: initial?.title_ar ?? '',
    title_bn: initial?.title_bn ?? '',
    title_translit: initial?.title_translit ?? '',
    slug: initial?.slug ?? '',
    about_md: initial?.about_md ?? '',
    author_id: initial?.author?.id ? String(initial.author.id) : '',
    explainer_id: initial?.explainer?.id ? String(initial.explainer.id) : '',
    category_id: initial?.category?.id ? String(initial.category.id) : 'none',
    is_sharh: initial?.is_sharh ?? false,
    is_published: initial?.is_published ?? false,
  })

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({
          ...values,
          slug: values.slug || undefined,
          author_id: Number(values.author_id),
          category_id: values.category_id === 'none' ? null : Number(values.category_id),
          explainer_id: values.is_sharh && values.explainer_id ? Number(values.explainer_id) : null,
        })
      }}
    >
      <FormSection title="শিরোনাম">
        <NameFields prefix="title" values={values as unknown as Record<string, string>} set={(k, v) => set(k as 'title_ar', v)} kind="শিরোনাম" />
      </FormSection>

      <FormSection title="লেখক ও বিষয়" hint="তালিকায় লেখক না থাকলে সেখান থেকেই নতুন লেখক যোগ করতে পারবেন">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={values.is_sharh ? 'মূল গ্রন্থকার (মতনের লেখক)' : 'লেখক'}>
            <AuthorSelect value={values.author_id} onChange={(v) => set('author_id', v)} />
          </Field>
          <CategorySelect value={values.category_id} onChange={(v) => set('category_id', v)} />
        </div>
        <div className="space-y-3 rounded-lg border bg-muted/40 p-3">
          <label className="flex items-start gap-3 text-sm">
            <Switch checked={values.is_sharh} onCheckedChange={(v) => set('is_sharh', v)} className="mt-0.5" />
            <span>
              এটি একটি শারহ (ব্যাখ্যাগ্রন্থ)
              <span className="block text-xs text-muted-foreground">উপরের লেখক হবেন মূল গ্রন্থকার; নিচে ব্যাখ্যাকার বেছে নিন</span>
            </span>
          </label>
          {values.is_sharh && (
            <Field label="ব্যাখ্যাকার (শারিহ)">
              <AuthorSelect value={values.explainer_id} onChange={(v) => set('explainer_id', v)} placeholder="ব্যাখ্যাকার বেছে নিন" />
            </Field>
          )}
        </div>
      </FormSection>

      <FormSection title="পরিচিতি ও প্রকাশ">
        <SlugField value={values.slug} onChange={(v) => set('slug', v)} source={values.title_translit} />
        <Field label="পরিচিতি (Markdown)">
          <Textarea value={values.about_md} onChange={(e) => set('about_md', e.target.value)} className="min-h-28" />
        </Field>
        <PublishSwitch checked={values.is_published} onChange={(v) => set('is_published', v)} />
      </FormSection>

      <FormActions dirty={!!initial && dirty}>
        <Button type="submit" disabled={submitting || !values.author_id || (values.is_sharh && !values.explainer_id)}>
          {submitLabel}
        </Button>
        {!values.author_id && <span className="text-xs text-muted-foreground">লেখক বেছে নিন</span>}
      </FormActions>
    </form>
  )
}

export function SeriesForm({ initial, submitting, onSubmit, submitLabel = 'সংরক্ষণ' }: FormProps<DarsSeries>) {
  const books = useBookOptions()
  const { values, set, dirty } = useFormValues({
    title_ar: initial?.title_ar ?? '',
    title_bn: initial?.title_bn ?? '',
    title_translit: initial?.title_translit ?? '',
    slug: initial?.slug ?? '',
    about_md: initial?.about_md ?? '',
    author_id: initial?.author?.id ? String(initial.author.id) : '',
    book_id: initial?.book_id ? String(initial.book_id) : 'none',
    category_id: initial?.category?.id ? String(initial.category.id) : 'none',
    is_published: initial?.is_published ?? false,
  })

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({
          ...values,
          slug: values.slug || undefined,
          author_id: Number(values.author_id),
          book_id: values.book_id === 'none' ? null : Number(values.book_id),
          category_id: values.category_id === 'none' ? null : Number(values.category_id),
        })
      }}
    >
      <FormSection title="কিতাবের নাম" hint="যে কিতাবের দারস দেওয়া হচ্ছে">
        <NameFields prefix="title" values={values as unknown as Record<string, string>} set={(k, v) => set(k as 'title_ar', v)} kind="কিতাবের নাম" />
      </FormSection>
      <FormSection title="শাইখ ও বিষয়">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="শাইখ / লেখক">
            <AuthorSelect value={values.author_id} onChange={(v) => set('author_id', v)} placeholder="বেছে নিন" />
          </Field>
          <CategorySelect value={values.category_id} onChange={(v) => set('category_id', v)} />
        </div>
        <Field label="সংশ্লিষ্ট কিতাব (ঐচ্ছিক)" hint="সাইটে থাকা কিতাবের সাথে সিরিজটি যুক্ত করুন">
          <Combobox value={values.book_id} onChange={(v) => set('book_id', v)} none="— নেই —" options={books.map((b) => ({ value: String(b.id), label: b.title_bn, hint: b.author?.name_bn }))} />
        </Field>
      </FormSection>
      <FormSection title="পরিচিতি ও প্রকাশ">
        <SlugField value={values.slug} onChange={(v) => set('slug', v)} source={values.title_translit} />
        <Field label="পরিচিতি (Markdown)">
          <Textarea value={values.about_md} onChange={(e) => set('about_md', e.target.value)} />
        </Field>
        <PublishSwitch checked={values.is_published} onChange={(v) => set('is_published', v)} />
      </FormSection>
      <FormActions dirty={!!initial?.id && dirty}>
        <Button type="submit" disabled={submitting || !values.author_id}>
          {submitLabel}
        </Button>
      </FormActions>
    </form>
  )
}

export function DarsForm({ initial, submitting, onSubmit, submitLabel = 'সংরক্ষণ' }: FormProps<Dars>) {
  const { values, set, dirty } = useFormValues({
    number: initial?.number !== undefined ? String(initial.number) : '',
    title_bn: initial?.title_bn ?? '',
    title_ar: initial?.title_ar ?? '',
    media_type: initial?.media_type ?? 'video',
    media_url: initial?.media_url ?? '',
    duration: initial?.duration_seconds ? formatTime(initial.duration_seconds) : '',
  })
  const [typeTouched, setTypeTouched] = useState(!!initial?.id)

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault()
        const { duration, ...rest } = values
        const seconds = parseTime(duration)
        onSubmit({ ...rest, number: Number(values.number), duration_seconds: seconds != null ? Math.round(seconds) : null, title_ar: values.title_ar || null })
      }}
    >
      <div className="grid gap-4 sm:grid-cols-[100px_1fr]">
        <Field label="নম্বর">
          <Input type="number" min={0} required value={values.number} onChange={(e) => set('number', e.target.value)} />
        </Field>
        <Field label="শিরোনাম (বাংলা)">
          <Input required value={values.title_bn} onChange={(e) => set('title_bn', e.target.value)} autoFocus={!initial?.id} />
        </Field>
      </div>
      <Field label="শিরোনাম (আরবি, ঐচ্ছিক)">
        <Input dir="rtl" className="font-arabic" value={values.title_ar} onChange={(e) => set('title_ar', e.target.value)} />
      </Field>
      <Field label="মিডিয়া লিংক" hint="YouTube লিংক বা সরাসরি mp3/mp4 ফাইলের লিংক; ধরন নিজে থেকে বোঝা যায়">
        <Input
          type="url"
          dir="ltr"
          required
          value={values.media_url}
          onChange={(e) => {
            set('media_url', e.target.value)
            const guessed = guessMediaType(e.target.value)
            if (guessed && !typeTouched) set('media_type', guessed)
          }}
          placeholder="https://www.youtube.com/watch?v=…"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="ধরন">
          <ToggleGroup
            type="single"
            variant="outline"
            value={values.media_type}
            onValueChange={(v) => {
              if (!v) return
              setTypeTouched(true)
              set('media_type', v as typeof values.media_type)
            }}
          >
            <ToggleGroupItem value="video">ভিডিও</ToggleGroupItem>
            <ToggleGroupItem value="audio">অডিও</ToggleGroupItem>
          </ToggleGroup>
        </Field>
        <Field label="সময়কাল (ঐচ্ছিক)" hint="যেমন 45:30 বা 1:05:00">
          <Input dir="ltr" value={values.duration} onChange={(e) => set('duration', e.target.value)} placeholder="45:30" className="w-32 font-mono" />
        </Field>
      </div>
      <FormActions dirty={!!initial?.id && dirty}>
        <Button type="submit" disabled={submitting}>
          {submitLabel}
        </Button>
      </FormActions>
    </form>
  )
}
