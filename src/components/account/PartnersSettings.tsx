'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, Button, Input } from '@/components/ui'
import { addPartnerAction, removePartnerAction, leavePartnerAccountAction } from '@/app/dashboard/partners/actions'
import { formatDate } from '@/lib/utils'

type Partner = {
  id: string
  partner: { id: string; name: string | null; email: string }
  createdAt: Date
}

type AccessibleAccount = {
  id: string
  owner: { id: string; name: string | null; email: string }
  createdAt: Date
}

export default function PartnersSettings({
  partners,
  accessibleAccounts,
}: {
  partners: Partner[]
  accessibleAccounts: AccessibleAccount[]
}) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    setAddError(null)
    const fd = new FormData()
    fd.set('email', email)
    const res = await addPartnerAction(fd)
    setAdding(false)
    if (res.error) {
      setAddError(res.error)
    } else {
      setEmail('')
      router.refresh()
    }
  }

  return (
    <div className="space-y-5 max-w-lg">

      {/* People who can access my account */}
      <Card>
        <CardHeader>
          <div>
            <h2 className="text-sm font-semibold text-jf-text-primary">Who can access your account</h2>
            <p className="text-xs text-jf-text-muted mt-0.5">
              Partners can view and edit your tags and devices, but cannot change your Jellyfin settings.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {partners.length > 0 && (
            <ul className="space-y-2">
              {partners.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2 border-b border-jf-border last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-jf-text-primary truncate">
                      {p.partner.name ?? p.partner.email}
                    </p>
                    <p className="text-xs text-jf-text-muted truncate">{p.partner.email} · Added {formatDate(p.createdAt)}</p>
                  </div>
                  <form action={() => removePartnerAction(p.partner.id).then(() => router.refresh())}>
                    <Button type="submit" variant="secondary" size="sm">Remove</Button>
                  </form>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleAdd} className="space-y-3">
            {addError && (
              <div className="p-3 rounded-lg bg-jf-error/10 border border-jf-error/30 text-jf-error text-sm">
                {addError}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="partner@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1"
              />
              <Button type="submit" loading={adding} disabled={!email}>
                Add partner
              </Button>
            </div>
            <p className="text-xs text-jf-text-muted">
              The person must already have a Jellybox account.
            </p>
          </form>
        </CardContent>
      </Card>

      {/* Accounts I can access */}
      {accessibleAccounts.length > 0 && (
        <Card>
          <CardHeader>
            <div>
              <h2 className="text-sm font-semibold text-jf-text-primary">Accounts you can access</h2>
              <p className="text-xs text-jf-text-muted mt-0.5">
                You can switch to these accounts from the sidebar.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {accessibleAccounts.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2 border-b border-jf-border last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-jf-text-primary truncate">
                      {a.owner.name ?? a.owner.email}
                    </p>
                    <p className="text-xs text-jf-text-muted truncate">{a.owner.email}</p>
                  </div>
                  <form action={() => leavePartnerAccountAction(a.owner.id)}>
                    <Button type="submit" variant="secondary" size="sm">Leave</Button>
                  </form>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
