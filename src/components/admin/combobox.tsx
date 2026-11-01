import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export type ComboOption = { value: string; label: string; hint?: string }

/** Searchable select. `none` adds an empty choice; `onCreate` adds a "create new" item. */
export function Combobox({
  value,
  onChange,
  options,
  placeholder = 'বেছে নিন',
  none,
  onCreate,
  createLabel = 'নতুন যোগ করুন',
  className,
}: {
  value: string
  onChange: (value: string) => void
  options: ComboOption[]
  placeholder?: string
  none?: string
  onCreate?: () => void
  createLabel?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  // "Create" opens another dialog; wait until the popover has closed and returned focus, or that dialog closes again at once
  const creating = useRef(false)
  const selected = options.find((o) => o.value === value)
  const pick = (next: string) => {
    onChange(next)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-expanded={open} className={cn('w-full justify-between font-normal', !selected && 'text-muted-foreground', className)}>
          <span className="truncate">{selected?.label ?? (value === 'none' && none ? none : placeholder)}</span>
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) min-w-64 p-0"
        align="start"
        onCloseAutoFocus={(e) => {
          if (!creating.current) return
          e.preventDefault()
          creating.current = false
          onCreate?.()
        }}
      >
        <Command filter={(itemValue, search) => (itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0)}>
          <CommandInput placeholder="খুঁজুন…" />
          <CommandList>
            <CommandEmpty>কিছু পাওয়া যায়নি</CommandEmpty>
            <CommandGroup>
              {none && (
                <CommandItem value={`__none ${none}`} onSelect={() => pick('none')}>
                  <Check className={cn(value === 'none' ? 'opacity-100' : 'opacity-0')} />
                  {none}
                </CommandItem>
              )}
              {options.map((option) => (
                <CommandItem key={option.value} value={`${option.label} ${option.hint ?? ''} #${option.value}`} onSelect={() => pick(option.value)}>
                  <Check className={cn(value === option.value ? 'opacity-100' : 'opacity-0')} />
                  <span className="truncate">{option.label}</span>
                  {option.hint && <span className="ms-auto truncate text-xs text-muted-foreground">{option.hint}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
            {onCreate && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    value="__create"
                    forceMount
                    onSelect={() => {
                      creating.current = true
                      setOpen(false)
                    }}
                  >
                    <Plus /> {createLabel}
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
