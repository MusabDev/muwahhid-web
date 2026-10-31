import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Navigate, useNavigate } from '@tanstack/react-router'
import { CircleAlert, CircleCheck, KeyRound, Loader2, LogOut, Monitor, Smartphone, Trash2, UserRound } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { toast } from 'sonner'
import { CenterSpinner, PageTitle } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { firstError } from '@/lib/api'
import { useAccountActions, useAccountSessions, useUser } from '@/lib/auth'
import { seo } from '@/lib/seo'
import type { AccountSession, User } from '@/lib/types'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_site/settings')({
  head: () => seo({ title: 'সেটিংস', noindex: true }),
  component: SettingsPage,
})

function SettingsPage() {
  const { data: user, isLoading } = useUser()

  if (isLoading) return <CenterSpinner />
  if (!user) return <Navigate to="/login" search={{ redirect: '/settings' }} replace />

  return (
    <>
      <PageTitle title="অ্যাকাউন্ট সেটিংস">প্রোফাইল, পাসওয়ার্ড ও লগইন করা ডিভাইস পরিচালনা করুন।</PageTitle>
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="max-w-3xl space-y-8">
        <ProfileSection user={user} />
        <PasswordSection />
        <SessionsSection />
        <DeleteAccountSection />
        </div>
      </div>
    </>
  )
}

function Section({ icon: Icon, title, description, danger, children }: { icon: typeof UserRound; title: string; description: string; danger?: boolean; children: ReactNode }) {
  return (
    <section className={cn('rounded-2xl border bg-card p-6 shadow-sm sm:p-8', danger && 'border-destructive/40')}>
      <div className="mb-6 flex items-start gap-3">
        <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', danger ? 'bg-destructive/10 text-destructive' : 'bg-gold/15 text-gold')}>
          <Icon className="size-4.5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  )
}

function ProfileSection({ user }: { user: User }) {
  const { updateProfile, resendVerification } = useAccountActions()
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [currentPassword, setCurrentPassword] = useState('')
  const emailChanged = email.trim().toLowerCase() !== user.email
  const dirty = name !== user.name || emailChanged

  const submit = (e: FormEvent) => {
    e.preventDefault()
    updateProfile.mutate(
      { name, email, current_password: emailChanged ? currentPassword : undefined },
      {
        onSuccess: (updated) => {
          setCurrentPassword('')
          setEmail(updated.email)
          toast.success('প্রোফাইল সংরক্ষিত হয়েছে', emailChanged ? { description: 'নতুন ইমেইল যাচাইয়ের লিংক পাঠানো হয়েছে।' } : undefined)
        },
        onError: (error) => toast.error(firstError(error)),
      },
    )
  }

  return (
    <Section icon={UserRound} title="প্রোফাইল" description="আপনার নাম ও ইমেইল ঠিকানা">
      {user.email_verified ? (
        <p className="mb-5 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
          <CircleCheck className="size-4" /> ইমেইল যাচাই করা হয়েছে
        </p>
      ) : (
        <div className="mb-5 flex flex-col gap-3 rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm sm:flex-row sm:items-center">
          <CircleAlert className="size-5 shrink-0 text-gold" />
          <p className="flex-1">আপনার ইমেইল এখনো যাচাই করা হয়নি। ইনবক্সে পাঠানো লিংকে ক্লিক করুন।</p>
          <Button
            size="sm"
            variant="outline"
            disabled={resendVerification.isPending || resendVerification.isSuccess}
            onClick={() =>
              resendVerification.mutate(undefined, {
                onSuccess: () => toast.success('যাচাই লিংক আবার পাঠানো হয়েছে'),
                onError: (error) => toast.error(firstError(error)),
              })
            }
          >
            {resendVerification.isPending && <Loader2 className="animate-spin" />}
            {resendVerification.isSuccess ? 'পাঠানো হয়েছে' : 'আবার পাঠান'}
          </Button>
        </div>
      )}

      <form className="space-y-4" onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="name" label="নাম">
            <Input id="name" required maxLength={255} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className="h-10" />
          </Field>
          <Field id="email" label="ইমেইল">
            <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10" />
          </Field>
        </div>
        {emailChanged && (
          <Field id="profile_current_password" label="বর্তমান পাসওয়ার্ড (ইমেইল পরিবর্তনের জন্য)">
            <Input
              id="profile_current_password"
              type="password"
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="h-10"
            />
          </Field>
        )}
        <div className="flex justify-end">
          <Button type="submit" disabled={!dirty || updateProfile.isPending}>
            {updateProfile.isPending && <Loader2 className="animate-spin" />} সংরক্ষণ করুন
          </Button>
        </div>
      </form>
    </Section>
  )
}

const EMPTY_PASSWORD_FORM = { current_password: '', password: '', password_confirmation: '' }

function PasswordSection() {
  const { updatePassword } = useAccountActions()
  const [form, setForm] = useState(EMPTY_PASSWORD_FORM)
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }))

  return (
    <Section icon={KeyRound} title="পাসওয়ার্ড পরিবর্তন" description="পরিবর্তনের পর অন্য সব ডিভাইস থেকে লগআউট হয়ে যাবে">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          updatePassword.mutate(form, {
            onSuccess: () => {
              setForm(EMPTY_PASSWORD_FORM)
              toast.success('পাসওয়ার্ড পরিবর্তন হয়েছে')
            },
            onError: (error) => toast.error(firstError(error)),
          })
        }}
      >
        <Field id="current_password" label="বর্তমান পাসওয়ার্ড">
          <Input id="current_password" type="password" required autoComplete="current-password" value={form.current_password} onChange={set('current_password')} className="h-10" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="new_password" label="নতুন পাসওয়ার্ড">
            <Input id="new_password" type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={set('password')} className="h-10" />
          </Field>
          <Field id="new_password_confirmation" label="আবার লিখুন">
            <Input
              id="new_password_confirmation"
              type="password"
              required
              autoComplete="new-password"
              value={form.password_confirmation}
              onChange={set('password_confirmation')}
              className="h-10"
            />
          </Field>
        </div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">কমপক্ষে ৮ অক্ষর; অক্ষর ও সংখ্যা মিলিয়ে দিন।</p>
          <Button type="submit" disabled={updatePassword.isPending}>
            {updatePassword.isPending && <Loader2 className="animate-spin" />} পাসওয়ার্ড পরিবর্তন করুন
          </Button>
        </div>
      </form>
    </Section>
  )
}

