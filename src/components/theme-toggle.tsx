import { MoonIcon, SunIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="থিম পরিবর্তন"
      className={cn(className)}
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      <SunIcon className="dark:hidden" />
      <MoonIcon className="hidden dark:block" />
    </Button>
  )
}
