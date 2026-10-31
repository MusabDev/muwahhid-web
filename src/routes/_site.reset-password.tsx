import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { KeyRound, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AuthCard } from '@/components/auth-card'
import { EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { firstError } from '@/lib/api'
import { useAuthActions } from '@/lib/auth'
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
  const [form, setForm] = useState({ email: search.email ?? '', password: '', password_confirmation: '' })
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }))

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
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          resetPassword.mutate(
            { token, ...form },
            {
              onSuccess: () => {
                toast.success('পাসওয়ার্ড পরিবর্তন হয়েছে', { description: 'নতুন পাসওয়ার্ড দিয়ে লগইন করুন।' })
                navigate({ to: '/login', replace: true })
              },
              onError: (error) => toast.error(firstError(error)),
            },
          )
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="email">ইমেইল</Label>
          <Input id="email" type="email" required autoComplete="email" value={form.email} onChange={set('email')} className="h-10" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">নতুন পাসওয়ার্ড</Label>
          <Input id="password" type="password" required minLength={8} autoFocus autoComplete="new-password" value={form.password} onChange={set('password')} className="h-10" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password_confirmation">আবার লিখুন</Label>
          <Input id="password_confirmation" type="password" required autoComplete="new-password" value={form.password_confirmation} onChange={set('password_confirmation')} className="h-10" />
        </div>
        <p className="text-xs text-muted-foreground">কমপক্ষে ৮ অক্ষর; অক্ষর ও সংখ্যা মিলিয়ে দিন। পরিবর্তনের পর সব ডিভাইস থেকে লগআউট হয়ে যাবে।</p>
        <Button type="submit" className="h-10 w-full text-base" disabled={resetPassword.isPending}>
          {resetPassword.isPending && <Loader2 className="animate-spin" />} পাসওয়ার্ড সংরক্ষণ করুন
        </Button>
      </form>
    </AuthCard>
  )
}
