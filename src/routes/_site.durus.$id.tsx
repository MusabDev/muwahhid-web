import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, Headphones, Link2, ListVideo, Subtitles } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { StarMark } from '@/components/brand'
import type { HighlightRange } from '@/components/markdown'
import { PlainHighlight } from '@/components/plain-highlight'
import { CenterSpinner, EmptyState } from '@/components/states'
import { useTextActions } from '@/components/text-actions'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useMediaPlayer } from '@/hooks/use-media-player'
import { darsQuery } from '@/lib/queries'
import type { TextTarget } from '@/lib/selection'
import { bnNum, formatTime, parseTime } from '@/lib/text'
import type { Dars, Segment } from '@/lib/types'
import { useAnnotations, useReaderSettings } from '@/lib/user-data'
import { cn } from '@/lib/utils'
import { pageTitle } from '@/lib/head'
import { PatternTint } from '@/components/pattern'

export const Route = createFileRoute('/_site/durus/$id')({
  validateSearch: (search: Record<string, unknown>): { t?: string } => ({
    t: typeof search.t === 'string' || typeof search.t === 'number' ? String(search.t) : undefined,
  }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(darsQuery(Number(params.id))),
  head: ({ loaderData }) => pageTitle(loaderData && `${loaderData.title_bn} — ${loaderData.series?.title_bn ?? 'দারস'}`),
  pendingComponent: CenterSpinner,
  component: DarsPage,
})

function DarsPage() {
  const { id } = Route.useParams()
  const { data: dars } = useQuery(darsQuery(Number(id)))
  if (!dars) return <CenterSpinner />
  return <DarsPlayer key={dars.id} dars={dars} />
}

function activeIndex(segments: Segment[], time: number) {
  let lo = 0
  let hi = segments.length - 1
  let found = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (segments[mid].start_time <= time + 0.05) {
      found = mid
      lo = mid + 1
    } else hi = mid - 1
  }
  if (found === -1) return -1
  const seg = segments[found]
  if (seg.end_time != null && time > seg.end_time + 0.3) return -1
  return found
}

