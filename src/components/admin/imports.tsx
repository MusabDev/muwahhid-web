import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { BOOK_GUIDE, FormatGuide, JsonImportDialog, SERIES_GUIDE } from '@/components/admin/json-import'
import { Switch } from '@/components/ui/switch'
import { BOOK_FORMAT, BOOK_STARTER, SERIES_FORMAT, SERIES_STARTER } from '@/lib/admin/templates'
import type { Book, DarsSeries } from '@/lib/types'

type DialogProps = { open: boolean; onOpenChange: (open: boolean) => void }

/** Import a book file: creates a new book, or (with `book`) adds content to that book. */
export function BookImportDialog({ open, onOpenChange, book }: DialogProps & { book?: Book }) {
  const navigate = useNavigate()
  const [replace, setReplace] = useState(false)

  if (book) {
    return (
      <JsonImportDialog
        open={open}
        onOpenChange={onOpenChange}
        title="কনটেন্ট ইমপোর্ট"
        description={`“${book.title_bn}” কিতাবে পৃষ্ঠা, বাক্য, টীকা ও সূচিপত্র যোগ করুন। পূর্ণ কিতাবের JSON দিলে তার "book" অংশটি উপেক্ষা করা হবে। CSV ফাইলও চলবে।`}
        endpoint={`/admin/books/${book.id}/import`}
        format={BOOK_FORMAT}
        starter={BOOK_STARTER}
        starterName="muwahhid-book-starter.json"
        accept=".json,.csv"
        formFields={{ replace: replace ? '1' : '0' }}
        invalidate={[['admin'], ['book']]}
        guide={<FormatGuide rows={BOOK_GUIDE} />}
        options={
          <label className="flex items-start gap-3 rounded-lg border p-3 text-sm">
            <Switch checked={replace} onCheckedChange={setReplace} className="mt-0.5" />
            <span>
              পুরনো কনটেন্ট মুছে নতুন করে বসান
              <span className="block text-xs text-muted-foreground">বন্ধ থাকলে একই নম্বরের পৃষ্ঠায় বাক্যগুলো শেষে যোগ হবে।</span>
              {replace && <span className="block text-xs text-destructive">সতর্কতা: পাঠকদের এই কিতাবের হাইলাইট ও নোটও মুছে যাবে</span>}
            </span>
          </label>
        }
      />
    )
  }

  return (
    <JsonImportDialog
      open={open}
      onOpenChange={onOpenChange}
      title="JSON থেকে নতুন কিতাব"
      description="একটি ফাইলেই কিতাবের তথ্য, লেখক, বিষয়, পৃষ্ঠা, টীকা ও সূচিপত্র। লেখক বা বিষয় না থাকলে নিজে থেকে তৈরি হবে।"
      endpoint="/admin/books/import"
      format={BOOK_FORMAT}
      starter={BOOK_STARTER}
      starterName="muwahhid-book-starter.json"
      invalidate={[['admin'], ['book'], ['authors'], ['categories']]}
      guide={<FormatGuide rows={BOOK_GUIDE} />}
      onImported={(result) => {
        const created = result.book as Book | undefined
        if (created) navigate({ to: '/admin/books/$id', params: { id: String(created.id) } })
      }}
    />
  )
}

/** Import a series file: creates a new series, or (with `series`) adds/updates its durus. */
export function SeriesImportDialog({ open, onOpenChange, series }: DialogProps & { series?: DarsSeries }) {
  const navigate = useNavigate()

  if (series) {
    return (
      <JsonImportDialog
        open={open}
        onOpenChange={onOpenChange}
        title="একসাথে অনেক দারস"
        description={`“${series.title_bn}” সিরিজে দারস যোগ করুন। একই নম্বরের দারস থাকলে সেটি হালনাগাদ হবে; ফাইলের "series" অংশটি উপেক্ষা করা হবে।`}
        endpoint={`/admin/dars-series/${series.id}/import`}
        format={SERIES_FORMAT}
        starter={SERIES_STARTER}
        starterName="muwahhid-series-starter.json"
        invalidate={[['admin'], ['dars-series'], ['dars']]}
        guide={<FormatGuide rows={SERIES_GUIDE} />}
      />
    )
  }

  return (
    <JsonImportDialog
      open={open}
      onOpenChange={onOpenChange}
      title="JSON থেকে নতুন দারস সিরিজ"
      description="একটি ফাইলেই সিরিজের তথ্য, শাইখ, সব দারস ও তাদের ট্রান্সক্রিপ্ট। শাইখ বা বিষয় না থাকলে নিজে থেকে তৈরি হবে।"
      endpoint="/admin/dars-series/import"
      format={SERIES_FORMAT}
      starter={SERIES_STARTER}
      starterName="muwahhid-series-starter.json"
      invalidate={[['admin'], ['dars-series'], ['authors'], ['categories']]}
      guide={<FormatGuide rows={SERIES_GUIDE} />}
      onImported={(result) => {
        const created = result.series as DarsSeries | undefined
        if (created) navigate({ to: '/admin/series/$id', params: { id: String(created.id) } })
      }}
    />
  )
}
