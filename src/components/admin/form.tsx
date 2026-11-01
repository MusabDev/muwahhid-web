import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { Link, type LinkProps } from '@tanstack/react-router'
import { Fragment, useSyncExternalStore, type ReactNode } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Label } from '@/components/ui/label'
import { firstError } from '@/lib/api'
import { cn } from '@/lib/utils'

export function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-sm">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

/** A titled group of fields inside a form. */
export function FormSection({ title, hint, children, className }: { title: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn('space-y-4 border-t pt-5 first:border-t-0 first:pt-0', className)}>
      <div className="pb-1">
        <h3 className="text-xs font-semibold tracking-wider text-gold uppercase">{title}</h3>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

/** Button row at the bottom of a form, with an "unsaved changes" note. */
export function FormActions({ children, dirty }: { children: ReactNode; dirty?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t pt-4">
      {children}
      {dirty && <span className="ms-auto text-xs text-gold">অসংরক্ষিত পরিবর্তন আছে</span>}
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

export type Crumb = { label: string } & Pick<LinkProps, 'to' | 'params'>

export function AdminPageHeader({ title, description, action, crumbs }: { title: string; description?: ReactNode; action?: ReactNode; crumbs?: Crumb[] }) {
  return (
    <div className="mb-6">
      {crumbs && crumbs.length > 0 && (
        <Breadcrumb className="mb-2">
          <BreadcrumbList>
            {crumbs.map((crumb) => (
              <Fragment key={crumb.label}>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to={crumb.to} params={crumb.params as never}>
                      {crumb.label}
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              </Fragment>
            ))}
            <BreadcrumbItem>
              <BreadcrumbPage className="max-w-60 truncate">{title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{title}</h1>
          {description && <div className="mt-1 text-sm text-muted-foreground">{description}</div>}
        </div>
        {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
      </div>
    </div>
  )
}

export function Panel({ title, description, action, children, className }: { title?: string; description?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-xl border bg-card shadow-sm', className)}>
      {title && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3">
          <div>
            <h2 className="font-semibold">{title}</h2>
            {description && <div className="text-xs text-muted-foreground">{description}</div>}
          </div>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  )
}

type ConfirmRequest = { title: string; description: string; confirmLabel: string; destructive: boolean; resolve: (ok: boolean) => void }

let pending: ConfirmRequest | null = null
const listeners = new Set<() => void>()
const setPending = (next: ConfirmRequest | null) => {
  pending = next
  listeners.forEach((listener) => listener())
}

/** Ask for confirmation in a dialog; resolves to true when confirmed. Needs <ConfirmHost /> mounted. */
export function confirmAction(options: { title: string; description?: string; confirmLabel?: string; destructive?: boolean }) {
  pending?.resolve(false)
  return new Promise<boolean>((resolve) =>
    setPending({ title: options.title, description: options.description ?? '', confirmLabel: options.confirmLabel ?? 'নিশ্চিত', destructive: options.destructive ?? false, resolve }),
  )
}

export function confirmDelete(what: string) {
  return confirmAction({ title: `${what} মুছে ফেলবেন?`, description: 'এটি আর ফেরানো যাবে না।', confirmLabel: 'মুছে ফেলুন', destructive: true })
}

export function ConfirmHost() {
  const request = useSyncExternalStore(
    (listener) => (listeners.add(listener), () => listeners.delete(listener)),
    () => pending,
    () => null,
  )
  const close = (ok: boolean) => {
    request?.resolve(ok)
    setPending(null)
  }

  return (
    <AlertDialog open={!!request} onOpenChange={(open) => !open && close(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{request?.title}</AlertDialogTitle>
          {request?.description && <AlertDialogDescription>{request.description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>বাতিল</AlertDialogCancel>
          <AlertDialogAction variant={request?.destructive ? 'destructive' : 'default'} onClick={() => close(true)}>
            {request?.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
