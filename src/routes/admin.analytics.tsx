import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { ArrowDown, ArrowUp, BarChart3, Clock, Eye, Layers, MousePointerClick, Repeat, Users, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { AdminPageHeader, Panel } from '@/components/admin/form'
import { CenterSpinner, EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { api } from '@/lib/api'
import { bnNum } from '@/lib/text'
import { cn } from '@/lib/utils'

const RANGES = [
  { value: 'today', label: 'আজ' },
  { value: 'yesterday', label: 'গতকাল' },
  { value: '7d', label: '৭ দিন' },
  { value: '30d', label: '৩০ দিন' },
  { value: '90d', label: '৯০ দিন' },
  { value: '12m', label: '১২ মাস' },
] as const

type Range = (typeof RANGES)[number]['value']

export const Route = createFileRoute('/admin/analytics')({
  validateSearch: (search: Record<string, unknown>): { range?: Range; path?: string } => ({
    range: RANGES.some((r) => r.value === search.range) ? (search.range as Range) : undefined,
    path: typeof search.path === 'string' && search.path ? search.path : undefined,
  }),
  component: Analytics,
})

interface Row {
  label: string | null
  views: number
  visitors: number
}

interface PageRow extends Row {
  label: string
  title: string | null
  avg_duration: number | null
}

interface Summary {
  visitors: number
  pageviews: number
  visits: number
  bounce_rate: number
  pages_per_visit: number
  avg_duration: number
}

interface Report {
  interval: 'hour' | 'day' | 'month'
  summary: Summary
  previous: Summary
  timeseries: { date: string; pageviews: number; visitors: number }[]
  pages: PageRow[]
  routes: Row[]
  entry_pages: Row[]
  exit_pages: Row[]
  referrers: Row[]
  utm_sources: Row[]
  utm_campaigns: Row[]
  countries: Row[]
  languages: Row[]
  devices: Row[]
  browsers: Row[]
  os: Row[]
  screens: Row[]
  auth: Row[]
}

interface Realtime {
  visitors: number
  pages: { label: string; title: string | null; visitors: number }[]
}

const TZ = 'Asia/Dhaka'

const chartConfig = {
  visitors: { label: 'ভিজিটর', color: 'var(--chart-visitors)' },
  pageviews: { label: 'পেজভিউ', color: 'var(--chart-pageviews)' },
} satisfies ChartConfig

const DEVICES: Record<string, string> = {
  desktop: 'ডেস্কটপ',
  smartphone: 'মোবাইল',
  tablet: 'ট্যাবলেট',
  phablet: 'ফ্যাবলেট',
  'feature phone': 'ফিচার ফোন',
  tv: 'টিভি',
  console: 'গেম কনসোল',
  'smart display': 'স্মার্ট ডিসপ্লে',
  unknown: 'অজানা',
}

const SCREENS: Record<string, string> = { mobile: 'মোবাইল (<৫৭৬)', tablet: 'ট্যাবলেট (<৯৯২)', laptop: 'ল্যাপটপ (<১৪৪০)', desktop: 'বড় স্ক্রিন' }

const regionNames = new Intl.DisplayNames(['bn'], { type: 'region' })
const languageNames = new Intl.DisplayNames(['bn'], { type: 'language' })

function displayName(names: Intl.DisplayNames, code: string) {
  try {
    return names.of(code) ?? code
  } catch {
    return code
  }
}

function flag(code: string) {
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)))
}

function formatDuration(seconds: number | null) {
  if (seconds == null) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return bnNum(m ? `${m}মি ${s}সে` : `${s}সে`)
}

function formatBucket(date: string, interval: Report['interval'], long = false) {
  const options: Intl.DateTimeFormatOptions =
    interval === 'hour'
      ? long
        ? { day: 'numeric', month: 'short', hour: 'numeric' }
        : { hour: 'numeric' }
      : interval === 'month'
        ? { month: 'short', year: 'numeric' }
        : { day: 'numeric', month: 'short' }
  return new Intl.DateTimeFormat('bn-BD', { ...options, timeZone: TZ }).format(new Date(date))
}

