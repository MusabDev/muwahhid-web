import { Captions, CaptionsOff, ChevronLeft, ChevronRight, Gauge, Keyboard, Languages, LoaderCircle, Maximize, Minimize, Palette, Pause, Play, RectangleHorizontal, RotateCcw, RotateCw, Settings, Volume1, Volume2, VolumeX } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ComponentProps, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { CheckRow, ShortcutList, SubtitleCustomizePage, SubtitleLanguagePage, SubtitleStylePage, subtitleLookLabel, subtitleModeLabel } from '@/components/subtitles'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Slider } from '@/components/ui/slider'
import type { MediaPlayer } from '@/hooks/use-media-player'
import { bnNum, formatTime } from '@/lib/text'
import type { Segment } from '@/lib/types'
import type { ReaderSettings, SubtitleStyle } from '@/lib/user-data'
import { cn } from '@/lib/utils'

export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]
export const SKIP_SECONDS = 10

const rateLabel = (r: number) => `${bnNum(r)}×`

/**
 * Whether the overlaid controls should show: always while `canHide` is false (paused, a menu open),
 * otherwise only for a moment after the last `poke` (pointer movement, a tap, a shortcut).
 */
export function useAutoHide(canHide: boolean, delay = 2500) {
  const [awake, setAwake] = useState(true)
  const timer = useRef<number | undefined>(undefined)

  const poke = useCallback(() => {
    setAwake(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setAwake(false), delay)
  }, [delay])

  const hide = useCallback(() => {
    window.clearTimeout(timer.current)
    setAwake(false)
  }, [])

  // starting to play hides the controls after the usual pause
  useEffect(() => {
    if (!canHide) return
    timer.current = window.setTimeout(() => setAwake(false), delay)
    return () => window.clearTimeout(timer.current)
  }, [canHide, delay])

  return { visible: !canHide || awake, poke, hide }
}

/**
 * The layer over the picture that takes clicks for the player: click plays or pauses, double-click is fullscreen,
 * and on touch the first tap only brings the controls back. It also shows the big play button and the buffering spinner.
 */
export function PlayerSurface({ player, visible, onPoke, onFullscreen }: { player: MediaPlayer; visible: boolean; onPoke: () => void; onFullscreen?: () => void }) {
  const clickTimer = useRef<number | undefined>(undefined)

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    if (e.pointerType !== 'mouse') {
      if (visible) player.toggle()
      onPoke()
      return
    }
    onPoke()
    // wait a moment so a double-click goes fullscreen without also pausing
    window.clearTimeout(clickTimer.current)
    clickTimer.current = window.setTimeout(player.toggle, onFullscreen ? 220 : 0)
  }

  return (
    <div
      className={cn('absolute inset-0 z-[5] flex items-center justify-center', !visible && 'cursor-none')}
      onPointerUp={onPointerUp}
      onPointerMove={(e) => e.pointerType === 'mouse' && onPoke()}
      onDoubleClick={() => {
        window.clearTimeout(clickTimer.current)
        onFullscreen?.()
      }}
    >
      {player.waiting ? (
        <LoaderCircle className="size-12 animate-spin text-white/90 drop-shadow" />
      ) : (
        !player.playing && (
          <span className="flex size-16 items-center justify-center rounded-full bg-black/55 text-white shadow-lg backdrop-blur-sm transition sm:size-20">
            <Play className="ms-1 size-8 fill-current sm:size-9" />
          </span>
        )
      )}
    </div>
  )
}

