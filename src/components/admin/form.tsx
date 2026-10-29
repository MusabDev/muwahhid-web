import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import { firstError } from '@/lib/api'
import { cn } from '@/lib/utils'

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-sm">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

/** Mutation that toasts on success/failure and invalidates the given query keys. */
export function useAdminMutation<TVars, TResult = unknown>(fn: (vars: TVars) => Promise<TResult>, options: { success?: string; invalidate?: QueryKey[]; onSuccess?: (result: TResult) => void } = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (result) => {
      if (options.success) toast.success(options.success)
      options.invalidate?.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }))
      options.onSuccess?.(result)
    },
    onError: (error) => toast.error(firstError(error)),
  })
}

export function AdminPageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function Panel({ title, action, children, className }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-xl border bg-card shadow-sm', className)}>
      {title && (
        <div className="flex items-center justify-between gap-3 border-b px-5 py-3">
          <h2 className="font-semibold">{title}</h2>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  )
}

export function confirmDelete(what: string) {
  return window.confirm(`${what} মুছে ফেলতে চান? এটি আর ফেরানো যাবে না।`)
}
