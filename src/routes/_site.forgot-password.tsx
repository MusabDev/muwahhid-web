import { createFileRoute, Link } from '@tanstack/react-router'
import { Loader2, MailCheck } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { AuthCard } from '@/components/auth-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { firstError } from '@/lib/api'
import { useAuthActions } from '@/lib/auth'
import { pageTitle } from '@/lib/head'

export const Route = createFileRoute('/_site/forgot-password')({
  head: () => pageTitle('পাসওয়ার্ড ভুলে গেছেন'),
  validateSearch: (search: Record<string, unknown>): { email?: string } => ({
    email: typeof search.email === 'string' ? search.email : undefined,
  }),
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const search = Route.useSearch()
  const { forgotPassword } = useAuthActions()
  const [email, setEmail] = useState(search.email ?? '')
  const [sentTo, setSentTo] = useState<string | null>(null)

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
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          forgotPassword.mutate(
            { email },
            {
              onSuccess: () => setSentTo(email),
              onError: (error) => toast.error(firstError(error)),
            },
          )
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="email">ইমেইল</Label>
          <Input id="email" type="email" required autoFocus autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10" />
        </div>
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
