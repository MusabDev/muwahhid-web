import { AlignJustify, BookOpen, Minus, Plus, RotateCcw, Rows3 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Button } from '@/components/ui/button'
import { ARABIC_FONTS, BANGLA_FONTS } from '@/lib/fonts'
import { bnNum } from '@/lib/text'
import { DARS_SETTING_KEYS, DEFAULT_SETTINGS, type ReaderLeading, type ReaderSettings, type ReaderTheme } from '@/lib/user-data'
import { cn } from '@/lib/utils'

export const FONT_SIZE = { min: 14, max: 32 }

export const clampFontSize = (n: number) => Math.min(FONT_SIZE.max, Math.max(FONT_SIZE.min, n))

/** Multiplier applied to the base line height of each script. */
export const LEADING: Record<ReaderLeading, number> = { compact: 0.88, normal: 1, relaxed: 1.16 }

const THEMES: { key: ReaderTheme; label: string; bg: string; ink: string }[] = [
  { key: 'paper', label: 'কাগজ', bg: '#fdfbf5', ink: '#2a2118' },
  { key: 'sepia', label: 'সেপিয়া', bg: '#f1e2c2', ink: '#4f3820' },
  { key: 'dark', label: 'ডার্ক', bg: '#2b2b2b', ink: '#dedede' },
  { key: 'night', label: 'রাত', bg: '#241a10', ink: '#e9cf9f' },
]

type Languages = 'ar' | 'both' | 'bn'

/* without room for both, "both" reads as Bangla — see `readerSettings` in the reader route */
const languagesOf = (s: ReaderSettings, allowBoth: boolean): Languages => (s.showArabic && s.showBangla ? (allowBoth ? 'both' : 'bn') : s.showArabic ? 'ar' : 'bn')

export const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['←', '→'], label: 'আগের / পরের পৃষ্ঠা' },
  { keys: ['T'], label: 'সূচিপত্র' },
  { keys: ['/'], label: 'কিতাবে সার্চ করুন' },
  { keys: ['N'], label: 'বুকমার্ক ও নোট' },
  { keys: ['B'], label: 'পাতা বুকমার্ক' },
  { keys: ['M'], label: 'কিতাব / বাক্য মোড' },
  { keys: ['L'], label: 'ভাষা বদলান' },
  { keys: ['+', '−'], label: 'লেখার আকার' },
  { keys: ['S'], label: 'সেটিংস' },
]

