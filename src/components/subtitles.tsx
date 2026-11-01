import { AlignCenter, AlignHorizontalJustifyCenter, AlignLeft, AlignRight, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd, AlignVerticalJustifyStart, Check, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { useEffect, useLayoutEffect, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { Kbd, Section } from '@/components/reader/settings-panel'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { ARABIC_FONTS, arabicFamily, banglaFamily, loadFont, readerFontVars, SUBTITLE_BANGLA_FONTS } from '@/lib/fonts'
import { bnNum } from '@/lib/text'
import type { Segment } from '@/lib/types'
import { CUE_KEYS, cueStyle, type CueOverride, type ReaderSettings, type SubtitleStyle, type SubtitleTransition } from '@/lib/user-data'
import { cn } from '@/lib/utils'

type SubtitleMode = ReaderSettings['subtitles']
type Lang = 'ar' | 'bn'

export const SUBTITLE_SIZE = { min: 60, max: 200, step: 10 }
export const SUBTITLE_POSITION = { min: 0, max: 75 }
/** How far a middle-anchored cue may move above or below the center. */
const MIDDLE_RANGE = 45
export const SUBTITLE_OFFSET = { min: -50, max: 50 }

/** The range `position` may take against each edge. */
export const positionRange = (valign: SubtitleStyle['valign']) => (valign === 'middle' ? { min: -MIDDLE_RANGE, max: MIDDLE_RANGE } : SUBTITLE_POSITION)

const clamp = (n: number, { min, max }: { min: number; max: number }) => Math.min(max, Math.max(min, n))

/** How long a line stays up after it ends when the next hasn't started, so short pauses don't blink. */
const CUE_HOLD = 0.8

/** The index of the last line that has started by `time`, or -1. */
export function lastStarted(segments: Segment[], time: number) {
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

/** The line to show as a subtitle: the active one, or the one that just ended if the gap is short. */
export function cueIndexAt(segments: Segment[], time: number) {
  const found = lastStarted(segments, time)
  if (found === -1) return -1
  const seg = segments[found]
  if (seg.end_time == null || time <= seg.end_time + CUE_HOLD) return found
  return -1
}

/** Where a cue moved to the top or bottom edge starts, in percent of the video height. */
const SUBTITLE_EDGE_GAP = 5
/** How far apart the two languages start when they are first separated, in percent of the video height. */
const SEPARATE_GAP = 14

export const clampSubtitleSize = (n: number) => Math.min(SUBTITLE_SIZE.max, Math.max(SUBTITLE_SIZE.min, n))

const TEXT_COLORS = [
  { value: '#ffffff', label: 'সাদা' },
  { value: '#f2dca6', label: 'সোনালি' },
  { value: '#ffe14d', label: 'হলুদ' },
  { value: '#7fe3ff', label: 'আসমানি' },
  { value: '#6b4a12', label: 'গাঢ় সোনালি' },
  { value: '#9be37a', label: 'সবুজ' },
  { value: '#000000', label: 'কালো' },
]

const EDGE_COLORS = [
  { value: '#000000', label: 'কালো' },
  { value: '#ffffff', label: 'সাদা' },
  { value: '#241a10', label: 'বাদামি' },
  { value: '#1e3a8a', label: 'নীল' },
]

const BACKGROUND_COLORS = [
  { value: '#000000', label: 'কালো' },
  { value: '#241a10', label: 'বাদামি' },
  { value: '#1f2937', label: 'ধূসর' },
  { value: '#fdfbf5', label: 'কাগজ' },
  { value: '#ffffff', label: 'সাদা' },
]

type Look = Pick<
  SubtitleStyle,
  'fontAr' | 'fontBn' | 'colorAr' | 'colorBn' | 'bold' | 'stroke' | 'strokeWidth' | 'strokeColor' | 'shadow' | 'shape' | 'backgroundColor' | 'backgroundOpacity' | 'backgroundBlur'
>

/** One-tap looks; picking one sets fonts, colors, edges and background, never sizes or layout. */
const PRESETS: { key: string; label: string; look: Look }[] = [
  {
    key: 'classic',
    label: 'ক্লাসিক',
    look: { fontAr: 'amiri', fontBn: 'noto-serif-bengali', colorAr: '#f2dca6', colorBn: '#ffffff', bold: false, stroke: false, strokeWidth: 2, strokeColor: '#000000', shadow: true, shape: 'box', backgroundColor: '#000000', backgroundOpacity: 55, backgroundBlur: 4 },
  },
  {
    // a dark pill with soft edges and bold sans text, as on dubbed lecture clips
    key: 'soft',
    label: 'নরম',
    look: { fontAr: 'noto-naskh-arabic', fontBn: 'hind-siliguri', colorAr: '#ffffff', colorBn: '#ffffff', bold: true, stroke: false, strokeWidth: 2, strokeColor: '#000000', shadow: false, shape: 'soft', backgroundColor: '#0b1220', backgroundOpacity: 70, backgroundBlur: 6 },
  },
  {
    // white letters with a thick black edge and no background, as in films and anime
    key: 'outline',
    label: 'আউটলাইন',
    look: { fontAr: 'noto-naskh-arabic', fontBn: 'hind-siliguri', colorAr: '#ffffff', colorBn: '#ffffff', bold: true, stroke: true, strokeWidth: 1.5, strokeColor: '#000000', shadow: true, shape: 'none', backgroundColor: '#000000', backgroundOpacity: 55, backgroundBlur: 0 },
  },
  {
    key: 'fade',
    label: 'ফেড',
    look: { fontAr: 'amiri', fontBn: 'hind-siliguri', colorAr: '#f2dca6', colorBn: '#ffffff', bold: true, stroke: false, strokeWidth: 2, strokeColor: '#000000', shadow: true, shape: 'fade', backgroundColor: '#000000', backgroundOpacity: 80, backgroundBlur: 0 },
  },
  {
    // the same rising shade in white, with dark text, for light or busy footage
    key: 'fade-light',
    label: 'সাদা ফেড',
    look: { fontAr: 'amiri', fontBn: 'hind-siliguri', colorAr: '#6b4a12', colorBn: '#16130f', bold: true, stroke: false, strokeWidth: 2, strokeColor: '#000000', shadow: false, shape: 'fade', backgroundColor: '#ffffff', backgroundOpacity: 85, backgroundBlur: 0 },
  },
  {
    key: 'bright',
    label: 'উজ্জ্বল',
    look: { fontAr: 'noto-naskh-arabic', fontBn: 'hind-siliguri', colorAr: '#ffe14d', colorBn: '#ffe14d', bold: true, stroke: false, strokeWidth: 2, strokeColor: '#000000', shadow: false, shape: 'lines', backgroundColor: '#000000', backgroundOpacity: 100, backgroundBlur: 0 },
  },
  {
    key: 'paper',
    label: 'কাগজ',
    look: { fontAr: 'amiri', fontBn: 'noto-serif-bengali', colorAr: '#2a2118', colorBn: '#4a3d30', bold: false, stroke: false, strokeWidth: 2, strokeColor: '#000000', shadow: false, shape: 'box', backgroundColor: '#fdfbf5', backgroundOpacity: 92, backgroundBlur: 0 },
  },
]

const SHAPES: { key: SubtitleStyle['shape']; label: string }[] = [
  { key: 'box', label: 'বক্স' },
  { key: 'soft', label: 'নরম' },
  { key: 'lines', label: 'লাইন' },
  { key: 'fade', label: 'ফেড' },
  { key: 'none', label: 'নেই' },
]

export const SUBTITLE_SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['Space', 'K'], label: 'চালান / থামান' },
  { keys: ['←', '→'], label: '৫ সেকেন্ড পেছনে / সামনে' },
  { keys: ['J', 'L'], label: '১০ সেকেন্ড পেছনে / সামনে' },
  { keys: ['M'], label: 'আওয়াজ বন্ধ / চালু' },
  { keys: ['C'], label: 'সাবটাইটেল চালু / বন্ধ' },
  { keys: ['+', '−'], label: 'লেখার আকার' },
  { keys: ['[', ']'], label: 'আগের / পরের লাইন' },
  { keys: ['T'], label: 'থিয়েটার ভিউ' },
  { keys: ['F'], label: 'ফুলস্ক্রিন' },
]

/** Room the overlaid controls take at the bottom of the video; a raised cue stays above it. */
const CONTROLS_HEIGHT = 60

const BASE = {
  ar: { size: 'clamp(1.05rem, 3.1cqw, 3.25rem)', leading: 1.6 },
  bn: { size: 'clamp(0.9rem, 2.4cqw, 2.5rem)', leading: 1.5 },
}

/**
 * Over a video everything is a share of the player width, with no floor or cap, so a cue covers the same part
 * of the picture on a phone as on a desktop: it wraps the same and sits on the same spot. Outline and shadow
 * widths are given in px as seen on a player this wide.
 */
const REFERENCE_WIDTH = 960
const scaled = (px: number) => `${((px * 100) / REFERENCE_WIDTH).toFixed(3)}cqw`
const SCALED_SIZE = { ar: '3.1cqw', bn: '2.4cqw' }

type ShadowLook = Pick<SubtitleStyle, 'shadowColor' | 'shadowOpacity' | 'shadowBlur' | 'shadowX' | 'shadowY'>

const shade = (color: string, opacity: number) => `color-mix(in srgb, ${color} ${Math.round(Math.min(100, opacity))}%, transparent)`

/**
 * A tight edge on every side, then a softer layer and the full shadow towards (x, y), so light text holds up on
 * bright footage. The defaults give black at 0 0 2px, 0 1px 3px and 0 2px 10px.
 */
const textShadow = (s: ShadowLook, unit: (px: number) => string) =>
  [
    `0 0 ${unit(s.shadowBlur * 0.2)} ${shade(s.shadowColor, s.shadowOpacity)}`,
    `${unit(s.shadowX * 0.5)} ${unit(s.shadowY * 0.5)} ${unit(s.shadowBlur * 0.3)} ${shade(s.shadowColor, s.shadowOpacity * 0.9)}`,
    `${unit(s.shadowX)} ${unit(s.shadowY)} ${unit(s.shadowBlur)} ${shade(s.shadowColor, s.shadowOpacity * 0.55)}`,
  ].join(', ')
const px = (n: number) => `${n}px`

type Backdrop = Pick<SubtitleStyle, 'backgroundColor' | 'backgroundOpacity' | 'backgroundBlur'>

const fill = (s: Backdrop) => `color-mix(in srgb, ${s.backgroundColor} ${s.backgroundOpacity}%, transparent)`
const blur = (s: Backdrop) => (s.backgroundBlur ? `blur(${s.backgroundBlur}px)` : undefined)
/** Opacity along an eased fade (position 0–1, alpha), so the shade melts away without a visible edge. */
const EASE = [[0, 1], [0.19, 0.738], [0.34, 0.541], [0.47, 0.382], [0.565, 0.278], [0.65, 0.194], [0.73, 0.126], [0.802, 0.075], [0.861, 0.042], [0.91, 0.021], [0.952, 0.008], [0.982, 0.002], [1, 0]]

/** A mask rising from the bottom (or, `to bottom`, falling from the top): solid up to `from`, then easing out to nothing at `to` (in `unit`). */
const easedMask = (from: number, to: number, unit: string, direction = 'to top') =>
  `linear-gradient(${direction}, black ${from}${unit}, ${EASE.map(([p, a]) => `rgb(0 0 0 / ${a}) ${from + (to - from) * p}${unit}`).join(', ')})`

const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`

/** The shade behind the text for the box shapes; "soft" spreads it past the edges with a shadow of the same color. */
const boxFill = (s: Backdrop & Pick<SubtitleStyle, 'shape'>, feather: string): CSSProperties =>
  s.shape === 'box' || s.shape === 'soft'
    ? {
        background: fill(s),
        backdropFilter: blur(s),
        WebkitBackdropFilter: blur(s),
        boxShadow: s.shape === 'soft' ? `0 0 ${feather} calc(${feather} / 2) ${fill(s)}` : undefined,
      }
    : {}

function textOf(segment: Segment, mode: SubtitleMode, order: Lang): { lang: Lang; text: string }[] {
  const lines: { lang: Lang; text: string }[] = []
  if (mode !== 'bn' && segment.text_ar) lines.push({ lang: 'ar', text: segment.text_ar })
  if (mode !== 'ar' && segment.text_bn) lines.push({ lang: 'bn', text: segment.text_bn })
  return order === 'bn' ? lines.reverse() : lines
}

const TRANSITIONS: { key: SubtitleTransition; label: string }[] = [
  { key: 'fade', label: 'ফেড' },
  { key: 'rise', label: 'নিচ থেকে' },
  { key: 'rise-blur', label: 'নিচ থেকে + ব্লার' },
  { key: 'blur', label: 'ব্লার' },
  { key: 'zoom', label: 'জুম' },
  { key: 'drop', label: 'উপর থেকে' },
  { key: 'words', label: 'শব্দে শব্দে' },
]

/** The longest a word-by-word line may take to finish coming in, however many words it has. */
const WORDS_MAX_MS = 1500

/** One entrance, as an inline animation (keyframes in index.css); `data-sub-enter` lets reduced motion make it a plain fade. */
const enter = (name: Exclude<SubtitleTransition, 'words'>, ms: number, delay = 0) => ({
  'data-sub-enter': '',
  style: { animation: `sub-${name} ${ms}ms cubic-bezier(0.2, 0.7, 0.2, 1) ${delay}ms both` } as CSSProperties,
})

/** The words of a line, each coming in a little after the one before, rising out of a blur. */
function Words({ text, ms }: { text: string; ms: number }) {
  const parts = text.split(/(\s+)/)
  const count = parts.filter((p) => p.trim()).length
  const stagger = Math.min(ms / 4, (WORDS_MAX_MS - ms) / Math.max(1, count - 1))
  let i = 0
  return parts.map((part, n) =>
    part.trim() ? (
      <span key={n} className="inline-block" {...enter('rise-blur', ms, Math.max(0, stagger) * i++)}>
        {part}
      </span>
    ) : (
      part
    ),
  )
}

function Line({ lang, text, s, dim, overlay, words }: { lang: Lang; text: string; s: SubtitleStyle; dim?: boolean; overlay?: boolean; words?: boolean }) {
  const size = (lang === 'ar' ? s.sizeAr : s.sizeBn) / 100
  const unit = overlay ? scaled : px
  const style: CSSProperties = {
    color: lang === 'ar' ? s.colorAr : s.colorBn,
    fontFamily: lang === 'ar' ? 'var(--font-ar), serif' : 'var(--font-bn), serif',
    fontSize: `calc(${overlay ? SCALED_SIZE[lang] : BASE[lang].size} * ${dim ? size * 0.8 : size})`,
    lineHeight: BASE[lang].leading * (s.lineHeight / 100),
    fontWeight: s.bold ? 700 : undefined,
    textAlign: s.align,
    opacity: dim ? 0.55 : undefined,
    // the stroke is painted under the fill, so only its outer half shows
    WebkitTextStroke: s.stroke ? `${unit(s.strokeWidth * 2)} ${s.strokeColor}` : undefined,
    paintOrder: s.stroke ? 'stroke fill' : undefined,
    // a tight dark edge on every side, then a soft glow, so light text holds up on bright footage
    textShadow: s.shadow ? textShadow(s, unit) : undefined,
  }
  const strip: CSSProperties | undefined =
    s.shape === 'lines'
      ? { background: fill(s), backdropFilter: blur(s), WebkitBackdropFilter: blur(s), boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone', padding: '0.05em 0.35em', borderRadius: '0.2em' }
      : undefined
  return (
    <p lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'} style={style} className={cn('w-full', lang === 'ar' ? 'text-balance' : 'text-pretty')}>
      {strip ? <span style={strip}>{words ? <Words text={text} ms={s.transitionMs} /> : text}</span> : words ? <Words text={text} ms={s.transitionMs} /> : text}
    </p>
  )
}

/**
 * The subtitles for one moment: one cue with both languages, or, when the style keeps them `separate`,
 * a cue per language, each placed and styled on its own. Dragging a separate cue moves only that language.
 */
export function SubtitleCue(props: CueProps) {
  const { style, mode, onMove } = props
  if (!style.separate) return <CueBlock {...props} />
  const cues = (['ar', 'bn'] as const).filter((l) => mode === 'both' || mode === l).map((lang) => ({ lang, style: cueStyle(style, lang) }))
  // clearing the controls lifts every bottom cue by the same amount, so the two keep their spacing
  const bottoms = cues.filter((c) => c.style.valign === 'bottom').map((c) => c.style.position)
  const floor = bottoms.length ? Math.min(...bottoms) : undefined
  return (
    <>
      {cues.map(({ lang, style }) => (
        <CueBlock key={lang} {...props} mode={lang} style={style} floor={floor} onMove={onMove && ((patch) => onMove({ [lang]: patch }))} />
      ))}
    </>
  )
}

interface CueProps {
  segment: Segment | null
  next?: Segment | null
  mode: SubtitleMode
  style: SubtitleStyle
  overlay?: boolean
  raised?: boolean
  onMove?: (patch: Partial<SubtitleStyle>) => void
  /** The lowest bottom cue's position, when there are several: all of them rise until that one clears the controls. */
  floor?: number
  /** Changing it plays the entrance again, to see a transition while nothing new is playing. */
  replayKey?: string | number
}

/**
 * One subtitle cue. `overlay` sits over a video frame, against the edge `valign` names, and can be dragged anywhere
 * (reported via `onMove`; Shift keeps the drag to one direction); otherwise it flows inside its box (the audio panel).
 * Sizes follow the width of the nearest `@container`, so the text grows with theater view and fullscreen.
 * `raised` keeps a bottom cue clear of the controls while they show.
 */
function CueBlock({ segment, next, mode, style, overlay, raised, onMove, floor, replayKey }: CueProps) {
  // a shade rising from the edge can't sit around a cue in the middle, so there it becomes a soft box
  const s = overlay && style.valign === 'middle' && style.shape === 'fade' ? { ...style, shape: 'soft' as const } : style
  const [drag, setDrag] = useState<{ startX: number; startY: number; startPos: number; startOffset: number; width: number; height: number; pos: number; offset: number } | null>(null)
  const { attach: measureShade, text: textHeight, frame: frameHeight } = useFadeShade(!!overlay && s.shape === 'fade' && !!segment && mode !== 'off')
  if (!segment || mode === 'off') return null
  const lines = textOf(segment, mode, s.order)
  if (!lines.length) return null
  const upcoming = s.nextLine && next ? textOf(next, mode, s.order) : []

  const byWord = s.fade && s.transition === 'words'
  const draggable = overlay && !!onMove
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggable || e.button !== 0) return
    const frame = e.currentTarget.parentElement?.parentElement
    if (!frame) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag({ startX: e.clientX, startY: e.clientY, startPos: s.position, startOffset: s.offsetX, width: frame.clientWidth, height: frame.clientHeight, pos: s.position, offset: s.offsetX })
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag) return
    let dx = ((e.clientX - drag.startX) / drag.width) * 100
    let dy = ((e.clientY - drag.startY) / drag.height) * 100
    if (e.shiftKey) {
      if (Math.abs(dx) > Math.abs(dy)) dy = 0
      else dx = 0
    }
    // a top cue's distance grows downwards, the others' upwards
    const pos = drag.startPos + (s.valign === 'top' ? dy : -dy)
    setDrag({ ...drag, pos: Math.round(clamp(pos, positionRange(s.valign))), offset: Math.round(clamp(drag.startOffset + dx, SUBTITLE_OFFSET)) })
  }
  const onPointerUp = () => {
    if (!drag) return
    if (drag.pos !== s.position || drag.offset !== s.offsetX) onMove?.({ position: drag.pos, offsetX: drag.offset })
    setDrag(null)
  }

  const box: CSSProperties = {
    maxWidth: `min(100%, ${s.width}cqw)`,
    alignItems: { center: 'center', left: 'flex-start', right: 'flex-end' }[s.align],
    ...boxFill(s, '0.9em'),
  }
  const pos = drag?.pos ?? s.position
  const offset = drag?.offset ?? s.offsetX
  const lift = raised && !drag && s.valign === 'bottom' ? CONTROLS_HEIGHT : 0
  // how far the lowest cue sits; on its own, that's this one
  const lowest = floor ?? pos
  // the cue's column is narrowed from one side, so it moves without ever leaving the frame
  const placement: CSSProperties = {
    left: `${Math.max(0, offset * 2)}%`,
    right: `${Math.max(0, -offset * 2)}%`,
    ...(s.valign === 'bottom'
      ? { bottom: lift ? `calc(${pos}% + max(0px, ${lift}px - ${lowest}%))` : `${pos}%` }
      : s.valign === 'top'
        ? { top: `${pos}%` }
        : { top: `${50 - pos}%`, transform: 'translateY(-50%)' }),
  }
  // the shade is sized from the measured text block, so it hugs one line or four alike
  const textNear = (frameHeight * pos) / 100 + Math.max(0, lift - (frameHeight * lowest) / 100)
  const textFar = textNear + textHeight
  const shadeEnd = textFar + (textHeight * s.fadeHeight) / 100
  // full strength only between the text and the edge; through and past it the shade thins out, so the picture shows through
  const solidTo = textNear
  const fromTop = s.valign === 'top'

  return (
    <>
      {/* the bottom shade only makes sense over a picture */}
      {overlay && s.shape === 'fade' && textHeight > 0 && (
        <div
          aria-hidden
          className={cn('pointer-events-none absolute inset-x-0 z-[6] animate-in duration-500 fade-in-0', fromTop ? 'top-0' : 'bottom-0', !drag && 'transition-[height] duration-300')}
          style={{
            height: shadeEnd,
            background: fill(s),
            backdropFilter: blur(s),
            WebkitBackdropFilter: blur(s),
            // a mask fades the color and the blur together
            maskImage: easedMask(solidTo, shadeEnd, 'px', fromTop ? 'to bottom' : 'to top'),
            WebkitMaskImage: easedMask(solidTo, shadeEnd, 'px', fromTop ? 'to bottom' : 'to top'),
          }}
        >
          {/* a faint grain keeps a long dark gradient from showing bands */}
          <div className="absolute inset-0 opacity-[0.07] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />
        </div>
      )}
      <div
        ref={measureShade}
        style={{ ...readerFontVars(s.fontAr, s.fontBn), ...(overlay ? placement : {}) }}
        className={cn(
          'pointer-events-none flex px-[4%]',
          { center: 'justify-center', left: 'justify-start', right: 'justify-end' }[s.align],
          overlay ? 'absolute z-10' : 'w-full',
          overlay && !drag && 'transition-[top,bottom,left,right] duration-300',
        )}
      >
        <div
          style={box}
          title={draggable ? 'টেনে সরান (Shift চেপে এক দিকে)' : undefined}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className={cn(
            'flex flex-col gap-[0.15em] px-[0.9em] py-[0.35em] select-none',
            s.shape === 'soft' ? 'rounded-[0.8em]' : 'rounded-[0.4em]',
            draggable && 'pointer-events-auto cursor-grab touch-none',
            draggable && !drag && 'ring-white/30 hover:ring-1',
            drag && 'cursor-grabbing ring-2 ring-gold/70',
          )}
        >
          {/* keyed by the words, so a cue that stays the same doesn't come in again */}
          <div key={`${segment.text_ar}|${segment.text_bn}|${replayKey ?? 0}`} className="flex w-full flex-col gap-[0.15em]" {...(s.fade && !byWord ? enter(s.transition as Exclude<SubtitleTransition, 'words'>, s.transitionMs) : {})}>
            {lines.map((l) => (
              <Line key={l.lang} {...l} s={s} overlay={overlay} words={byWord} />
            ))}
            {/* the dimmed next line only fades, even when the current one comes in word by word */}
            {upcoming.map((l) => (
              <div key={`next-${l.lang}`} {...(byWord ? enter('fade', s.transitionMs) : {})}>
                <Line {...l} s={s} overlay={overlay} dim />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

/**
 * Heights (px) of the caption block and the video frame it sits in, kept current while `active`,
 * so the bottom shade can reach just past the text however many lines it wraps to.
 */
function useFadeShade(active: boolean) {
  const [wrap, setWrap] = useState<HTMLDivElement | null>(null)
  const [size, setSize] = useState({ text: 0, frame: 0 })

  useLayoutEffect(() => {
    const frame = wrap?.parentElement
    if (!active || !wrap || !frame) return
    const measure = () => setSize({ text: wrap.offsetHeight, frame: frame.clientHeight })
    const observer = new ResizeObserver(measure)
    observer.observe(wrap)
    observer.observe(frame)
    return () => observer.disconnect()
  }, [active, wrap])

  return { attach: setWrap, ...size }
}

const MODES: { value: SubtitleMode; label: string }[] = [
  { value: 'both', label: 'আরবি ও বাংলা' },
  { value: 'ar', label: 'শুধু আরবি' },
  { value: 'bn', label: 'শুধু বাংলা' },
  { value: 'off', label: 'বন্ধ' },
]

export const subtitleModeLabel = (mode: SubtitleMode) => MODES.find((m) => m.value === mode)?.label ?? ''

const presetOf = (s: SubtitleStyle) => PRESETS.find((p) => (Object.keys(p.look) as (keyof Look)[]).every((k) => p.look[k] === s[k]))

/** The preset the style matches, or "custom" once something was changed by hand. */
export const subtitleLookLabel = (s: SubtitleStyle) => presetOf(s)?.label ?? 'কাস্টম'

const sameStyle = (a: SubtitleStyle, b: SubtitleStyle) => (Object.keys(b) as (keyof SubtitleStyle)[]).every((k) => JSON.stringify(a[k] ?? null) === JSON.stringify(b[k] ?? null))

/** Clears what each language set for itself among `keys`, so a change made for both shows in both. */
const forBoth = (keys: readonly string[]) => {
  const cleared = Object.fromEntries(keys.filter((k) => (CUE_KEYS as readonly string[]).includes(k)).map((k) => [k, null])) as CueOverride
  return { ar: cleared, bn: cleared }
}

/** What a page of subtitle settings edits: the player menu's viewer settings, or a dars's style in the admin panel. */
export interface SubtitleEditorProps {
  style: SubtitleStyle
  set: (patch: Partial<SubtitleStyle>) => void
}

/** A menu row that is one of a set of choices, ticked when chosen. */
export function CheckRow({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={selected}
      onClick={onClick}
      className={cn('flex items-center gap-2.5 rounded-md px-2 py-1.5 text-start text-sm tabular-nums transition hover:bg-muted', selected && 'font-semibold')}
    >
      <Check className={cn('size-4 shrink-0 text-gold', !selected && 'invisible')} />
      {children}
    </button>
  )
}

export function SubtitleLanguagePage({ mode, onMode, style: s, set }: SubtitleEditorProps & { mode: SubtitleMode; onMode: (mode: SubtitleMode) => void }) {
  return (
    <div className="flex flex-col gap-0.5">
      {MODES.map((m) => (
        <CheckRow key={m.value} selected={mode === m.value} onClick={() => onMode(m.value)}>
          {m.label}
        </CheckRow>
      ))}
      {mode === 'both' && !s.separate && (
        <div className="mt-1.5 border-t px-2 pt-3 pb-1">
          <Section label="উপরে কোন লাইন">
            <ToggleGroup type="single" variant="outline" size="sm" className="w-full" value={s.order} onValueChange={(v) => v && set({ order: v as Lang })}>
              <ToggleGroupItem value="ar" className="flex-1">
                আরবি
              </ToggleGroupItem>
              <ToggleGroupItem value="bn" className="flex-1">
                বাংলা
              </ToggleGroupItem>
            </ToggleGroup>
          </Section>
        </div>
      )}
    </div>
  )
}

/**
 * The everyday choices: a ready-made look, the size, (over a video) the height, and the outline and shadow on or off. The rest is behind `onCustomize`.
 * Reset goes back to `base`, the style the page started from.
 */
export function SubtitleStylePage({
  style: s,
  base,
  hasVideo,
  set,
  onReset,
  onCustomize,
}: SubtitleEditorProps & { base: SubtitleStyle; hasVideo: boolean; onReset: () => void; onCustomize?: () => void }) {
  const isDefault = sameStyle(s, base)
  const activePreset = presetOf(s)?.key
  // one size for both scripts; moving it shifts both, like the + and − keys
  const size = Math.round((s.sizeAr + s.sizeBn) / 2)
  const resize = (v: number) => set({ sizeAr: clampSubtitleSize(s.sizeAr + v - size), sizeBn: clampSubtitleSize(s.sizeBn + v - size) })

  // the preset previews are drawn in their own fonts
  useEffect(() => {
    for (const p of PRESETS) {
      loadFont(p.look.fontAr)
      loadFont(p.look.fontBn)
    }
  }, [])

  return (
    <div className="space-y-4 px-1.5 pb-1.5">
      <div className="grid grid-cols-3 gap-2">
        {PRESETS.map((p) => (
          <Tile key={p.key} label={p.label} active={activePreset === p.key} onClick={() => set({ ...p.look, ...forBoth(Object.keys(p.look)) })}>
            <MiniCaption look={p.look} />
          </Tile>
        ))}
      </div>
      <SliderRow label="লেখার আকার" display={`${bnNum(size)}%`} min={SUBTITLE_SIZE.min} max={SUBTITLE_SIZE.max} step={SUBTITLE_SIZE.step} value={size} onChange={resize} />
      {hasVideo &&
        (s.separate ? (
          (['ar', 'bn'] as const).map((lang) => <PositionSlider key={lang} style={cueStyle(s, lang)} set={(patch) => set({ [lang]: patch })} prefix={LANG_LABELS[lang]} />)
        ) : (
          <PositionSlider style={s} set={set} />
        ))}
      {/* the edges the looks set, to switch off without opening the full settings; for both languages at once */}
      <div className="space-y-3">
        <SwitchRow label="আউটলাইন (স্ট্রোক)" checked={s.stroke} onChange={(stroke) => set({ stroke, ...forBoth(['stroke']) })} />
        <SwitchRow label="ছায়া" checked={s.shadow} onChange={(shadow) => set({ shadow, ...forBoth(['shadow']) })} />
      </div>
      <div className="flex items-center gap-2 border-t pt-3">
        {onCustomize && (
          <Button variant="outline" size="sm" className="flex-1" onClick={onCustomize}>
            <SlidersHorizontal /> কাস্টমাইজ
          </Button>
        )}
        <Button variant="ghost" size="sm" className="text-muted-foreground" disabled={isDefault} onClick={onReset}>
          <RotateCcw /> রিসেট
        </Button>
      </div>
    </div>
  )
}

const POSITION_LABELS: Record<SubtitleStyle['valign'], string> = { bottom: 'নিচ থেকে দূরত্ব', top: 'উপর থেকে দূরত্ব', middle: 'মাঝ থেকে উপরে-নিচে' }

const LANG_LABELS: Record<Lang, string> = { ar: 'আরবি', bn: 'বাংলা' }

/** The distance from the edge the cue sits against; `prefix` names the language when each has its own. */
function PositionSlider({ style: s, set, prefix }: SubtitleEditorProps & { prefix?: string }) {
  const range = positionRange(s.valign)
  return (
    <SliderRow
      label={prefix ? `${prefix}: ${POSITION_LABELS[s.valign]}` : POSITION_LABELS[s.valign]}
      hint="ভিডিওর উপর সাবটাইটেল টেনেও সরানো যায়"
      display={`${bnNum(s.position)}%`}
      min={range.min}
      max={range.max}
      step={1}
      value={clamp(s.position, range)}
      onChange={(position) => set({ position })}
    />
  )
}

/**
 * Every setting one by one, for fine-tuning a look. Placing the cue only shows `hasVideo`, where there is a frame to place it in.
 * Fonts, sizes and colors are always per language; the rest is shared, or, once the languages are `separate`, per language too.
 */
export function SubtitleCustomizePage({ style: s, set, hasVideo }: SubtitleEditorProps & { hasVideo: boolean }) {
  const [lang, setLang] = useState<Lang>('ar')
  const size = lang === 'ar' ? s.sizeAr : s.sizeBn
  // the chosen language's cue while the two are apart, otherwise the shared one
  const c = cueStyle(s, lang)
  const setCue = (patch: CueOverride) => set(s.separate ? { [lang]: patch } : (patch as Partial<SubtitleStyle>))

  const separate = (on: boolean) => {
    if (!on) return set({ separate: false })
    // the two start one above the other, the upper one as the shared order has it, so they don't overlap
    const step = s.valign === 'top' ? -SEPARATE_GAP : SEPARATE_GAP
    const upper = s.order
    const lower = upper === 'ar' ? 'bn' : 'ar'
    const at = (n: number) => clamp(n, positionRange(s.valign))
    set({
      separate: true,
      [upper]: { position: s[upper].position ?? at(s.position + (s.valign === 'top' ? 0 : step)) },
      [lower]: { position: s[lower].position ?? at(s.position + (s.valign === 'top' ? -step : 0)) },
    })
  }

  return (
    <div className="space-y-3 px-1.5 pb-1.5">
      <SwitchRow label="আরবি ও বাংলা আলাদা" hint="প্রতিটি ভাষার জায়গা ও সাজ আলাদা করে ঠিক করুন" checked={s.separate} onChange={separate} />
      <ToggleGroup type="single" variant="outline" size="sm" className="w-full" value={lang} onValueChange={(v) => v && setLang(v as Lang)}>
        <ToggleGroupItem value="ar" className="flex-1">
          আরবি লাইন
        </ToggleGroupItem>
        <ToggleGroupItem value="bn" className="flex-1">
          বাংলা লাইন
        </ToggleGroupItem>
      </ToggleGroup>
      {!s.separate && <p className="text-[11px] text-muted-foreground">ফন্ট, আকার ও রং প্রতিটি ভাষার আলাদা; বাকিগুলো দুই ভাষাতেই।</p>}
      <Tabs defaultValue="text">
        <TabsList className="w-full">
          <TabsTrigger value="text">লেখা</TabsTrigger>
          <TabsTrigger value="edge">আউটলাইন</TabsTrigger>
          <TabsTrigger value="box">পটভূমি</TabsTrigger>
          <TabsTrigger value="layout">বিন্যাস</TabsTrigger>
        </TabsList>

        <TabsContent value="text" className="space-y-4 pt-2">
          <Section label="ফন্ট">
            {lang === 'ar' ? (
              <FontSelect value={s.fontAr} fonts={ARABIC_FONTS} onChange={(fontAr) => set({ fontAr })} />
            ) : (
              <FontSelect value={s.fontBn} fonts={SUBTITLE_BANGLA_FONTS} onChange={(fontBn) => set({ fontBn })} />
            )}
          </Section>
          <SliderRow
            label="লেখার আকার"
            display={`${bnNum(size)}%`}
            min={SUBTITLE_SIZE.min}
            max={SUBTITLE_SIZE.max}
            step={SUBTITLE_SIZE.step}
            value={size}
            onChange={(v) => set(lang === 'ar' ? { sizeAr: v } : { sizeBn: v })}
          />
          <Section label="লেখার রং">
            <Swatches value={lang === 'ar' ? s.colorAr : s.colorBn} options={TEXT_COLORS} onChange={(v) => set(lang === 'ar' ? { colorAr: v } : { colorBn: v })} />
          </Section>
          <div className="border-t pt-4">
            <SwitchRow label="মোটা অক্ষর" hint={s.separate ? undefined : 'দুই ভাষাতেই'} checked={c.bold} onChange={(bold) => setCue({ bold })} />
          </div>
        </TabsContent>

        <TabsContent value="edge" className="space-y-4 pt-2">
          <SwitchRow label="আউটলাইন (স্ট্রোক)" checked={c.stroke} onChange={(stroke) => setCue({ stroke })} />
          <SliderRow label="আউটলাইনের পুরুত্ব" display={`${bnNum(c.strokeWidth)}px`} min={0.5} max={6} step={0.5} value={c.strokeWidth} disabled={!c.stroke} onChange={(strokeWidth) => setCue({ strokeWidth })} />
          <Section label="আউটলাইনের রং">
            <Swatches value={c.strokeColor} options={EDGE_COLORS} disabled={!c.stroke} onChange={(strokeColor) => setCue({ strokeColor })} />
          </Section>
          <div className="border-t pt-4">
            <SwitchRow label="ছায়া" hint="যেকোনো দৃশ্যের উপর লেখা পড়তে সহজ করে" checked={c.shadow} onChange={(shadow) => setCue({ shadow })} />
          <div className="mt-4 space-y-4">
            <Section label="ছায়ার রং">
              <Swatches value={c.shadowColor} options={EDGE_COLORS} disabled={!c.shadow} onChange={(shadowColor) => setCue({ shadowColor })} />
            </Section>
            <SliderRow label="ছায়ার গাঢ়তা" display={`${bnNum(c.shadowOpacity)}%`} min={0} max={100} step={5} value={c.shadowOpacity} disabled={!c.shadow} onChange={(shadowOpacity) => setCue({ shadowOpacity })} />
            <SliderRow label="ছায়ার ছড়ানো" display={`${bnNum(c.shadowBlur)}px`} min={0} max={30} step={1} value={c.shadowBlur} disabled={!c.shadow} onChange={(shadowBlur) => setCue({ shadowBlur })} />
            <SliderRow label="ছায়া ডানে-বামে" display={`${bnNum(c.shadowX)}px`} min={-10} max={10} step={1} value={c.shadowX} disabled={!c.shadow} onChange={(shadowX) => setCue({ shadowX })} />
            <SliderRow label="ছায়া উপরে-নিচে" display={`${bnNum(c.shadowY)}px`} min={-10} max={10} step={1} value={c.shadowY} disabled={!c.shadow} onChange={(shadowY) => setCue({ shadowY })} />
          </div>
          </div>
        </TabsContent>

        <TabsContent value="box" className="space-y-4 pt-2">
          <Section label="ধরন">
            <div className="grid grid-cols-5 gap-1.5">
              {SHAPES.map((shape) => (
                <Tile key={shape.key} label={shape.label} active={c.shape === shape.key} onClick={() => setCue({ shape: shape.key })}>
                  <MiniCaption look={{ ...c, shape: shape.key }} short />
                </Tile>
              ))}
            </div>
          </Section>
          {c.shape === 'fade' && (
            <SliderRow
              label="ফেডের উচ্চতা"
              hint="লেখার উপরে কতদূর পর্যন্ত ছায়া উঠবে, লেখার উচ্চতার তুলনায়"
              display={`${bnNum(c.fadeHeight)}%`}
              min={0}
              max={200}
              step={10}
              value={c.fadeHeight}
              onChange={(fadeHeight) => setCue({ fadeHeight })}
            />
          )}
          <Section label="পটভূমির রং">
            <Swatches value={c.backgroundColor} options={BACKGROUND_COLORS} disabled={c.shape === 'none'} onChange={(backgroundColor) => setCue({ backgroundColor })} />
          </Section>
          <SliderRow label="অস্বচ্ছতা" display={`${bnNum(c.backgroundOpacity)}%`} min={0} max={100} step={5} value={c.backgroundOpacity} disabled={c.shape === 'none'} onChange={(backgroundOpacity) => setCue({ backgroundOpacity })} />
          <SliderRow label="ব্লার" display={`${bnNum(c.backgroundBlur)}px`} min={0} max={20} step={1} value={c.backgroundBlur} disabled={c.shape === 'none'} onChange={(backgroundBlur) => setCue({ backgroundBlur })} />
        </TabsContent>

        <TabsContent value="layout" className="space-y-4 pt-2">
          {hasVideo && (
            <div className="space-y-4 border-b pb-4">
              <Section label="কোথায় বসবে">
                <ToggleGroup
                  type="single"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  value={c.valign}
                  // a new edge starts near it; the middle starts at the center
                  onValueChange={(v) => v && v !== c.valign && setCue({ valign: v as SubtitleStyle['valign'], position: v === 'middle' ? 0 : SUBTITLE_EDGE_GAP })}
                >
                  <ToggleGroupItem value="top" aria-label="উপরে" className="flex-1">
                    <AlignVerticalJustifyStart /> উপরে
                  </ToggleGroupItem>
                  <ToggleGroupItem value="middle" aria-label="মাঝে" className="flex-1">
                    <AlignVerticalJustifyCenter /> মাঝে
                  </ToggleGroupItem>
                  <ToggleGroupItem value="bottom" aria-label="নিচে" className="flex-1">
                    <AlignVerticalJustifyEnd /> নিচে
                  </ToggleGroupItem>
                </ToggleGroup>
              </Section>
              <PositionSlider style={c} set={setCue} />
              <SliderRow
                label="ডানে-বামে সরানো"
                display={
                  <span className="flex items-center gap-1.5">
                    {bnNum(c.offsetX)}%
                    <button type="button" disabled={!c.offsetX} onClick={() => setCue({ offsetX: 0 })} title="মাঝে আনুন" aria-label="মাঝে আনুন" className="text-muted-foreground transition hover:text-foreground disabled:opacity-40">
                      <AlignHorizontalJustifyCenter className="size-3.5" />
                    </button>
                  </span>
                }
                min={SUBTITLE_OFFSET.min}
                max={SUBTITLE_OFFSET.max}
                step={1}
                value={c.offsetX}
                onChange={(offsetX) => setCue({ offsetX })}
              />
            </div>
          )}
          <Section label="সারিবদ্ধতা">
            <ToggleGroup type="single" variant="outline" size="sm" className="w-full" value={c.align} onValueChange={(v) => v && setCue({ align: v as SubtitleStyle['align'] })}>
              <ToggleGroupItem value="left" aria-label="বামে" className="flex-1">
                <AlignLeft />
              </ToggleGroupItem>
              <ToggleGroupItem value="center" aria-label="মাঝে" className="flex-1">
                <AlignCenter />
              </ToggleGroupItem>
              <ToggleGroupItem value="right" aria-label="ডানে" className="flex-1">
                <AlignRight />
              </ToggleGroupItem>
            </ToggleGroup>
          </Section>
          <SliderRow label="লাইনের ফাঁক" display={`${bnNum(c.lineHeight)}%`} min={70} max={160} step={10} value={c.lineHeight} onChange={(lineHeight) => setCue({ lineHeight })} />
          <SliderRow label="সর্বোচ্চ প্রস্থ" display={`${bnNum(c.width)}%`} min={40} max={100} step={5} value={c.width} onChange={(width) => setCue({ width })} />
          <div className="space-y-3 border-t pt-4">
            <SwitchRow label="পরের লাইন দেখান" hint="হালকা করে, বর্তমান লাইনের নিচে" checked={s.nextLine} onChange={(nextLine) => set({ nextLine })} />
          </div>
          <div className="space-y-4 border-t pt-4">
            <SwitchRow label="ট্রানজিশন" hint="নতুন লাইন কীভাবে আসবে" checked={c.fade} onChange={(fade) => setCue({ fade })} />
            <div className={cn('grid grid-cols-4 gap-1.5', !c.fade && 'pointer-events-none opacity-50')}>
              {TRANSITIONS.map((t) => (
                <Tile key={t.key} label={t.label} active={c.transition === t.key} onClick={() => setCue({ transition: t.key })}>
                  <TransitionDemo transition={t.key} />
                </Tile>
              ))}
            </div>
            <SliderRow label="সময়" display={`${bnNum(c.transitionMs)} ms`} min={150} max={1000} step={50} value={c.transitionMs} disabled={!c.fade} onChange={(transitionMs) => setCue({ transitionMs })} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export function ShortcutList() {
  return (
    <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 px-2 pb-1.5 text-xs">
      {SUBTITLE_SHORTCUTS.map((k) => (
        <div key={k.label} className="contents">
          <dt className="flex gap-1">
            {k.keys.map((key) => (
              <Kbd key={key}>{key}</Kbd>
            ))}
          </dt>
          <dd className="text-muted-foreground">{k.label}</dd>
        </div>
      ))}
    </dl>
  )
}

/** A tiny caption playing one entrance; it plays again on hover. */
function TransitionDemo({ transition }: { transition: SubtitleTransition }) {
  const [run, setRun] = useState(0)
  const ms = 600
  return (
    <span onMouseEnter={() => setRun((n) => n + 1)} className="flex aspect-video w-full items-end justify-center bg-[linear-gradient(160deg,#55606b,#2b2622)] pb-[14%]">
      <span key={run} className="text-[9px] leading-tight font-bold text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.8)]" {...(transition === 'words' ? {} : enter(transition, ms))}>
        {transition === 'words' ? <Words text="আল্লাহর নামে শুরু" ms={ms} /> : 'আল্লাহর নামে'}
      </span>
    </span>
  )
}

function Tile({ label, active, onClick, children }: { label: string; active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'group/tile flex flex-col items-center gap-1 rounded-lg p-0.5 text-[11px] transition',
        active ? 'font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <span className={cn('block w-full overflow-hidden rounded-md ring-2 ring-offset-1 ring-offset-popover transition', active ? 'ring-gold' : 'ring-transparent group-hover/tile:ring-border')}>{children}</span>
      {label}
    </button>
  )
}

/** A tiny video frame with a caption drawn in the given look, for picking presets and shapes. */
function MiniCaption({ look, short }: { look: Look; short?: boolean }) {
  const text = (color: string): CSSProperties => ({
    color,
    fontWeight: look.bold ? 700 : undefined,
    WebkitTextStroke: look.stroke ? `${Math.max(1, look.strokeWidth * 0.8)}px ${look.strokeColor}` : undefined,
    paintOrder: 'stroke fill',
    textShadow: look.shadow ? `0 1px 2px ${shade((look as Partial<ShadowLook>).shadowColor ?? '#000000', 80)}` : undefined,
    ...(look.shape === 'lines' ? { background: fill(look), padding: '0 0.25em', borderRadius: '0.15em' } : {}),
  })
  return (
    <span className="relative flex aspect-video w-full flex-col items-center justify-end bg-[radial-gradient(circle_at_70%_30%,#d8b27a_0,transparent_45%),radial-gradient(circle_at_25%_75%,#6d7f8f_0,transparent_55%),linear-gradient(160deg,#55606b,#2b2622)] pb-[9%]">
      {look.shape === 'fade' && (
        <span
          className="absolute inset-x-0 bottom-0 h-3/4"
          style={{ background: fill(look), maskImage: easedMask(10, 100, '%'), WebkitMaskImage: easedMask(10, 100, '%') }}
        />
      )}
      <span className={cn('relative flex flex-col items-center gap-px px-1.5 py-0.5 leading-none', look.shape === 'soft' ? 'rounded-[5px]' : 'rounded-[3px]')} style={boxFill(look, '5px')}>
        {!short && (
          <span lang="ar" className="text-[12px] leading-tight" style={{ ...text(look.colorAr), fontFamily: `'${arabicFamily(look.fontAr)}', serif` }}>
            بسم الله
          </span>
        )}
        <span className="text-[9px] leading-tight" style={{ ...text(look.colorBn), fontFamily: `'${banglaFamily(look.fontBn)}', serif` }}>
          {short ? 'বাংলা' : 'আল্লাহর নামে'}
        </span>
      </span>
    </span>
  )
}

function FontSelect({ value, fonts, onChange }: { value: string; fonts: { key: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger size="sm" className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {fonts.map((f) => (
          <SelectItem key={f.key} value={f.key}>
            {f.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function SliderRow({ label, hint, display, value, min, max, step, disabled, onChange }: { label: string; hint?: string; display: ReactNode; value: number; min: number; max: number; step: number; disabled?: boolean; onChange: (v: number) => void }) {
  return (
    <Section label={label} value={display}>
      <Slider min={min} max={max} step={step} value={[value]} disabled={disabled} onValueChange={([v]) => onChange(v)} aria-label={label} className="[&_[data-slot=slider-thumb]]:size-4" />
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </Section>
  )
}

/** Preset colors plus a picker for anything else. */
function Swatches({ value, options, disabled, onChange }: { value: string; options: { value: string; label: string }[]; disabled?: boolean; onChange: (v: string) => void }) {
  const custom = !options.some((o) => o.value === value)
  const ring = 'ring-2 ring-gold ring-offset-2 ring-offset-popover'
  return (
    <div className={cn('flex flex-wrap items-center gap-2', disabled && 'pointer-events-none opacity-50')}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          title={o.label}
          aria-label={o.label}
          aria-pressed={value === o.value}
          disabled={disabled}
          onClick={() => onChange(o.value)}
          style={{ background: o.value }}
          className={cn('size-6 rounded-full border border-foreground/20 transition', value === o.value && ring)}
        />
      ))}
      <label title="অন্য রং" className={cn('relative size-6 cursor-pointer overflow-hidden rounded-full border border-foreground/20 bg-[conic-gradient(red,yellow,lime,cyan,blue,magenta,red)]', custom && ring)}>
        <input type="color" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 size-full cursor-pointer opacity-0" aria-label="অন্য রং" />
      </label>
    </div>
  )
}

function SwitchRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
      <span>
        {label}
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  )
}
