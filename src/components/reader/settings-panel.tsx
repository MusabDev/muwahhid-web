import { BookOpen, Minus, Plus, Rows3 } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Button } from '@/components/ui/button'
import { ARABIC_FONTS, BANGLA_FONTS } from '@/lib/fonts'
import { bnNum } from '@/lib/text'
import type { ReaderSettings, ReaderTheme } from '@/lib/user-data'
import { cn } from '@/lib/utils'

const THEMES: { key: ReaderTheme; label: string; bg: string; ink: string }[] = [
  { key: 'paper', label: 'কাগজ', bg: '#fdfbf5', ink: '#2a2118' },
  { key: 'sepia', label: 'সেপিয়া', bg: '#f1e2c2', ink: '#4f3820' },
  { key: 'dark', label: 'ডার্ক', bg: '#2b2b2b', ink: '#dedede' },
  { key: 'night', label: 'রাত', bg: '#241a10', ink: '#e9cf9f' },
]

export function SettingsPanel({ settings, update }: { settings: ReaderSettings; update: (patch: Partial<ReaderSettings>) => void }) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">পড়ার ধরন</Label>
        <ToggleGroup type="single" variant="outline" className="w-full" value={settings.mode} onValueChange={(v) => v && update({ mode: v as ReaderSettings['mode'] })}>
          <ToggleGroupItem value="book" className="flex-1 gap-1.5">
            <BookOpen className="size-4" /> কিতাব
          </ToggleGroupItem>
          <ToggleGroupItem value="sentence" className="flex-1 gap-1.5">
            <Rows3 className="size-4" /> বাক্য
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">থিম</Label>
        <div className="grid grid-cols-4 gap-2">
          {THEMES.map((t) => (
            <button
              key={t.key}
              type="button"
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
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">লেখার আকার</Label>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" aria-label="ছোট" onClick={() => update({ fontSize: Math.max(14, settings.fontSize - 1) })}>
            <Minus />
          </Button>
          <div className="flex-1 text-center text-sm tabular-nums">{bnNum(settings.fontSize)}</div>
          <Button variant="outline" size="icon" aria-label="বড়" onClick={() => update({ fontSize: Math.min(32, settings.fontSize + 1) })}>
            <Plus />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">আরবি ফন্ট</Label>
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
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">বাংলা ফন্ট</Label>
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
        </div>
      </div>

      <div className="space-y-3 border-t pt-4">
        <SwitchRow label="আরবি দেখান" checked={settings.showArabic} onChange={(v) => (v || settings.showBangla) && update({ showArabic: v })} />
        <SwitchRow label="বাংলা দেখান" checked={settings.showBangla} onChange={(v) => (v || settings.showArabic) && update({ showBangla: v })} />
        <SwitchRow label="হরকত (তাশকীল)" hint="আরবির যের-যবর-পেশ" checked={settings.diacritics} onChange={(v) => update({ diacritics: v })} />
      </div>
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
