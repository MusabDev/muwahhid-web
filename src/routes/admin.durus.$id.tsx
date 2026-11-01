import { useQuery, type QueryKey } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, ExternalLink, FileUp, Plus, Save, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { DarsForm } from '@/components/admin/entity-forms'
import { AdminPageHeader, confirmDelete, Field, Panel, useAdminMutation } from '@/components/admin/form'
import { CenterSpinner } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { downloadJson, SERIES_STARTER } from '@/lib/admin/templates'
import { darsLink } from '@/lib/links'
import { api } from '@/lib/api'
import { bnNum, formatTime, parseTime } from '@/lib/text'
import type { Dars, DarsSeries, Segment } from '@/lib/types'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/admin/durus/$id')({
  component: AdminDars,
})

function AdminDars() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const queryKey: QueryKey = ['admin', 'dars', id]
  const { data: dars } = useQuery({ queryKey, queryFn: () => api<Dars>(`/admin/durus/${id}`) })
  const { data: series } = useQuery({
    queryKey: ['admin', 'series', String(dars?.series_id)],
    queryFn: () => api<DarsSeries>(`/admin/dars-series/${dars!.series_id}`),
    enabled: !!dars,
  })
  const invalidate: QueryKey[] = [queryKey, ['dars']]

  const save = useAdminMutation((values: Record<string, unknown>) => api(`/admin/durus/${id}`, { method: 'PUT', body: values }), { success: 'সংরক্ষিত হয়েছে', invalidate: [...invalidate, ['admin', 'series']] })
  const destroy = useAdminMutation(() => api(`/admin/durus/${id}`, { method: 'DELETE' }), {
    success: 'দারস মুছে ফেলা হয়েছে',
    invalidate: [['admin']],
    onSuccess: () => dars && navigate({ to: '/admin/series/$id', params: { id: String(dars.series_id) } }),
  })
  const addSegment = useAdminMutation((start: number) => api(`/admin/durus/${id}/segments`, { method: 'POST', body: { start_time: start, text_ar: '', text_bn: '' } }), { invalidate })

  if (!dars) return <CenterSpinner />
  const segments = dars.segments ?? []
  const lastStart = segments.length ? segments[segments.length - 1].start_time + 5 : 0
  const siblings = [...(series?.durus ?? [])].sort((a, b) => a.number - b.number)
  const index = siblings.findIndex((d) => d.id === dars.id)
  const prev = index > 0 ? siblings[index - 1] : null
  const next = index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null

  return (
    <>
      <AdminPageHeader
        crumbs={[
          { label: 'দারস সিরিজ', to: '/admin/series' },
          { label: dars.series?.title_bn ?? 'সিরিজ', to: '/admin/series/$id', params: { id: String(dars.series_id) } },
        ]}
        title={`দারস ${bnNum(dars.number)}: ${dars.title_bn}`}
        action={
          <>
            <Button variant="outline" size="icon" disabled={!prev} asChild={!!prev} aria-label="আগের দারস">
              {prev ? (
                <Link to="/admin/durus/$id" params={{ id: String(prev.id) }}>
                  <ChevronLeft className="rtl:rotate-180" />
                </Link>
              ) : (
                <ChevronLeft className="rtl:rotate-180" />
              )}
            </Button>
            <Button variant="outline" size="icon" disabled={!next} asChild={!!next} aria-label="পরের দারস">
              {next ? (
                <Link to="/admin/durus/$id" params={{ id: String(next.id) }}>
                  <ChevronRight className="rtl:rotate-180" />
                </Link>
              ) : (
                <ChevronRight className="rtl:rotate-180" />
              )}
            </Button>
            <Button variant="outline" asChild>
              <Link {...darsLink(dars)} search={{}} target="_blank">
                <ExternalLink /> সাইটে দেখুন
              </Link>
            </Button>
            <Button variant="destructive" size="icon" onClick={() => confirmDelete('দারসটি').then((ok) => ok && destroy.mutate(undefined))} aria-label="মুছুন">
              <Trash2 />
            </Button>
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="দারসের তথ্য">
          <DarsForm key={`${dars.id}:${dars.updated_at}`} initial={dars} submitting={save.isPending} onSubmit={(v) => save.mutate(v)} />
        </Panel>
        <TranscriptImport darsId={dars.id} invalidate={invalidate} hasSegments={segments.length > 0} />
      </div>

      <Panel
        className="mt-6"
        title={`ট্রান্সক্রিপ্ট (${bnNum(segments.length)} লাইন)`}
        action={
          <Button size="sm" variant="outline" onClick={() => addSegment.mutate(lastStart)}>
            <Plus /> লাইন যোগ
          </Button>
        }
      >
        <div className="space-y-2">
          {segments.map((seg) => (
            <SegmentRow key={`${seg.id}:${seg.position}`} segment={seg} invalidate={invalidate} />
          ))}
          {!segments.length && <p className="text-sm text-muted-foreground">এখনো কোনো লাইন নেই। ফাইল ইমপোর্ট করুন বা লাইন যোগ করুন।</p>}
        </div>
      </Panel>
    </>
  )
}

