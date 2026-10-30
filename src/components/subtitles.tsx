import { AlignCenter, AlignLeft, AlignRight, ArrowDownUp, RotateCcw } from 'lucide-react'
import { useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { Kbd, Section } from '@/components/reader/settings-panel'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { ARABIC_FONTS, BANGLA_FONTS, readerFontVars } from '@/lib/fonts'
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
]

type Look = Pick<SubtitleStyle, 'colorAr' | 'colorBn' | 'bold' | 'stroke' | 'strokeWidth' | 'strokeColor' | 'shadow' | 'shape' | 'backgroundColor' | 'backgroundOpacity' | 'backgroundBlur'>

/** One-tap looks; picking one only touches colors, edges and background, never fonts, sizes or layout. */
const PRESETS: { key: string; label: string; look: Look }[] = [
  {
    key: 'classic',
    label: 'ক্লাসিক',
    look: { colorAr: '#f2dca6', colorBn: '#ffffff', bold: false, stroke: false, strokeWidth: 2, strokeColor: '#000000', shadow: true, shape: 'box', backgroundColor: '#000000', backgroundOpacity: 55, backgroundBlur: 4 },
  },
  {
    key: 'cinema',
    label: 'সিনেমা',
    look: { colorAr: '#ffffff', colorBn: '#ffffff', bold: true, stroke: true, strokeWidth: 1.5, strokeColor: '#000000', shadow: true, shape: 'none', backgroundColor: '#000000', backgroundOpacity: 55, backgroundBlur: 0 },
  },
  {
    key: 'bright',
    label: 'উজ্জ্বল',
    look: { colorAr: '#ffe14d', colorBn: '#ffe14d', bold: true, stroke: false, strokeWidth: 2, strokeColor: '#000000', shadow: false, shape: 'lines', backgroundColor: '#000000', backgroundOpacity: 100, backgroundBlur: 0 },
  },
  {
    key: 'minimal',
    label: 'মিনিমাল',
    look: { colorAr: '#ffffff', colorBn: '#e5e5e5', bold: false, stroke: false, strokeWidth: 2, strokeColor: '#000000', shadow: true, shape: 'none', backgroundColor: '#000000', backgroundOpacity: 55, backgroundBlur: 0 },
  },
  {
    key: 'paper',
    label: 'কাগজ',
    look: { colorAr: '#2a2118', colorBn: '#4a3d30', bold: false, stroke: false, strokeWidth: 2, strokeColor: '#000000', shadow: false, shape: 'box', backgroundColor: '#fdfbf5', backgroundOpacity: 90, backgroundBlur: 0 },
  },
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

const BASE = {
  ar: { size: 'clamp(1.05rem, 3.1cqw, 3.25rem)', leading: 1.6 },
  bn: { size: 'clamp(0.9rem, 2.4cqw, 2.5rem)', leading: 1.5 },
}

const fill = (s: SubtitleStyle) => `color-mix(in srgb, ${s.backgroundColor} ${s.backgroundOpacity}%, transparent)`
const blur = (s: SubtitleStyle) => (s.backgroundBlur ? `blur(${s.backgroundBlur}px)` : undefined)

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
    textShadow: s.shadow ? '0 1px 2px rgb(0 0 0 / 0.8), 0 2px 8px rgb(0 0 0 / 0.5)' : undefined,
  }
  const strip: CSSProperties | undefined =
    s.shape === 'lines'
      ? { background: fill(s), backdropFilter: blur(s), WebkitBackdropFilter: blur(s), boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone', padding: '0.05em 0.35em', borderRadius: '0.2em' }
      : undefined
  return (
    <p lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'} style={style} className="w-full text-balance">
      {strip ? <span style={strip}>{text}</span> : text}
    </p>
  )
}

/**
 * One subtitle cue. `overlay` sits over a video frame and can be dragged up or down (reported via `onMove`);
 * otherwise it flows inside its box (the audio panel). Sizes follow the width of the nearest `@container`,
 * so the text grows with theater view and fullscreen.
 */
