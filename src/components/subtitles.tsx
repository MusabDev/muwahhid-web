import { AlignCenter, AlignLeft, AlignRight, Check, RotateCcw, SlidersHorizontal } from 'lucide-react'
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
import { DEFAULT_SETTINGS, type ReaderSettings, type SubtitleStyle } from '@/lib/user-data'
import { cn } from '@/lib/utils'

type SubtitleMode = ReaderSettings['subtitles']
type Lang = 'ar' | 'bn'

export const SUBTITLE_SIZE = { min: 60, max: 200, step: 10 }
export const SUBTITLE_POSITION = { min: 0, max: 75 }

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

type Backdrop = Pick<SubtitleStyle, 'backgroundColor' | 'backgroundOpacity' | 'backgroundBlur'>

const fill = (s: Backdrop) => `color-mix(in srgb, ${s.backgroundColor} ${s.backgroundOpacity}%, transparent)`
const blur = (s: Backdrop) => (s.backgroundBlur ? `blur(${s.backgroundBlur}px)` : undefined)
/** Opacity along an eased fade (position 0–1, alpha), so the shade melts away without a visible edge. */
const EASE = [[0, 1], [0.19, 0.738], [0.34, 0.541], [0.47, 0.382], [0.565, 0.278], [0.65, 0.194], [0.73, 0.126], [0.802, 0.075], [0.861, 0.042], [0.91, 0.021], [0.952, 0.008], [0.982, 0.002], [1, 0]]

/** A mask rising from the bottom: solid up to `from`, then easing out to nothing at `to` (in `unit`). */
const easedMask = (from: number, to: number, unit: string) =>
  `linear-gradient(to top, black ${from}${unit}, ${EASE.map(([p, a]) => `rgb(0 0 0 / ${a}) ${from + (to - from) * p}${unit}`).join(', ')})`

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