/** Seek bar with what's buffered, a tick at every transcript line, and a hover preview of the time and line. */
function SeekBar({ player, segments }: { player: MediaPlayer; segments: Segment[] }) {
  const barRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<{ x: number; width: number; t: number } | null>(null)
  const [dragTo, setDragTo] = useState<number | null>(null)
  const { duration } = player
  const shown = dragTo ?? player.time
  const pct = (t: number) => (duration ? `${Math.min(100, (t / duration) * 100)}%` : '0%')

  const at = (clientX: number) => {
    const rect = barRef.current!.getBoundingClientRect()
    const x = Math.min(rect.width, Math.max(0, clientX - rect.left))
    return { x, width: rect.width, t: duration ? (x / rect.width) * duration : 0 }
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!duration || e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragTo(at(e.clientX).t)
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!duration) return
    const { x, width, t } = at(e.clientX)
    setHover({ x, width, t })
    if (dragTo != null) setDragTo(t)
  }
  const onPointerUp = () => {
    if (dragTo == null) return
    player.seek(dragTo, player.playing)
    setDragTo(null)
  }
  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowLeft: -5, ArrowRight: 5, PageDown: -SKIP_SECONDS, PageUp: SKIP_SECONDS }[e.key]
    if (e.key === 'Home') player.seek(0, player.playing)
    else if (e.key === 'End' && duration) player.seek(duration - 1, player.playing)
    else if (step) player.seek(player.time + step, player.playing)
    else return
    e.preventDefault()
    e.stopPropagation()
  }

  const line = hover ? lineAt(segments, hover.t) : null

  return (
    <div
      ref={barRef}
      role="slider"
      tabIndex={0}
      aria-label="সময়"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(shown)}
      aria-valuetext={formatTime(shown)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => setDragTo(null)}
      onPointerLeave={() => setHover(null)}
      onKeyDown={onKeyDown}
      className="group/seek relative flex h-4 cursor-pointer touch-none items-center outline-none"
    >
      <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/25 transition-[height] group-hover/seek:h-1.5 group-focus-visible/seek:h-1.5">
        <div className="absolute inset-y-0 left-0 bg-white/35" style={{ width: pct(player.buffered) }} />
        <div className="absolute inset-y-0 left-0 bg-gold" style={{ width: pct(shown) }} />
        {!!duration &&
          segments.map((s) =>
            s.start_time > 0.5 ? <span key={s.id} className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-black/45" style={{ left: pct(s.start_time) }} /> : null,
          )}
      </div>
      <span
        className={cn('pointer-events-none absolute size-3 -translate-x-1/2 rounded-full bg-gold shadow transition-transform', dragTo != null ? 'scale-125' : 'scale-0 group-hover/seek:scale-100 group-focus-visible/seek:scale-100')}
        style={{ left: pct(shown) }}
      />
      {hover && (
        <div
          className="pointer-events-none absolute bottom-full mb-3 w-max max-w-64 -translate-x-1/2 rounded-md bg-black/85 px-2.5 py-1.5 text-center text-white shadow-lg"
          style={{ left: Math.min(Math.max(hover.x, 70), Math.max(70, hover.width - 70)) }}
        >
          <span className="block text-xs font-semibold tabular-nums">{bnNum(formatTime(hover.t))}</span>
          {line && <span className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-white/80">{line.text_bn || line.text_ar}</span>}
        </div>
      )}
    </div>
  )
}

function lineAt(segments: Segment[], t: number) {
  let found: Segment | null = null
  for (const s of segments) {
    if (s.start_time > t) break
    found = s
  }
  if (found?.end_time != null && t > found.end_time + 0.3) return null
  return found
}

/** A round player button; passes other props through so it can be a popover trigger. */
function Icon({ label, active, children, className, ...props }: ComponentProps<'button'> & { label: string; active?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      {...props}
      className={cn('relative flex size-9 shrink-0 items-center justify-center rounded-full text-white transition hover:bg-white/15 focus-visible:bg-white/15 focus-visible:outline-none [&_svg]:size-5', className)}
    >
      {children}
    </button>
  )
}

function Skip({ seconds, onClick }: { seconds: number; onClick: () => void }) {
  const back = seconds < 0
  return (
    <Icon label={back ? `${bnNum(SKIP_SECONDS)} সেকেন্ড পেছনে (J)` : `${bnNum(SKIP_SECONDS)} সেকেন্ড সামনে (L)`} onClick={onClick}>
      {back ? <RotateCcw /> : <RotateCw />}
      <span className="absolute text-[8px] font-bold">{bnNum(SKIP_SECONDS)}</span>
    </Icon>
  )
}

export interface PlayerControlsProps {
  player: MediaPlayer
  segments: Segment[]
  /** Over a video, fading out while idle; otherwise a plain bar (the audio panel). */
  overlay?: boolean
  visible?: boolean
  subtitlesOn: boolean
  onToggleSubtitles: () => void
  /** What the settings menu reads and changes. */
  settings: ReaderSettings
  update: (patch: Partial<Omit<ReaderSettings, 'subtitle'>>) => void
  updateSubtitle: (patch: Partial<SubtitleStyle>) => void
  resetSubtitle: () => void
  /** The style the subtitle reset goes back to: the dars's own, or the site default. */
  subtitleBase: SubtitleStyle
  hasVideo: boolean
  settingsOpen: boolean
  onSettingsOpenChange: (open: boolean) => void
  onRate: (rate: number) => void
  theater: boolean
  onTheater: () => void
  fullscreen: boolean
  canFullscreen: boolean
  onFullscreen: () => void
}

