import { useForm, useStore } from '@tanstack/react-form'
import { createFileRoute, Link, Navigate, useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { AuthCard } from '@/components/auth-card'
import { AuthField } from '@/components/auth-field'
import { CenterSpinner } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { safeRedirect, useAuthActions, useUser } from '@/lib/auth'
import { authError, required, validEmail } from '@/lib/auth-form'
import { pageTitle } from '@/lib/head'

export const Route = createFileRoute('/_site/login')({
  head: () => pageTitle('লগইন'),
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  component: LoginPage,
})

function LoginPage() {
  const { redirect } = Route.useSearch()
  const navigate = useNavigate()
  const { data: user, isLoading } = useUser()
  const { login } = useAuthActions()
  const destination = safeRedirect(redirect)

  const form = useForm({
    defaultValues: { email: '', password: '', remember: true },
    onSubmit: ({ value }) =>
      login.mutate(value, {
        onSuccess: (user) => {
          toast.success(`স্বাগতম, ${user.name}`)
          navigate({ to: destination, replace: true })
        },
        onError: (error) => {
          form.setFieldValue('password', '', { dontValidate: true })
          toast.error(authError(error))
        },
      }),
  })
  const email = useStore(form.store, (state) => state.values.email)

  if (isLoading) return <CenterSpinner />
  if (user && !login.isPending && !login.isSuccess) return <Navigate to={destination} replace />

  return (
    <AuthCard title="আস-সালামু আলাইকুম" subtitle="আপনার অ্যাকাউন্টে প্রবেশ করুন">
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
        <form.Field name="password" validators={{ onChange: required('পাসওয়ার্ড দিন') }}>
          {(field) => (
            <AuthField
              field={field}
              label="পাসওয়ার্ড"
              type="password"
              autoComplete="current-password"
              labelAction={
                <Link to="/forgot-password" search={{ email: email || undefined }} className="text-xs font-medium text-primary hover:underline">
                  পাসওয়ার্ড ভুলে গেছেন?
                </Link>
              }
            />
          )}
        </form.Field>
        <form.Field name="remember">
          {(field) => (
            <Label htmlFor="remember" className="flex cursor-pointer items-center gap-2 font-normal text-muted-foreground">
              <Switch id="remember" checked={field.state.value} onCheckedChange={field.handleChange} />
              আমাকে মনে রাখুন
            </Label>
          )}
        </form.Field>
        <Button type="submit" className="h-10 w-full text-base" disabled={login.isPending}>
          {login.isPending && <Loader2 className="animate-spin" />} লগইন
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        অ্যাকাউন্ট নেই?{' '}
        <Link to="/register" search={{ redirect }} className="font-semibold text-primary hover:underline">
          রেজিস্টার করুন
        </Link>
      </p>
    </AuthCard>
  )
}
