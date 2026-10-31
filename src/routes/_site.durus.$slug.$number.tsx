import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useHydrated } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, Clock, Headphones, Link2, ListOrdered, ListVideo, Video } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AuthorAvatar } from '@/components/author-avatar'
import { StarMark } from '@/components/brand'
import { DarsStatusMenu } from '@/components/status-menu'
import { EpisodeList, episodeNumber } from '@/components/episode-list'
import type { HighlightRange } from '@/components/markdown'
import { PlainHighlight } from '@/components/plain-highlight'
import { CenterSpinner, EmptyState } from '@/components/states'
import { clampSubtitleSize, SUBTITLE_SIZE, SubtitleCue } from '@/components/subtitles'
import { useTextActions } from '@/components/text-actions'
import { PlayerControls, PlayerSurface, SKIP_SECONDS, useAutoHide } from '@/components/player-controls'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useMediaPlayer, youtubeId } from '@/hooks/use-media-player'
import { api } from '@/lib/api'
import { loadFont } from '@/lib/fonts'
import { PortalContainer } from '@/lib/portal'
import { useUser } from '@/lib/auth'
import { darsPath } from '@/lib/links'
import { darsByNumberQuery, orNotFound, seriesQuery } from '@/lib/queries'
import { breadcrumbLd, isoDuration, ogImage, personLd, seo } from '@/lib/seo'
import { absoluteUrl } from '@/lib/site'
import type { TextTarget } from '@/lib/selection'
import { arNum, bnNum, formatTime, parseTime, stripMarkdown, truncate } from '@/lib/text'
import type { Dars, DarsEntry, Segment } from '@/lib/types'
import { DARS_COMPLETED_AT, useAnnotations, useDarsEntry, useReaderSettings } from '@/lib/user-data'
import { cn } from '@/lib/utils'
import { PatternTint } from '@/components/pattern'

export const Route = createFileRoute('/_site/durus/$slug/$number')({
  validateSearch: (search: Record<string, unknown>): { t?: string } => ({
    t: typeof search.t === 'string' || typeof search.t === 'number' ? String(search.t) : undefined,
  }),
  loader: async ({ context: { queryClient }, params }) => {
    const dars = await orNotFound(queryClient.ensureQueryData(darsByNumberQuery(params.slug, Number(params.number))))
    // the series feeds the episode list and the prev/next titles
    await queryClient.prefetchQuery(seriesQuery(params.slug))
    return dars
  },
  head: ({ loaderData: dars }) => {
    if (!dars?.series) return {}
    const series = dars.series
    const path = darsPath(dars)
    const label = `দারস ${bnNum(dars.number)}`
    const transcript = (dars.segments ?? []).map((s) => s.text_bn).join(' ')
    const ytId = youtubeId(dars.media_url)
    const duration = dars.duration_seconds ?? Math.max(0, ...(dars.segments ?? []).map((s) => s.end_time ?? s.start_time))
    const description = transcript || series.about_md || `${series.title_bn} সিরিজের ${label}: আরবি ও বাংলা সাবটাইটেলসহ।`
    const thumbnail = ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : ogImage('dars', `${series.slug}-${dars.number}`)
    return seo({
      title: `${dars.title_bn} — ${series.title_bn}, ${label}${series.author ? ` | ${series.author.name_bn}` : ''}`,
      description,
      path,
      type: dars.media_type === 'video' ? 'video.other' : 'article',
      image: ogImage('dars', `${series.slug}-${dars.number}`),
      imageAlt: `${dars.title_bn} — ${series.title_bn}`,
      prev: dars.prev_number ? `/durus/${series.slug}/${dars.prev_number}` : null,
      next: dars.next_number ? `/durus/${series.slug}/${dars.next_number}` : null,
      jsonLd: [
        {
          '@type': dars.media_type === 'video' ? 'VideoObject' : 'AudioObject',
          '@id': `${absoluteUrl(path)}#media`,
          name: `${dars.title_bn} — ${series.title_bn} (${label})`,
          ...(dars.title_ar ? { alternateName: dars.title_ar } : {}),
          description: truncate(stripMarkdown(description), 500),
          url: absoluteUrl(path),
          inLanguage: 'ar',
          thumbnailUrl: [thumbnail],
          ...(ytId ? { embedUrl: `https://www.youtube.com/embed/${ytId}` } : { contentUrl: dars.media_url }),
          ...(isoDuration(duration) ? { duration: isoDuration(duration) } : {}),
          ...((dars.created_at ?? series.created_at) ? { uploadDate: dars.created_at ?? series.created_at } : {}),
          ...(series.author ? { author: personLd(series.author) } : {}),
          partOfSeries: { '@type': 'CreativeWorkSeries', name: series.title_bn, url: absoluteUrl(`/durus/${series.slug}`) },
          ...(transcript ? { transcript: truncate(transcript, 5000) } : {}),
          isAccessibleForFree: true,
        },
        breadcrumbLd([
          ['দারস', '/library?type=durus'],
          [series.title_bn, `/durus/${series.slug}`],
          [label, path],
        ]),
      ],
    })
  },
  pendingComponent: CenterSpinner,
  component: DarsPage,
})

