import { cn } from '@/lib/utils'

/** Small category label that links to the filtered list. */
export function CategoryBadge({ name, className }: { name: string; className?: string }) {
  return <span className={cn('inline-flex items-center rounded-full border bg-card/80 px-3 py-0.5 text-xs font-semibold text-foreground/80', className)}>{name}</span>
}
