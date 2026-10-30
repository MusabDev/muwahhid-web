import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, Clock, Headphones, Link2, ListOrdered, ListVideo, Subtitles, Video } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AuthorAvatar } from '@/components/author-avatar'
import { StarMark } from '@/components/brand'
import { DarsStatusMenu } from '@/components/status-menu'
import { EpisodeList, episodeNumber } from '@/components/episode-list'
import type { HighlightRange } from '@/components/markdown'
import { PlainHighlight } from '@/components/plain-highlight'
import { CenterSpinner, EmptyState } from '@/components/states'
import { useTextActions } from '@/components/text-actions'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useMediaPlayer } from '@/hooks/use-media-player'
import { api } from '@/lib/api'
import { useUser } from '@/lib/auth'
import { darsQuery, seriesQuery } from '@/lib/queries'
import type { TextTarget } from '@/lib/selection'
import { bnNum, formatTime, parseTime } from '@/lib/text'
import type { Dars, DarsEntry, Segment } from '@/lib/types'
import { DARS_COMPLETED_AT, useAnnotations, useDarsEntry, useReaderSettings } from '@/lib/user-data'
import { cn } from '@/lib/utils'
import { pageTitle } from '@/lib/head'
import { PatternTint } from '@/components/pattern'

export const Route = createFileRoute('/_site/durus/$id')({
  validateSearch: (search: Record<string, unknown>): { t?: string } => ({
    t: typeof search.t === 'string' || typeof search.t === 'number' ? String(search.t) : undefined,
  }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(darsQuery(Number(params.id))),
  head: ({ loaderData }) => pageTitle(loaderData && [loaderData.title_bn, loaderData.series?.title_bn, loaderData.series?.author?.name_bn].filter(Boolean).join(' - ')),
  pendingComponent: CenterSpinner,
  component: DarsPage,
})

function DarsPage() {
  const { id } = Route.useParams()
  const { data: dars } = useQuery(darsQuery(Number(id)))
  const { isLoading: userLoading } = useUser()
  const { entry, isLoading: entryLoading } = useDarsEntry(dars)
  // the player takes its start time once, so wait for the saved position
  if (!dars || userLoading || entryLoading) return <CenterSpinner />
  return <DarsPlayer key={dars.id} dars={dars} resumeAt={resumePosition(entry)} />
}

/** Where to pick up a dars again: nowhere if it was barely started or already finished. */
function resumePosition(entry: DarsEntry | undefined) {
  if (!entry || entry.position_seconds < 5 || entry.progress >= DARS_COMPLETED_AT) return null
  return entry.position_seconds
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

function DarsPlayer({ dars, resumeAt: savedAt }: { dars: Dars; resumeAt: number | null }) {
  // fixed when the dars opens; later saves must not move the start point again
  const [resumeAt] = useState(savedAt)
  const { t } = Route.useSearch()
  const startAt = parseTime(t)
  const segments = useMemo(() => dars.segments ?? [], [dars])
  // a timestamp link wins over the saved position
  const player = useMediaPlayer(dars.media_url, startAt ?? resumeAt)
  useSaveListening(dars, player.time, player.duration)
  useResumeNotice(startAt == null ? resumeAt : null, player.seek)
  const { settings, update } = useReaderSettings()
  const { annotations, create, update: updateAnnotation, remove } = useAnnotations({ darsId: dars.id })
  const { data: series } = useQuery({ ...seriesQuery(dars.series?.slug ?? ''), enabled: !!dars.series })
  const siblings = series?.durus ?? []
  useRecordDuration(dars, player.duration)
  const prev = siblings.find((d) => d.id === dars.prev_id)
  const next = siblings.find((d) => d.id === dars.next_id)
  const seriesSeconds = siblings.reduce((sum, d) => sum + (d.duration_seconds ?? 0), 0)
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
    annotations: { list: annotations, create, update: updateAnnotation, remove },
    linkFor: (target) => linkAt(segmentMap.get(target.id)?.start_time ?? 0),
    quoteFor: (target, selected) => {
      const s = target ? segmentMap.get(target.id) : undefined
      if (!s) return { ar: '', bn: selected ?? '', source }
      return { ar: target?.lang === 'ar' && selected ? selected : s.text_ar, bn: target?.lang === 'bn' && selected ? selected : s.text_bn, source }
    },
  })

  const copyTimestamp = async () => {
    await navigator.clipboard.writeText(linkAt(player.time))
    toast.success(`${formatTime(player.time)} থেকে শোনার লিংক কপি হয়েছে`)
  }

  const subtitleMode = settings.subtitles

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <nav aria-label="breadcrumb" className="mb-5 flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/library" search={{ type: 'durus' }} className="shrink-0 transition hover:text-primary">
          দারস
        </Link>
        {dars.series && (
          <>
            <ChevronRight className="size-3.5 shrink-0 opacity-60" />
            <Link to="/durus/series/$slug" params={{ slug: dars.series.slug }} className="min-w-0 truncate transition hover:text-primary">
              {dars.series.title_bn}
            </Link>
          </>
        )}
        <ChevronRight className="size-3.5 shrink-0 opacity-60" />
        <span aria-current="page" className="shrink-0 font-medium text-foreground">
          দারস {bnNum(dars.number)}
        </span>
      </nav>

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

          <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card px-3 py-2.5 shadow-xs">
            <div className="flex items-center gap-2">
              <Subtitles className="size-4 text-gold" />
              <span className="hidden text-sm text-muted-foreground sm:inline">সাবটাইটেল</span>
              <ToggleGroup type="single" variant="outline" size="sm" value={subtitleMode} onValueChange={(v) => v && update({ subtitles: v as typeof subtitleMode })}>
                <ToggleGroupItem value="ar">আরবি</ToggleGroupItem>
                <ToggleGroupItem value="bn">বাংলা</ToggleGroupItem>
                <ToggleGroupItem value="both">উভয়</ToggleGroupItem>
              </ToggleGroup>
            </div>
            <Button variant="ghost" size="sm" onClick={copyTimestamp} className="ms-auto">
              <Link2 className="text-gold" /> <span className="tabular-nums">{bnNum(formatTime(player.time))}</span> থেকে লিংক কপি
            </Button>
          </div>

          <div className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-4 sm:gap-5">
              <span className="font-heading text-4xl leading-none text-gold tabular-nums sm:text-5xl">{episodeNumber(dars.number)}</span>
              <div className="min-w-0 flex-1">
                {dars.series && (
                  <Link to="/durus/series/$slug" params={{ slug: dars.series.slug }} className="text-xs font-semibold tracking-wide text-muted-foreground transition hover:text-primary">
                    {dars.series.title_bn}
                    {siblings.length > 0 && <span className="font-normal"> · {bnNum(siblings.length)}টির মধ্যে {bnNum(dars.number)}</span>}
                  </Link>
                )}
                <h1 className="mt-1 text-xl leading-snug font-bold text-balance sm:text-2xl">{dars.title_bn}</h1>
                {dars.title_ar && (
                  <p lang="ar" dir="rtl" className="mt-1 text-left font-arabic text-xl leading-relaxed text-muted-foreground">
                    {dars.title_ar}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 border-t pt-4 text-sm">
              {dars.series?.author && (
                <Link to="/authors/$slug" params={{ slug: dars.series.author.slug }} className="group flex items-center gap-2.5">
                  <AuthorAvatar author={dars.series.author} className="size-8" />
                  <span className="font-semibold transition-colors group-hover:text-primary">{dars.series.author.name_bn}</span>
                </Link>
              )}
              <span className="flex items-center gap-1.5 text-muted-foreground">
                {dars.media_type === 'video' ? <Video className="size-4 text-gold" /> : <Headphones className="size-4 text-gold" />}
                {dars.media_type === 'video' ? 'ভিডিও' : 'অডিও'}
              </span>
              {!!dars.duration_seconds && (
                <span className="flex items-center gap-1.5 text-muted-foreground tabular-nums">
                  <Clock className="size-4 text-gold" /> <span className="tabular-nums">{bnNum(formatTime(dars.duration_seconds))}</span>
                </span>
              )}
              <span className="ms-auto">
                <DarsStatusMenu dars={dars} />
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <NavCard id={dars.prev_id} title={prev?.title_bn} label="আগের দারস" direction="prev" />
              <NavCard id={dars.next_id} title={next?.title_bn} label="পরের দারস" direction="next" />
            </div>
          </div>

          {siblings.length > 1 && (
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b bg-muted/40 px-4 py-3">
                <h2 className="flex items-center gap-2 font-bold">
                  <ListOrdered className="size-4 text-gold" /> এই সিরিজের দারস
                </h2>
                <span className="text-xs text-muted-foreground">
                  {bnNum(siblings.length)}টি{seriesSeconds > 0 && ` · মোট ${bnNum(formatTime(seriesSeconds))}`}
                </span>
              </div>
              <div className="max-h-96 overflow-y-auto scrollbar-thin">
                <EpisodeList durus={siblings} currentId={dars.id} compact />
              </div>
            </div>
          )}
        </div>

        {/* Transcript */}
        <div className="flex max-h-[calc(100svh-7rem)] min-h-96 flex-col overflow-hidden rounded-xl border bg-parchment shadow-sm lg:sticky lg:top-24">
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
            <h2 className="flex items-center gap-2 font-bold">
              <ListVideo className="size-4 text-gold" /> ট্রান্সক্রিপ্ট
              {!!segments.length && <span className="text-xs font-normal text-muted-foreground">({bnNum(segments.length)})</span>}
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
                      'group relative flex cursor-pointer gap-3 border-b border-border/50 px-4 py-3.5 transition-colors hover:bg-muted/60',
                      isActive && 'bg-gold/15 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-gold hover:bg-gold/20',
                      flashId === seg.id && 'animate-pulse bg-gold/25',
                    )}
                    onClick={(e) => {
                      const mark = (e.target as HTMLElement).closest('mark[data-id]') as HTMLElement | null
                      const annotation = mark && annotationIndex.get(mark.dataset.id!)
                      if (annotation && mark) return actions.openForMark(annotation, mark)
                      if (window.getSelection()?.isCollapsed !== false) player.seek(seg.start_time)
                    }}
                  >
                    <span className={cn('mt-1 h-fit shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[11px] tabular-nums transition-colors', isActive ? 'bg-gold text-gold-foreground' : 'bg-muted text-muted-foreground group-hover:bg-gold/25 group-hover:text-foreground')}>
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

/** Saving interval while playing; the position is also saved when the page is hidden or left. */
const SAVE_EVERY_MS = 15_000

/** Keep the listening position in the library (account or localStorage) while the dars plays. */
function useSaveListening(dars: Dars, time: number, duration: number) {
  const { saveProgress } = useDarsEntry(dars)
  const latest = useRef({ time, duration, saveProgress })
  useEffect(() => {
    latest.current = { time, duration, saveProgress }
  })
  const saved = useRef<number | null>(null)

  useEffect(() => {
    const flush = (keepalive = false) => {
      const { time, duration, saveProgress } = latest.current
      // nothing played yet, or nothing new since the last save
      if (time < 1 || (saved.current != null && Math.abs(time - saved.current) < 1)) return
      saved.current = time
      saveProgress(time, duration, keepalive).catch(() => {
        saved.current = null
      })
    }
    const timer = window.setInterval(flush, SAVE_EVERY_MS)
    const onHide = () => document.visibilityState === 'hidden' && flush(true)
    const onPageHide = () => flush(true)
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', onPageHide)
      flush()
    }
  }, [dars.id])
}

