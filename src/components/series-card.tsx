import { Link } from '@tanstack/react-router'
import { Headphones } from 'lucide-react'
import { bnNum } from '@/lib/text'
import type { DarsSeries } from '@/lib/types'

export function SeriesCard({ series }: { series: DarsSeries }) {
  return (
    <Link
      to="/durus/series/$slug"
      params={{ slug: series.slug }}
      className="group relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition hover:border-gold/60 hover:shadow-md"
    >
      <div className="pattern-star absolute -end-10 -top-10 size-40 rounded-full opacity-20" />
      <div className="relative flex items-start gap-4">
        <div className="wood-panel flex size-12 shrink-0 items-center justify-center rounded-lg">
          <Headphones className="size-5 text-gold" />
        </div>
        <div className="min-w-0">
          <p lang="ar" dir="rtl" className="text-right font-arabic text-lg leading-snug text-primary">
            {series.title_ar}
          </p>
          <h3 className="mt-1 line-clamp-2 font-heading font-semibold group-hover:text-primary">{series.title_bn}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {series.author?.name_bn}
            {series.durus_count !== undefined && ` · ${bnNum(series.durus_count)}টি দারস`}
          </p>
        </div>
      </div>
    </Link>
  )
}
