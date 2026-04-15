import type { Metadata } from 'next'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/ui'
import PartnersSettings from '@/components/account/PartnersSettings'

export const metadata: Metadata = { title: 'Partners' }

export default async function PartnersPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/signin')

  const [partners, accessibleAccounts] = await Promise.all([
    db.accountPartner.findMany({
      where: { ownerId: session.user.id },
      include: { partner: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    db.accountPartner.findMany({
      where: { partnerId: session.user.id },
      include: { owner: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  return (
    <div>
      <PageHeader
        title="Partners"
        description="Share access to your account with other Jellybox users."
      />
      <PartnersSettings
        partners={partners}
        accessibleAccounts={accessibleAccounts}
      />
    </div>
  )
}
