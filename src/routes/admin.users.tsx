import { createFileRoute } from '@tanstack/react-router'
import { DataTable } from '@/components/admin/data-table'
import { AdminPageHeader, confirmAction, useAdminMutation } from '@/components/admin/form'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { api } from '@/lib/api'
import { useUser } from '@/lib/auth'
import { timeAgo } from '@/lib/text'
import type { User } from '@/lib/types'

export const Route = createFileRoute('/admin/users')({
  component: AdminUsers,
})

function AdminUsers() {
  const { data: me } = useUser()
  const toggle = useAdminMutation(({ id, is_admin }: { id: number; is_admin: boolean }) => api(`/admin/users/${id}`, { method: 'PUT', body: { is_admin } }), {
    success: 'আপডেট হয়েছে',
    invalidate: [['admin', 'users']],
  })

  return (
    <>
      <AdminPageHeader title="ব্যবহারকারী" description="নিবন্ধিত ব্যবহারকারী ও অ্যাডমিন অনুমতি" />
      <DataTable<User>
        path="/admin/users"
        queryKey="users"
        searchPlaceholder="নাম বা ইমেইল…"
        columns={[
          {
            header: 'ব্যবহারকারী',
            cell: (user) => (
              <div className="min-w-0">
                <div className="truncate font-semibold">{user.name}</div>
                <div className="truncate text-sm text-muted-foreground">{user.email}</div>
              </div>
            ),
          },
          {
            header: 'ইমেইল',
            className: 'hidden sm:table-cell',
            cell: (user) => <Badge variant={user.email_verified ? 'secondary' : 'outline'}>{user.email_verified ? 'যাচাইকৃত' : 'অযাচাইকৃত'}</Badge>,
          },
          { header: 'যোগদান', className: 'hidden md:table-cell', cell: (user) => <span className="text-xs text-muted-foreground">{timeAgo(user.created_at)}</span> },
          {
            header: 'অ্যাডমিন',
            cell: (user) => (
              <Switch
                checked={user.is_admin}
                disabled={user.id === me?.id}
                aria-label="অ্যাডমিন"
                onCheckedChange={(is_admin) =>
                  confirmAction({
                    title: is_admin ? `${user.name}-কে অ্যাডমিন করবেন?` : `${user.name}-এর অ্যাডমিন অনুমতি সরাবেন?`,
                    description: is_admin ? 'অ্যাডমিনরা সব কনটেন্ট বদলাতে ও মুছতে পারেন।' : undefined,
                    destructive: !is_admin,
                  }).then((ok) => ok && toggle.mutate({ id: user.id, is_admin }))
                }
              />
            ),
          },
        ]}
      />
    </>
  )
}
