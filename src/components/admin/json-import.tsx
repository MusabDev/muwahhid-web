import { useQueryClient, type QueryKey } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, Download, FileJson, FileUp, Loader2, UserPlus } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { downloadJson } from '@/lib/admin/templates'
import { api, ApiError, firstError } from '@/lib/api'
import { bnNum } from '@/lib/text'
import { cn } from '@/lib/utils'

const COUNT_LABELS: Record<string, string> = {
  pages: 'পৃষ্ঠা',
  sentences: 'বাক্য',
  footnotes: 'টীকা',
  toc_entries: 'সূচি',
  durus: 'দারস',
  segments: 'ট্রান্সক্রিপ্ট লাইন',
}

export type ImportResult = {
  imported: Record<string, number> | null
  will_create?: { authors: string[]; categories: string[] }
  updated?: number
  existing_pages?: number
  [key: string]: unknown
}

type Issue = { path: string; message: string }

function issuesOf(error: unknown): Issue[] {
  if (error instanceof ApiError && Object.keys(error.errors).length) {
    return Object.entries(error.errors).flatMap(([path, messages]) => messages.map((message) => ({ path, message })))
  }
  return [{ path: '', message: firstError(error) }]
}

/**
 * Import flow shared by every JSON import: pick a file, check it in the browser, ask the
 * server for a dry run (counts + what will be created), then import for real.
 */
