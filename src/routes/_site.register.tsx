import { createFileRoute, Link, Navigate, useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { AuthCard } from '@/components/auth-card'
import { CenterSpinner } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { firstError } from '@/lib/api'
import { safeRedirect, useAuthActions, useUser } from '@/lib/auth'
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
  const [form, setForm] = useState({ name: '', email: '', password: '', password_confirmation: '' })
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const destination = safeRedirect(redirect)

  if (isLoading) return <CenterSpinner />
  if (user && !register.isPending && !register.isSuccess) return <Navigate to={destination} replace />

  return (
    <AuthCard title="নতুন অ্যাকাউন্ট" subtitle="আপনার পড়া, হাইলাইট ও নোট সব ডিভাইসে সংরক্ষিত থাকবে">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          register.mutate(form, {
            onSuccess: () => {
              toast.success('অ্যাকাউন্ট তৈরি হয়েছে', { description: 'ইমেইল যাচাইয়ের জন্য আপনার ইনবক্সে একটি লিংক পাঠানো হয়েছে।' })
              navigate({ to: destination, replace: true })
            },
            onError: (error) => toast.error(firstError(error)),
          })
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="name">নাম</Label>
          <Input id="name" required maxLength={255} autoComplete="name" value={form.name} onChange={set('name')} className="h-10" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">ইমেইল</Label>
          <Input id="email" type="email" required autoComplete="email" value={form.email} onChange={set('email')} className="h-10" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="password">পাসওয়ার্ড</Label>
            <Input id="password" type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={set('password')} className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password_confirmation">আবার লিখুন</Label>
            <Input id="password_confirmation" type="password" required autoComplete="new-password" value={form.password_confirmation} onChange={set('password_confirmation')} className="h-10" />
          </div>
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