function Line({ lang, text, s, dim }: { lang: Lang; text: string; s: SubtitleStyle; dim?: boolean }) {
  const size = (lang === 'ar' ? s.sizeAr : s.sizeBn) / 100
  const style: CSSProperties = {
    color: lang === 'ar' ? s.colorAr : s.colorBn,
    fontFamily: lang === 'ar' ? 'var(--font-ar), serif' : 'var(--font-bn), serif',
    fontSize: `calc(${BASE[lang].size} * ${dim ? size * 0.8 : size})`,
    lineHeight: BASE[lang].leading * (s.lineHeight / 100),
    fontWeight: s.bold ? 700 : undefined,
    textAlign: s.align,
    opacity: dim ? 0.55 : undefined,
    // the stroke is painted under the fill, so only its outer half shows
    WebkitTextStroke: s.stroke ? `${s.strokeWidth * 2}px ${s.strokeColor}` : undefined,
    paintOrder: s.stroke ? 'stroke fill' : undefined,
    // a tight dark edge on every side, then a soft glow, so light text holds up on bright footage
    textShadow: s.shadow ? '0 0 2px rgb(0 0 0 / 0.9), 0 1px 3px rgb(0 0 0 / 0.8), 0 2px 10px rgb(0 0 0 / 0.5)' : undefined,
  }
  const strip: CSSProperties | undefined =
    s.shape === 'lines'
      ? { background: fill(s), backdropFilter: blur(s), WebkitBackdropFilter: blur(s), boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone', padding: '0.05em 0.35em', borderRadius: '0.2em' }
      : undefined
  return (
    <p lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'} style={style} className={cn('w-full', lang === 'ar' ? 'text-balance' : 'text-pretty')}>
      {strip ? <span style={strip}>{text}</span> : text}
    </p>
  )
}

/**
 * One subtitle cue. `overlay` sits over a video frame and can be dragged up or down (reported via `onMove`);
 * otherwise it flows inside its box (the audio panel). Sizes follow the width of the nearest `@container`,
 * so the text grows with theater view and fullscreen. `raised` keeps an overlaid cue clear of the controls while they show.
 */
export function SubtitleCue({
  segment,
  next,
  mode,
  style: s,
  overlay,
  raised,
  onMove,
}: {
  segment: Segment | null
  next?: Segment | null
  mode: SubtitleMode
  style: SubtitleStyle
  overlay?: boolean
  raised?: boolean
  onMove?: (position: number) => void
}) {
  const [drag, setDrag] = useState<{ startY: number; startPos: number; height: number; pos: number } | null>(null)
  const { attach: measureShade, text: textHeight, frame: frameHeight } = useFadeShade(!!overlay && s.shape === 'fade' && !!segment && mode !== 'off')
  if (!segment || mode === 'off') return null
  const lines = textOf(segment, mode, s.order)
  if (!lines.length) return null
  const upcoming = s.nextLine && next ? textOf(next, mode, s.order) : []

  const draggable = overlay && !!onMove
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggable || e.button !== 0) return
    const frame = e.currentTarget.parentElement?.parentElement
    if (!frame) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag({ startY: e.clientY, startPos: s.position, height: frame.clientHeight, pos: s.position })
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag) return
    const pos = drag.startPos - ((e.clientY - drag.startY) / drag.height) * 100
    setDrag({ ...drag, pos: Math.round(Math.min(SUBTITLE_POSITION.max, Math.max(SUBTITLE_POSITION.min, pos))) })
  }
  const onPointerUp = () => {
    if (!drag) return
    if (drag.pos !== s.position) onMove?.(drag.pos)
    setDrag(null)
  }

  const box: CSSProperties = {
    maxWidth: `${s.width}%`,
    alignItems: { center: 'center', left: 'flex-start', right: 'flex-end' }[s.align],
    ...boxFill(s, '0.9em'),
  }
  const pos = drag?.pos ?? s.position
  const lift = raised && !drag ? CONTROLS_HEIGHT : 0
  const bottom = lift ? `max(${pos}%, ${lift}px)` : `${pos}%`
  // the shade is sized from the measured text block, so it hugs one line or four alike
  const textBottom = Math.max((frameHeight * pos) / 100, lift)
  const textTop = textBottom + textHeight
  const shadeTop = textTop + (textHeight * s.fadeHeight) / 100
  // full strength only below the text; through and above it the shade thins out, so the picture shows through
  const solidTo = textBottom

  return (
    <>
      {/* the bottom shade only makes sense over a picture */}
      {overlay && s.shape === 'fade' && textHeight > 0 && (
        <div
          aria-hidden
          className={cn('pointer-events-none absolute inset-x-0 bottom-0 z-[6] animate-in duration-500 fade-in-0', !drag && 'transition-[height] duration-300')}
          style={{
            height: shadeTop,
            background: fill(s),
            backdropFilter: blur(s),
            WebkitBackdropFilter: blur(s),
            // a mask fades the color and the blur together
            maskImage: easedMask(solidTo, shadeTop, 'px'),
            WebkitMaskImage: easedMask(solidTo, shadeTop, 'px'),
          }}
        >
          {/* a faint grain keeps a long dark gradient from showing bands */}
          <div className="absolute inset-0 opacity-[0.07] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />
        </div>
      )}
      <div
        ref={measureShade}
        style={{ ...readerFontVars(s.fontAr, s.fontBn), ...(overlay ? { bottom } : {}) }}
        className={cn('pointer-events-none flex px-[4%]', { center: 'justify-center', left: 'justify-start', right: 'justify-end' }[s.align], overlay ? 'absolute inset-x-0 z-10' : 'w-full', overlay && !drag && 'transition-[bottom] duration-300')}
      >
        <div
          style={box}
          title={draggable ? 'উপরে-নিচে টেনে সরান' : undefined}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className={cn(
            'flex flex-col gap-[0.15em] px-[0.9em] py-[0.35em] select-none',
            s.shape === 'soft' ? 'rounded-[0.8em]' : 'rounded-lg',
            draggable && 'pointer-events-auto cursor-grab touch-none',
            draggable && !drag && 'ring-white/30 hover:ring-1',
            drag && 'cursor-grabbing ring-2 ring-gold/70',
          )}
        >
          {/* keyed by the words, so a cue that stays the same doesn't fade in again */}
          <div key={`${segment.text_ar}|${segment.text_bn}`} className={cn('flex w-full flex-col gap-[0.15em]', s.fade && 'animate-in duration-300 fade-in-0')}>
            {lines.map((l) => (
              <Line key={l.lang} {...l} s={s} />
            ))}
            {upcoming.map((l) => (
              <Line key={`next-${l.lang}`} {...l} s={s} dim />
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

interface SubtitlePageProps {
  mode: SubtitleMode
  style: SubtitleStyle
  update: (patch: Partial<ReaderSettings>) => void
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

export function SubtitleLanguagePage({ mode, style: s, update }: SubtitlePageProps) {
  return (
    <div className="flex flex-col gap-0.5">
      {MODES.map((m) => (
        <CheckRow key={m.value} selected={mode === m.value} onClick={() => update({ subtitles: m.value })}>
          {m.label}
        </CheckRow>
      ))}
      {mode === 'both' && (
        <div className="mt-1.5 border-t px-2 pt-3 pb-1">
          <Section label="উপরে কোন লাইন">
            <ToggleGroup type="single" variant="outline" size="sm" className="w-full" value={s.order} onValueChange={(v) => v && update({ subtitle: { ...s, order: v as Lang } })}>
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

/** The everyday choices: a ready-made look, the size, and (over a video) the height. The rest is behind `onCustomize`. */
export function SubtitleStylePage({ style: s, hasVideo, update, onCustomize }: SubtitlePageProps & { hasVideo: boolean; onCustomize: () => void }) {
  const set = (patch: Partial<SubtitleStyle>) => update({ subtitle: { ...s, ...patch } })
  const isDefault = (Object.keys(DEFAULT_SETTINGS.subtitle) as (keyof SubtitleStyle)[]).every((k) => s[k] === DEFAULT_SETTINGS.subtitle[k])
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
          <Tile key={p.key} label={p.label} active={activePreset === p.key} onClick={() => set(p.look)}>
            <MiniCaption look={p.look} />
          </Tile>
        ))}
      </div>
      <SliderRow label="লেখার আকার" display={`${bnNum(size)}%`} min={SUBTITLE_SIZE.min} max={SUBTITLE_SIZE.max} step={SUBTITLE_SIZE.step} value={size} onChange={resize} />
      {hasVideo && (
        <SliderRow
          label="নিচ থেকে দূরত্ব"
          hint="ভিডিওর উপর সাবটাইটেল টেনেও সরানো যায়"
          display={`${bnNum(s.position)}%`}
          min={SUBTITLE_POSITION.min}
          max={SUBTITLE_POSITION.max}
          step={1}
          value={s.position}
          onChange={(position) => set({ position })}
        />
      )}
      <div className="flex items-center gap-2 border-t pt-3">
        <Button variant="outline" size="sm" className="flex-1" onClick={onCustomize}>
          <SlidersHorizontal /> কাস্টমাইজ
        </Button>
        <Button variant="ghost" size="sm" className="text-muted-foreground" disabled={isDefault} onClick={() => update({ subtitle: DEFAULT_SETTINGS.subtitle })}>
          <RotateCcw /> রিসেট
        </Button>
      </div>
    </div>
  )
}

/** Every setting one by one, for fine-tuning a look. */
export function SubtitleCustomizePage({ style: s, update }: SubtitlePageProps) {
  const [lang, setLang] = useState<Lang>('ar')
  const set = (patch: Partial<SubtitleStyle>) => update({ subtitle: { ...s, ...patch } })
  const size = lang === 'ar' ? s.sizeAr : s.sizeBn

  return (
    <Tabs defaultValue="text" className="px-1.5 pb-1.5">
      <TabsList className="w-full">
        <TabsTrigger value="text">লেখা</TabsTrigger>
        <TabsTrigger value="edge">আউটলাইন</TabsTrigger>
        <TabsTrigger value="box">পটভূমি</TabsTrigger>
        <TabsTrigger value="layout">বিন্যাস</TabsTrigger>
      </TabsList>

      <TabsContent value="text" className="space-y-4 pt-2">
        <ToggleGroup type="single" variant="outline" size="sm" className="w-full" value={lang} onValueChange={(v) => v && setLang(v as Lang)}>
          <ToggleGroupItem value="ar" className="flex-1">
            আরবি লাইন
          </ToggleGroupItem>
          <ToggleGroupItem value="bn" className="flex-1">
            বাংলা লাইন
          </ToggleGroupItem>
        </ToggleGroup>
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
          <SwitchRow label="মোটা অক্ষর" hint="দুই ভাষাতেই" checked={s.bold} onChange={(bold) => set({ bold })} />
        </div>
      </TabsContent>

      <TabsContent value="edge" className="space-y-4 pt-2">
        <SwitchRow label="আউটলাইন (স্ট্রোক)" checked={s.stroke} onChange={(stroke) => set({ stroke })} />
        <SliderRow label="আউটলাইনের পুরুত্ব" display={`${bnNum(s.strokeWidth)}px`} min={0.5} max={6} step={0.5} value={s.strokeWidth} disabled={!s.stroke} onChange={(strokeWidth) => set({ strokeWidth })} />
        <Section label="আউটলাইনের রং">
          <Swatches value={s.strokeColor} options={EDGE_COLORS} disabled={!s.stroke} onChange={(strokeColor) => set({ strokeColor })} />
        </Section>
        <div className="border-t pt-4">
          <SwitchRow label="ছায়া" hint="যেকোনো দৃশ্যের উপর লেখা পড়তে সহজ করে" checked={s.shadow} onChange={(shadow) => set({ shadow })} />
        </div>
      </TabsContent>

      <TabsContent value="box" className="space-y-4 pt-2">
        <Section label="ধরন">
          <div className="grid grid-cols-5 gap-1.5">
            {SHAPES.map((shape) => (
              <Tile key={shape.key} label={shape.label} active={s.shape === shape.key} onClick={() => set({ shape: shape.key })}>
                <MiniCaption look={{ ...s, shape: shape.key }} short />
              </Tile>
            ))}
          </div>
        </Section>
        {s.shape === 'fade' && (
          <SliderRow
            label="ফেডের উচ্চতা"
            hint="লেখার উপরে কতদূর পর্যন্ত ছায়া উঠবে, লেখার উচ্চতার তুলনায়"
            display={`${bnNum(s.fadeHeight)}%`}
            min={0}
            max={200}
            step={10}
            value={s.fadeHeight}
            onChange={(fadeHeight) => set({ fadeHeight })}
          />
        )}
        <Section label="পটভূমির রং">
          <Swatches value={s.backgroundColor} options={BACKGROUND_COLORS} disabled={s.shape === 'none'} onChange={(backgroundColor) => set({ backgroundColor })} />
        </Section>
        <SliderRow label="অস্বচ্ছতা" display={`${bnNum(s.backgroundOpacity)}%`} min={0} max={100} step={5} value={s.backgroundOpacity} disabled={s.shape === 'none'} onChange={(backgroundOpacity) => set({ backgroundOpacity })} />
        <SliderRow label="ব্লার" display={`${bnNum(s.backgroundBlur)}px`} min={0} max={20} step={1} value={s.backgroundBlur} disabled={s.shape === 'none'} onChange={(backgroundBlur) => set({ backgroundBlur })} />
      </TabsContent>

      <TabsContent value="layout" className="space-y-4 pt-2">
        <Section label="সারিবদ্ধতা">
          <ToggleGroup type="single" variant="outline" size="sm" className="w-full" value={s.align} onValueChange={(v) => v && set({ align: v as SubtitleStyle['align'] })}>
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
        <SliderRow label="লাইনের ফাঁক" display={`${bnNum(s.lineHeight)}%`} min={70} max={160} step={10} value={s.lineHeight} onChange={(lineHeight) => set({ lineHeight })} />
        <SliderRow label="সর্বোচ্চ প্রস্থ" display={`${bnNum(s.width)}%`} min={40} max={100} step={5} value={s.width} onChange={(width) => set({ width })} />
        <div className="space-y-3 border-t pt-4">
          <SwitchRow label="পরের লাইন দেখান" hint="হালকা করে, বর্তমান লাইনের নিচে" checked={s.nextLine} onChange={(nextLine) => set({ nextLine })} />
          <SwitchRow label="ফেড" hint="লাইন বদলের সময় আলতো করে আসে" checked={s.fade} onChange={(fade) => set({ fade })} />
        </div>
      </TabsContent>
    </Tabs>
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
    textShadow: look.shadow ? '0 1px 2px rgb(0 0 0 / 0.8)' : undefined,
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
