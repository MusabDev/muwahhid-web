import type { QueryKey } from '@tanstack/react-query'
import { Monitor, Pause, Play, Save, Smartphone, SkipBack, SkipForward, Sparkles, Tablet, Undo2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Panel, useAdminMutation } from '@/components/admin/form'
import { PatternTint } from '@/components/pattern'
import { Section } from '@/components/reader/settings-panel'
import { cueIndexAt, lastStarted, SubtitleCue, SubtitleCustomizePage, SubtitleStylePage } from '@/components/subtitles'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useMediaPlayer } from '@/hooks/use-media-player'
import { api } from '@/lib/api'
import { loadFont } from '@/lib/fonts'
import { formatTime } from '@/lib/text'
import type { Dars, Segment } from '@/lib/types'
import { CUE_KEYS, cueStyle, DEFAULT_SETTINGS, mergeSubtitle, type CueOverride, type ReaderSettings, type SubtitleStyle } from '@/lib/user-data'
import { cn } from '@/lib/utils'

const KEYS = Object.keys(DEFAULT_SETTINGS.subtitle) as (keyof SubtitleStyle)[]

/** What one language's cue sets for itself, without the fields that follow the shared ones; null when nothing is left. */
function ownCue(cue: CueOverride | undefined) {
  const own = Object.fromEntries(CUE_KEYS.filter((k) => cue?.[k] != null).map((k) => [k, cue![k]]))
  return Object.keys(own).length ? own : undefined
}

/** Only the fields that differ from the site default, in a fixed order, so later changes to the default still reach the rest. */
function ownFields(style: Partial<SubtitleStyle>): Partial<SubtitleStyle> {
  const own: Partial<Record<keyof SubtitleStyle, unknown>> = {}
  for (const k of KEYS) {
    const value = k === 'ar' || k === 'bn' ? ownCue(style[k]) : style[k] !== DEFAULT_SETTINGS.subtitle[k] ? style[k] : undefined
    if (value !== undefined) own[k] = value
  }
  return own as Partial<SubtitleStyle>
}

/** Shown when no line is playing, so the style can always be seen. */
const SAMPLE: Segment = { id: 0, position: 0, start_time: 0, end_time: null, text_ar: 'بسم الله الرحمن الرحيم، الحمد لله رب العالمين', text_bn: 'পরম করুণাময় অসীম দয়ালু আল্লাহর নামে, সকল প্রশংসা জগতসমূহের রব আল্লাহর জন্য' }

/** Player widths to check the cue at; sizes follow the player width, so a phone shows the same cue smaller. */
const WIDTHS = [
  { key: 'desktop', label: 'ডেস্কটপ', icon: Monitor, className: 'w-full' },
  { key: 'tablet', label: 'ট্যাবলেট', icon: Tablet, className: 'w-full max-w-[640px]' },
  { key: 'phone', label: 'মোবাইল', icon: Smartphone, className: 'w-full max-w-[360px]' },
]

/**
 * The dars's own subtitle look, set over its real video: the default every viewer starts from,
 * under whatever they change for themselves in the player.
 */
