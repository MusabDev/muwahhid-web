import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { AdminPageHeader, confirmDelete, Panel, useAdminMutation } from '@/components/admin/form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { bnNum } from '@/lib/text'
import type { Category } from '@/lib/types'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/admin/categories')({
  component: AdminCategories,
})

const INVALIDATE = [['admin', 'categories'], ['categories']]

function AdminCategories() {
  const { data: categories } = useQuery({ queryKey: ['admin', 'categories'], queryFn: () => api<Category[]>('/admin/categories') })
  const [draft, setDraft] = useState({ name_bn: '', name_ar: '', slug: '' })

  const create = useAdminMutation(
    () => api('/admin/categories', { method: 'POST', body: { ...draft, name_ar: draft.name_ar || null, slug: draft.slug || undefined, position: categories?.length ?? 0 } }),
    { success: 'বিষয় যোগ হয়েছে', invalidate: INVALIDATE, onSuccess: () => setDraft({ name_bn: '', name_ar: '', slug: '' }) },
  )
  const reorder = useAdminMutation(
    (ordered: Category[]) => Promise.all(ordered.map((c, position) => (c.position === position ? null : api(`/admin/categories/${c.id}`, { method: 'PUT', body: { position } })))),
    { invalidate: INVALIDATE },
  )

  const move = (index: number, delta: number) => {
    if (!categories) return
    const next = [...categories]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    reorder.mutate(next)
  }

  return (
    <>
      <AdminPageHeader title="বিষয় (ক্যাটাগরি)" description="কিতাব ও দারস সিরিজ দুটোই এই বিষয়গুলো ব্যবহার করে। ক্রম এখানে যেমন, সাইটেও তেমন দেখাবে।" />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Panel>
          <div className="divide-y">
            {categories?.map((category, index) => (
              <CategoryRow
                key={`${category.id}:${category.position}`}
                category={category}
                first={index === 0}
                last={index === categories.length - 1}
                onMove={(delta) => move(index, delta)}
              />
            ))}
            {categories && !categories.length && <p className="py-6 text-center text-sm text-muted-foreground">কোনো বিষয় নেই</p>}
          </div>
        </Panel>
        <Panel title="নতুন বিষয়">
          <form className="space-y-3" onSubmit={(e) => (e.preventDefault(), create.mutate(undefined))}>
            <Input required placeholder="নাম (বাংলা), যেমন: আকীদা" value={draft.name_bn} onChange={(e) => setDraft((d) => ({ ...d, name_bn: e.target.value }))} />
            <Input dir="rtl" className="font-arabic" placeholder="الاسم بالعربية (ঐচ্ছিক)" value={draft.name_ar} onChange={(e) => setDraft((d) => ({ ...d, name_ar: e.target.value }))} />
            <Input dir="ltr" placeholder="স্লাগ (URL), যেমন: aqidah" value={draft.slug} onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))} />
            <Button type="submit" className="w-full" disabled={create.isPending || !draft.name_bn}>
              <Plus /> যোগ করুন
            </Button>
          </form>
        </Panel>
      </div>
    </>
  )
}

function CategoryRow({ category, first, last, onMove }: { category: Category; first: boolean; last: boolean; onMove: (delta: number) => void }) {
  const [values, setValues] = useState({ name_bn: category.name_bn, name_ar: category.name_ar ?? '', slug: category.slug })
  const dirty = values.name_bn !== category.name_bn || values.name_ar !== (category.name_ar ?? '') || values.slug !== category.slug

  const save = useAdminMutation(() => api(`/admin/categories/${category.id}`, { method: 'PUT', body: { ...values, name_ar: values.name_ar || null } }), { success: 'সংরক্ষিত', invalidate: INVALIDATE })
  const remove = useAdminMutation(() => api(`/admin/categories/${category.id}`, { method: 'DELETE' }), { success: 'মুছে ফেলা হয়েছে', invalidate: INVALIDATE })
  const used = (category.books_count ?? 0) + (category.dars_series_count ?? 0)

  return (
    <div className={cn('grid gap-2 py-3 sm:grid-cols-[1fr_1fr_140px_auto] sm:items-center', dirty && 'rounded-lg bg-gold/5')}>
      <Input value={values.name_bn} onChange={(e) => setValues((v) => ({ ...v, name_bn: e.target.value }))} aria-label="নাম (বাংলা)" />
      <Input dir="rtl" className="font-arabic" value={values.name_ar} onChange={(e) => setValues((v) => ({ ...v, name_ar: e.target.value }))} aria-label="নাম (আরবি)" />
      <Input dir="ltr" className="text-xs" value={values.slug} onChange={(e) => setValues((v) => ({ ...v, slug: e.target.value }))} aria-label="স্লাগ" />
      <div className="flex items-center gap-0.5">
        <span className="me-2 text-xs whitespace-nowrap text-muted-foreground">
          {bnNum(category.books_count ?? 0)} কিতাব · {bnNum(category.dars_series_count ?? 0)} দারস
        </span>
        <Button variant="ghost" size="icon-sm" onClick={() => onMove(-1)} disabled={first} aria-label="উপরে">
          <ArrowUp />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={() => onMove(1)} disabled={last} aria-label="নিচে">
          <ArrowDown />
        </Button>
        <Button size="icon-sm" disabled={!dirty || save.isPending} onClick={() => save.mutate(undefined)} aria-label="সংরক্ষণ">
          <Save />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="মুছুন"
          onClick={() => confirmDelete(used ? `“${category.name_bn}” (এর ${bnNum(used)}টি কিতাব/দারস বিষয়হীন হয়ে যাবে)` : `“${category.name_bn}”`) && remove.mutate(undefined)}
        >
          <Trash2 />
        </Button>
      </div>
    </div>
  )
}