function DarsPage() {
  const { slug, number } = Route.useParams()
  const { data: dars } = useQuery(darsByNumberQuery(slug, Number(number)))
  const hydrated = useHydrated()
  const { isLoading: userLoading } = useUser()
  const { entry, isLoading: entryLoading } = useDarsEntry(dars)
  if (!dars) return <CenterSpinner />
  // the page (titles, transcript) renders on the server; the player itself waits in the browser for the saved position
  const known = hydrated && !userLoading && !entryLoading
  return <DarsPlayer key={dars.id} dars={dars} resumeAt={known ? resumePosition(entry) : undefined} />
}

/** Where to pick up a dars again: nowhere if it was barely started or already finished. */
function resumePosition(entry: DarsEntry | undefined) {
  if (!entry || entry.position_seconds < 5 || entry.progress >= DARS_COMPLETED_AT) return null
  return entry.position_seconds
}

/** The last segment that has started by `time`, even if it has already ended. */
function lastStarted(segments: Segment[], time: number) {
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
  return found
}

function activeIndex(segments: Segment[], time: number) {
  const found = lastStarted(segments, time)
  if (found === -1) return -1
  const seg = segments[found]
  if (seg.end_time != null && time > seg.end_time + 0.3) return -1
  return found
}

/** How long a line stays up after it ends when the next hasn't started, so short pauses don't blink. */
const CUE_HOLD = 0.8

/** The line to show as a subtitle: the active one, or the one that just ended if the gap is short. */
function cueIndexAt(segments: Segment[], time: number) {
  const found = lastStarted(segments, time)
  if (found === -1) return -1
  const seg = segments[found]
  if (seg.end_time == null || time <= seg.end_time + CUE_HOLD) return found
  return -1
}