export function PlayerControls({
  player,
  segments,
  overlay,
  visible = true,
  subtitlesOn,
  onToggleSubtitles,
  settings,
  update,
  updateSubtitle,
  resetSubtitle,
  subtitleBase,
  hasVideo,
  settingsOpen,
  onSettingsOpenChange,
  onRate,
  theater,
  onTheater,
  fullscreen,
  canFullscreen,
  onFullscreen,
}: PlayerControlsProps) {
  const VolumeIcon = player.muted || player.volume === 0 ? VolumeX : player.volume < 50 ? Volume1 : Volume2
  const [page, setPage] = useState<MenuPage>('main')

  return (
    <div
      className={cn(
        'z-20 px-2 pb-1.5 sm:px-3',
        overlay ? 'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-10 transition-opacity duration-300' : 'relative w-full',
        overlay && !visible && 'pointer-events-none opacity-0',
      )}
    >
      <SeekBar player={player} segments={segments} />
      <div className="flex items-center gap-0.5">
        <Icon label={player.playing ? 'থামান (K)' : 'চালান (K)'} onClick={player.toggle}>
          {player.playing ? <Pause className="fill-current" /> : <Play className="fill-current" />}
        </Icon>
        <Skip seconds={-SKIP_SECONDS} onClick={() => player.seek(player.time - SKIP_SECONDS, player.playing)} />
        <Skip seconds={SKIP_SECONDS} onClick={() => player.seek(player.time + SKIP_SECONDS, player.playing)} />

        <div className="group/vol flex items-center">
          <Icon label={player.muted ? 'আওয়াজ চালু (M)' : 'আওয়াজ বন্ধ (M)'} onClick={player.toggleMute}>
            <VolumeIcon />
          </Icon>
          {/* phones set the volume with their own buttons */}
          <div className="w-0 overflow-hidden transition-[width] duration-200 group-focus-within/vol:w-20 group-hover/vol:w-20 max-sm:hidden">
            <Slider
              min={0}
              max={100}
              step={1}
              value={[player.muted ? 0 : player.volume]}
              onValueChange={([v]) => player.setVolume(v)}
              aria-label="আওয়াজ"
              className="mx-2 w-16 [&_[data-slot=slider-range]]:bg-white [&_[data-slot=slider-thumb]]:size-3 [&_[data-slot=slider-thumb]]:border-white [&_[data-slot=slider-track]]:bg-white/30"
            />
          </div>
        </div>

        <span className="ms-1.5 shrink-0 text-xs text-white/90 tabular-nums sm:text-sm">
          {bnNum(formatTime(player.time))}
          {!!player.duration && <span className="text-white/60"> / {bnNum(formatTime(player.duration))}</span>}
        </span>

        <div className="ms-auto flex items-center gap-0.5">
          <Icon label={subtitlesOn ? 'সাবটাইটেল বন্ধ (C)' : 'সাবটাইটেল চালু (C)'} onClick={onToggleSubtitles} active={subtitlesOn}>
            {subtitlesOn ? <Captions /> : <CaptionsOff />}
            {subtitlesOn && <span className="absolute inset-x-2.5 bottom-1 h-0.5 rounded-full bg-gold" />}
          </Icon>

          <Popover
            open={settingsOpen}
            onOpenChange={(open) => {
              // every opening starts from the top of the menu
              if (open) setPage('main')
              onSettingsOpenChange(open)
            }}
          >
            <PopoverTrigger asChild>
              <Icon label="সেটিংস" active={settingsOpen}>
                <Settings className={cn('transition-transform duration-300', settingsOpen && 'rotate-45')} />
                {/* a changed speed is easy to forget, so the gear shows it */}
                {player.rate !== 1 && (
                  <span className="absolute -top-0.5 -right-1 rounded bg-gold px-1 text-[9px] leading-3.5 font-bold text-gold-foreground tabular-nums">{rateLabel(player.rate)}</span>
                )}
              </Icon>
            </PopoverTrigger>
            <PopoverContent side="top" align="end" className="max-h-[min(36rem,var(--radix-popover-content-available-height))] w-80 gap-1 overflow-y-auto p-1.5 scrollbar-thin">
              <SettingsMenu page={page} onPage={setPage} player={player} onRate={onRate} settings={settings} update={update} updateSubtitle={updateSubtitle} resetSubtitle={resetSubtitle} subtitleBase={subtitleBase} hasVideo={hasVideo} />
            </PopoverContent>
          </Popover>

          {!fullscreen && (
            <Icon label="থিয়েটার ভিউ (T)" onClick={onTheater} active={theater} className="max-lg:hidden">
              <RectangleHorizontal className={cn(theater && 'fill-current')} />
            </Icon>
          )}
          {canFullscreen && (
            <Icon label={fullscreen ? 'ফুলস্ক্রিন থেকে বের হন (F)' : 'ফুলস্ক্রিন (F)'} onClick={onFullscreen}>
              {fullscreen ? <Minimize /> : <Maximize />}
            </Icon>
          )}
        </div>
      </div>
    </div>
  )
}

