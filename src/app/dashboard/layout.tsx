import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { getActiveAccountId } from '@/lib/context'
import DashboardNav from '@/components/dashboard/DashboardNav'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/signin')

  const userId = session.user.id

  const [partnerRows, activeAccountId] = await Promise.all([
    // Accounts this user has been granted access to
    db.accountPartner.findMany({
      where: { partnerId: userId },
      select: { owner: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    getActiveAccountId(userId),
  ])

  const partnerAccounts = partnerRows.map((r) => r.owner)

  return (
    <div className="flex h-screen bg-jf-bg overflow-hidden">
      {/* Sidebar */}
      <DashboardNav
        partnerAccounts={partnerAccounts}
        activeAccountId={activeAccountId}
        selfId={userId}
        selfName={session.user.name ?? null}
        selfEmail={session.user.email ?? ''}
        selfImage={session.user.image ?? null}
      />

      {/* Main content area — top padding on mobile clears the fixed top bar (plus iOS status bar) */}
      <main className="flex-1 overflow-y-auto pt-[calc(3.5rem+env(safe-area-inset-top))] md:pt-0 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</div>
      </main>
    </div>
  )
}
