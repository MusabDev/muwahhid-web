import { Copy, Download } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { arabicFamily, banglaFamily, loadFont } from '@/lib/fonts'
import { cn } from '@/lib/utils'

export interface ShareQuote {
  ar: string
  bn: string
  source: string
}

const STYLES = {
  parchment: { bg: '#f6eedc', ink: '#2c1e12', muted: '#7d6650', accent: '#a07b35', frame: '#c9a75c' },
  wood: { bg: '#3b2617', ink: '#f2e6cf', muted: '#c8b18c', accent: '#d4ad62', frame: '#b8904a' },
  night: { bg: '#15110c', ink: '#ecd9b4', muted: '#9c8a6c', accent: '#d4ad62', frame: '#5c4a2c' },
  green: { bg: '#163a2c', ink: '#eef3e6', muted: '#a8c2ad', accent: '#d9b866', frame: '#8f7a3f' },
} as const

const SIZES = {
  square: [1080, 1080],
  portrait: [1080, 1350],
  story: [1080, 1920],
} as const

type StyleKey = keyof typeof STYLES
type SizeKey = keyof typeof SIZES

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else line = test
  }
  if (line) lines.push(line)
  return lines
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath()
  for (let i = 0; i < 16; i++) {
    const radius = i % 2 === 0 ? r : r * 0.42
    const angle = (Math.PI / 8) * i - Math.PI / 2
    ctx.lineTo(x + radius * Math.cos(angle), y + radius * Math.sin(angle))
  }
  ctx.closePath()
  ctx.fill()
}

export function ShareDialog({ quote, open, onOpenChange, fontAr, fontBn }: { quote: ShareQuote | null; open: boolean; onOpenChange: (open: boolean) => void; fontAr: string; fontBn: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [style, setStyle] = useState<StyleKey>('parchment')
  const [size, setSize] = useState<SizeKey>('square')
  const [showAr, setShowAr] = useState(true)
  const [showBn, setShowBn] = useState(true)

  useEffect(() => {
    if (!open || !quote) return
    let cancelled = false
    const famAr = arabicFamily(fontAr)
    const famBn = banglaFamily(fontBn)

    const draw = async () => {
      await Promise.all([loadFont(fontAr), loadFont(fontBn)])
      await Promise.all([document.fonts.load(`48px "${famAr}"`, quote.ar), document.fonts.load(`40px "${famBn}"`, quote.bn)]).catch(() => {})
      const canvas = canvasRef.current
      if (cancelled || !canvas) return
      const [w, h] = SIZES[size]
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      const c = STYLES[style]

      ctx.fillStyle = c.bg
      ctx.fillRect(0, 0, w, h)
      // double frame
      ctx.strokeStyle = c.frame
      ctx.lineWidth = 3
      ctx.strokeRect(50, 50, w - 100, h - 100)
      ctx.lineWidth = 1.5
      ctx.strokeRect(64, 64, w - 128, h - 128)
      ctx.fillStyle = c.frame
      for (const [x, y] of [[50, 50], [w - 50, 50], [50, h - 50], [w - 50, h - 50]]) drawStar(ctx, x, y, 16)

      const maxWidth = w - 220
      const arText = showAr && quote.ar ? quote.ar : ''
      const bnText = showBn && quote.bn ? quote.bn : ''

      // Fit text: shrink until everything fits in the frame
      let arSize = 58
      let bnSize = 40
      let arLines: string[] = []
      let bnLines: string[] = []
      const available = h - 420
      for (let i = 0; i < 30; i++) {
        ctx.font = `${arSize}px "${famAr}"`
        ctx.direction = 'rtl'
        arLines = arText ? wrapLines(ctx, arText, maxWidth) : []
        ctx.font = `${bnSize}px "${famBn}"`
        ctx.direction = 'ltr'
        bnLines = bnText ? wrapLines(ctx, bnText, maxWidth) : []
        const height = arLines.length * arSize * 1.75 + bnLines.length * bnSize * 1.6 + (arLines.length && bnLines.length ? 70 : 0)
        if (height <= available) break
        arSize *= 0.93
        bnSize *= 0.93
      }

      const blockHeight = arLines.length * arSize * 1.75 + bnLines.length * bnSize * 1.6 + (arLines.length && bnLines.length ? 70 : 0)
      let y = (h - blockHeight) / 2 - 20
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'

      // opening ornament
      ctx.fillStyle = c.accent
      drawStar(ctx, w / 2, y - 60, 14)

      ctx.fillStyle = c.ink
      ctx.direction = 'rtl'
      ctx.font = `${arSize}px "${famAr}"`
      for (const line of arLines) {
        ctx.fillText(line, w / 2, y)
        y += arSize * 1.75
      }
      if (arLines.length && bnLines.length) {
        ctx.strokeStyle = c.accent
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(w / 2 - 60, y + 25)
        ctx.lineTo(w / 2 + 60, y + 25)
        ctx.stroke()
        y += 70
      }
      ctx.direction = 'ltr'
      ctx.font = `${bnSize}px "${famBn}"`
      ctx.fillStyle = arLines.length ? c.muted : c.ink
      for (const line of bnLines) {
        ctx.fillText(line, w / 2, y)
        y += bnSize * 1.6
      }

      ctx.fillStyle = c.accent
      ctx.font = `30px "${famBn}"`
      ctx.fillText(`— ${quote.source}`, w / 2, h - 190)
      ctx.fillStyle = c.muted
      ctx.font = `24px "Hind Siliguri"`
      ctx.fillText('muwahhid.net', w / 2, h - 130)
    }

    draw()
    return () => {
      cancelled = true
    }
  }, [open, quote, style, size, showAr, showBn, fontAr, fontBn])

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
        <div className="grid gap-6 md:grid-cols-[1fr_240px]">
          <div className="flex items-center justify-center rounded-lg bg-muted p-3">
            <canvas ref={canvasRef} className={cn('h-auto max-h-[60vh] w-auto max-w-full rounded shadow-lg')} />
          </div>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>রং</Label>
              <div className="flex gap-2">
                {(Object.keys(STYLES) as StyleKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStyle(key)}
                    aria-label={key}
                    className={cn('size-9 rounded-full border-2 transition', style === key ? 'scale-110 border-gold' : 'border-transparent')}
                    style={{ background: STYLES[key].bg, boxShadow: `inset 0 0 0 3px ${STYLES[key].frame}` }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>আকার</Label>
              <ToggleGroup type="single" variant="outline" size="sm" value={size} onValueChange={(v) => v && setSize(v as SizeKey)}>
                <ToggleGroupItem value="square">বর্গ</ToggleGroupItem>
                <ToggleGroupItem value="portrait">লম্বা</ToggleGroupItem>
                <ToggleGroupItem value="story">স্টোরি</ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div className="space-y-3">
              <label className="flex items-center justify-between text-sm">
                আরবি দেখান <Switch checked={showAr} onCheckedChange={(v) => (v || showBn) && setShowAr(v)} disabled={!quote?.ar} />
              </label>
              <label className="flex items-center justify-between text-sm">
                বাংলা দেখান <Switch checked={showBn} onCheckedChange={(v) => (v || showAr) && setShowBn(v)} disabled={!quote?.bn} />
              </label>
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
