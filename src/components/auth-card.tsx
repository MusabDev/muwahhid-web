import type { ReactNode } from 'react'
import { Wordmark } from '@/components/brand'
import { PatternBackdrop } from '@/components/pattern'

export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="relative flex min-h-[calc(100svh-4rem)] items-center justify-center overflow-hidden px-4 py-16">
      <PatternBackdrop opacity={0.22} fade="radial" />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border bg-card shadow-xl">
        <div className="wood-panel flex flex-col items-center px-6 py-7 text-center">
          <Wordmark className="h-12 text-gold" />
          <h1 className="mt-3 text-2xl font-bold text-wood-foreground">{title}</h1>
          <p className="mt-1 text-sm text-wood-foreground/75">{subtitle}</p>
        </div>
        <div className="gold-rule opacity-70" />
        <div className="p-6 sm:p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