function DarsPlayer({ dars }: { dars: Dars }) {
  const { t } = Route.useSearch()
  const startAt = parseTime(t)
  const segments = useMemo(() => dars.segments ?? [], [dars])
  const player = useMediaPlayer(dars.media_url, startAt)
  const { settings, update } = useReaderSettings()
  const { annotations, create, update: updateAnnotation, remove } = useAnnotations({ darsId: dars.id })
  const listRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [flashId, setFlashId] = useState<number | null>(null)

  const index = activeIndex(segments, player.time)
  const current = index >= 0 ? segments[index] : null

  // Flash the segment a timestamp link points to
  useEffect(() => {
    if (startAt == null) return
    const i = activeIndex(segments, startAt)
    if (i >= 0) {
      setFlashId(segments[i].id)
      const timer = window.setTimeout(() => setFlashId(null), 2600)
      return () => window.clearTimeout(timer)
    }
  }, [startAt, segments])

  // Keep the active line in view inside the transcript
  useEffect(() => {
    if (!autoScroll || !current || !listRef.current) return
    const row = listRef.current.querySelector<HTMLElement>(`[data-seg="${current.id}"]`)
    if (row) listRef.current.scrollTo({ top: row.offsetTop - listRef.current.clientHeight / 3, behavior: 'smooth' })
  }, [current, autoScroll])

  const segmentMap = useMemo(() => new Map(segments.map((s) => [s.id, s])), [segments])
  const plainFor = useCallback((target: TextTarget) => {
    const s = segmentMap.get(target.id)
    return s ? (target.lang === 'ar' ? s.text_ar : s.text_bn) : undefined
  }, [segmentMap])

  const highlightMap = useMemo(() => {
    const map = new Map<string, HighlightRange[]>()
    for (const a of annotations) {
      const key = `${a.target_id}:${a.lang}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push({ id: a.id, start: a.start_offset, end: a.end_offset, color: a.color, hasNote: !!a.note })
    }
    return map
  }, [annotations])
  const annotationIndex = useMemo(() => new Map(annotations.map((a) => [String(a.id), a])), [annotations])

  const source = `${dars.series?.title_bn ?? ''} — দারস ${bnNum(dars.number)}`
  const linkAt = (seconds: number) => `${window.location.origin}/durus/${dars.id}?t=${formatTime(seconds)}`

  const actions = useTextActions({
    containerRef: listRef,
    plainFor,
    diacriticsHidden: false,
    fontAr: settings.fontAr,
    fontBn: settings.fontBn,
    annotations: { create, update: updateAnnotation, remove },
    linkFor: (target) => linkAt(segmentMap.get(target.id)?.start_time ?? 0),
    quoteFor: (target, selected) => {
      const s = target ? segmentMap.get(target.id) : undefined
      if (!s) return { ar: '', bn: selected ?? '', source }
      return { ar: target?.lang === 'ar' && selected ? selected : s.text_ar, bn: target?.lang === 'bn' && selected ? selected : s.text_bn, source }
    },
  })

  const copyTimestamp = async () => {
    await navigator.clipboard.writeText(linkAt(player.time))
    toast.success(`${formatTime(player.time)} — লিংক কপি হয়েছে`)
  }

  const subtitleMode = settings.subtitles

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <Link to="/library" search={{ type: 'durus' }} className="hover:text-primary">
          দারস
        </Link>
        <span>/</span>
        {dars.series && (
          <Link to="/durus/series/$slug" params={{ slug: dars.series.slug }} className="hover:text-primary">
            {dars.series.title_bn}
          </Link>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-black/20 bg-black shadow-xl">
            {player.kind === 'youtube' ? (
              <div ref={player.ytHost} className="aspect-video w-full [&_iframe]:size-full" />
            ) : dars.media_type === 'video' ? (
              <video ref={player.mediaRef} src={dars.media_url} controls playsInline className="aspect-video w-full" {...player.nativeProps} />
            ) : (
              <div className="wood-panel relative flex flex-col items-center gap-5 px-6 pt-10 pb-6">
                <PatternTint />
                <div className="relative flex size-20 items-center justify-center rounded-full border border-gold/50 bg-black/20">
                  <Headphones className="size-8 text-gold" />
                </div>
                <audio ref={player.mediaRef} src={dars.media_url} controls className="relative w-full" {...player.nativeProps} />
              </div>
            )}

            {/* Synced subtitles */}
            <div className="flex min-h-28 flex-col items-center justify-center gap-1.5 bg-[oklch(0.16_0.015_55)] px-5 py-4 text-center">
              {current ? (
                <>
                  {subtitleMode !== 'bn' && current.text_ar && (
                    <p lang="ar" dir="rtl" className="font-arabic text-xl leading-relaxed text-[oklch(0.92_0.07_85)] md:text-2xl">
                      {current.text_ar}
                    </p>
                  )}
                  {subtitleMode !== 'ar' && current.text_bn && <p className="text-base leading-relaxed text-[oklch(0.86_0.02_80)] md:text-lg">{current.text_bn}</p>}
                </>
              ) : (
                <StarMark className="size-6 text-gold/40" />
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Subtitles className="size-4 text-gold" />
              <ToggleGroup type="single" variant="outline" size="sm" value={subtitleMode} onValueChange={(v) => v && update({ subtitles: v as typeof subtitleMode })}>
                <ToggleGroupItem value="ar">আরবি</ToggleGroupItem>
                <ToggleGroupItem value="bn">বাংলা</ToggleGroupItem>
                <ToggleGroupItem value="both">উভয়</ToggleGroupItem>
              </ToggleGroup>
            </div>
            <Button variant="outline" size="sm" onClick={copyTimestamp} className="ms-auto">
              <Link2 /> {formatTime(player.time)} — লিংক কপি
            </Button>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <p className="text-sm text-gold">দারস {bnNum(dars.number)}</p>
            <h1 className="mt-1 text-2xl font-bold">{dars.title_bn}</h1>
            {dars.title_ar && (
              <p lang="ar" dir="rtl" className="mt-1 text-left font-arabic text-xl text-muted-foreground">
                {dars.title_ar}
              </p>
            )}
            <div className="mt-4 flex gap-2">
              {dars.prev_id ? (
                <Button variant="outline" size="sm" asChild>
                  <Link to="/durus/$id" params={{ id: String(dars.prev_id) }}>
                    <ChevronLeft /> আগের দারস
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  <ChevronLeft /> আগের দারস
                </Button>
              )}
              {dars.next_id ? (
                <Button variant="outline" size="sm" asChild>
                  <Link to="/durus/$id" params={{ id: String(dars.next_id) }}>
                    পরের দারস <ChevronRight />
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  পরের দারস <ChevronRight />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Transcript */}
        <div className="flex max-h-[calc(100svh-7rem)] min-h-96 flex-col overflow-hidden rounded-xl border bg-parchment shadow-sm lg:sticky lg:top-24">
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
            <h2 className="flex items-center gap-2 font-bold">
              <ListVideo className="size-4 text-gold" /> ট্রান্সক্রিপ্ট
            </h2>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              স্বয়ংক্রিয় স্ক্রল <Switch checked={autoScroll} onCheckedChange={setAutoScroll} />
            </label>
          </div>
          <div ref={listRef} className="relative min-h-0 flex-1 overflow-y-auto scrollbar-thin">
            {segments.length ? (
              segments.map((seg) => {
                const isActive = current?.id === seg.id
                return (
                  <div
                    key={seg.id}
                    data-seg={seg.id}
                    className={cn(
                      'group flex cursor-pointer gap-3 border-b border-border/50 px-4 py-3 transition-colors hover:bg-muted/60',
                      isActive && 'bg-gold/15 hover:bg-gold/20',
                      flashId === seg.id && 'animate-pulse bg-gold/25',
                    )}
                    onClick={(e) => {
                      const mark = (e.target as HTMLElement).closest('mark[data-id]') as HTMLElement | null
                      const annotation = mark && annotationIndex.get(mark.dataset.id!)
                      if (annotation && mark) return actions.openForMark(annotation, mark)
                      if (window.getSelection()?.isCollapsed !== false) player.seek(seg.start_time)
                    }}
                  >
                    <span className={cn('mt-1 h-fit shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground', isActive ? 'bg-gold text-gold-foreground' : 'bg-muted')}>
                      {formatTime(seg.start_time)}
                    </span>
                    <div className="min-w-0 flex-1 space-y-1">
                      {seg.text_ar && (
                        <p lang="ar" dir="rtl" data-tt="dars_segment" data-tid={seg.id} data-lang="ar" className="font-arabic text-lg leading-loose">
                          <PlainHighlight text={seg.text_ar} ranges={highlightMap.get(`${seg.id}:ar`) ?? []} />
                        </p>
                      )}
                      {seg.text_bn && (
                        <p data-tt="dars_segment" data-tid={seg.id} data-lang="bn" className="text-[15px] leading-relaxed text-foreground/85">
                          <PlainHighlight text={seg.text_bn} ranges={highlightMap.get(`${seg.id}:bn`) ?? []} />
                        </p>
                      )}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="p-4">
                <EmptyState title="ট্রান্সক্রিপ্ট যুক্ত হয়নি" />
              </div>
            )}
          </div>
        </div>
      </div>
      {actions.element}
    </div>
  )
}
