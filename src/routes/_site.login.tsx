import { createFileRoute, Link, Navigate, useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { AuthCard } from '@/components/auth-card'
import { CenterSpinner } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { firstError } from '@/lib/api'
import { safeRedirect, useAuthActions, useUser } from '@/lib/auth'
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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const destination = safeRedirect(redirect)

  if (isLoading) return <CenterSpinner />
  if (user && !login.isPending && !login.isSuccess) return <Navigate to={destination} replace />

  return (
    <AuthCard title="আস-সালামু আলাইকুম" subtitle="আপনার অ্যাকাউন্টে প্রবেশ করুন">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          login.mutate(
            { email, password, remember },
            {
              onSuccess: (user) => {
                toast.success(`স্বাগতম, ${user.name}`)
                navigate({ to: destination, replace: true })
              },
              onError: (error) => {
                setPassword('')
                toast.error(firstError(error))
              },
            },
          )
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="email">ইমেইল</Label>
          <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10" />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">পাসওয়ার্ড</Label>
            <Link to="/forgot-password" search={{ email: email || undefined }} className="text-xs font-medium text-primary hover:underline">
              পাসওয়ার্ড ভুলে গেছেন?
            </Link>
          </div>
          <Input id="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-10" />
        </div>
        <Label htmlFor="remember" className="flex cursor-pointer items-center gap-2 font-normal text-muted-foreground">
          <Switch id="remember" checked={remember} onCheckedChange={setRemember} />
          আমাকে মনে রাখুন
        </Label>
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
