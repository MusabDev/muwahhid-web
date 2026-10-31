import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { CircleCheck, CircleX } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { CenterSpinner, EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { useUser, useVerifyEmail } from '@/lib/auth'
import { pageTitle } from '@/lib/head'

type VerifySearch = { id?: string; hash?: string; expires?: string; signature?: string }

const str = (value: unknown) => (typeof value === 'string' || typeof value === 'number' ? String(value) : undefined)

export const Route = createFileRoute('/_site/verify-email')({
  head: () => pageTitle('ইমেইল যাচাই'),
  validateSearch: (search: Record<string, unknown>): VerifySearch => ({
    id: str(search.id),
    hash: str(search.hash),
    expires: str(search.expires),
    signature: str(search.signature),
  }),
  component: VerifyEmailPage,
})

function VerifyEmailPage() {
  const search = Route.useSearch()
  const navigate = useNavigate()
  const { data: user } = useUser()
  const verify = useVerifyEmail()
  const started = useRef(false)
  const { id, hash, expires, signature } = search
  const complete = !!(id && hash && expires && signature)

  useEffect(() => {
    if (!complete || started.current) return
    started.current = true
    verify.mutate({ id, hash, expires, signature })
    navigate({ to: '/verify-email', search: {}, replace: true })
  }, [complete, id, hash, expires, signature, verify, navigate])

  if (verify.isPending || (complete && verify.isIdle)) return <CenterSpinner />

  const ok = verify.isSuccess

  return (
    <div className="mx-auto max-w-md px-4 py-24">
      <EmptyState icon={ok ? CircleCheck : CircleX} title={ok ? 'ইমেইল যাচাই সম্পন্ন' : 'লিংকটি কাজ করছে না'}>
        <p>
          {ok
            ? 'জাযাকাল্লাহু খাইরান। আপনার ইমেইল ঠিকানা যাচাই করা হয়েছে।'
            : 'যাচাই লিংকটি অসম্পূর্ণ বা মেয়াদোত্তীর্ণ। সেটিংস থেকে নতুন লিংক পাঠাতে পারেন।'}
        </p>
        <Button className="mt-4" asChild>
          {user ? <Link to="/settings">সেটিংসে যান</Link> : <Link to="/login" search={{ redirect: '/settings' }}>লগইন</Link>}
        </Button>
      </EmptyState>
    </div>
  )
}
