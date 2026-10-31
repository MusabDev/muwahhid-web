import { Copy, Download } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { arabicFamily, banglaFamily, loadFont } from '@/lib/fonts'
import type { Lang } from '@/lib/types'
import { cn } from '@/lib/utils'

/** Where a quote comes from, worded in the quote's own language. */
export interface ShareSource {
  title: string
  author?: string
  /** "পৃষ্ঠা ৫", "ص ٥", "দারস ৩"… */
  meta?: string
}

export interface ShareQuote {
  text: string
  lang: Lang
  source: ShareSource
}

const THEMES = {
  paper: { label: 'কাগজ', bg: '#fbfaf6', ink: '#1f1a14', muted: '#7a6e60', accent: '#a07b35', rule: '#e6e0d4' },
  parchment: { label: 'পার্চমেন্ট', bg: '#f4ead5', ink: '#2c1e12', muted: '#7d6650', accent: '#a07b35', rule: '#dccaa3' },
  wood: { label: 'কাঠ', bg: '#3b2617', ink: '#f4e9d4', muted: '#c8b18c', accent: '#d4ad62', rule: '#5a3f29' },
  night: { label: 'রাত', bg: '#14110d', ink: '#ece2cc', muted: '#968a74', accent: '#d4ad62', rule: '#2e2820' },
  green: { label: 'সবুজ', bg: '#143528', ink: '#eef3e6', muted: '#a8c2ad', accent: '#d9b866', rule: '#24503d' },
  navy: { label: 'নীল', bg: '#111c2e', ink: '#e8edf5', muted: '#94a3ba', accent: '#d4ad62', rule: '#22314a' },
} as const

/** Body text size in px for Arabic; Bangla is drawn a little smaller to look the same size. */
const TEXT_SIZES = { sm: 44, md: 52, lg: 62 } as const

type ThemeKey = keyof typeof THEMES
type TextSize = keyof typeof TEXT_SIZES

const WIDTH = 1080
const PAD = 96
const MIN_HEIGHT = 540
/* very long passages are shrunk until the image is no taller than this */
const MAX_HEIGHT = 2600

/* the site's eight-pointed star, as drawn by StarMark */
const STAR_OUTER = 'M20 3 25 15 37 20 25 25 20 37 15 25 3 20 15 15Z'
const STAR_INNER = 'M8 8 20 13 32 8 27 20 32 32 20 27 8 32 13 20Z'

/** Wrap each paragraph to the width; a paragraph's first line is flagged so a gap can go above it. */
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: { text: string; gap: boolean }[] = []
  for (const paragraph of text.split(/\n+/)) {
    let line = ''
    let first = lines.length > 0
    const push = () => {
      lines.push({ text: line, gap: first })
      first = false
    }
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const test = line ? `${line} ${word}` : word
      if (ctx.measureText(test).width > maxWidth && line) {
        push()
        line = word
      } else line = test
    }
    if (line) push()
  }
  return lines
}

/** Cut a one-line label down with an ellipsis so it fits. */
function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text
  let cut = text
  while (cut && ctx.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1)
  return `${cut.trimEnd()}…`
}