function describeAgent(agent: string | null) {
  if (!agent) return { label: 'অজানা ডিভাইস', mobile: false }
  const browser = /Edg\//.test(agent)
    ? 'Edge'
    : /OPR\//.test(agent)
      ? 'Opera'
      : /Firefox\//.test(agent)
        ? 'Firefox'
        : /Chrome\//.test(agent)
          ? 'Chrome'
          : /Safari\//.test(agent)
            ? 'Safari'
            : null
  const os = /Android/.test(agent)
    ? 'Android'
    : /iPhone|iPad|iPod/.test(agent)
      ? 'iOS'
      : /Windows/.test(agent)
        ? 'Windows'
        : /Mac OS X|Macintosh/.test(agent)
          ? 'macOS'
          : /Linux/.test(agent)
            ? 'Linux'
            : null
  const label = [browser, os].filter(Boolean).join(' · ') || 'অজানা ডিভাইস'
  return { label, mobile: /Mobile|Android|iPhone|iPad/.test(agent) }
}

function SessionRow({ session }: { session: AccountSession }) {
  const { label, mobile } = describeAgent(session.user_agent)
  const Icon = mobile ? Smartphone : Monitor
  const lastActive = new Date(session.last_active_at).toLocaleString('bn-BD', { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <li className="flex items-center gap-3 py-3">
      <Icon className="size-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{label}</div>
        <div className="truncate text-xs text-muted-foreground">
          {session.ip_address ?? '—'} · {session.is_current ? <span className="font-semibold text-emerald-700 dark:text-emerald-400">এই ডিভাইস</span> : `শেষ সক্রিয় ${lastActive}`}
        </div>
      </div>
    </li>
  )
}

function SessionsSection() {
  const { data: sessions, isLoading } = useAccountSessions()
  const { logoutOtherSessions } = useAccountActions()
  const [open, setOpen] = useState(false)
  const others = sessions?.filter((s) => !s.is_current).length ?? 0

  return (
    <Section icon={Monitor} title="লগইন করা ডিভাইস" description="যেসব ব্রাউজারে আপনার অ্যাকাউন্টে লগইন করা আছে">
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <ul className="divide-y">{sessions?.map((session, i) => <SessionRow key={i} session={session} />)}</ul>
      )}
      <div className="mt-4 flex justify-end">
        <Button variant="outline" disabled={others === 0} onClick={() => setOpen(true)}>
          <LogOut /> অন্য সব ডিভাইস থেকে লগআউট
        </Button>
      </div>
      <PasswordConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="অন্য ডিভাইস থেকে লগআউট"
        description="নিশ্চিত করতে আপনার পাসওয়ার্ড দিন। এই ডিভাইস ছাড়া বাকি সব জায়গা থেকে লগআউট হয়ে যাবে।"
        confirmLabel="লগআউট করুন"
        pending={logoutOtherSessions.isPending}
        onConfirm={(password, done) =>
          logoutOtherSessions.mutate(
            { password },
            {
              onSuccess: () => {
                done()
                toast.success('অন্য সব ডিভাইস থেকে লগআউট করা হয়েছে')
              },
              onError: (error) => toast.error(firstError(error)),
            },
          )
        }
      />
    </Section>
  )
}