function SegmentRow({ segment, invalidate }: { segment: Segment; invalidate: QueryKey[] }) {
  const [start, setStart] = useState(formatTime(segment.start_time))
  const [end, setEnd] = useState(segment.end_time != null ? formatTime(segment.end_time) : '')
  const [ar, setAr] = useState(segment.text_ar)
  const [bn, setBn] = useState(segment.text_bn)
  const dirty = start !== formatTime(segment.start_time) || end !== (segment.end_time != null ? formatTime(segment.end_time) : '') || ar !== segment.text_ar || bn !== segment.text_bn

  const save = useAdminMutation(
    () => {
      const startTime = parseTime(start)
      if (startTime == null) throw new Error('শুরুর সময় ঠিক নেই (যেমন 1:05)')
      return api(`/admin/segments/${segment.id}`, { method: 'PUT', body: { start_time: startTime, end_time: parseTime(end), text_ar: ar, text_bn: bn } })
    },
    { success: 'সংরক্ষিত', invalidate },
  )
  const remove = useAdminMutation(() => api(`/admin/segments/${segment.id}`, { method: 'DELETE' }), { invalidate })

  return (
    <div className={cn('grid gap-2 rounded-lg border bg-background p-2 md:grid-cols-[150px_1fr_1fr_auto]', dirty && 'border-gold')}>
      <div className="flex gap-1 md:flex-col">
        <Input value={start} onChange={(e) => setStart(e.target.value)} className="h-8 font-mono text-xs" aria-label="শুরু" />
        <Input value={end} onChange={(e) => setEnd(e.target.value)} placeholder="শেষ" className="h-8 font-mono text-xs" aria-label="শেষ" />
      </div>
      <Textarea dir="rtl" value={ar} onChange={(e) => setAr(e.target.value)} className="min-h-16 font-arabic text-lg" placeholder="العربية" />
      <Textarea value={bn} onChange={(e) => setBn(e.target.value)} className="min-h-16" placeholder="বাংলা" />
      <div className="flex gap-1 md:flex-col">
        <Button size="icon-sm" disabled={!dirty || save.isPending} onClick={() => save.mutate(undefined)} aria-label="সংরক্ষণ">
          <Save />
        </Button>
        <Button size="icon-sm" variant="ghost" onClick={() => confirmDelete('লাইনটি').then((ok) => ok && remove.mutate(undefined))} aria-label="মুছুন">
          <Trash2 />
        </Button>
      </div>
    </div>
  )
}

function TranscriptImport({ darsId, invalidate, hasSegments }: { darsId: number; invalidate: QueryKey[]; hasSegments: boolean }) {
  const [file, setFile] = useState<File | null>(null)
  const [lang, setLang] = useState('ar')
  const [merge, setMerge] = useState(false)
  const isSrt = file?.name.toLowerCase().endsWith('.srt')

  const run = useAdminMutation(
    () => {
      const form = new FormData()
      form.append('file', file!)
      if (isSrt) {
        form.append('lang', lang)
        form.append('merge', merge ? '1' : '0')
      }
      return api<{ imported: number }>(`/admin/durus/${darsId}/import`, { method: 'POST', body: form })
    },
    { invalidate, onSuccess: ({ imported }) => toast.success(`${bnNum(imported)}টি লাইন ইমপোর্ট হয়েছে`) },
  )

  const replacing = hasSegments && !(isSrt && merge)

  return (
    <Panel title="ট্রান্সক্রিপ্ট ইমপোর্ট">
      <div className="space-y-4">
        <Field
          label="ফাইল"
          hint={
            <>
              JSON <code dir="ltr">[{'{'}start, end, ar, bn{'}'}]</code>, CSV (start,end,ar,bn) অথবা SRT।{' '}
              <button type="button" className="underline underline-offset-2" onClick={() => downloadJson('muwahhid-transcript-starter.json', SERIES_STARTER.durus[0].segments)}>
                নমুনা JSON
              </button>
            </>
          }
        >
          <Input type="file" accept=".json,.csv,.srt" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </Field>
        {isSrt && (
          <div className="space-y-3 rounded-lg bg-muted/50 p-3">
            <Field label="SRT ফাইলের ভাষা">
              <Select value={lang} onValueChange={setLang}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">আরবি</SelectItem>
                  <SelectItem value="bn">বাংলা</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <label className="flex items-start gap-3 text-sm">
              <Switch checked={merge} onCheckedChange={setMerge} className="mt-0.5" />
              <span>
                বিদ্যমান লাইনের সাথে মিলিয়ে দিন
                <span className="block text-xs text-muted-foreground">আগে আরবি SRT, তারপর এটি চালু করে বাংলা SRT দিন</span>
              </span>
            </label>
          </div>
        )}
        {replacing && file && <p className="text-xs text-destructive">বর্তমান লাইনগুলো (ও সেগুলোর হাইলাইট) মুছে নতুন করে বসানো হবে।</p>}
        <Button disabled={!file || run.isPending} onClick={() => run.mutate(undefined)}>
          <FileUp /> ইমপোর্ট
        </Button>
      </div>
    </Panel>
  )
}
