import { useForm } from '@tanstack/react-form'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { KeyRound, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AuthCard } from '@/components/auth-card'
import { AuthField } from '@/components/auth-field'
import { EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { useAuthActions } from '@/lib/auth'
import { authError, matchesPassword, newPassword, validEmail } from '@/lib/auth-form'
import { pageTitle } from '@/lib/head'

export const Route = createFileRoute('/_site/reset-password')({
  head: () => pageTitle('নতুন পাসওয়ার্ড'),
  validateSearch: (search: Record<string, unknown>): { token?: string; email?: string } => ({
    token: typeof search.token === 'string' ? search.token : undefined,
    email: typeof search.email === 'string' ? search.email : undefined,
  }),
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const search = Route.useSearch()
  const navigate = useNavigate()
  const { resetPassword } = useAuthActions()
  // Keep the token in memory only, and strip it from the address bar so it doesn't linger in history or leak via Referer.
  const [token] = useState(search.token ?? '')

  const form = useForm({
    defaultValues: { email: search.email ?? '', password: '', password_confirmation: '' },
    onSubmit: ({ value }) =>
      resetPassword.mutate(
        { token, ...value },
        {
          onSuccess: () => {
            toast.success('পাসওয়ার্ড পরিবর্তন হয়েছে', { description: 'নতুন পাসওয়ার্ড দিয়ে লগইন করুন।' })
            navigate({ to: '/login', replace: true })
          },
          onError: (error) => toast.error(authError(error)),
        },
      ),
  })

  useEffect(() => {
    if (search.token) navigate({ to: '/reset-password', search: {}, replace: true })
  }, [search.token, navigate])

  if (!token) {
    return (
      <div className="mx-auto max-w-md px-4 py-24">
        <EmptyState icon={KeyRound} title="লিংকটি সঠিক নয়">
          <p>পাসওয়ার্ড রিসেট লিংকটি অসম্পূর্ণ বা মেয়াদোত্তীর্ণ। নতুন লিংকের জন্য আবার অনুরোধ করুন।</p>
          <Button className="mt-4" asChild>
            <Link to="/forgot-password">নতুন লিংক চান</Link>
          </Button>
        </EmptyState>
      </div>
    )
  }

  return (
    <AuthCard title="নতুন পাসওয়ার্ড" subtitle="আপনার অ্যাকাউন্টের জন্য নতুন পাসওয়ার্ড দিন">
      <form
        noValidate
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <form.Field name="email" validators={{ onChange: validEmail }}>
          {(field) => <AuthField field={field} label="ইমেইল" type="email" autoComplete="email" />}
        </form.Field>
        <form.Field name="password" validators={{ onChange: newPassword }}>
          {(field) => <AuthField field={field} label="নতুন পাসওয়ার্ড" type="password" autoFocus autoComplete="new-password" />}
        </form.Field>
        <form.Field name="password_confirmation" validators={{ onChangeListenTo: ['password'], onChange: matchesPassword }}>
          {(field) => <AuthField field={field} label="আবার লিখুন" type="password" autoComplete="new-password" />}
        </form.Field>
        <p className="text-xs text-muted-foreground">কমপক্ষে ৮ অক্ষর; অক্ষর ও সংখ্যা মিলিয়ে দিন। পরিবর্তনের পর সব ডিভাইস থেকে লগআউট হয়ে যাবে।</p>
        <Button type="submit" className="h-10 w-full text-base" disabled={resetPassword.isPending}>
          {resetPassword.isPending && <Loader2 className="animate-spin" />} পাসওয়ার্ড সংরক্ষণ করুন
        </Button>
      </form>
    </AuthCard>
  )
}
