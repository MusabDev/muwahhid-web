import { Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/** Shares the current page through the system sheet, or copies its link where there is none. */
export function ShareButton({ title, text }: { title: string; text?: string }) {
  const share = async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url })
      } catch {
        // dismissed by the user
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      toast.success('লিংক কপি করা হয়েছে')
    } catch {
      toast.error('লিংক কপি করা যায়নি')
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline" size="icon-lg" onClick={share} aria-label="শেয়ার করুন">
          <Share2 />
        </Button>
      </TooltipTrigger>
      <TooltipContent>শেয়ার করুন</TooltipContent>
    </Tooltip>
  )
}