/** Tell the listener the dars picks up where they stopped, with a way back to the start. */
function useResumeNotice(resumeAt: number | null, seek: (seconds: number) => void) {
  const seekRef = useRef(seek)
  useEffect(() => {
    seekRef.current = seek
  })

  useEffect(() => {
    if (resumeAt == null) return
    const id = toast(`${bnNum(formatTime(resumeAt))} থেকে আবার শুরু হচ্ছে`, {
      action: { label: 'শুরু থেকে', onClick: () => seekRef.current(0) },
    })
    return () => {
      toast.dismiss(id)
    }
  }, [resumeAt])
}

/**
 * When an admin opens a dars that has no saved length, store the one the player reports,
 * so list rows and series totals fill in without typing seconds by hand.
 */
function useRecordDuration(dars: Dars, duration: number) {
  const { data: user } = useUser()
  const queryClient = useQueryClient()
  const saved = useRef(false)
  const seconds = Math.round(duration)

  useEffect(() => {
    if (!user?.is_admin || dars.duration_seconds || seconds <= 0 || saved.current) return
    saved.current = true
    api(`/admin/durus/${dars.id}`, { method: 'PUT', body: { duration_seconds: seconds } })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['dars', dars.id] })
        queryClient.invalidateQueries({ queryKey: ['dars-series'] })
        toast.success(`সময়কাল ${bnNum(formatTime(seconds))} হিসেবে সেভ হয়েছে`)
      })
      .catch(() => {
        saved.current = false
      })
  }, [user?.is_admin, dars.id, dars.duration_seconds, seconds, queryClient])
}

function NavCard({ id, title, label, direction }: { id?: number | null; title?: string; label: string; direction: 'prev' | 'next' }) {
  const Icon = direction === 'prev' ? ChevronLeft : ChevronRight
  const body = (
    <>
      {direction === 'prev' && <Icon className="size-5 shrink-0 text-muted-foreground transition group-hover:-translate-x-0.5 group-hover:text-primary" />}
      <span className={cn('min-w-0 flex-1', direction === 'next' && 'text-right')}>
        <span className="block text-xs text-muted-foreground">{label}</span>
        <span className="line-clamp-1 text-sm font-semibold transition-colors group-hover:text-primary">{id ? (title ?? '…') : 'নেই'}</span>
      </span>
      {direction === 'next' && <Icon className="size-5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />}
    </>
  )
  const base = 'group flex items-center gap-3 rounded-lg border px-3.5 py-3 transition'
  if (!id) return <div className={cn(base, 'opacity-50', direction === 'next' && 'sm:col-start-2')}>{body}</div>
  return (
    <Link to="/durus/$id" params={{ id: String(id) }} className={cn(base, 'hover:border-gold/60 hover:bg-muted/40')}>
      {body}
    </Link>
  )
}