type MenuPage = 'main' | 'speed' | 'language' | 'style' | 'customize' | 'shortcuts'

const PAGE_TITLES: Record<Exclude<MenuPage, 'main'>, string> = {
  speed: 'গতি',
  language: 'সাবটাইটেল',
  style: 'সাবটাইটেলের স্টাইল',
  customize: 'কাস্টমাইজ',
  shortcuts: 'কিবোর্ড শর্টকাট',
}

/** The page each one goes back to. */
const PARENT: Record<Exclude<MenuPage, 'main'>, MenuPage> = { speed: 'main', language: 'main', style: 'main', customize: 'style', shortcuts: 'main' }

/** The gear menu: a short list of settings, each opening its own page, as in most video players. */
function SettingsMenu({
  page,
  onPage,
  player,
  onRate,
  settings,
  update,
  updateSubtitle,
  resetSubtitle,
  subtitleBase,
  hasVideo,
}: Pick<PlayerControlsProps, 'player' | 'onRate' | 'settings' | 'update' | 'updateSubtitle' | 'resetSubtitle' | 'subtitleBase' | 'hasVideo'> & {
  page: MenuPage
  onPage: (page: MenuPage) => void
}) {
  const sub = { style: settings.subtitle, set: updateSubtitle }

  if (page === 'main')
    return (
      <div role="menu" className="flex flex-col gap-0.5">
        <MenuRow icon={<Gauge />} label="গতি" value={player.rate === 1 ? 'সাধারণ' : rateLabel(player.rate)} onClick={() => onPage('speed')} />
        <MenuRow icon={<Languages />} label="সাবটাইটেল" value={subtitleModeLabel(settings.subtitles)} onClick={() => onPage('language')} />
        <MenuRow icon={<Palette />} label="সাবটাইটেলের স্টাইল" value={subtitleLookLabel(settings.subtitle)} onClick={() => onPage('style')} />
        {/* keyboards are rare on phones, so the list only shows where there's room for one */}
        <MenuRow icon={<Keyboard />} label="কিবোর্ড শর্টকাট" onClick={() => onPage('shortcuts')} className="max-md:hidden" />
      </div>
    )

  return (
    <>
      <button type="button" onClick={() => onPage(PARENT[page])} className="flex items-center gap-1.5 rounded-md px-1.5 py-1.5 text-sm font-semibold transition hover:bg-muted">
        <ChevronLeft className="size-4 text-muted-foreground" />
        {PAGE_TITLES[page]}
      </button>
      <div className="mb-1 border-t" />
      {page === 'speed' && (
        <div role="menu" className="flex flex-col gap-0.5">
          {PLAYBACK_RATES.map((r) => (
            <CheckRow
              key={r}
              selected={player.rate === r}
              onClick={() => {
                onRate(r)
                onPage('main')
              }}
            >
              <span className="flex-1">{rateLabel(r)}</span>
              {r === 1 && <span className="text-xs font-normal text-muted-foreground">সাধারণ</span>}
            </CheckRow>
          ))}
        </div>
      )}
      {page === 'language' && <SubtitleLanguagePage {...sub} mode={settings.subtitles} onMode={(subtitles) => update({ subtitles })} />}
      {page === 'style' && <SubtitleStylePage {...sub} base={subtitleBase} hasVideo={hasVideo} onReset={resetSubtitle} onCustomize={() => onPage('customize')} />}
      {page === 'customize' && <SubtitleCustomizePage {...sub} hasVideo={hasVideo} />}
      {page === 'shortcuts' && <ShortcutList />}
    </>
  )
}

function MenuRow({ icon, label, value, onClick, className }: { icon: ReactNode; label: string; value?: string; onClick: () => void; className?: string }) {
  return (
    <button type="button" role="menuitem" onClick={onClick} className={cn('flex items-center gap-3 rounded-md px-2 py-2 text-start text-sm transition hover:bg-muted [&>svg]:size-4', className)}>
      <span className="text-muted-foreground [&_svg]:size-4">{icon}</span>
      <span className="flex-1">{label}</span>
      {value && <span className="truncate text-xs text-muted-foreground tabular-nums">{value}</span>}
      <ChevronRight className="shrink-0 text-muted-foreground" />
    </button>
  )
}