/** `resumeAt` is undefined until the saved position is known; the player is created only then. */
function DarsPlayer({ dars, resumeAt: savedAt }: { dars: Dars; resumeAt: number | null | undefined }) {
  // fixed once known; later saves must not move the start point again
  const [resumeAt, setResumeAt] = useState(savedAt)
  useEffect(() => {
    if (resumeAt === undefined && savedAt !== undefined) setResumeAt(savedAt)
  }, [resumeAt, savedAt])
  const { t } = Route.useSearch()
  const startAt = parseTime(t)
  const segments = useMemo(() => dars.segments ?? [], [dars])
  // a timestamp link wins over the saved position
  const player = useMediaPlayer(dars.media_url, startAt ?? resumeAt ?? null, resumeAt !== undefined)
  useSaveListening(dars, player.time, player.duration)
  useResumeNotice(startAt == null ? (resumeAt ?? null) : null, player.seek)
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

  const linkAt = (seconds: number) => `${window.location.origin}${darsPath(dars)}?t=${formatTime(seconds)}`

  const actions = useTextActions({
    containerRef: listRef,
    plainFor,
    diacriticsHidden: false,
    fontAr: settings.fontAr,
    fontBn: settings.fontBn,
    annotations: { list: annotations, create, update: updateAnnotation, remove },
    linkFor: (target) => linkAt(segmentMap.get(target.id)?.start_time ?? 0),
    sourceFor: (lang) =>
      lang === 'ar'
        ? { title: dars.series?.title_ar || dars.title_ar || '', author: dars.series?.author?.name_ar, meta: `الدرس ${arNum(dars.number)}` }
        : { title: dars.series?.title_bn ?? '', author: dars.series?.author?.name_bn, meta: `দারস ${bnNum(dars.number)}` },
  })

  const copyTimestamp = async () => {
    await navigator.clipboard.writeText(linkAt(player.time))
    toast.success(`${formatTime(player.time)} থেকে শোনার লিংক কপি হয়েছে`)
  }

  const subtitleMode = settings.subtitles
  // the last language shown, so C can bring the subtitles back as they were
  const shownMode = useRef(subtitleMode === 'off' ? 'both' : subtitleMode)
  useEffect(() => {
    if (subtitleMode !== 'off') shownMode.current = subtitleMode
  }, [subtitleMode])
  const theater = settings.theater
  const isVideo = player.kind === 'youtube' || dars.media_type === 'video'
  const [styling, setStyling] = useState(false)
  const shownIndex = cueIndexAt(segments, player.time)
  // while the settings are open, show a line even between cues so changes are visible
  const cueIndex = shownIndex >= 0 ? shownIndex : styling && segments.length ? 0 : -1
  const cue = cueIndex >= 0 ? segments[cueIndex] : null
  const nextCue = cueIndex >= 0 ? (segments[cueIndex + 1] ?? null) : null
  const moveSubtitle = (position: number) => update({ subtitle: { ...settings.subtitle, position } })
  const { boxRef, fullscreenEl, canFullscreen, toggleFullscreen } = useFullscreen()
  const fullscreen = !!fullscreenEl
  const controls = useAutoHide(player.playing && !styling)
  const subtitlesOn = subtitleMode !== 'off'
  const toggleSubtitles = () => update({ subtitles: subtitlesOn ? 'off' : shownMode.current })
  const toggleTheater = () => update({ theater: !theater })
  const setRate = (rate: number) => {
    player.setRate(rate)
    update({ playbackRate: rate })
  }

  // the saved speed, once the player can take it
  const { ready, setRate: applyRate } = player
  useEffect(() => {
    if (ready) applyRate(settings.playbackRate)
  }, [ready, applyRate, settings.playbackRate])

  useEffect(() => {
    loadFont(settings.subtitle.fontAr)
    loadFont(settings.subtitle.fontBn)
  }, [settings.subtitle.fontAr, settings.subtitle.fontBn])

  // player shortcuts, like most video players; the handler reads the latest values through a ref
  const keys = useRef({ settings, update, player, segments, canFullscreen, toggleFullscreen, poke: controls.poke })
  useEffect(() => {
    keys.current = { settings, update, player, segments, canFullscreen, toggleFullscreen, poke: controls.poke }
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable="true"], [role="slider"], [role="dialog"]')) return
      const { settings, update, player, segments, canFullscreen, toggleFullscreen, poke } = keys.current
      const { time, seek } = player
      const sub = settings.subtitle
      const resize = (by: number) => update({ subtitle: { ...sub, sizeAr: clampSubtitleSize(sub.sizeAr + by), sizeBn: clampSubtitleSize(sub.sizeBn + by) } })
      const at = lastStarted(segments, time)
      const key = e.key.toLowerCase()
      const repeatable = ['+', '=', '-', 'arrowleft', 'arrowright', 'j', 'l']
      if (e.repeat && !repeatable.includes(key)) return
      // Space on a focused button or link presses it
      if (key === ' ' && e.target instanceof Element && e.target.closest('button, a, [role="switch"], [role="tab"]')) return
      if (key === ' ' || key === 'k') player.toggle()
      else if (key === 'arrowleft') seek(time - 5, player.playing)
      else if (key === 'arrowright') seek(time + 5, player.playing)
      else if (key === 'j') seek(time - SKIP_SECONDS, player.playing)
      else if (key === 'l') seek(time + SKIP_SECONDS, player.playing)
      else if (key === 'm') player.toggleMute()
      else if (key === 't') update({ theater: !settings.theater })
      else if (key === 'f' && canFullscreen) toggleFullscreen()
      else if (key === 'c') update({ subtitles: settings.subtitles === 'off' ? shownMode.current : 'off' })
      else if (key === '+' || key === '=') resize(SUBTITLE_SIZE.step)
      else if (key === '-') resize(-SUBTITLE_SIZE.step)
      // [ goes to the line before the one playing, ] to the one after
      else if (key === '[' && at > 0) seek(segments[at - 1].start_time)
      else if (key === ']' && at + 1 < segments.length) seek(segments[at + 1].start_time)
      else return
      e.preventDefault()
      poke()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const controlProps = () => ({
    player,
    segments,
    subtitlesOn,
    onToggleSubtitles: toggleSubtitles,
    settings,
    update,
    hasVideo: isVideo,
    settingsOpen: styling,
    onSettingsOpenChange: setStyling,
    onRate: setRate,
    theater,
    onTheater: toggleTheater,
    fullscreen,
    canFullscreen,
    onFullscreen: toggleFullscreen,
  })

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <nav aria-label="breadcrumb" className="mb-5 flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/library" search={{ type: 'durus' }} className="shrink-0 transition hover:text-primary">
          দারস
        </Link>
        {dars.series && (
          <>
            <ChevronRight className="size-3.5 shrink-0 opacity-60" />
            <Link to="/durus/$slug" params={{ slug: dars.series.slug }} className="min-w-0 truncate transition hover:text-primary">
              {dars.series.title_bn}
            </Link>
          </>
        )}
        <ChevronRight className="size-3.5 shrink-0 opacity-60" />
        <span aria-current="page" className="shrink-0 font-medium text-foreground">
          দারস {bnNum(dars.number)}
        </span>
      </nav>

      <div className={cn('grid gap-6', !theater && 'lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]')}>
        <div className="min-w-0 space-y-4">
          {/* fullscreen goes to this box, not the player inside, so the subtitles and controls come along */}
          <div
            ref={boxRef}
            onPointerLeave={(e) => e.pointerType === 'mouse' && player.playing && controls.hide()}
            className={cn('overflow-hidden bg-black', fullscreen ? 'flex items-center justify-center' : 'rounded-xl border border-black/20 shadow-xl')}
          >
            <PortalContainer.Provider value={fullscreenEl}>
              {isVideo ? (
                <div className={cn('@container relative mx-auto aspect-video', fullscreen ? 'w-[min(100vw,calc(100svh*16/9))]' : 'w-full')}>
                  {player.kind === 'youtube' ? (
                    <div ref={player.ytHost} className="absolute inset-0 [&_iframe]:size-full" />
                  ) : (
                    <video ref={player.mediaRef} src={resumeAt !== undefined ? dars.media_url : undefined} playsInline className="absolute inset-0 size-full" {...player.nativeProps} />
                  )}
                  {/* while YouTube plays an ad, its own buttons (skip) must stay reachable */}
                  {!player.ad && (
                    <>
                      <PlayerSurface player={player} visible={controls.visible} onPoke={controls.poke} onFullscreen={canFullscreen ? toggleFullscreen : undefined} />
                      <SubtitleCue segment={cue} next={nextCue} mode={subtitleMode} style={settings.subtitle} overlay raised={controls.visible} onMove={moveSubtitle} />
                      <PlayerControls {...controlProps()} overlay visible={controls.visible} />
                    </>
                  )}
                </div>
              ) : (
                <div className={cn('wood-panel @container relative flex flex-col items-center gap-5 px-4 pt-10 pb-3 sm:px-6', fullscreen && 'size-full justify-center')}>
                  <PatternTint />
                  <button type="button" onClick={player.toggle} aria-label={player.playing ? 'থামান' : 'চালান'} className="relative flex size-20 items-center justify-center rounded-full border border-gold/50 bg-black/20 transition hover:bg-black/30">
                    <Headphones className={cn('size-8 text-gold', player.playing && 'animate-pulse')} />
                  </button>
                  <div className="relative flex min-h-24 w-full items-center justify-center">
                    {subtitlesOn && (cue ? <SubtitleCue segment={cue} next={nextCue} mode={subtitleMode} style={settings.subtitle} /> : <StarMark className="size-6 text-gold/40" />)}
                  </div>
                  <audio ref={player.mediaRef} src={resumeAt !== undefined ? dars.media_url : undefined} className="hidden" {...player.nativeProps} />
                  <div className="relative w-full max-w-3xl">
                    <PlayerControls {...controlProps()} />
                  </div>
                </div>
              )}
            </PortalContainer.Provider>
          </div>

          {/* in theater view the details and the episode list share the width below the player */}
          <div className={cn('space-y-4', theater && 'lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start lg:gap-4 lg:space-y-0')}>
            <div className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
              <div className="flex items-start gap-4 sm:gap-5">
                <span className="font-heading text-4xl leading-none text-gold tabular-nums sm:text-5xl">{episodeNumber(dars.number)}</span>
                <div className="min-w-0 flex-1">
                  {dars.series && (
                    <Link to="/durus/$slug" params={{ slug: dars.series.slug }} className="text-xs font-semibold tracking-wide text-muted-foreground transition hover:text-primary">
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
                <span className="ms-auto flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={copyTimestamp} title={`${bnNum(formatTime(player.time))} থেকে শোনার লিংক কপি করুন`}>
                    <Link2 className="text-gold" /> <span className="tabular-nums">{bnNum(formatTime(player.time))}</span> থেকে লিংক
                  </Button>
                  <DarsStatusMenu dars={dars} />
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <NavCard seriesSlug={dars.series?.slug} number={dars.prev_number} title={prev?.title_bn} label="আগের দারস" direction="prev" />
                <NavCard seriesSlug={dars.series?.slug} number={dars.next_number} title={next?.title_bn} label="পরের দারস" direction="next" />
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
                  <EpisodeList durus={siblings} seriesSlug={dars.series?.slug} currentId={dars.id} compact />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Transcript */}
        <div className={cn('flex max-h-[calc(100svh-7rem)] min-h-96 flex-col overflow-hidden rounded-xl border bg-parchment shadow-sm lg:sticky lg:top-24', theater && 'lg:hidden')}>
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

/** Fullscreen for the player box, so the subtitles drawn over the media stay visible. */
function useFullscreen() {
  const boxRef = useRef<HTMLDivElement>(null)
  // the box while it is fullscreen, so popovers can portal into it
  const [fullscreenEl, setFullscreenEl] = useState<HTMLElement | null>(null)
  // iPhone Safari only lets a bare <video> go fullscreen
  // read after hydration so the server and first browser render agree
  const canFullscreen = useHydrated() && document.fullscreenEnabled

  useEffect(() => {
    const onChange = () => setFullscreenEl(boxRef.current && document.fullscreenElement === boxRef.current ? boxRef.current : null)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    else boxRef.current?.requestFullscreen().catch(() => {})
  }, [])

  return { boxRef, fullscreenEl, canFullscreen, toggleFullscreen }
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
        queryClient.invalidateQueries({ queryKey: ['dars'] })
        queryClient.invalidateQueries({ queryKey: ['dars-series'] })
        toast.success(`সময়কাল ${bnNum(formatTime(seconds))} হিসেবে সেভ হয়েছে`)
      })
      .catch(() => {
        saved.current = false
      })
  }, [user?.is_admin, dars.id, dars.duration_seconds, seconds, queryClient])
}

function NavCard({ seriesSlug, number, title, label, direction }: { seriesSlug?: string; number?: number | null; title?: string; label: string; direction: 'prev' | 'next' }) {
  const id = seriesSlug ? number : null
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
    <Link to="/durus/$slug/$number" params={{ slug: seriesSlug!, number: String(id) }} rel={direction} className={cn(base, 'hover:border-gold/60 hover:bg-muted/40')}>
      {body}
    </Link>
  )
}
