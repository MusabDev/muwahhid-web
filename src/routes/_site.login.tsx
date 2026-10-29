import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { AuthCard } from '@/components/auth-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { firstError } from '@/lib/api'
import { useAuthActions } from '@/lib/auth'
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
  const { login } = useAuthActions()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  return (
    <AuthCard title="আস-সালামু আলাইকুম" subtitle="আপনার অ্যাকাউন্টে প্রবেশ করুন">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          login.mutate(
            { email, password },
            {
              onSuccess: (user) => {
                toast.success(`স্বাগতম, ${user.name}`)
                navigate({ to: redirect ?? '/library' })
              },
              onError: (error) => toast.error(firstError(error)),
            },
          )
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="email">ইমেইল</Label>
          <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">পাসওয়ার্ড</Label>
          <Input id="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-10" />
        </div>
        <Button type="submit" className="h-10 w-full text-base" disabled={login.isPending}>
          {login.isPending && <Loader2 className="animate-spin" />} লগইন
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        অ্যাকাউন্ট নেই?{' '}
        <Link to="/register" className="font-semibold text-primary hover:underline">
          রেজিস্টার করুন
        </Link>
      </p>
    </AuthCard>
  )
}