function drawMark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(size / 40, size / 40)
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 2
  ctx.lineJoin = 'round'
  // Path2D is browser-only, so the paths are built when drawing rather than at import
  ctx.stroke(new Path2D(STAR_OUTER))
  ctx.stroke(new Path2D(STAR_INNER))
  ctx.beginPath()
  ctx.arc(20, 20, 3.4, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

export function ShareDialog({ quote, open, onOpenChange, fontAr, fontBn }: { quote: ShareQuote | null; open: boolean; onOpenChange: (open: boolean) => void; fontAr: string; fontBn: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [theme, setTheme] = useState<ThemeKey>('paper')
  const [textSize, setTextSize] = useState<TextSize>('md')

  useEffect(() => {
    if (!open || !quote) return
    let cancelled = false
    const rtl = quote.lang === 'ar'
    const fam = rtl ? arabicFamily(fontAr) : banglaFamily(fontBn)
    /* the footer always has Bangla UI text (brand name), whatever the quote's language */
    const famBn = banglaFamily(fontBn)

    const draw = async () => {
      await loadFont(rtl ? fontAr : fontBn)
      if (!rtl) await loadFont(fontBn)
      await Promise.all([
        document.fonts.load(`48px "${fam}"`, quote.text),
        document.fonts.load(`bold 34px "${fam}"`, quote.source.title),
        document.fonts.load(`28px "${famBn}"`, 'আল-মুওয়াহহিদ'),
      ]).catch(() => {})
      const canvas = canvasRef.current
      if (cancelled || !canvas) return
      const ctx = canvas.getContext('2d')!
      const c = THEMES[theme]
      const textWidth = WIDTH - PAD * 2

      // Lay out the passage, shrinking it only when it would make the image too tall
      let size: number = rtl ? TEXT_SIZES[textSize] : Math.round(TEXT_SIZES[textSize] * 0.82)
      const lineHeight = rtl ? 1.95 : 1.7
      let lines: ReturnType<typeof wrapLines> = []
      /* extra space above each paragraph after the first */
      const gapOf = (px: number) => px * 0.6
      const heightOf = (px: number) => lines.reduce((sum, line) => sum + px * lineHeight + (line.gap ? gapOf(px) : 0), 0)
      const footerHeight = 210
      for (let i = 0; i < 20; i++) {
        ctx.font = `${size}px "${fam}"`
        ctx.direction = rtl ? 'rtl' : 'ltr'
        lines = wrapLines(ctx, quote.text, textWidth)
        if (PAD + heightOf(size) + footerHeight <= MAX_HEIGHT || size <= 28) break
        size = Math.round(size * 0.92)
      }
      const textHeight = heightOf(size)
      const h = Math.max(MIN_HEIGHT, Math.round(PAD + textHeight + footerHeight))
      canvas.width = WIDTH
      canvas.height = h

      ctx.fillStyle = c.bg
      ctx.fillRect(0, 0, WIDTH, h)
      // thin accent band along the top edge
      ctx.fillStyle = c.accent
      ctx.fillRect(0, 0, WIDTH, 8)

      // Passage: start-aligned, vertically centred in the space above the footer
      const start = rtl ? WIDTH - PAD : PAD
      let y = PAD + (h - footerHeight - PAD - textHeight) / 2
      ctx.direction = rtl ? 'rtl' : 'ltr'
      ctx.textAlign = 'start'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = c.ink
      ctx.font = `${size}px "${fam}"`
      for (const line of lines) {
        if (line.gap) y += gapOf(size)
        ctx.fillText(line.text, start, y + (size * lineHeight) / 2)
        y += size * lineHeight
      }

      // Footer: rule, then source on the reading side and the brand on the other
      const ruleY = h - footerHeight + 40
      ctx.fillStyle = c.rule
      ctx.fillRect(PAD, ruleY, textWidth, 2)

      const brandWidth = 300
      const metaWidth = textWidth - brandWidth - 40
      const titleY = ruleY + 62
      ctx.textBaseline = 'alphabetic'
      ctx.textAlign = 'start'
      ctx.direction = rtl ? 'rtl' : 'ltr'

      ctx.font = `bold 34px "${fam}"`
      const title = fit(ctx, quote.source.title, metaWidth)
      ctx.fillStyle = c.ink
      ctx.fillText(title, start, titleY)
      if (quote.source.meta) {
        const titleWidth = ctx.measureText(title).width
        ctx.font = `28px "${fam}"`
        ctx.fillStyle = c.accent
        const metaX = rtl ? start - titleWidth - 18 : start + titleWidth + 18
        if (titleWidth + 18 + ctx.measureText(quote.source.meta).width <= metaWidth) ctx.fillText(quote.source.meta, metaX, titleY)
      }
      if (quote.source.author) {
        ctx.font = `28px "${fam}"`
        ctx.fillStyle = c.muted
        ctx.fillText(fit(ctx, quote.source.author, metaWidth), start, titleY + 50)
      }

      // Brand: star mark with the site name and address beside it
      ctx.direction = 'ltr'
      const markSize = 64
      const brandY = ruleY + 34
      ctx.font = `bold 28px "${famBn}"`
      const nameWidth = ctx.measureText('আল-মুওয়াহহিদ').width
      ctx.font = `22px "${famBn}"`
      const siteWidth = ctx.measureText('muwahhid.net').width
      const brandTextWidth = Math.max(nameWidth, siteWidth)
      const brandLeft = rtl ? PAD : WIDTH - PAD - markSize - 16 - brandTextWidth
      drawMark(ctx, brandLeft, brandY, markSize, c.accent)
      ctx.textAlign = 'left'
      ctx.fillStyle = c.ink
      ctx.font = `bold 28px "${famBn}"`
      ctx.fillText('আল-মুওয়াহহিদ', brandLeft + markSize + 16, brandY + 28)
      ctx.fillStyle = c.muted
      ctx.font = `22px "${famBn}"`
      ctx.fillText('muwahhid.net', brandLeft + markSize + 16, brandY + 60)
    }

    draw()
    return () => {
      cancelled = true
    }
  }, [open, quote, theme, textSize, fontAr, fontBn])

  const toBlob = () => new Promise<Blob | null>((resolve) => canvasRef.current?.toBlob(resolve, 'image/png'))

  const download = async () => {
    const blob = await toBlob()
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'muwahhid-quote.png'
    a.click()
    URL.revokeObjectURL(url)
  }

  const copy = async () => {
    try {
      const blob = await toBlob()
      if (!blob) return
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      toast.success('ছবি কপি হয়েছে')
    } catch {
      toast.error('এই ব্রাউজারে ছবি কপি করা যাচ্ছে না, ডাউনলোড করুন')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>উদ্ধৃতি শেয়ার করুন</DialogTitle>
          <DialogDescription>ছবি হিসেবে ডাউনলোড বা কপি করুন</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 md:grid-cols-[1fr_220px]">
          <div className="flex min-h-48 items-center justify-center rounded-lg bg-muted p-3">
            <canvas ref={canvasRef} className="h-auto max-h-[60vh] w-auto max-w-full rounded shadow-lg" />
          </div>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>থিম</Label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(THEMES) as ThemeKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTheme(key)}
                    aria-pressed={theme === key}
                    className={cn('flex flex-col items-center gap-1 rounded-lg p-1.5 text-[11px] text-muted-foreground transition hover:bg-muted', theme === key && 'bg-muted text-foreground')}
                  >
                    <span
                      className={cn('flex h-9 w-full items-center justify-center rounded-md border-2 font-arabic text-sm', theme === key ? 'border-gold' : 'border-border')}
                      style={{ background: THEMES[key].bg, color: THEMES[key].ink, boxShadow: `inset 0 3px 0 ${THEMES[key].accent}` }}
                    >
                      أ
                    </span>
                    {THEMES[key].label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>লেখার আকার</Label>
              <ToggleGroup type="single" variant="outline" size="sm" value={textSize} onValueChange={(v) => v && setTextSize(v as TextSize)}>
                <ToggleGroupItem value="sm">ছোট</ToggleGroupItem>
                <ToggleGroupItem value="md">মাঝারি</ToggleGroupItem>
                <ToggleGroupItem value="lg">বড়</ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Button onClick={download}>
                <Download /> ডাউনলোড
              </Button>
              <Button variant="outline" onClick={copy}>
                <Copy /> ছবি কপি
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
