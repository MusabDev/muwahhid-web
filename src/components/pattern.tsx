import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

/**
 * Soft geometric backdrop for light sections: the rosette tile at low opacity,
 * faded into the page background so content stays readable.
 */
export function PatternBackdrop({ opacity = 0.18, fade = 'bottom', className }: { opacity?: number; fade?: 'bottom' | 'radial' | 'hero' | 'none'; className?: string }) {
  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0', className)}>
      <div className="pattern-tile absolute inset-0 opacity-(--pattern-opacity) dark:hidden" style={{ '--pattern-opacity': opacity } as CSSProperties} />
      {/* the stone tones turn muddy on dark backgrounds, so dark mode uses the gold line version */}
      <div className="pattern-tint absolute inset-0 hidden text-gold opacity-[0.09] dark:block" />
      {fade === 'bottom' && <div className="absolute inset-0 bg-linear-to-b from-transparent via-background/45 via-60% to-background" />}
      {fade === 'radial' && <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_15%,var(--background)_78%)]" />}
      {fade === 'hero' && (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_45%_at_50%_42%,var(--background)_20%,transparent_100%)] opacity-90" />
          <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent via-55% to-background" />
        </>
      )}
    </div>
  )
}

/** The same tile as a single-colour overlay (takes `currentColor`), for wood panels and covers. */
export function PatternTint({ className }: { className?: string }) {
  return <div aria-hidden className={cn('pattern-tint pointer-events-none absolute inset-0 text-gold opacity-[0.08]', className)} />
}
