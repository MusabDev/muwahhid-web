import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { AdminPageHeader, Panel, useAdminMutation } from '@/components/admin/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { api } from '@/lib/api'
import { useUser } from '@/lib/auth'
import type { Paginated, User } from '@/lib/types'

export const Route = createFileRoute('/admin/users')({
  component: AdminUsers,
})

function AdminUsers() {
  const [q, setQ] = useState('')
  const { data: me } = useUser()
  const { data } = useQuery({ queryKey: ['admin', 'users', q], queryFn: () => api<Paginated<User>>('/admin/users', { query: { q, per_page: 100 } }) })
  const toggle = useAdminMutation(({ id, is_admin }: { id: number; is_admin: boolean }) => api(`/admin/users/${id}`, { method: 'PUT', body: { is_admin } }), {
    success: 'আপডেট হয়েছে',
    invalidate: [['admin', 'users']],
  })

  return (
    <>
      <AdminPageHeader title="ব্যবহারকারী" />
      <Panel>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="নাম বা ইমেইল…" className="mb-4 max-w-xs" />
        <div className="divide-y">
          {data?.data.map((user) => (
            <div key={user.id} className="flex items-center gap-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{user.name}</div>
                <div className="text-sm text-muted-foreground">{user.email}</div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                অ্যাডমিন
                <Switch checked={user.is_admin} disabled={user.id === me?.id} onCheckedChange={(v) => toggle.mutate({ id: user.id, is_admin: v })} />
              </label>
            </div>
          ))}
        </div>
      </Panel>
    </>
  )
}