function Analytics() {
  const { range = '7d', path } = Route.useSearch()
  const navigate = Route.useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'analytics', range, path],
    queryFn: () => api<Report>('/admin/analytics', { query: { range, path } }),
    placeholderData: keepPreviousData,
  })

  const setPath = (next?: string) => navigate({ search: (prev) => ({ ...prev, path: next }) })

  return (
    <>
      <AdminPageHeader
        title="পরিসংখ্যান"
        description="কুকি ছাড়া গোনা হয়; ভিজিটর প্রতিদিন নতুন করে গোনা হয়, তাই কয়েক দিনের হিসাবে একই মানুষ একাধিকবার আসতে পারে।"
        action={
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={range}
            onValueChange={(value) => value && navigate({ search: (prev) => ({ ...prev, range: value as Range }) })}
            className="flex-wrap"
          >
            {RANGES.map((r) => (
              <ToggleGroupItem key={r.value} value={r.value} className="px-3">
                {r.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        }
      />

      {path && (
        <div className="mb-4 flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">শুধু এই পাতা:</span>
          <span className="rounded-md border bg-card px-2 py-1 font-mono text-xs" dir="ltr">
            {path}
          </span>
          <Button variant="ghost" size="icon" className="size-7" onClick={() => setPath(undefined)} aria-label="ফিল্টার সরান">
            <X />
          </Button>
        </div>
      )}

      {isLoading || !data ? (
        <CenterSpinner />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <RealtimeTile />
            <Kpi icon={Users} label="ভিজিটর" value={data.summary.visitors} previous={data.previous.visitors} />
            <Kpi icon={Eye} label="পেজভিউ" value={data.summary.pageviews} previous={data.previous.pageviews} />
            <Kpi icon={Repeat} label="ভিজিট" value={data.summary.visits} previous={data.previous.visits} />
            <Kpi icon={MousePointerClick} label="বাউন্স রেট" value={data.summary.bounce_rate} previous={data.previous.bounce_rate} format={(v) => `${bnNum(v)}%`} lowerIsBetter />
            <Kpi icon={Layers} label="প্রতি ভিজিটে পাতা" value={data.summary.pages_per_visit} previous={data.previous.pages_per_visit} format={(v) => bnNum(v.toFixed(1))} />
            <Kpi icon={Clock} label="পাতায় গড় সময়" value={data.summary.avg_duration} previous={data.previous.avg_duration} format={formatDuration} />
          </div>

          <Panel title="সময়ের সাথে">
            <TrafficChart data={data} />
          </Panel>

          {data.summary.pageviews === 0 ? (
            <EmptyState icon={BarChart3} title="এই সময়ে কোনো ভিজিট নেই" />
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <TabbedPanel
                tabs={[
                  { key: 'pages', label: 'শীর্ষ পাতা', content: <PageList rows={data.pages} onSelect={setPath} /> },
                  { key: 'routes', label: 'পাতার ধরন', content: <BarList rows={data.routes} mono /> },
                  { key: 'entry', label: 'প্রবেশ', content: <BarList rows={data.entry_pages} mono onSelect={setPath} /> },
                  { key: 'exit', label: 'প্রস্থান', content: <BarList rows={data.exit_pages} mono onSelect={setPath} /> },
                ]}
              />
              <TabbedPanel
                tabs={[
                  { key: 'referrers', label: 'উৎস', content: <BarList rows={data.referrers} name={(l) => l ?? 'সরাসরি / অজানা'} /> },
                  { key: 'utm', label: 'UTM সোর্স', content: <BarList rows={data.utm_sources} /> },
                  { key: 'campaigns', label: 'ক্যাম্পেইন', content: <BarList rows={data.utm_campaigns} /> },
                ]}
              />
              <TabbedPanel
                tabs={[
                  {
                    key: 'countries',
                    label: 'দেশ',
                    content: <BarList rows={data.countries} name={(l) => (l ? `${flag(l)} ${displayName(regionNames, l)}` : 'অজানা')} />,
                  },
                  { key: 'languages', label: 'ভাষা', content: <BarList rows={data.languages} name={(l) => (l ? displayName(languageNames, l) : 'অজানা')} /> },
                ]}
              />
              <TabbedPanel
                tabs={[
                  { key: 'devices', label: 'ডিভাইস', content: <BarList rows={data.devices} name={(l) => (l ? (DEVICES[l] ?? l) : 'অজানা')} /> },
                  { key: 'browsers', label: 'ব্রাউজার', content: <BarList rows={data.browsers} /> },
                  { key: 'os', label: 'OS', content: <BarList rows={data.os} /> },
                  { key: 'screens', label: 'স্ক্রিন', content: <BarList rows={data.screens} name={(l) => (l ? (SCREENS[l] ?? l) : 'অজানা')} /> },
                  { key: 'auth', label: 'লগইন', content: <BarList rows={data.auth} name={(l) => (l === 'true' ? 'লগইন করা' : 'অতিথি')} /> },
                ]}
              />
            </div>
          )}
        </div>
      )}
    </>
  )
}

function RealtimeTile() {
  const { data } = useQuery({
    queryKey: ['admin', 'analytics', 'realtime'],
    queryFn: () => api<Realtime>('/admin/analytics/realtime'),
    refetchInterval: 30_000,
  })

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
          <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
        </span>
        এখন সাইটে (৫ মিনিট)
      </div>
      <div className="mt-3 text-3xl font-bold">{data ? bnNum(data.visitors) : '—'}</div>
      {data?.pages.length ? (
        <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
          {data.pages.slice(0, 3).map((p) => (
            <li key={p.label} className="truncate" title={p.label}>
              {bnNum(p.visitors)} · {p.title ?? p.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function Kpi({
  icon: Icon,
  label,
  value,
  previous,
  format = (v) => bnNum(v),
  lowerIsBetter = false,
}: {
  icon: typeof Users
  label: string
  value: number
  previous: number
  format?: (value: number) => string
  lowerIsBetter?: boolean
}) {
  const change = previous ? ((value - previous) / previous) * 100 : null
  const up = change !== null && change > 0
  const good = change !== null && change !== 0 && up !== lowerIsBetter

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <Icon className="size-5 text-gold" />
      <div className="mt-3 text-3xl font-bold">{format(value)}</div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        {label}
        {change !== null && Math.round(change) !== 0 && (
          <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium', good ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400')} title={`আগের সময়ে: ${format(previous)}`}>
            {up ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
            {bnNum(Math.abs(Math.round(change)))}%
          </span>
        )}
      </div>
    </div>
  )
}

function TrafficChart({ data }: { data: Report }) {
  const [showTable, setShowTable] = useState(false)

  return (
    <>
      <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
        <LineChart data={data.timeseries} margin={{ left: 4, right: 12, top: 8 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} tickFormatter={(d: string) => formatBucket(d, data.interval)} />
          <YAxis tickLine={false} axisLine={false} width={40} allowDecimals={false} tickFormatter={(v: number) => bnNum(v)} />
          <ChartTooltip
            cursor={{ strokeWidth: 1 }}
            content={<ChartTooltipContent indicator="line" labelFormatter={(_, payload) => (payload?.[0] ? formatBucket(payload[0].payload.date, data.interval, true) : '')} />}
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Line dataKey="pageviews" type="monotone" stroke="var(--color-pageviews)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          <Line dataKey="visitors" type="monotone" stroke="var(--color-visitors)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ChartContainer>
      <button type="button" className="mt-2 text-xs text-muted-foreground underline-offset-2 hover:underline" onClick={() => setShowTable((v) => !v)}>
        {showTable ? 'টেবিল লুকান' : 'টেবিলে দেখুন'}
      </button>
      {showTable && (
        <div className="mt-3 max-h-80 overflow-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">সময়</th>
                <th className="px-3 py-2 text-right font-medium">ভিজিটর</th>
                <th className="px-3 py-2 text-right font-medium">পেজভিউ</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.timeseries.map((row) => (
                <tr key={row.date}>
                  <td className="px-3 py-1.5">{formatBucket(row.date, data.interval, true)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{bnNum(row.visitors)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{bnNum(row.pageviews)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

function TabbedPanel({ tabs }: { tabs: { key: string; label: string; content: ReactNode }[] }) {
  return (
    <Panel>
      <Tabs defaultValue={tabs[0].key}>
        <TabsList className="mb-3 h-auto flex-wrap">
          {tabs.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((t) => (
          <TabsContent key={t.key} value={t.key}>
            {t.content}
          </TabsContent>
        ))}
      </Tabs>
    </Panel>
  )
}

function ListHeader({ extra }: { extra?: string }) {
  return (
    <div className="flex justify-between gap-3 px-2 pb-1 text-xs text-muted-foreground">
      <span />
      <span className="flex gap-4">
        {extra && <span className="w-14 text-right">{extra}</span>}
        <span className="w-14 text-right">ভিজিটর</span>
        <span className="w-14 text-right">ভিউ</span>
      </span>
    </div>
  )
}

/** Rows with a bar behind each one, sized by visitors relative to the top row. */
function BarList({ rows, name = (l) => l ?? 'অজানা', mono = false, onSelect }: { rows: Row[]; name?: (label: string | null) => string; mono?: boolean; onSelect?: (label: string) => void }) {
  if (!rows.length) return <p className="py-8 text-center text-sm text-muted-foreground">কোনো তথ্য নেই</p>
  const max = Math.max(...rows.map((r) => r.visitors), 1)

  return (
    <>
      <ListHeader />
      <ul className="space-y-1">
        {rows.map((row) => (
          <BarRow key={row.label ?? '∅'} width={(row.visitors / max) * 100} onClick={onSelect && row.label ? () => onSelect(row.label!) : undefined}>
            <span className={cn('min-w-0 truncate', mono && 'font-mono text-xs')} dir={mono ? 'ltr' : undefined} title={row.label ?? undefined}>
              {name(row.label)}
            </span>
            <span className="flex shrink-0 gap-4 tabular-nums">
              <span className="w-14 text-right font-medium">{bnNum(row.visitors)}</span>
              <span className="w-14 text-right text-muted-foreground">{bnNum(row.views)}</span>
            </span>
          </BarRow>
        ))}
      </ul>
    </>
  )
}

function PageList({ rows, onSelect }: { rows: PageRow[]; onSelect: (path: string) => void }) {
  if (!rows.length) return <p className="py-8 text-center text-sm text-muted-foreground">কোনো তথ্য নেই</p>
  const max = Math.max(...rows.map((r) => r.views), 1)

  return (
    <>
      <ListHeader extra="গড় সময়" />
      <ul className="space-y-1">
        {rows.map((row) => (
          <BarRow key={row.label} width={(row.views / max) * 100} onClick={() => onSelect(row.label)}>
            <span className="min-w-0">
              <span className="block truncate">{row.title ?? row.label}</span>
              <span className="block truncate font-mono text-xs text-muted-foreground" dir="ltr">
                {row.label}
              </span>
            </span>
            <span className="flex shrink-0 gap-4 tabular-nums">
              <span className="w-14 text-right text-muted-foreground">{formatDuration(row.avg_duration)}</span>
              <span className="w-14 text-right">{bnNum(row.visitors)}</span>
              <span className="w-14 text-right font-medium">{bnNum(row.views)}</span>
            </span>
          </BarRow>
        ))}
      </ul>
    </>
  )
}

function BarRow({ width, onClick, children }: { width: number; onClick?: () => void; children: ReactNode }) {
  const inner = (
    <>
      <span className="absolute inset-y-0 left-0 rounded-md bg-gold/15" style={{ width: `${width}%` }} aria-hidden />
      <span className="relative flex items-center justify-between gap-3 text-sm">{children}</span>
    </>
  )

  return (
    <li>
      {onClick ? (
        <button type="button" onClick={onClick} className="relative block w-full rounded-md px-2 py-1.5 text-left transition hover:bg-muted" title="এই পাতার পরিসংখ্যান দেখুন">
          {inner}
        </button>
      ) : (
        <div className="relative rounded-md px-2 py-1.5">{inner}</div>
      )}
    </li>
  )
}
