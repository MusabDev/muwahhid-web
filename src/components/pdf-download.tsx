import { Download, FileText, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { api, firstError } from '@/lib/api'
import type { Book, BookExport } from '@/lib/types'
import { useReaderSettings } from '@/lib/user-data'

const VARIANTS = [
  { value: 'bilingual', label: 'আরবি ও বাংলা (পাশাপাশি)' },
  { value: 'ar', label: 'শুধু আরবি' },
  { value: 'bn', label: 'শুধু বাংলা' },
] as const

export function PdfDownload({ book, variant = 'outline', size = 'lg' }: { book: Book; variant?: 'outline' | 'ghost'; size?: 'lg' | 'sm' | 'icon' }) {
  const { settings } = useReaderSettings()
  const [busy, setBusy] = useState<string | null>(null)

  const request = async (value: BookExport['variant']) => {
    setBusy(value)
    const toastId = toast.loading('PDF তৈরি হচ্ছে… বড় কিতাবে কিছুক্ষণ লাগতে পারে')
    try {
      for (let attempt = 0; attempt < 120; attempt++) {
        const exp = await api<BookExport>(`/books/${book.slug}/exports`, {
          method: 'POST',
          body: { variant: value, font_ar: settings.fontAr, font_bn: settings.fontBn },
        })
        if (exp.status === 'done' && exp.download_url) {
          toast.success('PDF প্রস্তুত', { id: toastId })
          window.location.href = exp.download_url
          return
        }
        if (exp.status === 'failed') throw new Error('PDF তৈরি করা যায়নি। পরে আবার চেষ্টা করুন।')
        await new Promise((r) => setTimeout(r, 3000))
      }
      throw new Error('অনেক সময় লাগছে, একটু পরে আবার চেষ্টা করুন।')
    } catch (error) {
      toast.error(firstError(error), { id: toastId })
    } finally {
      setBusy(null)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={!!busy} aria-label="PDF ডাউনলোড">
          {busy ? <Loader2 className="animate-spin" /> : <Download />}
          {size !== 'icon' && 'PDF'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="text-xs text-muted-foreground">কোন সংস্করণ ডাউনলোড করবেন?</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {VARIANTS.map((v) => (
          <DropdownMenuItem key={v.value} onClick={() => request(v.value)}>
            <FileText className="text-gold" /> {v.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
