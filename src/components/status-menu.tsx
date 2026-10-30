import { Check, ChevronDown, Library } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { DARS_STATUS_LABELS, STATUS_LABELS, STATUS_ORDER } from '@/lib/text'
import type { Book, BookStatus, Dars, DarsSeries } from '@/lib/types'
import { useDarsEntry, useDarsSeriesStatus, useLibraryEntry } from '@/lib/user-data'

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

export function DarsStatusMenu({ dars, size = 'sm' }: { dars: Dars; size?: 'sm' | 'lg' }) {
  const { entry, setStatus } = useDarsEntry(dars)
  const status = entry?.status ?? null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={size} className="gap-2">
          <Library className="text-gold" />
          {status ? DARS_STATUS_LABELS[status] : 'লাইব্রেরিতে যোগ করুন'}
          <ChevronDown className="opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {STATUS_ORDER.map((value) => (
          <DropdownMenuItem key={value} onClick={() => setStatus(value as BookStatus)}>
            <Check className={status === value ? 'opacity-100' : 'opacity-0'} />
            {DARS_STATUS_LABELS[value]}
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

/** Sets the status of every dars in a series at once. */
export function DarsSeriesStatusMenu({ series, size = 'lg' }: { series: DarsSeries; size?: 'sm' | 'lg' }) {
  const { status, saved, setStatus, isPending } = useDarsSeriesStatus(series)
  const label = status ? DARS_STATUS_LABELS[status] : saved ? 'লাইব্রেরিতে আছে' : 'সিরিজ লাইব্রেরিতে যোগ করুন'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={size} className="gap-2" disabled={isPending}>
          <Library className="text-gold" />
          {label}
          <ChevronDown className="opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">সব দারসের জন্য</DropdownMenuLabel>
        {STATUS_ORDER.map((value) => (
          <DropdownMenuItem key={value} onClick={() => setStatus(value as BookStatus)}>
            <Check className={status === value ? 'opacity-100' : 'opacity-0'} />
            {DARS_STATUS_LABELS[value]}
          </DropdownMenuItem>
        ))}
        {saved && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setStatus(null)} className="text-muted-foreground">
              সিরিজ তালিকা থেকে সরান
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
