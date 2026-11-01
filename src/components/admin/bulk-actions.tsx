import { Eye, EyeOff, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Combobox } from '@/components/admin/combobox'
import { useAuthorOptions, useCategoryOptions } from '@/components/admin/entity-forms'
import { confirmAction, useAdminMutation } from '@/components/admin/form'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { bnNum } from '@/lib/text'

type Action = { action: 'publish' | 'unpublish' | 'delete' } | { action: 'category'; category_id: number | null } | { action: 'author'; author_id: number }

/** Leaves the category of the picked rows empty. */
const NO_CATEGORY = 'clear'

/**
 * What can be done to many books or series at once: publish, unpublish, move to a category,
 * give to another author, or delete. `noun` names one row ("কিতাব", "সিরিজ") in the confirmations.
 */
export function PublishableBulkActions({
  path,
  ids,
  clear,
  noun,
  authorNoun = 'লেখক',
  deleteNote,
}: {
  path: string
  ids: number[]
  clear: () => void
  noun: string
  authorNoun?: string
  deleteNote?: string
}) {
  const authors = useAuthorOptions()
  const categories = useCategoryOptions()
  const count = `${bnNum(ids.length)}টি ${noun}`

  const run = useAdminMutation((body: Action) => api<{ affected: number }>(path, { method: 'POST', body: { ids, ...body } }), {
    invalidate: [['admin']],
    onSuccess: ({ affected }) => {
      toast.success(`${bnNum(affected)}টি ${noun} হালনাগাদ হয়েছে`)
      clear()
    },
  })

  const confirmThen = (title: string, body: Action) => confirmAction({ title, confirmLabel: 'হ্যাঁ' }).then((ok) => ok && run.mutate(body))

  return (
    <>
      <Button size="sm" variant="outline" disabled={run.isPending} onClick={() => run.mutate({ action: 'publish' })}>
        <Eye /> প্রকাশ করুন
      </Button>
      <Button size="sm" variant="outline" disabled={run.isPending} onClick={() => run.mutate({ action: 'unpublish' })}>
        <EyeOff /> খসড়া করুন
      </Button>
      <Combobox
        className="w-full sm:w-40"
        value=""
        placeholder="বিষয় বদলান"
        options={[{ value: NO_CATEGORY, label: 'বিষয় ছাড়া' }, ...categories.map((c) => ({ value: String(c.id), label: c.name_bn }))]}
        onChange={(v) => {
          const category = categories.find((c) => String(c.id) === v)
          confirmThen(`${count} ${category ? `"${category.name_bn}" বিষয়ে` : 'বিষয় ছাড়া'} রাখবেন?`, { action: 'category', category_id: category ? category.id : null })
        }}
      />
      <Combobox
        className="w-full sm:w-40"
        value=""
        placeholder={`${authorNoun} বদলান`}
        options={authors.map((a) => ({ value: String(a.id), label: a.name_bn }))}
        onChange={(v) => {
          const author = authors.find((a) => String(a.id) === v)
          if (author) confirmThen(`${count} ${author.name_bn}-এর নামে করবেন?`, { action: 'author', author_id: author.id })
        }}
      />
      <Button
        size="sm"
        variant="destructive"
        disabled={run.isPending}
        onClick={() =>
          confirmAction({ title: `${count} মুছে ফেলবেন?`, description: deleteNote ?? 'এটি আর ফেরানো যাবে না।', confirmLabel: 'মুছে ফেলুন', destructive: true }).then(
            (ok) => ok && run.mutate({ action: 'delete' }),
          )
        }
      >
        <Trash2 /> মুছুন
      </Button>
    </>
  )
}
