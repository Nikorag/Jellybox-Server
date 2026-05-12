import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { getActiveAccountId } from '@/lib/context'
import { publicPagesDisabled } from '@/lib/auth-flags'
import DashboardNav from '@/components/dashboard/DashboardNav'
import DocsSidebar from './DocsSidebar'
import DocsMobileNav from './DocsMobileNav'

export default async function DocsLayout({ children }: { children: ReactNode }) {
  const session = await auth()

  if (publicPagesDisabled() && !session?.user?.id) {
    redirect('/auth/signin')
  }

  if (session?.user?.id) {
    const userId = session.user.id
    const [partnerRows, activeAccountId] = await Promise.all([
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
        <DashboardNav
          partnerAccounts={partnerAccounts}
          activeAccountId={activeAccountId}
          selfId={userId}
          selfName={session.user.name ?? null}
          selfEmail={session.user.email ?? ''}
          selfImage={session.user.image ?? null}
        />

        <main className="flex-1 overflow-y-auto pt-[calc(3.5rem+env(safe-area-inset-top))] md:pt-0 pb-[env(safe-area-inset-bottom)]">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
            {children}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-jf-bg flex flex-col">
      {/* Header */}
      <header className="px-4 sm:px-6 py-4 pt-[calc(1rem+env(safe-area-inset-top))] border-b border-jf-border flex items-center gap-3 sm:gap-4 bg-jf-surface sticky top-0 z-10">
        <Link href="/" className="flex items-center gap-2.5 text-jf-text-secondary hover:text-jf-text-primary transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="w-px h-5 bg-jf-border" />
        <Link href="/" className="flex items-center gap-2">
          <Image src="/Icon.png" alt="Jellybox" width={24} height={24} className="flex-shrink-0" />
          <span className="font-semibold text-jf-text-primary text-sm">Jellybox</span>
        </Link>
        <span className="text-jf-text-muted text-sm">/</span>
        <span className="text-jf-text-secondary text-sm hidden sm:inline">Self-hosting Guide</span>
        <span className="text-jf-text-secondary text-sm sm:hidden">Docs</span>
      </header>

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="w-56 flex-shrink-0 border-r border-jf-border bg-jf-surface hidden md:block">
          <div className="sticky top-[57px] p-4">
            <DocsSidebar />
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">
          {/* Mobile nav strip */}
          <div className="md:hidden border-b border-jf-border bg-jf-surface">
            <DocsMobileNav />
          </div>

          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