export function SubtitleCue({
  segment,
  next,
  mode,
  style: s,
  overlay,
  lift = 0,
  onMove,
}: {
  segment: Segment | null
  next?: Segment | null
  mode: SubtitleMode
  style: SubtitleStyle
  overlay?: boolean
  /** Extra room at the bottom, in rem, while the player's controls show. */
  lift?: number
  onMove?: (position: number) => void
}) {
  const [drag, setDrag] = useState<{ startY: number; startPos: number; height: number; pos: number } | null>(null)
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
    ...(s.shape === 'box' ? { background: fill(s), backdropFilter: blur(s), WebkitBackdropFilter: blur(s) } : {}),
  }

  return (
    <div
      style={{ ...readerFontVars(s.fontAr, s.fontBn), ...(overlay ? { bottom: `calc(${drag?.pos ?? s.position}% + ${lift}rem)` } : {}) }}
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
          'flex flex-col gap-[0.15em] rounded-lg px-[0.9em] py-[0.35em] select-none',
          draggable && 'pointer-events-auto cursor-grab touch-none',
          drag && 'cursor-grabbing ring-2 ring-gold/70',
        )}
      >
        <div key={segment.id} className={cn('flex w-full flex-col gap-[0.15em]', s.fade && 'animate-in duration-300 fade-in-0')}>
          {lines.map((l) => (
            <Line key={l.lang} {...l} s={s} />
          ))}
          {upcoming.map((l) => (
            <Line key={`next-${l.lang}`} {...l} s={s} dim />
          ))}
        </div>
      </div>
    </div>
  )
}

