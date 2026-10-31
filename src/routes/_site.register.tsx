import { useForm } from '@tanstack/react-form'
import { createFileRoute, Link, Navigate, useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { AuthCard } from '@/components/auth-card'
import { AuthField } from '@/components/auth-field'
import { CenterSpinner } from '@/components/states'
import { Button } from '@/components/ui/button'
import { safeRedirect, useAuthActions, useUser } from '@/lib/auth'
import { authError, matchesPassword, newPassword, required, validEmail } from '@/lib/auth-form'
import { pageTitle } from '@/lib/head'

export const Route = createFileRoute('/_site/register')({
  head: () => pageTitle('রেজিস্টার'),
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  component: RegisterPage,
})

function RegisterPage() {
  const { redirect } = Route.useSearch()
  const navigate = useNavigate()
  const { data: user, isLoading } = useUser()
  const { register } = useAuthActions()
  const destination = safeRedirect(redirect)

  const form = useForm({
    defaultValues: { name: '', email: '', password: '', password_confirmation: '' },
    onSubmit: ({ value }) =>
      register.mutate(value, {
        onSuccess: () => {
          toast.success('অ্যাকাউন্ট তৈরি হয়েছে', { description: 'ইমেইল যাচাইয়ের জন্য আপনার ইনবক্সে একটি লিংক পাঠানো হয়েছে।' })
          navigate({ to: destination, replace: true })
        },
        onError: (error) => toast.error(authError(error)),
      }),
  })

  if (isLoading) return <CenterSpinner />
  if (user && !register.isPending && !register.isSuccess) return <Navigate to={destination} replace />

  return (
    <AuthCard title="নতুন অ্যাকাউন্ট" subtitle="আপনার পড়া, হাইলাইট ও নোট সব ডিভাইসে সংরক্ষিত থাকবে">
      <form
        noValidate
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <form.Field name="name" validators={{ onChange: required('আপনার নাম দিন') }}>
          {(field) => <AuthField field={field} label="নাম" maxLength={255} autoComplete="name" />}
        </form.Field>
        <form.Field name="email" validators={{ onChange: validEmail }}>
          {(field) => <AuthField field={field} label="ইমেইল" type="email" autoComplete="email" />}
        </form.Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <form.Field name="password" validators={{ onChange: newPassword }}>
            {(field) => <AuthField field={field} label="পাসওয়ার্ড" type="password" autoComplete="new-password" />}
          </form.Field>
          <form.Field name="password_confirmation" validators={{ onChangeListenTo: ['password'], onChange: matchesPassword }}>
            {(field) => <AuthField field={field} label="আবার লিখুন" type="password" autoComplete="new-password" />}
          </form.Field>
        </div>
        <p className="text-xs text-muted-foreground">কমপক্ষে ৮ অক্ষর; অক্ষর ও সংখ্যা মিলিয়ে দিন।</p>
        <Button type="submit" className="h-10 w-full text-base" disabled={register.isPending}>
          {register.isPending && <Loader2 className="animate-spin" />} রেজিস্টার
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        আগেই অ্যাকাউন্ট আছে?{' '}
        <Link to="/login" search={{ redirect }} className="font-semibold text-primary hover:underline">
          লগইন করুন
        </Link>
      </p>
    </AuthCard>
  )
}
