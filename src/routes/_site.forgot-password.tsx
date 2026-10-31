import { useForm } from '@tanstack/react-form'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Loader2, MailCheck } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { AuthCard } from '@/components/auth-card'
import { AuthField } from '@/components/auth-field'
import { Button } from '@/components/ui/button'
import { useAuthActions } from '@/lib/auth'
import { authError, validEmail } from '@/lib/auth-form'
import { seo } from '@/lib/seo'

export const Route = createFileRoute('/_site/forgot-password')({
  head: () => seo({ title: 'পাসওয়ার্ড ভুলে গেছেন', noindex: true }),
  validateSearch: (search: Record<string, unknown>): { email?: string } => ({
    email: typeof search.email === 'string' ? search.email : undefined,
  }),
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const search = Route.useSearch()
  const { forgotPassword } = useAuthActions()
  const [sentTo, setSentTo] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { email: search.email ?? '' },
    onSubmit: ({ value }) =>
      forgotPassword.mutate(value, {
        onSuccess: () => setSentTo(value.email),
        onError: (error) => toast.error(authError(error)),
      }),
  })

  if (sentTo) {
    return (
      <AuthCard title="ইমেইল দেখুন" subtitle="রিসেট লিংক পাঠানো হয়েছে">
        <div className="space-y-4 text-center">
          <MailCheck className="mx-auto size-10 text-gold" />
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{sentTo}</span> ঠিকানায় কোনো অ্যাকাউন্ট থাকলে সেখানে পাসওয়ার্ড রিসেটের একটি লিংক পাঠানো হয়েছে।
            লিংকটি ৬০ মিনিট পর্যন্ত কার্যকর থাকবে।
          </p>
          <p className="text-xs text-muted-foreground">ইমেইল না পেলে স্প্যাম ফোল্ডার দেখুন, অথবা কিছুক্ষণ পর আবার চেষ্টা করুন।</p>
          <Button variant="outline" className="w-full" onClick={() => setSentTo(null)}>
            আবার পাঠান
          </Button>
        </div>
        <BackToLogin />
      </AuthCard>
    )
  }

  return (
    <AuthCard title="পাসওয়ার্ড ভুলে গেছেন?" subtitle="আপনার ইমেইল দিন, আমরা রিসেট লিংক পাঠাব">
      <form
        noValidate
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <form.Field name="email" validators={{ onChange: validEmail }}>
          {(field) => <AuthField field={field} label="ইমেইল" type="email" autoFocus autoComplete="email" />}
        </form.Field>
        <Button type="submit" className="h-10 w-full text-base" disabled={forgotPassword.isPending}>
          {forgotPassword.isPending && <Loader2 className="animate-spin" />} রিসেট লিংক পাঠান
        </Button>
      </form>
      <BackToLogin />
    </AuthCard>
  )
}

function BackToLogin() {
  return (
    <p className="mt-6 text-center text-sm text-muted-foreground">
      পাসওয়ার্ড মনে পড়েছে?{' '}
      <Link to="/login" className="font-semibold text-primary hover:underline">
        লগইন করুন
      </Link>
    </p>
  )
}