/** `hasVideo` shows the controls that only mean something over a video frame. */
export function SubtitleSettings({ mode, style: s, hasVideo, update }: { mode: SubtitleMode; style: SubtitleStyle; hasVideo: boolean; update: (patch: Partial<ReaderSettings>) => void }) {
  const [lang, setLang] = useState<Lang>('ar')
  const set = (patch: Partial<SubtitleStyle>) => update({ subtitle: { ...s, ...patch } })
  const isDefault = mode === DEFAULT_SETTINGS.subtitles && (Object.keys(DEFAULT_SETTINGS.subtitle) as (keyof SubtitleStyle)[]).every((k) => s[k] === DEFAULT_SETTINGS.subtitle[k])
  const activePreset = PRESETS.find((p) => (Object.keys(p.look) as (keyof Look)[]).every((k) => p.look[k] === s[k]))?.key
  const size = lang === 'ar' ? s.sizeAr : s.sizeBn

  return (
    <div className="space-y-4">
      <Section label="ভাষা">
        <ToggleGroup type="single" variant="outline" size="sm" className="w-full" value={mode} onValueChange={(v) => v && update({ subtitles: v as SubtitleMode })}>
          <ToggleGroupItem value="ar" className="flex-1">
            আরবি
          </ToggleGroupItem>
          <ToggleGroupItem value="bn" className="flex-1">
            বাংলা
          </ToggleGroupItem>
          <ToggleGroupItem value="both" className="flex-1">
            উভয়
          </ToggleGroupItem>
          <ToggleGroupItem value="off" className="flex-1">
            বন্ধ
          </ToggleGroupItem>
        </ToggleGroup>
      </Section>

      <Section label="স্টাইল">
        <div className="grid grid-cols-5 gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              aria-pressed={activePreset === p.key}
              onClick={() => set(p.look)}
              className={cn('flex flex-col items-center gap-1 rounded-lg border-2 p-1 text-[10px] transition', activePreset === p.key ? 'border-gold' : 'border-transparent hover:border-border')}
            >
              <PresetSwatch look={p.look} />
              {p.label}
            </button>
          ))}
        </div>
      </Section>

      <Tabs defaultValue="text">
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
              <FontSelect value={s.fontBn} fonts={BANGLA_FONTS} onChange={(fontBn) => set({ fontBn })} />
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
            <ToggleGroup type="single" variant="outline" size="sm" className="w-full" value={s.shape} onValueChange={(v) => v && set({ shape: v as SubtitleStyle['shape'] })}>
              <ToggleGroupItem value="box" className="flex-1">
                একটি বক্স
              </ToggleGroupItem>
              <ToggleGroupItem value="lines" className="flex-1">
                প্রতি লাইনে
              </ToggleGroupItem>
              <ToggleGroupItem value="none" className="flex-1">
                নেই
              </ToggleGroupItem>
            </ToggleGroup>
          </Section>
          <Section label="পটভূমির রং">
            <Swatches value={s.backgroundColor} options={BACKGROUND_COLORS} disabled={s.shape === 'none'} onChange={(backgroundColor) => set({ backgroundColor })} />
          </Section>
          <SliderRow label="অস্বচ্ছতা" display={`${bnNum(s.backgroundOpacity)}%`} min={0} max={100} step={5} value={s.backgroundOpacity} disabled={s.shape === 'none'} onChange={(backgroundOpacity) => set({ backgroundOpacity })} />
          <SliderRow label="ব্লার" display={`${bnNum(s.backgroundBlur)}px`} min={0} max={20} step={1} value={s.backgroundBlur} disabled={s.shape === 'none'} onChange={(backgroundBlur) => set({ backgroundBlur })} />
        </TabsContent>

        <TabsContent value="layout" className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
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
            <Section label="উপরে কোন লাইন">
              <Button variant="outline" size="sm" className="w-full" disabled={mode !== 'both'} onClick={() => set({ order: s.order === 'ar' ? 'bn' : 'ar' })}>
                <ArrowDownUp /> {s.order === 'ar' ? 'আরবি' : 'বাংলা'}
              </Button>
            </Section>
          </div>
          <SliderRow label="লাইনের ফাঁক" display={`${bnNum(s.lineHeight)}%`} min={70} max={160} step={10} value={s.lineHeight} onChange={(lineHeight) => set({ lineHeight })} />
          <SliderRow label="সর্বোচ্চ প্রস্থ" display={`${bnNum(s.width)}%`} min={40} max={100} step={5} value={s.width} onChange={(width) => set({ width })} />
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
          <div className="space-y-3 border-t pt-4">
            <SwitchRow label="পরের লাইন দেখান" hint="হালকা করে, বর্তমান লাইনের নিচে" checked={s.nextLine} onChange={(nextLine) => set({ nextLine })} />
            <SwitchRow label="ফেড" hint="লাইন বদলের সময় আলতো করে আসে" checked={s.fade} onChange={(fade) => set({ fade })} />
          </div>
        </TabsContent>
      </Tabs>

      {/* keyboards are rare on phones, so the list only shows where there's room for one */}
      <details className="group border-t pt-4 max-md:hidden">
        <summary className="cursor-pointer list-none text-xs text-muted-foreground select-none hover:text-foreground">
          কিবোর্ড শর্টকাট <span className="inline-block transition group-open:rotate-90">›</span>
        </summary>
        <dl className="mt-3 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1.5 text-xs">
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
      </details>

      <Button variant="ghost" size="sm" className="w-full text-muted-foreground" disabled={isDefault} onClick={() => update({ subtitles: DEFAULT_SETTINGS.subtitles, subtitle: DEFAULT_SETTINGS.subtitle })}>
        <RotateCcw /> আগের অবস্থায় ফিরিয়ে নিন
      </Button>
    </div>
  )
}

/** A small frame of video with both scripts drawn in the preset's look. */
function PresetSwatch({ look }: { look: Look }) {
  const bg = `color-mix(in srgb, ${look.backgroundColor} ${look.backgroundOpacity}%, transparent)`
  const text = (color: string): CSSProperties => ({
    color,
    fontWeight: look.bold ? 700 : undefined,
    WebkitTextStroke: look.stroke ? `${look.strokeWidth}px ${look.strokeColor}` : undefined,
    paintOrder: 'stroke fill',
    textShadow: look.shadow ? '0 1px 2px rgb(0 0 0 / 0.8)' : undefined,
    background: look.shape === 'lines' ? bg : undefined,
  })
  return (
    <span className="flex h-10 w-full flex-col items-center justify-end overflow-hidden rounded-md bg-gradient-to-br from-slate-500 to-stone-700 pb-1">
      <span className="flex flex-col items-center rounded-sm px-1 leading-none" style={{ background: look.shape === 'box' ? bg : undefined }}>
        <span className="font-arabic text-[11px] leading-tight" style={text(look.colorAr)}>
          عربي
        </span>
        <span className="text-[8px] leading-tight" style={text(look.colorBn)}>
          বাংলা
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