/** `allowBoth` is off on phones, where there is room for only one language. */
export function SettingsPanel({ settings, update, allowBoth = true }: { settings: ReaderSettings; update: (patch: Partial<ReaderSettings>) => void; allowBoth?: boolean }) {
  const keys = (Object.keys(DEFAULT_SETTINGS) as (keyof ReaderSettings)[]).filter((k) => !(DARS_SETTING_KEYS as readonly string[]).includes(k))
  const isDefault = keys.every((k) => settings[k] === DEFAULT_SETTINGS[k])

  return (
    <div className="space-y-5">
      <Section label="পড়ার ধরন">
        <ToggleGroup type="single" variant="outline" className="w-full" value={settings.mode} onValueChange={(v) => v && update({ mode: v as ReaderSettings['mode'] })}>
          <ToggleGroupItem value="book" className="flex-1 gap-1.5">
            <BookOpen className="size-4" /> কিতাব
          </ToggleGroupItem>
          <ToggleGroupItem value="sentence" className="flex-1 gap-1.5">
            <Rows3 className="size-4" /> বাক্য
          </ToggleGroupItem>
        </ToggleGroup>
      </Section>

      <Section label="ভাষা">
        <ToggleGroup
          type="single"
          variant="outline"
          className="w-full"
          value={languagesOf(settings, allowBoth)}
          onValueChange={(v) => v && update({ showArabic: v !== 'bn', showBangla: v !== 'ar' })}
        >
          <ToggleGroupItem value="ar" className="flex-1 font-arabic text-base">
            عربي
          </ToggleGroupItem>
          {allowBoth && (
            <ToggleGroupItem value="both" className="flex-1">
              উভয়
            </ToggleGroupItem>
          )}
          <ToggleGroupItem value="bn" className="flex-1">
            বাংলা
          </ToggleGroupItem>
        </ToggleGroup>
      </Section>

      <Section label="থিম">
        <div className="grid grid-cols-4 gap-2">
          {THEMES.map((t) => (
            <button
              key={t.key}
              type="button"
              aria-pressed={settings.theme === t.key}
              onClick={() => update({ theme: t.key })}
              className={cn('flex flex-col items-center gap-1 rounded-lg border-2 p-1.5 text-[11px] transition', settings.theme === t.key ? 'border-gold' : 'border-transparent hover:border-border')}
            >
              <span className="flex h-9 w-full items-center justify-center rounded-md border font-arabic text-base" style={{ background: t.bg, color: t.ink }}>
                ع
              </span>
              {t.label}
            </button>
          ))}
        </div>
      </Section>

      <Section label="লেখার আকার" value={bnNum(settings.fontSize)}>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon-sm" aria-label="ছোট" disabled={settings.fontSize <= FONT_SIZE.min} onClick={() => update({ fontSize: clampFontSize(settings.fontSize - 1) })}>
            <Minus />
          </Button>
          <Slider
            min={FONT_SIZE.min}
            max={FONT_SIZE.max}
            step={1}
            value={[settings.fontSize]}
            onValueChange={([v]) => update({ fontSize: v })}
            aria-label="লেখার আকার"
            className="flex-1 [&_[data-slot=slider-thumb]]:size-4"
          />
          <Button variant="outline" size="icon-sm" aria-label="বড়" disabled={settings.fontSize >= FONT_SIZE.max} onClick={() => update({ fontSize: clampFontSize(settings.fontSize + 1) })}>
            <Plus />
          </Button>
        </div>
      </Section>

      <Section label="লাইনের ফাঁক">
        <ToggleGroup type="single" variant="outline" className="w-full" value={settings.leading} onValueChange={(v) => v && update({ leading: v as ReaderLeading })}>
          {(['compact', 'normal', 'relaxed'] as const).map((key, i) => (
            <ToggleGroupItem key={key} value={key} className="flex-1 gap-1.5">
              <AlignJustify className="size-4" style={{ transform: `scaleY(${0.7 + i * 0.3})` }} />
              {{ compact: 'ঘন', normal: 'সাধারণ', relaxed: 'খোলা' }[key]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Section>

      <div className="grid grid-cols-2 gap-3">
        <Section label="আরবি ফন্ট">
          <Select value={settings.fontAr} onValueChange={(v) => update({ fontAr: v })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ARABIC_FONTS.map((f) => (
                <SelectItem key={f.key} value={f.key}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Section>
        <Section label="বাংলা ফন্ট">
          <Select value={settings.fontBn} onValueChange={(v) => update({ fontBn: v })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BANGLA_FONTS.map((f) => (
                <SelectItem key={f.key} value={f.key}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Section>
      </div>

      <div className="border-t pt-4">
        <SwitchRow label="হরকত (তাশকীল)" hint="আরবির যের-যবর-পেশ" checked={settings.diacritics} onChange={(v) => update({ diacritics: v })} />
      </div>

      {/* keyboards are rare on phones, so the list only shows where there's room for one */}
      <details className="group border-t pt-4 max-md:hidden">
        <summary className="cursor-pointer list-none text-xs text-muted-foreground select-none hover:text-foreground">
          কিবোর্ড শর্টকাট <span className="inline-block transition group-open:rotate-90">›</span>
        </summary>
        <dl className="mt-3 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1.5 text-xs">
          {SHORTCUTS.map((s) => (
            <div key={s.label} className="contents">
              <dt className="flex gap-1">
                {s.keys.map((k) => (
                  <Kbd key={k}>{k}</Kbd>
                ))}
              </dt>
              <dd className="text-muted-foreground">{s.label}</dd>
            </div>
          ))}
        </dl>
      </details>

      <Button variant="ghost" size="sm" className="w-full text-muted-foreground" disabled={isDefault} onClick={() => update(Object.fromEntries(keys.map((k) => [k, DEFAULT_SETTINGS[k]])))}>
        <RotateCcw /> আগের অবস্থায় ফিরিয়ে নিন
      </Button>
    </div>
  )
}

export function Section({ label, value, children }: { label: string; value?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        {value != null && <span className="text-xs font-medium tabular-nums">{value}</span>}
      </div>
      {children}
    </div>
  )
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd data-slot="kbd" className={cn('inline-flex h-5 min-w-5 items-center justify-center rounded border border-current/20 bg-current/5 px-1 font-sans text-[11px] leading-none', className)}>
      {children}
    </kbd>
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
