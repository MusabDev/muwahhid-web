import { Fragment } from 'react'
import { cn } from '@/lib/utils'

export interface HeroStat {
  value: string
  label: string
}

/**
 * Key figures under a hero title: large serif values over small labels, divided by
 * thin gold rules — no box, so it reads as part of the title block.
 */
export function HeroStats({ items, className }: { items: HeroStat[]; className?: string }) {
  if (!items.length) return null

  return (
    <dl className={cn('mt-7 flex flex-wrap items-stretch justify-center gap-y-4 md:justify-start', className)}>
      {items.map(({ value, label }, i) => (
        <Fragment key={label}>
          {i > 0 && <span aria-hidden className="mx-5 w-px self-stretch bg-linear-to-b from-transparent via-gold/60 to-transparent sm:mx-7" />}
          <div className="flex flex-col-reverse items-center md:items-start">
            <dt className="mt-1 text-xs tracking-wide text-muted-foreground">{label}</dt>
            <dd className="font-heading text-xl leading-none font-bold whitespace-nowrap text-foreground tabular-nums sm:text-2xl">{value}</dd>
          </div>
        </Fragment>
      ))}
    </dl>
  )
}
