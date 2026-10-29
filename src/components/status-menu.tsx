import { Check, ChevronDown, Library } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { STATUS_LABELS, STATUS_ORDER } from '@/lib/text'
import type { Book, BookStatus } from '@/lib/types'
import { useLibraryEntry } from '@/lib/user-data'

export function StatusMenu({ book, size = 'lg' }: { book: Book; size?: 'sm' | 'lg' }) {
  const { entry, setStatus } = useLibraryEntry(book)
  const status = entry?.status ?? null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={size} className="gap-2">
          <Library className="text-gold" />
          {status ? STATUS_LABELS[status] : 'লাইব্রেরিতে যোগ করুন'}
          <ChevronDown className="opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {STATUS_ORDER.map((value) => (
          <DropdownMenuItem key={value} onClick={() => setStatus(value as BookStatus)}>
            <Check className={status === value ? 'opacity-100' : 'opacity-0'} />
            {STATUS_LABELS[value]}
          </DropdownMenuItem>
        ))}
        {status && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setStatus(null)} className="text-muted-foreground">
              তালিকা থেকে সরান
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