export function JsonImportDialog({
  open,
  onOpenChange,
  title,
  description,
  endpoint,
  format,
  starter,
  starterName,
  accept = '.json',
  options,
  formFields,
  guide,
  invalidate = [['admin']],
  onImported,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  endpoint: string
  format: string
  starter: unknown
  starterName: string
  accept?: string
  /** Extra controls (e.g. a "replace" switch) shown above the import button. */
  options?: ReactNode
  /** Extra form fields sent with the request. */
  formFields?: Record<string, string>
  guide?: ReactNode
  invalidate?: QueryKey[]
  onImported?: (result: ImportResult) => void
}) {
  const queryClient = useQueryClient()
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState<ImportResult | null>(null)
  const [issues, setIssues] = useState<Issue[]>([])
  const [busy, setBusy] = useState<'check' | 'import' | null>(null)

  const reset = () => {
    setFile(null)
    setPreview(null)
    setIssues([])
    setBusy(null)
  }

  const send = (picked: File, dryRun: boolean) => {
    const form = new FormData()
    form.append('file', picked)
    form.append('dry_run', dryRun ? '1' : '0')
    Object.entries(formFields ?? {}).forEach(([key, value]) => form.append(key, value))
    return api<ImportResult>(endpoint, { method: 'POST', body: form })
  }

  const check = async (picked: File) => {
    setFile(picked)
    setPreview(null)
    setIssues([])

    if (picked.name.toLowerCase().endsWith('.json')) {
      try {
        const data = JSON.parse(await picked.text())
        if (data?.format && data.format !== format) {
          setIssues([{ path: 'format', message: `এটা “${data.format}” ফাইল, এখানে “${format}” ফাইল লাগবে।` }])
          return
        }
      } catch (error) {
        setIssues([{ path: '', message: `JSON ঠিক নেই: ${error instanceof Error ? error.message : ''}` }])
        return
      }
    }

    setBusy('check')
    try {
      setPreview(await send(picked, true))
    } catch (error) {
      setIssues(issuesOf(error))
    } finally {
      setBusy(null)
    }
  }

  const run = async () => {
    if (!file) return
    setBusy('import')
    try {
      const result = await send(file, false)
      invalidate.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }))
      const counts = result.imported ? Object.entries(result.imported).map(([key, n]) => `${bnNum(n)} ${COUNT_LABELS[key] ?? key}`) : []
      toast.success(counts.length ? `ইমপোর্ট সম্পন্ন: ${counts.join(', ')}` : 'ইমপোর্ট সম্পন্ন')
      onOpenChange(false)
      reset()
      onImported?.(result)
    } catch (error) {
      setIssues(issuesOf(error))
      setBusy(null)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) reset()
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gold/30 bg-gold/5 px-3 py-2 text-sm">
          <span className="text-muted-foreground">নমুনা ফাইল নামিয়ে সেটি পূরণ করুন, তারপর এখানে দিন।</span>
          <Button type="button" size="sm" variant="outline" onClick={() => downloadJson(starterName, starter)}>
            <Download /> নমুনা JSON
          </Button>
        </div>

        <input
          ref={input}
          type="file"
          accept={accept}
          hidden
          onChange={(e) => {
            const picked = e.target.files?.[0]
            e.target.value = ''
            if (picked) check(picked)
          }}
        />
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(e) => (e.preventDefault(), setDragging(true))}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            const picked = e.dataTransfer.files[0]
            if (picked) check(picked)
          }}
          className={cn(
            'flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition hover:border-gold/70 hover:bg-muted/40',
            dragging && 'border-gold bg-gold/5',
          )}
        >
          <FileJson className="size-8 text-gold" />
          {file ? (
            <span className="font-medium">{file.name}</span>
          ) : (
            <span className="text-sm text-muted-foreground">
              ফাইল এখানে টেনে আনুন অথবা <span className="font-medium text-foreground underline underline-offset-4">বেছে নিন</span> ({accept})
            </span>
          )}
        </button>

        {busy === 'check' && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> ফাইল যাচাই হচ্ছে…
          </p>
        )}

        {issues.length > 0 && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
            <p className="mb-2 flex items-center gap-2 font-semibold text-destructive">
              <AlertTriangle className="size-4" /> ফাইলে সমস্যা আছে
            </p>
            <ul className="max-h-48 space-y-1 overflow-y-auto">
              {issues.slice(0, 30).map((issue, i) => (
                <li key={i} className="text-xs">
                  {issue.path && issue.path !== 'file' && (
                    <code className="me-2 rounded bg-muted px-1 py-0.5" dir="ltr">
                      {issue.path}
                    </code>
                  )}
                  {issue.message}
                </li>
              ))}
              {issues.length > 30 && <li className="text-xs text-muted-foreground">আরও {bnNum(issues.length - 30)}টি…</li>}
            </ul>
          </div>
        )}

        {preview && <ImportPreview result={preview} />}

        {options}

        {guide && (
          <details className="rounded-lg border text-sm">
            <summary className="cursor-pointer px-3 py-2 font-medium">ফরম্যাট নির্দেশিকা</summary>
            <div className="border-t p-3">{guide}</div>
          </details>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            বাতিল
          </Button>
          <Button disabled={!preview || busy !== null} onClick={run}>
            {busy === 'import' ? <Loader2 className="animate-spin" /> : <FileUp />} ইমপোর্ট করুন
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ImportPreview({ result }: { result: ImportResult }) {
  const created = [...(result.will_create?.authors ?? []).map((name) => `লেখক: ${name}`), ...(result.will_create?.categories ?? []).map((name) => `বিষয়: ${name}`)]

  return (
    <div className="space-y-3 rounded-lg border border-emerald-600/30 bg-emerald-600/5 p-3 text-sm">
      <p className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="size-4" /> ফাইল ঠিক আছে
      </p>
      {result.imported ? (
        <div className="flex flex-wrap gap-2">
          {Object.entries(result.imported).map(([key, n]) => (
            <span key={key} className="rounded-md border bg-background px-2.5 py-1">
              <span className="font-semibold">{bnNum(n)}</span> {COUNT_LABELS[key] ?? key}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">CSV ফাইল: ইমপোর্টের পরে সংখ্যা দেখানো হবে।</p>
      )}
      {created.length > 0 && (
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-xs font-medium">
            <UserPlus className="size-3.5" /> নতুন তৈরি হবে:
          </p>
          <ul className="list-inside list-disc text-xs text-muted-foreground">
            {created.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}
      {!!result.updated && <p className="text-xs text-gold">একই নম্বরের {bnNum(result.updated)}টি দারস হালনাগাদ হবে (ট্রান্সক্রিপ্ট দিলে পুরনোটা বদলে যাবে)।</p>}
      {!!result.existing_pages && <p className="text-xs text-muted-foreground">কিতাবে এখন {bnNum(result.existing_pages)}টি পৃষ্ঠা আছে।</p>}
    </div>
  )
}

/** Short field reference shown inside the import dialog. */
export function FormatGuide({ rows }: { rows: [string, string][] }) {
  return (
    <table className="w-full text-xs">
      <tbody className="divide-y">
        {rows.map(([field, text]) => (
          <tr key={field}>
            <td className="py-1.5 pe-3 align-top">
              <code dir="ltr" className="whitespace-nowrap">
                {field}
              </code>
            </td>
            <td className="py-1.5 text-muted-foreground">{text}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export const BOOK_GUIDE: [string, string][] = [
  ['book.title_ar / title_bn / title_translit', 'শিরোনাম (আবশ্যক); slug না দিলে title_translit থেকে তৈরি হবে'],
  ['book.author', 'বিদ্যমান লেখকের slug (যেমন "ibn-taymiyyah"), অথবা নতুন লেখক: {name_ar, name_bn, name_translit, death_year_ah}'],
  ['book.explainer', 'শারহ হলে ব্যাখ্যাকার (author এর মতো); না হলে null'],
  ['book.category', 'বিষয়ের slug, অথবা {name_bn, name_ar}; না থাকলে null'],
  ['pages[].number', 'পৃষ্ঠা নম্বর'],
  ['pages[].sentences[]', '{ar, bn, block_type, paragraph_break} — block_type: paragraph, heading, quote, list_item, poetry'],
  ['pages[].footnotes', '{ar: [{marker, text}], bn: [...]} — বাক্যে [^1] দিয়ে উল্লেখ'],
  ['toc[]', '{title_ar, title_bn, page, children: [...]}'],
]

export const SERIES_GUIDE: [string, string][] = [
  ['series.title_ar / title_bn / title_translit', 'কিতাবের নাম (আবশ্যক); slug না দিলে title_translit থেকে'],
  ['series.author', 'শাইখের slug, অথবা নতুন: {name_ar, name_bn, name_translit}'],
  ['series.category', 'বিষয়ের slug বা {name_bn}; series.book: সংশ্লিষ্ট কিতাবের slug বা null'],
  ['durus[].number', 'দারস নম্বর — একই নম্বর আগে থাকলে সেটি হালনাগাদ হবে'],
  ['durus[].media_type / media_url', '"video" বা "audio"; YouTube বা mp3/mp4 লিংক'],
  ['durus[].segments[]', '{start, end, ar, bn} — সময় "01:05.5" অথবা সেকেন্ডে'],
]
