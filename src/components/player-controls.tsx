import { Captions, CaptionsOff, Gauge, LoaderCircle, Maximize, Minimize, Pause, Play, RectangleHorizontal, RotateCcw, RotateCw, Settings2, Volume1, Volume2, VolumeX } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ComponentProps, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Slider } from '@/components/ui/slider'
import type { MediaPlayer } from '@/hooks/use-media-player'
import { bnNum, formatTime } from '@/lib/text'
import type { Segment } from '@/lib/types'
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
  subtitleSettings: ReactNode
  settingsOpen: boolean
  onSettingsOpenChange: (open: boolean) => void
  speedOpen: boolean
  onSpeedOpenChange: (open: boolean) => void
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
  subtitleSettings,
  settingsOpen,
  onSettingsOpenChange,
  speedOpen,
  onSpeedOpenChange,
  onRate,
  theater,
  onTheater,
  fullscreen,
  canFullscreen,
  onFullscreen,
}: PlayerControlsProps) {
  const VolumeIcon = player.muted || player.volume === 0 ? VolumeX : player.volume < 50 ? Volume1 : Volume2

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

          <Popover open={speedOpen} onOpenChange={onSpeedOpenChange}>
            <PopoverTrigger asChild>
              <button type="button" title="গতি" aria-label="গতি" className="flex h-9 shrink-0 items-center gap-1 rounded-full px-2 text-xs font-semibold text-white tabular-nums transition hover:bg-white/15 focus-visible:bg-white/15 focus-visible:outline-none">
                <Gauge className="size-5 max-sm:hidden" />
                {rateLabel(player.rate)}
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" align="end" className="w-36 gap-0.5 p-1.5">
              <p className="px-2 pt-1 pb-1.5 text-xs text-muted-foreground">গতি</p>
              {PLAYBACK_RATES.map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={player.rate === r}
                  onClick={() => {
                    onRate(r)
                    onSpeedOpenChange(false)
                  }}
                  className={cn('flex items-center justify-between rounded-md px-2 py-1.5 text-sm tabular-nums transition hover:bg-muted', player.rate === r && 'bg-gold/15 font-semibold')}
                >
                  {rateLabel(r)}
                  {r === 1 && <span className="text-xs text-muted-foreground">সাধারণ</span>}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          <Popover open={settingsOpen} onOpenChange={onSettingsOpenChange}>
            <PopoverTrigger asChild>
              <Icon label="সাবটাইটেল সেটিংস" active={settingsOpen}>
                <Settings2 className={cn('transition-transform duration-300', settingsOpen && 'rotate-45')} />
              </Icon>
            </PopoverTrigger>
            <PopoverContent side="top" align="end" className="max-h-[min(36rem,var(--radix-popover-content-available-height))] w-80 overflow-y-auto p-4 scrollbar-thin">
              {subtitleSettings}
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