function DeleteAccountSection() {
  const { deleteAccount } = useAccountActions()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  return (
    <Section icon={Trash2} title="অ্যাকাউন্ট মুছে ফেলুন" description="আপনার লাইব্রেরি, হাইলাইট, নোট ও বুকমার্কসহ সব ডেটা স্থায়ীভাবে মুছে যাবে" danger>
      <div className="flex justify-end">
        <Button variant="destructive" onClick={() => setOpen(true)}>
          <Trash2 /> অ্যাকাউন্ট মুছে ফেলুন
        </Button>
      </div>
      <PasswordConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="অ্যাকাউন্ট স্থায়ীভাবে মুছবেন?"
        description="এই কাজ আর ফেরানো যাবে না। নিশ্চিত করতে আপনার পাসওয়ার্ড দিন।"
        confirmLabel="স্থায়ীভাবে মুছুন"
        destructive
        pending={deleteAccount.isPending}
        onConfirm={(password, done) =>
          deleteAccount.mutate(
            { password },
            {
              onSuccess: async () => {
                done()
                toast.success('আপনার অ্যাকাউন্ট মুছে ফেলা হয়েছে')
                await navigate({ to: '/', replace: true })
                queryClient.setQueryData(['user'], null)
                queryClient.removeQueries({ queryKey: ['me'] })
              },
              onError: (error) => toast.error(firstError(error)),
            },
          )
        }
      />
    </Section>
  )
}

function PasswordConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive,
  pending,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  destructive?: boolean
  pending: boolean
  onConfirm: (password: string, done: () => void) => void
}) {
  const [password, setPassword] = useState('')
  const change = (next: boolean) => {
    if (!next) setPassword('')
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogContent className="sm:max-w-md">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            onConfirm(password, () => change(false))
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <Field id="confirm_password" label="পাসওয়ার্ড">
            <Input id="confirm_password" type="password" required autoFocus autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-10" />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => change(false)}>
              বাতিল
            </Button>
            <Button type="submit" variant={destructive ? 'destructive' : 'default'} disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
