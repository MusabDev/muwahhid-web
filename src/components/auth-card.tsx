import type { ReactNode } from 'react'
import { Ornament, StarMark } from '@/components/brand'

export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="relative flex min-h-[calc(100svh-4rem)] items-center justify-center overflow-hidden px-4 py-16">
      <div className="pattern-star absolute inset-0 opacity-[0.14]" />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border bg-card shadow-xl">
        <div className="wood-panel flex flex-col items-center px-6 py-7 text-center">
          <StarMark className="size-10 text-gold" />
          <h1 className="mt-3 text-2xl font-bold text-wood-foreground">{title}</h1>
          <p className="mt-1 text-sm text-wood-foreground/75">{subtitle}</p>
        </div>
        <div className="gold-rule opacity-70" />
        <div className="p-6 sm:p-8">
          {children}
          <Ornament className="mt-6" />
        </div>
      </div>
    </div>
  )
}