export function SubtitleStyleEditor({ dars, invalidate }: { dars: Dars; invalidate: QueryKey[] }) {
  const saved = ownFields(dars.subtitle_style ?? {})
  const [draft, setDraft] = useState(saved)
  const style: SubtitleStyle = { ...DEFAULT_SETTINGS.subtitle, ...draft }
  const set = (patch: Partial<SubtitleStyle>) => setDraft((prev) => ownFields(mergeSubtitle({ ...DEFAULT_SETTINGS.subtitle, ...prev }, patch)))
  const savedMode = dars.subtitle_mode ?? DEFAULT_SETTINGS.subtitles
  // the languages the dars starts with; the preview shows them too
  const [mode, setMode] = useState(savedMode)
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved) || mode !== savedMode

  const save = useAdminMutation(
    () =>
      api(`/admin/durus/${dars.id}`, {
        method: 'PUT',
        body: { subtitle_style: Object.keys(draft).length ? draft : null, subtitle_mode: mode === DEFAULT_SETTINGS.subtitles ? null : mode },
      }),
    { success: 'সাবটাইটেলের স্টাইল সংরক্ষিত', invalidate },
  )

  useEffect(() => {
    loadFont(style.fontAr)
    loadFont(style.fontBn)
  }, [style.fontAr, style.fontBn])

  const player = useMediaPlayer(dars.media_url, null)
  const isVideo = player.kind === 'youtube' || dars.media_type === 'video'
  const segments = dars.segments ?? []
  const [raised, setRaised] = useState(false)
  const [width, setWidth] = useState('desktop')
  // the entrance plays again on the button, and whenever a language's transition changes, so a pick shows at once
  const [replays, setReplays] = useState(0)
  const transitions = (['ar', 'bn'] as const).map((lang) => cueStyle(style, lang)).map((c) => [c.fade, c.transition, c.transitionMs].join(':'))
  const replayKey = `${replays}|${transitions.join('|')}`
  const index = cueIndexAt(segments, player.time)
  const cue = index >= 0 ? segments[index] : (segments[0] ?? SAMPLE)
  const next = index >= 0 ? (segments[index + 1] ?? null) : (segments[1] ?? null)
  const at = lastStarted(segments, player.time)

  return (
    <Panel
      className={cn('mt-6', dirty && 'border-gold')}
      title="সাবটাইটেলের স্টাইল"
      description="এই দারসের সাবটাইটেল শুরুতে এভাবে দেখাবে; দর্শক প্লেয়ারে নিজে যা বদলান, শুধু সেটুকু তাঁর জন্য বদলাবে।"
      action={
        <div className="flex gap-2">
          {dirty && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setDraft(saved)
                setMode(savedMode)
              }}
            >
              <Undo2 /> আগের মতো
            </Button>
          )}
          <Button size="sm" disabled={!dirty || save.isPending} onClick={() => save.mutate(undefined)}>
            <Save /> সংরক্ষণ
          </Button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-3">
          <div className="flex justify-center rounded-lg bg-muted/50 p-2">
            <div className={cn('overflow-hidden rounded-lg border border-black/20 bg-black shadow', WIDTHS.find((w) => w.key === width)?.className)}>
              {isVideo ? (
                <div className="@container relative aspect-video w-full">
                  {player.kind === 'youtube' ? (
                    <div ref={player.ytHost} className="absolute inset-0 [&_iframe]:size-full" />
                  ) : (
                    <video ref={player.mediaRef} src={dars.media_url} playsInline className="absolute inset-0 size-full" {...player.nativeProps} />
                  )}
                  <button type="button" aria-label={player.playing ? 'থামান' : 'চালান'} onClick={player.toggle} className="absolute inset-0 z-[5]" />
                  {/* stands in for the player's controls, so a bottom cue can be checked while they show */}
                  {raised && <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[8] h-[60px] bg-gradient-to-t from-black/70 to-transparent" />}
                  <SubtitleCue segment={cue} next={next} mode={mode} style={style} overlay raised={raised} onMove={set} replayKey={replayKey} />
                </div>
              ) : (
                <div className="wood-panel @container relative flex min-h-48 flex-col items-center justify-center gap-4 px-4 py-8">
                  <PatternTint />
                  <audio ref={player.mediaRef} src={dars.media_url} className="hidden" {...player.nativeProps} />
                  <div className="relative flex w-full items-center justify-center">
                    <SubtitleCue segment={cue} next={next} mode={mode} style={style} replayKey={replayKey} />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button size="icon-sm" variant="ghost" aria-label="আগের লাইন" disabled={at <= 0} onClick={() => player.seek(segments[at - 1].start_time)}>
              <SkipBack />
            </Button>
            <Button size="icon-sm" variant="outline" aria-label={player.playing ? 'থামান' : 'চালান'} onClick={player.toggle}>
              {player.playing ? <Pause /> : <Play />}
            </Button>
            <Button size="icon-sm" variant="ghost" aria-label="পরের লাইন" disabled={at + 1 >= segments.length} onClick={() => player.seek(segments[at + 1].start_time)}>
              <SkipForward />
            </Button>
            <Button size="icon-sm" variant="ghost" aria-label="ট্রানজিশন দেখুন" title="ট্রানজিশন দেখুন" onClick={() => setReplays((n) => n + 1)}>
              <Sparkles />
            </Button>
            <span className="w-24 shrink-0 text-center font-mono text-xs text-muted-foreground tabular-nums">
              {formatTime(player.time)} / {formatTime(player.duration)}
            </span>
            <Slider min={0} max={player.duration || 1} step={0.1} value={[player.time]} onValueChange={([v]) => player.seek(v, player.playing)} aria-label="সময়" className="flex-1" />
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
            {isVideo && (
              <>
                <ToggleGroup type="single" variant="outline" size="sm" value={width} onValueChange={(v) => v && setWidth(v)}>
                  {WIDTHS.map((w) => (
                    <ToggleGroupItem key={w.key} value={w.key} aria-label={w.label} title={w.label}>
                      <w.icon />
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
                <label className="flex cursor-pointer items-center gap-2">
                  <Switch checked={raised} onCheckedChange={setRaised} />
                  প্লেয়ারের বাটন দেখান
                </label>
              </>
            )}
          </div>
          {isVideo && <p className="text-xs text-muted-foreground">ভিডিওর উপর সাবটাইটেল টেনে যেকোনো জায়গায় সরানো যায়; Shift চেপে টানলে শুধু এক দিকে সরবে।</p>}
        </div>

        <div className="space-y-4">
          <Section label="শুরুতে কোন ভাষা দেখাবে">
            <ToggleGroup type="single" variant="outline" size="sm" className="w-full" value={mode} onValueChange={(v) => v && setMode(v as ReaderSettings['subtitles'])}>
              <ToggleGroupItem value="both" className="flex-1">
                আরবি ও বাংলা
              </ToggleGroupItem>
              <ToggleGroupItem value="ar" className="flex-1">
                শুধু আরবি
              </ToggleGroupItem>
              <ToggleGroupItem value="bn" className="flex-1">
                শুধু বাংলা
              </ToggleGroupItem>
            </ToggleGroup>
            <p className="text-[11px] text-muted-foreground">দর্শক প্লেয়ারে নিজে ভাষা বেছে নিলে সেটিই থাকবে।</p>
          </Section>
          <SubtitleStylePage style={style} set={set} base={DEFAULT_SETTINGS.subtitle} hasVideo={isVideo} onReset={() => setDraft({})} />
          <div className="border-t pt-4">
            <SubtitleCustomizePage style={style} set={set} hasVideo={isVideo} />
          </div>
        </div>
      </div>
    </Panel>
  )
}
