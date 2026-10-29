import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { StarMark } from '@/components/brand'
import { Skeleton } from '@/components/ui/skeleton'
import { PatternBackdrop } from '@/components/pattern'

export function EmptyState({ icon: Icon, title, children }: { icon?: LucideIcon; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/60 px-6 py-14 text-center">
      {Icon ? <Icon className="mb-3 size-9 text-gold" /> : <StarMark className="mb-3 size-10 text-gold" />}
      <h3 className="text-lg font-semibold">{title}</h3>
      {children && <div className="mt-2 max-w-md text-sm text-muted-foreground">{children}</div>}
    </div>
  )
}

export function BookGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="aspect-[2/3] w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  )
}

export function PageTitle({ title, arabic, children }: { title: string; arabic?: string; children?: ReactNode }) {
  return (
    <div className="relative overflow-hidden border-b">
      <PatternBackdrop opacity={0.16} />
      <div className="relative mx-auto max-w-7xl px-4 py-10">
        {arabic && (
          <p lang="ar" dir="rtl" className="mb-1 text-left font-arabic text-xl text-gold">
            {arabic}
          </p>
        )}
        <h1 className="text-3xl font-bold md:text-4xl">{title}</h1>
        {children && <div className="mt-3 text-muted-foreground">{children}</div>}
      </div>
    </div>
  )
}

export function Spinner() {
  return <StarMark className="size-8 animate-spin text-gold [animation-duration:2.5s]" />
}

export function CenterSpinner() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner />
    </div>
  )
}
